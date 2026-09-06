"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  deriveMissingQuestions,
  type MissingQuestion,
} from "../../incident/missing-information";
import { containsSensitiveDetail } from "../../incident/sensitive-text";
import { deriveFinancialFactsFromText } from "../../incident/normalization";
import {
  getCaseConsistencyIssues,
  resolveEntityRelationship,
  type CaseConsistencyIssue,
  type EntityRelationshipResolution,
} from "../../incident/case-consistency";
import type {
  IncidentDraft,
  ReportFamily,
  TranscriptionResult,
} from "../../incident/schema";
import {
  DEMO_CASES,
  type DemoCaseDefinition,
  type DemoCaseId,
  type DemoNarrationLanguage,
} from "../../incident/demo-incident";
import type { ReportedAmountResolution } from "../../incident/complaint-case";
import {
  NCRP_FIELD_DEFINITIONS,
  buildNcrpCompatibleComplaint,
  complaintFieldApplies,
  complaintFieldIsRequired,
  complaintRequiredFieldStatus,
  type NcrpCompatibleComplaint,
} from "../../incident/ncrp-compatible-complaint";
import type { ExperienceMode, ReporterProfile } from "../../experience/profile";

type ConsistencyResolution =
  | "SAME"
  | "DIFFERENT"
  | "YES"
  | "NO"
  | "UNKNOWN"
  | EntityRelationshipResolution;
import { getPlatformConfig } from "../../incident/capabilities";
import { resolveFinancialLoss } from "../../incident/financial-summary";
import { useI18n } from "../../i18n/i18n-provider";
import {
  CITIZEN_DOES_NOT_HAVE,
  deriveReportGroups,
  type ReportFieldView,
  type ReportGroupView,
} from "../../presentation/report-details";
import { formatCurrency } from "../../presentation/format";
import { citizenVisibleValue } from "../../presentation/citizen-visible-value";
import { deriveEvidenceContributions } from "../../presentation/evidence-contributions";
import { getCaseIntegritySummary } from "../../presentation/case-integrity";
import { deriveIncidentTimeline } from "../../presentation/incident-timeline";
import {
  deriveReportReadiness,
  type ReportReadiness,
} from "../../presentation/report-readiness";
import { ComplaintPacket } from "./complaint-packet";
import { ImmediateHandoff } from "./immediate-handoff";
import { IncidentTimeline } from "./incident-timeline";
import { JourneyProgress } from "./journey-progress";
import {
  OPEN_EVIDENCE_PREVIEW_EVENT,
  requestEvidencePreview,
} from "./evidence-preview-events";

export type ReportWorkspaceMode =
  | "INPUT"
  | "PROCESSING"
  | "READY"
  | "ERROR"
  | "REVIEW";
export type ReportMethod = "SPEAK" | "UPLOAD" | "TYPE";
export type PreparationFailure =
  | "TRANSCRIPTION"
  | "TRANSLATION"
  | "REPORT"
  | null;

const SOURCE_VISIBLE_FIELD_IDS = new Set([
  "category",
  "transaction-0-utr",
  "reporter-name",
]);

const UNAVAILABLE_QUESTION_FIELDS = new Set<MissingQuestion["field"]>([
  "transactionIdOrUtr",
  "transactionApproximateTime",
  "transactionDate",
  "incidentApproximateTime",
  "accountOrUpiId",
  "institution",
  "platform",
  "affectedAccount",
  "affectedSystem",
]);

type ReportWorkspaceProps = {
  mode: ReportWorkspaceMode;
  reportMethod: ReportMethod;
  narrative: string;
  reporterName: string;
  screenshots: File[];
  unavailableEvidenceNames: string[];
  transcription: TranscriptionResult | null;
  hasAudio: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingLevels: number[];
  recordingSeconds: number;
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
  experienceMode: ExperienceMode | null;
  reporterProfile: ReporterProfile;
  identityDocumentProvided: boolean;
  isReportStale: boolean;
  isDraftSaved: boolean;
  demoNarrationLanguage: DemoNarrationLanguage;
  isTranscriptionError: boolean;
  preparationFailure: PreparationFailure;
  draft: IncidentDraft | null;
  loadingMessage: string;
  formError: string | null;
  missingAnswers: Record<string, string>;
  amountResolution: ReportedAmountResolution | null;
  reportReference: string;
  onReportMethodChange: (method: ReportMethod) => void;
  onNarrativeChange: (value: string) => void;
  onReporterNameChange: (value: string) => void;
  onReporterProfileChange: (profile: ReporterProfile) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRecordAgain: () => void;
  onTranscriptionChange: (value: TranscriptionResult) => void;
  onScreenshotsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveScreenshot: (index: number) => void;
  onOrganizeReport: () => void;
  onUseDemoIncident: () => void;
  onDemoCaseChange: (caseId: DemoCaseId) => void;
  onResetDemoCase: () => void;
  onMissingAnswerChange: (
    field: MissingQuestion["field"],
    value: string,
  ) => void;
  onSaveMissingAnswer: (question: MissingQuestion, fallback?: string) => void;
  onDraftChange: (draft: IncidentDraft) => void;
  onReportedAmountSelect: (amount: number) => void;
  onReportFamilyChange: (
    reportFamily: Exclude<ReportFamily, "OUT_OF_SCOPE_OR_UNCLEAR">,
  ) => void;
  onDemoNarrationLanguageChange: (language: DemoNarrationLanguage) => void;
  onReview: (ignoredConsistencyIssueIds?: readonly string[]) => void;
  onBackToEdit: () => void;
  onSubmit: (complaint: NcrpCompatibleComplaint) => void;
};

function languageLabel(languageCode: string): string {
  const labels: Record<string, string> = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "bn-IN": "Bengali",
    "kn-IN": "Kannada",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
  };
  return labels[languageCode] ?? "Original language";
}

function UploadedEvidenceInlinePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!previewUrl) return null;

  // Blob URLs are local browser resources and cannot use next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="inline-evidence-image ph-no-capture" src={previewUrl} alt={`Preview of ${file.name}`} />;
}

function EvidenceRows({
  screenshots,
  draft,
  isDemoIncident,
  demoCase,
  onRemoveScreenshot,
  compact = false,
}: {
  screenshots: File[];
  draft: IncidentDraft | null;
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
  onRemoveScreenshot: (index: number) => void;
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const [activeDemoEvidence, setActiveDemoEvidence] = useState<
    DemoCaseDefinition["evidence"][number] | null
  >(null);
  const [activeUploadedEvidence, setActiveUploadedEvidence] =
    useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const removeDialogRef = useRef<HTMLDialogElement | null>(null);
  const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(
    null,
  );
  const removalContribution =
    pendingRemovalIndex !== null && draft
      ? deriveEvidenceContributions(draft, {
          locale,
          isDemoIncident: false,
          screenshotNames: screenshots.map((file) => file.name),
        }).find((item) => item.evidenceId === `uploaded-${pendingRemovalIndex}`)
      : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (
      (activeDemoEvidence || activeUploadedEvidence) &&
      dialog &&
      !dialog.open
    ) {
      dialog.showModal();
    }
  }, [activeDemoEvidence, activeUploadedEvidence]);

  useEffect(() => {
    if (!activeUploadedEvidence) {
      setUploadedPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(activeUploadedEvidence);
    setUploadedPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [activeUploadedEvidence]);

  useEffect(() => {
    if (
      pendingRemovalIndex !== null &&
      removeDialogRef.current &&
      !removeDialogRef.current.open
    ) {
      removeDialogRef.current.showModal();
    }
  }, [pendingRemovalIndex]);

  useEffect(() => {
    const openRequestedEvidence = (event: Event) => {
      const evidenceId = (event as CustomEvent<string>).detail;
      if (isDemoIncident) {
        const evidence = demoCase?.evidence.find(
          (item) => item.id === evidenceId,
        );
        if (evidence) setActiveDemoEvidence(evidence);
        return;
      }
      const match = /^uploaded-(\d+)$/.exec(evidenceId);
      const file = match ? screenshots[Number(match[1])] : null;
      if (file) setActiveUploadedEvidence(file);
    };
    window.addEventListener(OPEN_EVIDENCE_PREVIEW_EVENT, openRequestedEvidence);
    return () =>
      window.removeEventListener(
        OPEN_EVIDENCE_PREVIEW_EVENT,
        openRequestedEvidence,
      );
  }, [demoCase, isDemoIncident, screenshots]);

  function closeEvidence() {
    dialogRef.current?.close();
    setActiveDemoEvidence(null);
    setActiveUploadedEvidence(null);
  }

  const evidenceCount = isDemoIncident
    ? (demoCase?.evidence.length ?? 0)
    : screenshots.length;
  const evidenceContributions = draft
    ? deriveEvidenceContributions(draft, {
        locale,
        isDemoIncident,
        screenshotNames: isDemoIncident
          ? (demoCase?.evidence.map((item) => item.label) ?? [])
          : screenshots.map((file) => file.name),
        demoEvidence: demoCase?.evidence,
      })
    : [];

  if (!isDemoIncident && screenshots.length === 0) {
    return compact ? (
      <section className="report-source-block inline-evidence-section">
        <h3>{locale === "hi" ? "सबूत" : "Evidence"}</h3>
        <p className="source-note">
          {locale === "hi" ? "अभी कोई सबूत नहीं जोड़ा गया है।" : "No evidence added yet."}
        </p>
      </section>
    ) : null;
  }

  const rows = (
    <ul className={`report-source-files${compact ? " report-source-files-inline" : ""}`}>
      {isDemoIncident
        ? (demoCase?.evidence ?? []).map((item) => {
            const contribution = evidenceContributions.find(
              (candidate) => candidate.evidenceId === item.id,
            );
            return (
            <li className="report-source-file-preview" key={item.src}>
              <button
                className="evidence-preview-trigger"
                type="button"
                data-evidence-id={item.id}
                aria-haspopup="dialog"
                aria-label={`${t("workspace.openEvidence")}: ${locale === "hi" ? item.labelHi : item.label}`}
                onClick={() => setActiveDemoEvidence(item)}
              >
                <Image
                  src={item.src}
                  alt={locale === "hi" ? item.labelHi : item.label}
                  width={720}
                  height={460}
                  sizes={compact ? "(max-width: 820px) calc(100vw - 84px), 390px" : "72px"}
                />
                <span className="evidence-row-copy">
                  <strong>{locale === "hi" ? item.labelHi : item.label}</strong>
                  <small>
                    {locale === "hi" ? item.typeLabelHi : item.typeLabel}
                  </small>
                </span>
                <span className="evidence-row-action">
                  {compact ? (locale === "hi" ? "पूरा सबूत देखें" : "View full evidence") : t("workspace.view")}
                </span>
              </button>
              {compact && contribution?.contributions.length ? (
                <ul className="inline-evidence-facts">
                  {contribution.contributions.map((fact) => (
                    <li key={`${item.id}-${fact.fieldKey}`}>
                      {/^(Detail found|सबूत में मिली जानकारी)$/.test(fact.label) ? null : <strong>{fact.label}: </strong>}
                      {fact.displayValue}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })
        : screenshots.map((file, index) => {
            const contribution = evidenceContributions.find(
              (candidate) => candidate.evidenceId === `uploaded-${index}`,
            );
            return (
            <li
              className="report-source-file-preview uploaded-evidence-row"
              key={`${file.name}-${file.lastModified}`}
            >
              <button
                className="evidence-preview-trigger"
                type="button"
                data-evidence-id={`uploaded-${index}`}
                aria-haspopup="dialog"
                aria-label={`${t("workspace.openEvidence")}: ${file.name}`}
                onClick={() => setActiveUploadedEvidence(file)}
              >
                {compact ? (
                  <UploadedEvidenceInlinePreview file={file} />
                ) : (
                  <span className="evidence-file-icon" aria-hidden="true">▧</span>
                )}
                <span className="evidence-row-copy">
                  <strong>{file.name}</strong>
                  <small>{locale === "hi" ? "तैयार" : "Ready"}</small>
                </span>
                <span className="evidence-row-action">
                  {compact ? (locale === "hi" ? "पूरा सबूत देखें" : "View full evidence") : t("workspace.view")}
                </span>
              </button>
              {compact && contribution?.contributions.length ? (
                <ul className="inline-evidence-facts">
                  {contribution.contributions.map((fact) => (
                    <li key={`${file.name}-${fact.fieldKey}`}>
                      {/^(Detail found|सबूत में मिली जानकारी)$/.test(fact.label) ? null : <strong>{fact.label}: </strong>}
                      {fact.displayValue}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!compact ? (
                <button
                  className="text-button evidence-remove-button"
                  type="button"
                  onClick={() => setPendingRemovalIndex(index)}
                >
                  {t("field.remove")}
                </button>
              ) : null}
            </li>
          );
        })}
    </ul>
  );

  const preview =
    activeDemoEvidence || activeUploadedEvidence ? (
      <dialog
        ref={dialogRef}
        className="evidence-preview-dialog"
        aria-label={
          activeDemoEvidence
            ? locale === "hi"
              ? activeDemoEvidence.labelHi
              : activeDemoEvidence.label
            : activeUploadedEvidence?.name
        }
        onCancel={(event) => {
          event.preventDefault();
          closeEvidence();
        }}
        onClick={(event) => {
          if (event.currentTarget === event.target) closeEvidence();
        }}
      >
        <div className="evidence-preview-dialog-header">
          <div>
            <small>
              {activeDemoEvidence
                ? t("workspace.syntheticEvidence")
                : t("workspace.evidence")}
            </small>
            <strong>
              {activeDemoEvidence
                ? locale === "hi"
                  ? activeDemoEvidence.labelHi
                  : activeDemoEvidence.label
                : activeUploadedEvidence?.name}
            </strong>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={closeEvidence}
            autoFocus
          >
            {t("workspace.closeEvidence")}
          </button>
        </div>
        {activeDemoEvidence ? (
          <Image
            className="ph-no-capture"
            src={activeDemoEvidence.src}
            alt={
              locale === "hi"
                ? activeDemoEvidence.labelHi
                : activeDemoEvidence.label
            }
            width={520}
            height={620}
            sizes="(max-width: 600px) calc(100vw - 40px), 520px"
          />
        ) : uploadedPreviewUrl && activeUploadedEvidence ? (
          // Blob URLs are local browser resources and cannot use next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="uploaded-evidence-preview ph-no-capture"
            src={uploadedPreviewUrl}
            alt={activeUploadedEvidence.name}
          />
        ) : null}
      </dialog>
    ) : null;

  const removalDialog =
    pendingRemovalIndex !== null ? (
      <dialog
        ref={removeDialogRef}
        className="evidence-preview-dialog evidence-remove-dialog"
        aria-labelledby="remove-evidence-heading"
        onCancel={(event) => {
          event.preventDefault();
          setPendingRemovalIndex(null);
        }}
        onClose={() => setPendingRemovalIndex(null)}
      >
        <h2 id="remove-evidence-heading">
          {locale === "hi" ? "यह सबूत हटाएँ?" : "Remove this evidence?"}
        </h2>
        {removalContribution?.contributions.length ? (
          <>
            <p>
              {locale === "hi"
                ? "यह फ़ाइल अभी इन जानकारियों का समर्थन करती है:"
                : "This file currently supports:"}
            </p>
            <ul>
              {removalContribution.contributions.map((fact) => (
                <li key={fact.fieldKey}>
                  {fact.label}: {fact.displayValue}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p>
          {locale === "hi"
            ? "फ़ाइल हटाने के बाद रिपोर्ट की तैयारी फिर से जाँची जाएगी।"
            : "After removal, सचेत will recheck which report details are supported."}
        </p>
        <div className="inline-field-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => removeDialogRef.current?.close()}
            autoFocus
          >
            {locale === "hi" ? "सबूत रखें" : "Keep evidence"}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              onRemoveScreenshot(pendingRemovalIndex);
              removeDialogRef.current?.close();
            }}
          >
            {locale === "hi" ? "सबूत हटाएँ" : "Remove evidence"}
          </button>
        </div>
      </dialog>
    ) : null;

  if (compact) {
    return (
      <section
        className="report-source-block inline-evidence-section"
        aria-label={t("workspace.evidence")}
      >
        <div className="inline-evidence-heading">
          <h3>{locale === "hi" ? "सबूत" : "Evidence"}</h3>
          <span>{evidenceCount} {t("workspace.screenshots")}</span>
        </div>
        {rows}
        {preview}
        {removalDialog}
      </section>
    );
  }

  return (
    <div className="report-source-block">
      <h3>{t("workspace.evidenceAdded")}</h3>
      {rows}
      {preview}
      {removalDialog}
    </div>
  );
}

function EvidenceContributions({
  draft,
  screenshots,
  isDemoIncident,
  demoCase,
}: {
  draft: IncidentDraft;
  screenshots: File[];
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
}) {
  const { locale } = useI18n();
  const items = deriveEvidenceContributions(draft, {
    locale,
    isDemoIncident,
    screenshotNames: isDemoIncident
      ? (demoCase?.evidence.map((item) => item.label) ?? [])
      : screenshots.map((file) => file.name),
    demoEvidence: demoCase?.evidence,
  });
  if (items.length === 0) return null;

  return (
    <section
      className="evidence-contributions"
      aria-labelledby="evidence-contributions-heading"
    >
      <div className="evidence-contributions-heading">
        <p className="report-field-label">
          {locale === "hi" ? "सबूत का उपयोग" : "Evidence used"}
        </p>
        <h3 id="evidence-contributions-heading">
          {locale === "hi"
            ? "आपके सबूत से रिपोर्ट में क्या जोड़ा गया"
            : "What we used from your evidence"}
        </h3>
      </div>
      <div className="evidence-contribution-list">
        {items.map((item) => (
          <article className="evidence-contribution" key={item.evidenceId}>
            <div className="evidence-contribution-title">
              <div>
                <button
                  className="text-button evidence-title-button"
                  type="button"
                  onClick={() => requestEvidencePreview(item.evidenceId)}
                >
                  {item.evidenceLabel}
                </button>
                <span>{item.evidenceType}</span>
              </div>
              <small>
                {item.contributions.length > 0
                  ? locale === "hi"
                    ? `${item.contributions.length} जानकारियाँ उपयोग हुईं`
                    : `${item.contributions.length} ${item.contributions.length === 1 ? "detail" : "details"} used`
                  : locale === "hi"
                    ? "रिपोर्ट के साथ जोड़ा गया"
                    : "Attached to the report"}
              </small>
            </div>

            {item.contributions.length > 0 ? (
              <>
                <p className="evidence-used-label">
                  {locale === "hi" ? "इसके लिए उपयोग हुआ" : "Used for"}
                </p>
                <ul className="evidence-used-list">
                  {item.contributions.map((fact) => (
                    <li key={`${item.evidenceId}-${fact.fieldKey}`}>
                      {/^(Detail found|सबूत में मिली जानकारी)$/.test(
                        fact.label,
                      ) ? null : (
                        <span>{fact.label}: </span>
                      )}
                      {fact.displayValue}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                {locale === "hi"
                  ? "हमने इस सबूत को आपकी रिपोर्ट के साथ जोड़ दिया है।"
                  : "We’ve attached this evidence to your report."}
              </p>
            )}

            <button
              className="text-button"
              type="button"
              aria-haspopup="dialog"
              onClick={() => requestEvidencePreview(item.evidenceId)}
            >
              {locale === "hi" ? "सबूत देखें" : "View evidence"} →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceSummary({
  narrative,
  transcription,
  screenshots,
  draft,
  isDemoIncident,
  demoCase,
  recordingSeconds,
  demoNarrationLanguage,
  onDemoNarrationLanguageChange,
  onRemoveScreenshot,
  compact = false,
}: Pick<
  ReportWorkspaceProps,
  | "narrative"
  | "transcription"
  | "screenshots"
  | "draft"
  | "isDemoIncident"
  | "demoCase"
  | "recordingSeconds"
  | "demoNarrationLanguage"
  | "onDemoNarrationLanguageChange"
  | "onRemoveScreenshot"
> & { compact?: boolean }) {
  const { locale, t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const showWrittenStatement =
    !isDemoIncident && narrative.trim() && !transcription;
  const displayedNarrative = narrative;
  const demoNarration = demoCase?.narrations[demoNarrationLanguage] ?? null;

  useEffect(() => {
    const player = audioRef.current;
    setIsPlaying(false);
    setPlaybackSeconds(0);
    setAudioUnavailable(false);
    player?.load();
    return () => {
      player?.pause();
      if (player) player.currentTime = 0;
    };
  }, [demoCase?.id, demoNarration?.audioPath, demoNarrationLanguage]);

  const formatPlayback = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return (
    <div
      className="report-sources"
      aria-label={t("workspace.informationShared")}
    >
      {isDemoIncident && demoNarration ? (
        <div className="report-source-block demo-narration-block">
          <div className="demo-narration-heading">
            <div>
              <h3>{t("workspace.yourStatement")}</h3>
              <p className="source-meta">
                {demoNarration.nativeLabel} ·{" "}
                {t("workspace.approxSeconds", {
                  seconds: demoNarration.durationSeconds,
                })}
              </p>
            </div>
            {demoNarration.audioPath && !audioUnavailable ? (
              <button
                className="secondary-button compact-audio-button"
                type="button"
                onClick={() => {
                  const player = audioRef.current;
                  if (!player) return;
                  if (player.paused) {
                    void player.play().catch(() => setAudioUnavailable(true));
                  }
                  else player.pause();
                }}
              >
                {isPlaying
                  ? t("workspace.pauseSample")
                  : t("workspace.playSample")}
                <span className="audio-progress" aria-hidden="true">
                  {formatPlayback(playbackSeconds)} /{" "}
                  {formatPlayback(demoNarration.durationSeconds)}
                </span>
              </button>
            ) : null}
          </div>
          {demoNarration.audioPath && !audioUnavailable ? (
            <audio
              ref={audioRef}
              src={demoNarration.audioPath}
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => setAudioUnavailable(true)}
              onTimeUpdate={(event) =>
                setPlaybackSeconds(event.currentTarget.currentTime)
              }
            />
          ) : null}
          {audioUnavailable ? (
            <p className="source-note" role="status">
              {locale === "hi"
                ? "ऑडियो उपलब्ध नहीं है। नीचे पूरा बयान दिया गया है।"
                : "Audio is unavailable. The full statement is shown below."}
            </p>
          ) : null}
          <p className="demo-language-label">{t("workspace.sampleLanguage")}</p>
          <div
            className="demo-narration-languages"
            role="group"
            aria-label={t("workspace.changeLanguage")}
          >
            {(
              Object.keys(demoCase?.narrations ?? {}) as DemoNarrationLanguage[]
            ).map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={demoNarrationLanguage === language}
                onClick={() => onDemoNarrationLanguageChange(language)}
              >
                {demoCase?.narrations[language].nativeLabel}
              </button>
            ))}
          </div>
          <p className="source-transcript">
            {demoNarration.originalTranscript}
          </p>
        </div>
      ) : null}
      {transcription && !isDemoIncident ? (
        compact ? (
          <details className="report-source-block compact-source-disclosure transcript-result">
            <summary>
              <span>
                {isDemoIncident
                  ? t("workspace.transcript")
                  : `${languageLabel(transcription.languageCode)} ${locale === "hi" ? "बयान" : "voice statement"}`}
              </span>
              <strong>
                {t("workspace.approxSeconds", {
                  seconds: recordingSeconds || 1,
                })}
              </strong>
            </summary>
            <p className="source-transcript">
              {transcription.originalTranscript}
            </p>
            {transcription.englishTranscript.trim() &&
            transcription.englishTranscript !==
              transcription.originalTranscript ? (
              <details className="translation-disclosure">
                <summary>{t("workspace.viewEnglish")}</summary>
                <p>{transcription.englishTranscript}</p>
              </details>
            ) : null}
          </details>
        ) : (
          <div className="report-source-block transcript-result">
            <h3>
              {isDemoIncident
                ? t("workspace.transcript")
                : t("workspace.yourStatement")}
            </h3>
            <p className="source-transcript">
              {transcription.originalTranscript}
            </p>
            <p className="source-meta">
              {isDemoIncident
                ? `${demoCase?.sourceLanguage ?? demoNarration?.nativeLabel ?? languageLabel(transcription.languageCode)} · ${t("workspace.approxSeconds", { seconds: recordingSeconds || 1 })}`
                : `${languageLabel(transcription.languageCode)} · ${recordingSeconds || 1} ${locale === "hi" ? "सेकंड" : "seconds"}`}
            </p>
            {transcription.englishTranscript.trim() &&
            transcription.englishTranscript !==
              transcription.originalTranscript ? (
              <details className="translation-disclosure">
                <summary>{t("workspace.viewEnglish")}</summary>
                <p>{transcription.englishTranscript}</p>
              </details>
            ) : null}
          </div>
        )
      ) : null}

      {showWrittenStatement ? (
        compact ? (
          <details className="report-source-block compact-source-disclosure">
            <summary>
              <span>
                {isDemoIncident
                  ? t("workspace.typedDescription")
                  : t("workspace.yourStatement")}
              </span>
              <strong>{t("workspace.viewStatement")}</strong>
            </summary>
            <p className="source-transcript">{displayedNarrative}</p>
          </details>
        ) : (
          <div className="report-source-block">
            <h3>{t("workspace.yourStatement")}</h3>
            <p className="source-transcript">{displayedNarrative}</p>
          </div>
        )
      ) : null}

      <EvidenceRows
        screenshots={screenshots}
        draft={draft}
        isDemoIncident={isDemoIncident}
        demoCase={demoCase}
        onRemoveScreenshot={onRemoveScreenshot}
        compact={compact}
      />
    </div>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}

function RecordingWaveform({ levels }: { levels: number[] }) {
  return (
    <div className="recording-waveform" aria-hidden="true">
      {levels.map((level, index) => (
        <span
          key={index}
          style={{ height: `${Math.round(8 + level * 42)}px` }}
        />
      ))}
    </div>
  );
}

function ReportInputPane(props: ReportWorkspaceProps) {
  const { locale, t } = useI18n();
  const processing = props.mode === "PROCESSING";
  const [editingTranscript, setEditingTranscript] = useState(false);
  const isSpeakMode = props.reportMethod === "SPEAK";
  const sourcePersonName = props.demoCase?.citizen.displayName.split(/\s+/)[0];
  const showingCaseFile = Boolean(props.draft);
  const recordingTime = `${Math.floor(props.recordingSeconds / 60)}:${String(
    props.recordingSeconds % 60,
  ).padStart(2, "0")}`;

  function updateTranscript(value: string) {
    if (!props.transcription) return;
    props.onTranscriptionChange({
      ...props.transcription,
      originalTranscript: value,
      // The citizen's edit is authoritative. Reuse the edited text for
      // preparation so an older machine translation cannot override it.
      englishTranscript: value,
    });
  }

  function growTextarea(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 420)}px`;
  }

  return (
    <section
      className="report-input-pane"
      aria-labelledby="journey-stage-heading"
    >
      <div className={showingCaseFile ? "report-input-pane-sticky" : undefined}>
      {showingCaseFile ? (
        <p className="case-file-column-label">
          {locale === "hi" ? "घटना का स्रोत" : "Incident source"}
        </p>
      ) : null}
      <h1 id="journey-stage-heading" tabIndex={-1}>
        {props.mode === "REVIEW"
          ? t("workspace.reviewSubmit")
          : props.isDemoIncident && sourcePersonName
            ? locale === "hi"
              ? `${sourcePersonName} ने हमें क्या बताया`
              : `What ${sourcePersonName} told us`
          : props.mode === "READY"
            ? t("workspace.yourInformation")
            : t("workspace.tell")}
      </h1>
      <p className="pane-intro">
        {props.isDemoIncident && showingCaseFile
          ? locale === "hi"
            ? `${sourcePersonName ?? "नागरिक"} का पूरा बयान और उससे जुड़े सिंथेटिक सबूत।`
            : "The full statement and synthetic evidence provided for this case."
          : props.mode === "REVIEW" || props.mode === "READY"
          ? t("workspace.reviewIntro")
          : locale === "hi"
            ? "घटना अपने शब्दों में बताएं। रिपोर्ट की श्रेणी जानना जरूरी नहीं है।"
            : "Describe the incident in your own words. You don't need to know the report category."}
      </p>

      {props.mode !== "REVIEW" && props.experienceMode !== "DEMO_CASE" ? (
        <div className="incident-composer">
          {!props.draft ? (
            <aside className="before-you-begin" aria-labelledby="before-you-begin-heading">
              <h2 id="before-you-begin-heading">{locale === "hi" ? "शुरू करने से पहले" : "Before you begin"}</h2>
              <ul>
                <li>{locale === "hi" ? "जमा करने से पहले आप शिकायत की जानकारी जाँचेंगे।" : "You will review the complaint details before submitting."}</li>
                <li>{locale === "hi" ? "जरूरी जानकारी साफ़ न हो तो सचेत अनुमान लगाने के बजाय पूछता है।" : "If an important detail is unclear, सचेत asks instead of guessing."}</li>
                <li>{locale === "hi" ? "पासवर्ड, OTP, PIN या CVV न लिखें।" : "Do not enter passwords, OTPs, PINs or CVVs."}</li>
              </ul>
              <p>{locale === "hi" ? "यह प्रोटोटाइप NCRP को जानकारी जमा नहीं करता।" : "This prototype does not submit information to NCRP."}</p>
            </aside>
          ) : null}
          <fieldset className="report-method-fieldset">
            <legend>{locale === "hi" ? "बयान" : "Statement"}</legend>
            <div className="report-method-switch">
              <button
                type="button"
                aria-pressed={isSpeakMode}
                disabled={processing || props.isRecording}
                onClick={() => props.onReportMethodChange("SPEAK")}
              >
                {locale === "hi" ? "बोलें" : "Speak"}
              </button>
              <button
                type="button"
                aria-pressed={!isSpeakMode}
                disabled={processing || props.isRecording}
                onClick={() => props.onReportMethodChange("TYPE")}
              >
                {locale === "hi" ? "लिखें" : "Type"}
              </button>
            </div>
          </fieldset>

          {isSpeakMode ? (
            <div
              className={`voice-capture-surface${props.isRecording ? " voice-capture-recording" : ""}`}
            >
              {props.isRecording ? (
                <>
                  <p className="voice-status" role="status" aria-live="polite">
                    {locale === "hi" ? "सुन रहे हैं…" : "Listening…"}
                  </p>
                  <RecordingWaveform levels={props.recordingLevels} />
                  <strong className="voice-timer">{recordingTime}</strong>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={props.onStopRecording}
                  >
                    {t("workspace.stopRecording")}
                  </button>
                </>
              ) : props.isTranscribing ? (
                <div
                  className="voice-processing"
                  role="status"
                  aria-live="polite"
                >
                  <span className="loading-marker" aria-hidden="true" />
                  <strong>
                    {locale === "hi"
                      ? "रिकॉर्डिंग को लिखा जा रहा है…"
                      : "Turning your recording into text…"}
                  </strong>
                  <p>
                    {locale === "hi"
                      ? "लंबी रिकॉर्डिंग में थोड़ा अधिक समय लग सकता है।"
                      : "Longer recordings may take a little more time."}
                  </p>
                </div>
              ) : props.transcription ? (
                <div className="voice-transcript-editor">
                  <h2>{locale === "hi" ? "आपका बयान" : "Your statement"}</h2>
                  {editingTranscript ? (
                    <textarea
                      value={props.transcription.originalTranscript}
                      onChange={(event) => {
                        updateTranscript(event.target.value);
                        growTextarea(event.currentTarget);
                      }}
                      rows={6}
                      maxLength={8000}
                      aria-label={
                        locale === "hi"
                          ? "रिकॉर्डिंग का लिखित रूप संपादित करें"
                          : "Edit recording transcript"
                      }
                    />
                  ) : props.draft ? (
                    <details className="compact-source-disclosure voice-transcript-compact">
                      <summary>
                        <span>
                          {languageLabel(props.transcription.languageCode)} ·{" "}
                          {recordingTime}
                        </span>
                        <strong>
                          {locale === "hi"
                            ? "लिखित रूप देखें"
                            : "View transcript"}
                        </strong>
                      </summary>
                      <p>{props.transcription.originalTranscript}</p>
                    </details>
                  ) : (
                    <p>{props.transcription.originalTranscript}</p>
                  )}
                  <div className="voice-transcript-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setEditingTranscript((current) => !current)
                      }
                    >
                      {editingTranscript
                        ? locale === "hi"
                          ? "संपादन पूरा"
                          : "Finish editing"
                        : locale === "hi"
                          ? "लिखित रूप बदलें"
                          : "Edit text"}
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setEditingTranscript(false);
                        props.onRecordAgain();
                      }}
                    >
                      {t("workspace.recordAgain")}
                    </button>
                  </div>
                </div>
              ) : props.hasAudio ? (
                <div className="voice-processing">
                  <strong>
                    {locale === "hi"
                      ? "रिकॉर्डिंग सुरक्षित है"
                      : "Recording saved"}
                  </strong>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={props.onRecordAgain}
                  >
                    {t("workspace.recordAgain")}
                  </button>
                </div>
              ) : (
                <>
                  <span className="voice-microphone" aria-hidden="true">
                    <MicrophoneIcon />
                  </span>
                  <h2>{locale === "hi" ? "बोलकर बताएं" : "Speak"}</h2>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={processing}
                    onClick={props.onStartRecording}
                  >
                    {t("workspace.startRecording")}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="typed-incident-input">
              <label htmlFor="incident-narrative">
                {t("workspace.whatHappened")}
              </label>
              <textarea
                id="incident-narrative"
                data-report-field-id="incident-narrative"
                rows={7}
                value={props.narrative}
                disabled={processing}
                onChange={(event) => {
                  props.onNarrativeChange(event.target.value);
                  growTextarea(event.currentTarget);
                }}
                placeholder={
                  locale === "hi"
                    ? "उदाहरण: कल मुझे KYC का संदेश मिला और ₹5,000 डेबिट हो गए…"
                    : "Example: I received a KYC message yesterday and ₹5,000 was debited…"
                }
                maxLength={8000}
              />
            </div>
          )}

          <section
            className="composer-evidence"
            aria-labelledby="composer-evidence-heading"
          >
            <div>
              <h2 id="composer-evidence-heading">{t("workspace.evidence")}</h2>
              <p>
                {locale === "hi"
                  ? "उपलब्ध हो तो मददगार"
                  : "Helpful if available"}
              </p>
            </div>
            <p>
              {locale === "hi"
                ? "संदेशों, भुगतान रसीदों या अकाउंट सूचनाओं के स्क्रीनशॉट जोड़ें।"
                : "Add screenshots of messages, payment receipts or account notifications."}
            </p>
            <label
              className="evidence-add-button"
              htmlFor="incident-screenshots"
              data-report-field-id="source-evidence"
              tabIndex={0}
              role="button"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  document
                    .querySelector<HTMLInputElement>("#incident-screenshots")
                    ?.click();
                }
              }}
            >
              <span aria-hidden="true">＋</span> {t("workspace.addEvidence")}
            </label>
            <input
              id="incident-screenshots"
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={processing}
              onChange={props.onScreenshotsChange}
            />
            <EvidenceRows
              screenshots={props.screenshots}
              draft={props.draft}
              isDemoIncident={false}
              demoCase={null}
              onRemoveScreenshot={props.onRemoveScreenshot}
            />
          </section>
          <p className="composer-safety">{t("workspace.safety")}</p>
          {!props.draft ? (
            <button
              className="primary-button input-prepare-action"
              type="button"
              disabled={
                processing ||
                props.isRecording ||
                props.isTranscribing ||
                !(
                  props.narrative.trim() ||
                  props.hasAudio ||
                  props.screenshots.length > 0
                )
              }
              onClick={props.onOrganizeReport}
            >
              {t("workspace.organise")}
            </button>
          ) : null}
        </div>
      ) : props.mode === "REVIEW" ? (
        <p className="review-source-intro">{t("workspace.reviewIntro")}</p>
      ) : null}

      {props.experienceMode === "DEMO_CASE" || props.mode === "REVIEW" ? (
        <SourceSummary
          narrative={props.narrative}
          transcription={props.transcription}
          screenshots={props.screenshots}
          draft={props.draft}
          isDemoIncident={props.isDemoIncident}
          demoCase={props.demoCase}
          recordingSeconds={props.recordingSeconds}
          demoNarrationLanguage={props.demoNarrationLanguage}
          onDemoNarrationLanguageChange={props.onDemoNarrationLanguageChange}
          onRemoveScreenshot={props.onRemoveScreenshot}
          compact={props.mode === "REVIEW" || Boolean(props.draft)}
        />
      ) : null}
      {props.unavailableEvidenceNames.length > 0 ? (
        <aside className="evidence-reattach-note" role="status">
          <strong>
            {locale === "hi" ? "सबूत दोबारा जोड़ें" : "Reattach saved evidence"}
          </strong>
          <p>
            {locale === "hi"
              ? `ब्राउज़र फ़ाइल सुरक्षित नहीं रख सका: ${props.unavailableEvidenceNames.join(", ")}`
              : `The browser saved the file details, but not the files: ${props.unavailableEvidenceNames.join(", ")}`}
          </p>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              document
                .querySelector<HTMLInputElement>("#incident-screenshots")
                ?.click()
            }
          >
            {locale === "hi" ? "फ़ाइलें दोबारा जोड़ें" : "Reattach files"} →
          </button>
        </aside>
      ) : null}
      {props.isDraftSaved && props.mode !== "REVIEW" ? (
        <p className="draft-saved-indicator" role="status">
          {locale === "hi"
            ? "प्रगति इस डिवाइस पर सुरक्षित है"
            : "Progress saved on this device"}
        </p>
      ) : null}
      {props.formError && props.mode !== "ERROR" ? (
        <p className="form-error" role="alert">
          {props.formError}
        </p>
      ) : null}
      </div>
    </section>
  );
}

function MissingFieldEditor({
  field,
  value,
  onChange,
  onSave,
}: {
  field: ReportFieldView;
  value: string;
  onChange: (value: string) => void;
  onSave: (fallback?: string) => void;
}) {
  const { locale, t } = useI18n();
  const question = field.missingQuestion;
  const [chooseAnotherYear, setChooseAnotherYear] = useState(false);
  const [showOtherCompromiseBasis, setShowOtherCompromiseBasis] =
    useState(false);
  if (!question) return null;

  const whyNeeded = (() => {
    switch (question.field) {
      case "transactionIdOrUtr":
        return locale === "hi"
          ? "इससे शिकायत में सही भुगतान की पहचान करने में मदद मिलती है।"
          : "This helps identify the exact payment in the complaint.";
      case "accountOrUpiId":
        return locale === "hi"
          ? "इससे यह स्पष्ट होता है कि भुगतान के लिए कौन-सा खाता या UPI आईडी इस्तेमाल हुआ।"
          : "This identifies the account or UPI ID used for the payment.";
      case "transactionDate":
        return locale === "hi"
          ? "तारीख से भुगतान रिकॉर्ड को बैंक या UPI विवरण से मिलाने में मदद मिलती है।"
          : "The date helps match this payment with the bank or UPI record.";
      case "affectedAccount":
      case "platform":
        return locale === "hi"
          ? "इससे शिकायत में प्रभावित अकाउंट या प्रोफ़ाइल की सही पहचान होती है।"
          : "This identifies the account or profile affected by the incident.";
      default:
        return null;
    }
  })();

  if (question.field === "incidentDateYear") {
    const suggestedYear = new Date().getFullYear();
    return (
      <div
        className="report-missing-editor"
        data-missing-field={question.field}
        data-report-field-id={field.id}
      >
        <p className="partial-date-value">{field.value}</p>
        <p className="report-field-state">
          {locale === "hi" ? "पुष्टि जरूरी है" : "Needs confirmation"}
        </p>
        <p>
          {locale === "hi"
            ? `क्या यह ${field.value} ${suggestedYear} की घटना है?`
            : `Was this ${field.value} ${suggestedYear}?`}
        </p>
        <div className="inline-field-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSave(String(suggestedYear))}
          >
            {t("field.yes")}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => setChooseAnotherYear(true)}
          >
            {locale === "hi" ? "दूसरा साल चुनें" : "Choose another year"}
          </button>
        </div>
        {chooseAnotherYear ? (
          <div className="year-confirmation-input">
            <label htmlFor="missing-incidentDateYear">
              {locale === "hi" ? "साल" : "Year"}
            </label>
            <input
              id="missing-incidentDateYear"
              type="number"
              min="2000"
              max="2100"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
            <button
              className="primary-button"
              type="button"
              disabled={!value.trim()}
              onClick={() => onSave()}
            >
              {locale === "hi" ? "सहेजें और आगे बढ़ें" : "Save and continue"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (
    question.field === "recoveryInformationChanged" ||
    question.field === "moneyLost" ||
    question.field === "delayInReporting" ||
    question.field === "requestedAmountPaymentStatus"
  ) {
    return (
      <div
        className="report-missing-editor"
        data-missing-field={question.field}
        data-report-field-id={field.id}
      >
        <p className="report-field-state">
          {locale === "hi" ? question.questionHi : question.question}
        </p>
        <div className="inline-field-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSave("yes")}
          >
            {question.field === "requestedAmountPaymentStatus"
              ? locale === "hi"
                ? "हाँ"
                : "Yes"
              : question.field === "moneyLost"
              ? locale === "hi"
                ? "हाँ, पैसे दिए या डेबिट हुए"
                : "Yes, money was paid or debited"
              : t("field.yes")}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSave("no")}
          >
            {question.field === "requestedAmountPaymentStatus"
              ? locale === "hi"
                ? "नहीं"
                : "No"
              : t("field.no")}
          </button>
          {question.field === "moneyLost" ||
          question.field === "requestedAmountPaymentStatus" ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => onSave("unknown")}
            >
              {question.field === "requestedAmountPaymentStatus"
                ? locale === "hi"
                  ? "मुझे याद नहीं"
                  : "I don’t remember"
                : locale === "hi"
                  ? "मुझे पक्का नहीं पता"
                  : "I'm not sure"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (question.field === "accountCompromiseBasis") {
    const options =
      locale === "hi"
        ? [
            "रिकवरी जानकारी बदल गई",
            "अनजान लॉगिन या सुरक्षा चेतावनी",
            "मेरी जानकारी के बिना संदेश या सेटिंग बदली",
            "मैं केवल पासवर्ड भूल गया/गई",
          ]
        : [
            "Recovery details changed",
            "Unfamiliar login or security alert",
            "Messages or settings changed without me",
            "I simply forgot the password",
          ];
    return (
      <div
        className="report-missing-editor"
        data-missing-field={question.field}
        data-report-field-id={field.id}
      >
        <p className="report-field-state">
          {locale === "hi" ? question.questionHi : question.question}
        </p>
        <div className="clarification-options">
          {options.map((option) => (
            <button
              className="secondary-button"
              type="button"
              key={option}
              onClick={() => onSave(option)}
            >
              {option}
            </button>
          ))}
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowOtherCompromiseBasis(true)}
          >
            {locale === "hi" ? "कुछ और" : "Something else"}
          </button>
        </div>
        {showOtherCompromiseBasis ? (
          <div className="year-confirmation-input">
            <label htmlFor="missing-accountCompromiseBasis">
              {locale === "hi" ? "क्या हुआ?" : "What happened?"}
            </label>
            <input
              id="missing-accountCompromiseBasis"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
            <button
              className="primary-button"
              type="button"
              disabled={!value.trim()}
              onClick={() => onSave()}
            >
              {locale === "hi" ? "सहेजें और आगे बढ़ें" : "Save and continue"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const inputId = `missing-${field.id}`;
  const reasonId = `${inputId}-reason`;
  const helperId = `${inputId}-help`;
  const isTransactionReference = question.field === "transactionIdOrUtr";

  return (
    <div
      className="report-missing-editor"
      data-missing-field={question.field}
      data-report-field-id={field.id}
    >
      {isTransactionReference ? (
        <p className="report-field-state">
          {locale === "hi"
            ? "लेन-देन संदर्भ नहीं मिला"
            : "Transaction reference not found"}
        </p>
      ) : null}
      <label htmlFor={inputId}>
        {locale === "hi" ? question.questionHi : question.question}
      </label>
      {isTransactionReference && whyNeeded ? (
        <p className="report-field-help clarification-reason" id={reasonId}>
          {whyNeeded}
        </p>
      ) : null}
      <input
        id={inputId}
        type={question.inputType}
        value={value}
        aria-describedby={[
          isTransactionReference && whyNeeded ? reasonId : null,
          field.helpText && !isTransactionReference ? helperId : null,
        ].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.helpText && !isTransactionReference ? (
        <p className="report-field-help" id={helperId}>{field.helpText}</p>
      ) : null}
      {whyNeeded && !isTransactionReference ? (
        <details className="field-help-disclosure field-why-needed">
          <summary>
            {locale === "hi" ? "यह क्यों जरूरी है?" : "Why is this needed?"}
          </summary>
          <p>{whyNeeded}</p>
        </details>
      ) : null}
      {isTransactionReference ? (
        <details className="field-help-disclosure">
          <summary>
            {locale === "hi" ? "यह कहाँ मिलेगा?" : "Where do I find this?"}
          </summary>
          <div className="field-help-content">
            <h4>
              {locale === "hi"
                ? "लेन-देन संदर्भ कहाँ मिलेगा?"
                : "Where can I find the transaction reference?"}
            </h4>
            <p>
              {locale === "hi"
                ? "अपने बैंकिंग या UPI ऐप में भुगतान खोलें। UTR, Transaction ID या Reference number देखें। अलग-अलग ऐप में शब्द अलग हो सकते हैं।"
                : "Open the payment in your banking or UPI app. Look for UTR, Transaction ID or Reference number. The wording can vary by bank or app."}
            </p>
            <svg
              className="utr-example"
              viewBox="0 0 360 210"
              role="img"
              aria-label={
                locale === "hi"
                  ? "उदाहरण लेन-देन में UTR की जगह"
                  : "Example transaction showing where the UTR appears"
              }
            >
              <rect x="1" y="1" width="358" height="208" rx="12" />
              <text x="22" y="30">
                {locale === "hi" ? "उदाहरण लेन-देन" : "Example transaction"}
              </text>
              <text x="22" y="60">
                {locale === "hi" ? "भुगतान सफल" : "Payment successful"}
              </text>
              <text x="270" y="60">
                ₹15,000
              </text>
              <text x="22" y="94">
                {locale === "hi" ? "तारीख" : "Date"}
              </text>
              <text x="230" y="94">
                3 Sep 2026
              </text>
              <rect
                className="utr-example-highlight"
                x="14"
                y="124"
                width="332"
                height="56"
                rx="8"
              />
              <text x="22" y="146">
                {locale === "hi"
                  ? "लेन-देन संदर्भ / UTR"
                  : "Transaction reference / UTR"}
              </text>
              <text x="22" y="169">
                123456789012
              </text>
              <text x="245" y="169">
                ← {locale === "hi" ? "इसे देखें" : "Look for this"}
              </text>
            </svg>
            <p>
              {locale === "hi"
                ? "नहीं मिल रहा? ‘मेरे पास यह नहीं है’ चुनकर आगे बढ़ें।"
                : "Can't find it? You can continue with ‘I don’t have this’."}
            </p>
          </div>
        </details>
      ) : null}
      <div className="inline-field-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!value.trim()}
          onClick={() => onSave()}
        >
          {isTransactionReference
            ? locale === "hi" ? "लेन-देन संदर्भ जोड़ें" : "Add transaction reference"
            : locale === "hi" ? "सहेजें और आगे बढ़ें" : "Save and continue"}
        </button>
        {UNAVAILABLE_QUESTION_FIELDS.has(question.field) ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSave(CITIZEN_DOES_NOT_HAVE)}
          >
            {locale === "hi"
              ? "मेरे पास यह नहीं है"
              : "I don’t have this"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReportFieldRow({
  field,
  missingValue,
  onMissingValueChange,
  onSaveMissing,
  narrativeEditing,
  onNarrativeEdit,
}: {
  field: ReportFieldView;
  missingValue: string;
  onMissingValueChange: (value: string) => void;
  onSaveMissing: (fallback?: string) => void;
  narrativeEditing: boolean;
  onNarrativeEdit: () => void;
}) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const showSource =
    SOURCE_VISIBLE_FIELD_IDS.has(field.id) ||
    /^transaction-(?:total|\d+-amount)$/.test(field.id) ||
    field.source === t("field.fromConfirmation") ||
    field.source === "Confirmed by you" ||
    field.source === "आपने पुष्टि की";
  const copyable =
    /^transaction-\d+-(utr|reference)$/.test(field.id) ||
    /^(suspect-\d+)$/.test(field.id);
  if (field.missingQuestion) {
    const isPartialDate = field.missingQuestion.field === "incidentDateYear";
    return (
      <div
        className="report-field report-field-missing"
        data-field-id={field.id}
        data-report-field-id={field.id}
      >
        <p className="report-field-label">{field.label}</p>
        {!isPartialDate ? (
          <p className="report-field-state">{t("field.needsInput")}</p>
        ) : null}
        <MissingFieldEditor
          field={field}
          value={missingValue}
          onChange={onMissingValueChange}
          onSave={onSaveMissing}
        />
      </div>
    );
  }

  return (
    <div
      className="report-field"
      data-field-id={field.id}
      data-report-field-id={field.id}
    >
      <p className="report-field-label">{field.label}</p>
      <p className="report-field-value">
        {field.value}
        {field.state === "READY" ? (
          <span className="ready-mark" aria-label={t("field.ready")}>
            ✓
          </span>
        ) : null}
      </p>
      {field.helpText ? (
        <p className="report-field-help">{field.helpText}</p>
      ) : null}
      {field.source && showSource ? (
        <p className="report-field-source">{field.source}</p>
      ) : null}
      {field.source && showSource ? (
        <details className="field-provenance-disclosure">
          <summary>
            {locale === "hi"
              ? "यह रिपोर्ट में क्यों है?"
              : "Why is this in my report?"}
          </summary>
          <p>
            {locale === "hi" ? "यह जानकारी यहाँ मिली:" : "Found in:"}{" "}
            {field.source}.{" "}
            {locale === "hi"
              ? "जमा करने से पहले आप इसे बदल सकते हैं।"
              : "You can change this before submitting."}
          </p>
        </details>
      ) : null}
      {copyable && field.state !== "NOT_PROVIDED_OPTIONAL" ? (
        <button
          className="text-button field-copy-button"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(field.value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied
            ? locale === "hi"
              ? "कॉपी हो गया"
              : "Copied"
            : locale === "hi"
              ? "कॉपी करें"
              : "Copy"}
        </button>
      ) : null}
      {field.kind === "NARRATIVE" && !narrativeEditing ? (
        <button
          className="text-button field-edit-button"
          type="button"
          onClick={onNarrativeEdit}
        >
          {t("field.edit")}
        </button>
      ) : null}
    </div>
  );
}

function NarrativeEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const { locale, t } = useI18n();
  const [narrative, setNarrative] = useState(value);

  return (
    <div className="report-inline-edit">
      <label className="visually-hidden" htmlFor="edit-incident-narrative">
        {t("field.description")}
      </label>
      <textarea
        id="edit-incident-narrative"
        rows={6}
        value={narrative}
        onChange={(event) => setNarrative(event.target.value)}
      />
      <div className="inline-field-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => onSave(narrative)}
        >
          {t("field.save")}
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          {t("field.cancel")}
        </button>
      </div>
    </div>
  );
}

function SectionEditor({
  groupId,
  draft,
  onSave,
  onCancel,
}: {
  groupId: ReportGroupView["id"];
  draft: IncidentDraft;
  onSave: (draft: IncidentDraft, confirmedFields: string[]) => void;
  onCancel: () => void;
}) {
  const { locale, t } = useI18n();
  const hi = locale === "hi";
  const [working, setWorking] = useState(() => structuredClone(draft));
  const numberValue = (value: string) => {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const editableValue = (value: string | null) =>
    citizenVisibleValue(value) ?? "";
  const controls: ReactNode[] = [];

  if (groupId === "INCIDENT") {
    controls.push(
      <label key="date">
        {hi ? "घटना की तारीख" : "Incident date"}
        <input
          type="date"
          value={working.incident.incidentDate ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              incident: {
                ...current.incident,
                incidentDate: event.target.value || null,
              },
            }))
          }
        />
      </label>,
      <label key="time">
        {hi ? "लगभग समय" : "Approximate time"}
        <input
          value={editableValue(working.incident.approximateTime)}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              incident: {
                ...current.incident,
                approximateTime: event.target.value || null,
              },
            }))
          }
        />
      </label>,
      <label key="channel">
        {hi ? "माध्यम" : "Communication channel"}
        <input
          value={editableValue(working.incident.occurredOn)}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              incident: {
                ...current.incident,
                occurredOn: event.target.value || null,
              },
            }))
          }
        />
      </label>,
    );
  } else if (groupId === "TRANSACTIONS") {
    controls.push(
      ...working.transactions.map((transaction, index) => (
        <fieldset className="section-edit-fieldset" key={transaction.id}>
          <legend>
            {hi ? `लेन-देन ${index + 1}` : `Transaction ${index + 1}`}
          </legend>
          <label>
            {hi ? "राशि" : "Amount"}
            <input
              inputMode="decimal"
              value={transaction.amount ?? ""}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, amount: numberValue(event.target.value) }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <label>
            {hi ? "बैंक या भुगतान संस्था" : "Bank / payment institution"}
            <input
              value={editableValue(transaction.institution)}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, institution: event.target.value || null }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <label>
            {hi ? "खाता / वॉलेट / UPI ID" : "Account / wallet / UPI ID"}
            <input
              value={editableValue(transaction.accountOrUpiId)}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, accountOrUpiId: event.target.value || null }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <label>
            {hi ? "लेन-देन संदर्भ / UTR" : "Transaction reference / UTR"}
            <input
              value={editableValue(transaction.transactionIdOrUtr)}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          transactionIdOrUtr: event.target.value || null,
                        }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <label>
            {hi ? "तारीख" : "Date"}
            <input
              type="date"
              value={transaction.transactionDate ?? ""}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, transactionDate: event.target.value || null }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <label>
            {hi ? "लगभग समय" : "Approximate time"}
            <input
              value={editableValue(transaction.approximateTime)}
              onChange={(event) =>
                setWorking((current) => ({
                  ...current,
                  transactions: current.transactions.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, approximateTime: event.target.value || null }
                      : item,
                  ),
                }))
              }
            />
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setWorking((current) => ({
                ...current,
                transactions: current.transactions.filter(
                  (_, itemIndex) => itemIndex !== index,
                ),
              }))
            }
          >
            {hi ? "लेन-देन हटाएँ" : "Remove transaction"}
          </button>
        </fieldset>
      )),
    );
    controls.push(
      <button
        key="add"
        className="secondary-button"
        type="button"
        onClick={() =>
          setWorking((current) => {
            let suffix = current.transactions.length + 1;
            while (
              current.transactions.some(
                (item) => item.id === `manual-transaction-${suffix}`,
              )
            )
              suffix += 1;
            return {
              ...current,
              transactions: [
                ...current.transactions,
                {
                  id: `manual-transaction-${suffix}`,
                  institution: null,
                  currency: "INR",
                  paymentMethod: null,
                  accountOrUpiId: null,
                  transactionIdOrUtr: null,
                  amount: null,
                  transactionDate: null,
                  approximateTime: null,
                  referenceNumber: null,
                  status: "MISSING",
                },
              ],
            };
          })
        }
      >
        {hi ? "लेन-देन जोड़ें" : "Add transaction"}
      </button>,
    );
  } else if (groupId === "ACCOUNT_SYSTEM") {
    const platformConfig = getPlatformConfig(working.adaptiveFacts.platform);
    controls.push(
      <label key="platform">
        {hi ? "प्रभावित प्लेटफ़ॉर्म" : "Affected platform"}
        <input
          value={working.adaptiveFacts.platform ?? ""}
          onChange={(event) => {
            const platform = event.target.value || null;
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                platform,
                affectedPlatforms: platform ? [platform] : [],
                entityRelationship:
                  current.adaptiveFacts.messageSourcePlatforms.length > 0
                    ? null
                    : current.adaptiveFacts.entityRelationship,
                platformType: platform
                  ? getPlatformConfig(platform).platformType
                  : null,
              },
            }));
          }}
        />
      </label>,
      <label key="account">
        {hi ? "खाता या प्रोफ़ाइल नाम / ID" : platformConfig.identifierLabel}
        <input
          value={working.adaptiveFacts.affectedAccount ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                affectedAccount: event.target.value || null,
              },
            }))
          }
        />
        <small>{hi ? "यदि उपलब्ध हो तो उपयोगी" : "Helpful if available"}</small>
      </label>,
      ...(platformConfig.urlLabel
        ? [
            <label key="url">
              {hi ? "प्रोफ़ाइल या खाते का URL" : platformConfig.urlLabel}
              <input
                type="url"
                value={working.adaptiveFacts.profileUrl ?? ""}
                onChange={(event) =>
                  setWorking((current) => ({
                    ...current,
                    adaptiveFacts: {
                      ...current.adaptiveFacts,
                      profileUrl: event.target.value || null,
                    },
                  }))
                }
              />
              <small>
                {hi ? "यदि उपलब्ध हो तो उपयोगी" : "Helpful if available"}
              </small>
            </label>,
          ]
        : []),
      <label key="access">
        {hi ? "खाते तक पहुँच" : "Account access status"}
        <input
          value={working.adaptiveFacts.accountAccessStatus ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                accountAccessStatus: event.target.value || null,
              },
            }))
          }
        />
      </label>,
    );
  } else if (groupId === "THREAT_IMPERSONATION") {
    controls.push(
      <label key="demand">
        {hi ? "मांगी गई राशि" : "Amount demanded"}
        <input
          inputMode="decimal"
          value={working.adaptiveFacts.demandedAmount ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                demandedAmount: numberValue(event.target.value),
              },
            }))
          }
        />
      </label>,
      <label key="threat-channel">
        {hi ? "धमकी का माध्यम" : "Threat channel"}
        <input
          value={working.adaptiveFacts.threatChannel ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                threatChannel: event.target.value || null,
              },
            }))
          }
        />
      </label>,
      <label key="entity">
        {hi ? "दावा की गई पहचान" : "Claimed identity or organisation"}
        <input
          value={working.adaptiveFacts.impersonatedEntity ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                impersonatedEntity: event.target.value || null,
              },
            }))
          }
        />
      </label>,
      <label key="description">
        {hi ? "धमकी का विवरण" : "Threat description"}
        <textarea
          rows={4}
          value={working.adaptiveFacts.threatDescription ?? ""}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                threatDescription: event.target.value || null,
              },
            }))
          }
        />
      </label>,
    );
  } else if (groupId === "INFORMATION") {
    controls.push(
      <label key="requested">
        {hi ? "मांगी गई जानकारी" : "Information requested"}
        <input
          value={working.adaptiveFacts.requestedSensitiveInfo.join(", ")}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                requestedSensitiveInfo: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
            }))
          }
        />
      </label>,
      <label key="shared">
        {hi ? "साझा की गई जानकारी" : "Information shared"}
        <input
          value={working.adaptiveFacts.sharedSensitiveInfo.join(", ")}
          onChange={(event) =>
            setWorking((current) => ({
              ...current,
              adaptiveFacts: {
                ...current.adaptiveFacts,
                sharedSensitiveInfo: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
            }))
          }
        />
      </label>,
    );
  }

  const confirmedFields =
    groupId === "TRANSACTIONS"
      ? working.transactions.flatMap((_, index) =>
          [
            "amount",
            "institution",
            "accountOrUpiId",
            "transactionIdOrUtr",
            "transactionDate",
            "approximateTime",
          ].map((field) => `transactions.${index}.${field}`),
        )
      : groupId === "ACCOUNT_SYSTEM"
        ? [
            "adaptive.platform",
            "adaptive.affectedPlatforms",
            "adaptive.platformType",
            "adaptive.affectedAccount",
            "adaptive.profileUrl",
            "adaptive.accountAccessStatus",
          ]
        : groupId === "THREAT_IMPERSONATION"
          ? [
              "adaptive.demandedAmount",
              "adaptive.threatChannel",
              "adaptive.impersonatedEntity",
              "adaptive.threatDescription",
            ]
          : groupId === "INFORMATION"
            ? [
                "adaptive.requestedSensitiveInfo",
                "adaptive.sharedSensitiveInfo",
              ]
            : [
                "incident.incidentDate",
                "incident.incidentTime",
                "incident.communicationChannel",
              ];

  return (
    <div className="report-inline-edit section-inline-edit">
      {controls}
      <div className="inline-field-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => onSave(working, confirmedFields)}
        >
          {t("field.save")}
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          {t("field.cancel")}
        </button>
      </div>
    </div>
  );
}

function ReportGroup({
  group,
  draft,
  missingAnswers,
  onMissingAnswerChange,
  onSaveMissingAnswer,
  onDraftChange,
  showMissingEditors = true,
  screenshots,
  isDemoIncident,
  demoCase,
  blockingCount,
}: {
  group: ReportGroupView;
  draft: IncidentDraft;
  missingAnswers: Record<string, string>;
  onMissingAnswerChange: ReportWorkspaceProps["onMissingAnswerChange"];
  onSaveMissingAnswer: ReportWorkspaceProps["onSaveMissingAnswer"];
  onDraftChange: ReportWorkspaceProps["onDraftChange"];
  showMissingEditors?: boolean;
  screenshots: File[];
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
  blockingCount?: number;
}) {
  const { locale, t } = useI18n();
  const [narrativeEditing, setNarrativeEditing] = useState(false);
  const [sectionEditing, setSectionEditing] = useState(false);

  const saveSection = (nextDraft: IncidentDraft, confirmedFields: string[]) => {
    onDraftChange({
      ...nextDraft,
      incident:
        group.id === "TRANSACTIONS"
          ? { ...nextDraft.incident, citizenConfirmedLoss: null }
          : nextDraft.incident,
      citizenConfirmedFields: Array.from(
        new Set([
          ...draft.citizenConfirmedFields.filter(
            (field) =>
              group.id !== "TRANSACTIONS" ||
              field !== "incident.citizenConfirmedLoss",
          ),
          ...confirmedFields,
        ]),
      ),
    });
    setSectionEditing(false);
  };

  const editSection = () => {
    if (group.id === "EVIDENCE_SUSPECT") {
      document
        .querySelector<HTMLElement>("[data-report-field-id='source-evidence']")
        ?.focus();
      document
        .querySelector<HTMLElement>("[data-report-field-id='source-evidence']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (group.id === "REPORTER") {
      document.querySelector<HTMLInputElement>("#reporter-name")?.focus();
      document
        .querySelector<HTMLInputElement>("#reporter-name")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSectionEditing(true);
  };

  const sectionHeading = (
    <div className="section-heading-with-action report-section-heading">
      <h2>{group.label}</h2>
      {blockingCount !== undefined ? (
        <span className="report-section-status">
          {blockingCount > 0
            ? `${blockingCount} ${t("workspace.actionNeeded")}`
            : `✓ ${t("workspace.complete")}`}
        </span>
      ) : null}
      <button
        className="text-button"
        type="button"
        onClick={editSection}
        aria-label={`${t("field.edit")} ${group.label}`}
      >
        <span aria-hidden="true">✎</span> {t("field.edit")}
      </button>
    </div>
  );

  const renderField = (item: ReportFieldView) =>
    item.missingQuestion && !showMissingEditors ? null : (
      <ReportFieldRow
        key={item.id}
        field={item}
        missingValue={
          item.missingQuestion
            ? (missingAnswers[item.missingQuestion.field] ?? "")
            : ""
        }
        onMissingValueChange={(value) => {
          if (item.missingQuestion)
            onMissingAnswerChange(item.missingQuestion.field, value);
        }}
        onSaveMissing={(fallback) => {
          if (item.missingQuestion)
            onSaveMissingAnswer(item.missingQuestion, fallback);
        }}
        narrativeEditing={narrativeEditing}
        onNarrativeEdit={() => setNarrativeEditing(true)}
      />
    );

  const allFields = group.sections.flatMap((section) => section.fields);
  const getField = (id: string) => allFields.find((field) => field.id === id);

  const editors = (
    <>
      {sectionEditing ? (
        <SectionEditor
          groupId={group.id}
          draft={draft}
          onSave={saveSection}
          onCancel={() => setSectionEditing(false)}
        />
      ) : null}
      {narrativeEditing && group.id === "INCIDENT" ? (
        <NarrativeEditor
          value={draft.incident.narrative ?? ""}
          onCancel={() => setNarrativeEditing(false)}
          onSave={(narrative) => {
            onDraftChange({
              ...draft,
              incident: { ...draft.incident, narrative: narrative || null },
              citizenConfirmedFields: Array.from(
                new Set([
                  ...draft.citizenConfirmedFields,
                  "incident.narrative",
                ]),
              ),
            });
            setNarrativeEditing(false);
          }}
        />
      ) : null}
    </>
  );

  if (group.id === "INCIDENT") {
    const subcategory = getField("subcategory");
    const date = getField("incident-date");
    const time = getField("incident-time");
    const channel = getField("occurred-on");
    const narrative = getField("incident-description");
    const reportedAmount = resolveFinancialLoss(draft).resolvedLoss ?? 0;
    const summaryIds = new Set([
      "subcategory",
      "incident-date",
      "incident-time",
      "occurred-on",
      "incident-description",
    ]);
    const supportingFields = allFields.filter(
      (field) => !summaryIds.has(field.id),
    );

    return (
      <div
        className="report-group report-group-incident"
        data-group-id={group.id}
      >
        {sectionHeading}
        {editors}
        <section className="incident-overview" aria-label={group.label}>
          <h3>{subcategory?.value}</h3>
          <div className="incident-overview-meta">
            {reportedAmount > 0 ? (
              <strong>
                {formatCurrency(reportedAmount)}{" "}
                {locale === "hi" ? "का नुकसान" : "lost"}
              </strong>
            ) : draft.classification.reportFamily === "FINANCIAL_FRAUD" &&
              draft.incident.financialLossState === "NO" ? (
              <strong>
                {locale === "hi" ? "पैसे गए: नहीं" : "Money lost: No"}
              </strong>
            ) : null}
            {draft.transactions.length > 0 ? (
              <span>
                {locale === "hi"
                  ? `${draft.transactions.length} लेन-देन`
                  : `${draft.transactions.length} ${draft.transactions.length === 1 ? "transaction" : "transactions"}`}
              </span>
            ) : null}
            <span>
              {locale === "hi" && channel?.value === "Multiple channels"
                ? "कई माध्यम"
                : channel?.value}
            </span>
            <span>
              {date?.value}
              {time?.value ? ` · ${time.value}` : ""}
            </span>
          </div>
        </section>
        {narrative ? (
          <section className="incident-description-block">
            <div className="section-heading-with-action">
              <h3>{narrative.label}</h3>
              {!narrativeEditing ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setNarrativeEditing(true)}
                >
                  {t("field.edit")} →
                </button>
              ) : null}
            </div>
            {!narrativeEditing ? <p>{narrative.value}</p> : null}
          </section>
        ) : null}
        {allFields.filter((field) => field.missingQuestion).map(renderField)}
        <details className="report-summary-disclosure">
          <summary>
            {t("workspace.officialDetails")} <span aria-hidden="true">→</span>
          </summary>
          <div className="report-summary-disclosure-content">
            {supportingFields
              .filter((field) => !field.missingQuestion)
              .map(renderField)}
          </div>
        </details>
      </div>
    );
  }

  if (group.id === "TRANSACTIONS") {
    const transactionSections = group.sections.filter(
      (section) =>
        section.id.startsWith("transaction-") &&
        section.id !== "transaction-summary",
    );
    const totalField = group.sections.find(
      (section) => section.id === "transaction-summary",
    )?.fields[0];
    return (
      <div
        className="report-group report-group-transactions"
        data-group-id={group.id}
      >
        {sectionHeading}
        {editors}
        {transactionSections.length > 1 && totalField
          ? renderField(totalField)
          : null}
        {transactionSections.map((section, index) => {
          const bySuffix = (suffix: string) =>
            section.fields.find((field) => field.id.endsWith(suffix));
          const amount = bySuffix("-amount");
          const institution = bySuffix("-institution");
          const date = bySuffix("-date");
          const time = bySuffix("-time");
          const secondary = section.fields.filter(
            (field) =>
              ![amount?.id, institution?.id, date?.id, time?.id].includes(
                field.id,
              ),
          );
          const summaryMissing = [amount, institution, date, time].filter(
            (field): field is ReportFieldView =>
              Boolean(field?.missingQuestion),
          );
          return (
            <section className="transaction-card" key={section.id}>
              <p className="transaction-label">
                {section.title ?? t("field.transaction", { number: index + 1 })}
              </p>
              <strong className="transaction-amount">{amount?.value}</strong>
              <p className="transaction-institution">{institution?.value}</p>
              <p className="transaction-date">
                {date?.value}
                {time?.value ? ` · ${time.value}` : ""}
              </p>
              {summaryMissing.map(renderField)}
              <div className="transaction-secondary-fields">
                {secondary.map(renderField)}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  if (group.id === "EVIDENCE_SUSPECT") {
    const evidenceFields =
      group.sections.find((section) => section.id === "evidence")?.fields ?? [];
    const evidenceFacts =
      group.sections.find((section) => section.id === "evidence-facts")
        ?.fields ?? [];
    const suspectFields = (
      group.sections.find((section) => section.id === "suspect")?.fields ?? []
    ).filter((field) => field.state !== "NOT_PROVIDED_OPTIONAL");
    const claimedIssue = evidenceFacts.find((field) =>
      /KYC|केवाईसी/i.test(field.value),
    );
    const transactionFound = evidenceFacts.find((field) =>
      field.value.includes("₹"),
    );
    return (
      <div
        className="report-group report-group-evidence"
        data-group-id={group.id}
      >
        {sectionHeading}
        <section className="evidence-prepared-summary">
          <p className="report-field-label">{t("field.evidenceSupplied")}</p>
          <strong>
            {t("workspace.evidenceItems", { count: evidenceFields.length })}
          </strong>
        </section>
        <EvidenceContributions
          draft={draft}
          screenshots={screenshots}
          isDemoIncident={isDemoIncident}
          demoCase={demoCase}
        />
        {suspectFields.length > 0 ? (
          <section className="information-found">
            <h3>{t("workspace.informationFound")}</h3>
            <div className="information-found-grid">
              {suspectFields.map(renderField)}
              {claimedIssue ? (
                <div className="report-field">
                  <p className="report-field-label">
                    {t("workspace.claimedIssue")}
                  </p>
                  <p className="report-field-value">
                    {claimedIssue.value} <span className="ready-mark">✓</span>
                  </p>
                </div>
              ) : null}
              {transactionFound ? (
                <div className="report-field">
                  <p className="report-field-label">
                    {t("workspace.transactionFound")}
                  </p>
                  <p className="report-field-value">
                    {transactionFound.value}{" "}
                    <span className="ready-mark">✓</span>
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        <details className="report-summary-disclosure">
          <summary>
            {t("workspace.fullEvidenceDetails")}{" "}
            <span aria-hidden="true">→</span>
          </summary>
          <div className="report-summary-disclosure-content">
            {evidenceFields.map(renderField)}
            {evidenceFacts.map(renderField)}
          </div>
        </details>
      </div>
    );
  }

  if (group.id === "REPORTER") {
    const name = getField("reporter-name");
    const mobile = getField("reporter-mobile");
    const state = getField("reporter-state");
    const district = getField("reporter-district");
    const city = getField("reporter-city");
    const conciseProfileIds = new Set([
      "reporter-name",
      "reporter-mobile",
      "reporter-email",
      "reporter-state",
      "reporter-district",
      "reporter-city",
    ]);
    return (
      <div
        className="report-group report-group-profile"
        data-group-id={group.id}
      >
        {sectionHeading}
        <section className="profile-primary-summary">
          <h3>{name?.value}</h3>
          <p>{name?.source}</p>
          <dl>
            <div>
              <dt>{mobile?.label}</dt>
              <dd>{mobile?.value}</dd>
            </div>
            <div>
              <dt>{state?.label}</dt>
              <dd>
                {[state?.value, district?.value ?? city?.value]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          </dl>
        </section>
        <details className="report-summary-disclosure">
          <summary>
            {t("workspace.fullProfile")} <span aria-hidden="true">→</span>
          </summary>
          <div className="report-summary-disclosure-content">
            {group.sections
              .filter((section) =>
                section.fields.some((field) => conciseProfileIds.has(field.id)),
              )
              .map((section) => (
                <section key={section.id} className="report-field-section">
                  {section.title ? <h3>{section.title}</h3> : null}
                  {section.fields
                    .filter((field) => conciseProfileIds.has(field.id))
                    .map(renderField)}
                </section>
              ))}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="report-group" data-group-id={group.id}>
      {sectionHeading}
      {editors}
      {group.sections.map((section) => {
        const fields = section.fields.map(renderField);
        if (section.id === "secondary-address") {
          return (
            <details
              key={section.id}
              className="report-field-section report-address-disclosure"
            >
              <summary>{section.title}</summary>
              {fields}
            </details>
          );
        }
        return (
          <section key={section.id} className="report-field-section">
            {section.title ? <h3>{section.title}</h3> : null}
            {fields}
          </section>
        );
      })}
    </div>
  );
}

function ReportReview(props: ReportWorkspaceProps) {
  const { locale, t } = useI18n();
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["INCIDENT", "TRANSACTIONS"]),
  );
  if (!props.draft) return null;
  const groups = deriveReportGroups(props.draft, {
    locale,
    profile: props.reporterProfile,
    identityDocumentProvided: props.identityDocumentProvided,
    displayStatement: props.transcription
      ? locale === "hi" && props.transcription.languageCode.startsWith("hi")
        ? props.transcription.originalTranscript
        : locale === "en" && props.transcription.englishTranscript
          ? props.transcription.englishTranscript
          : props.transcription.originalTranscript
      : props.narrative,
  });
  const complaint = buildNcrpCompatibleComplaint({
    draft: props.draft,
    profile: props.reporterProfile,
    transcription: props.transcription,
    typedNarrative: props.narrative,
    isDemoIncident: props.isDemoIncident,
    screenshotNames: props.isDemoIncident
      ? (props.demoCase?.evidence.map((item) => item.label) ?? [])
      : props.screenshots.map((file) => file.name),
    demoEvidencePaths: props.demoCase?.evidence.map((item) => item.src),
    identityDocumentProvided: props.identityDocumentProvided,
    declarationAccepted,
  });
  const sourceLabel = (sources: string[]) => {
    if (sources.length === 0) return "—";
    if (sources.includes("SIMULATED_PROFILE")) return t("field.fromProfile");
    if (sources.includes("USER_INPUT")) return t("profile.fromTest");
    if (sources.includes("USER_CONFIRMED")) return t("field.fromConfirmation");
    if (sources.includes("EVIDENCE")) return t("field.fromEvidence");
    if (sources.includes("VOICE") || sources.includes("TYPED"))
      return t("field.fromStatement");
    return t("field.fromShared");
  };
  const reviewTotal = resolveFinancialLoss(props.draft).resolvedLoss;
  const reporterDetailsReady = Boolean(
    props.reporterProfile.displayName.trim() &&
      props.reporterProfile.registeredMobile.trim() &&
      props.reporterProfile.state.trim() &&
      props.reporterProfile.district.trim(),
  );
  const updateProfileField = (
    field: "displayName" | "registeredMobile" | "email" | "state" | "district",
    value: string,
  ) => {
    props.onReporterProfileChange({
      ...props.reporterProfile,
      [field]: value,
      source: props.isDemoIncident ? "SIMULATED_NCRP_PROFILE" : "TEST_INPUT",
    });
  };
  const integrity = getCaseIntegritySummary(props.draft, {
    locale,
    isDemoIncident: props.isDemoIncident,
    screenshotNames: props.isDemoIncident
      ? (props.demoCase?.evidence.map((item) => item.label) ?? [])
      : props.screenshots.map((file) => file.name),
    demoEvidence: props.demoCase?.evidence,
  });
  const editGroup = (groupId: string) => {
    props.onBackToEdit();
    let attempts = 0;
    const openEditor = () => {
      const group = document.querySelector<HTMLElement>(
        `[data-group-id='${groupId}']`,
      );
      const button = group?.querySelector<HTMLButtonElement>(
        ".report-section-heading button",
      );
      if (button) {
        group?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
        button.focus();
        button.click();
        return;
      }
      attempts += 1;
      if (attempts < 12) window.setTimeout(openEditor, 40);
    };
    window.setTimeout(openEditor, 0);
  };

  return (
    <>
      <div className="report-pane-heading">
        <h2>{locale === "hi" ? "आपकी शिकायत" : "Your complaint"}</h2>
        <p>{t("workspace.reviewSupport")}</p>
      </div>
      <PreparedComplaintSummary
        draft={props.draft}
        reporterName={props.reporterProfile.displayName}
      />
      <section
        className="case-integrity-summary"
        aria-labelledby="case-check-heading"
      >
        <h2 id="case-check-heading">
          {integrity.unresolvedConflictCount > 0
            ? locale === "hi" ? "एक बात पर ध्यान देना है" : "Needs your attention"
            : locale === "hi" ? "जाँचने के लिए तैयार" : "Ready for you to review"}
        </h2>
        <ul>
          {integrity.transactionCount > 0 ? (
            <li>
              <span aria-hidden="true">✓</span>{" "}
              {locale === "hi"
                ? `${integrity.transactionCount} लेन-देन व्यवस्थित किए गए`
                : `${integrity.transactionCount} ${integrity.transactionCount === 1 ? "transaction" : "transactions"} organised`}
            </li>
          ) : null}
          {integrity.importantFactsLinkedToEvidence > 0 ? (
            <li>
              <span aria-hidden="true">✓</span>{" "}
              {locale === "hi"
                ? `सबूत ${integrity.importantFactsLinkedToEvidence} जरूरी जानकारियों से जुड़ा है`
                : `Evidence linked to ${integrity.importantFactsLinkedToEvidence} important details`}
            </li>
          ) : null}
          {integrity.unresolvedConflictCount === 0 ? (
            <li>
              <span aria-hidden="true">✓</span>{" "}
              {locale === "hi"
                ? "कोई अनसुलझा विरोध नहीं"
                : "Important complaint details are consistent"}
            </li>
          ) : (
            <li>
              {locale === "hi"
                ? `${integrity.unresolvedConflictCount} विरोध की पुष्टि बाकी है`
                : `${integrity.unresolvedConflictCount} ${integrity.unresolvedConflictCount === 1 ? "conflict needs" : "conflicts need"} confirmation`}
            </li>
          )}
        </ul>
        {integrity.unresolvedConflictCount === 0 ? (
          <p>
            {locale === "hi"
              ? "शिकायत की जरूरी जानकारी आपस में मेल खाती है। जो जानकारी आपके पास नहीं है, वह अनुपलब्ध के रूप में ही दर्ज रहेगी।"
              : "Important complaint details are consistent. Anything you don’t know remains marked as unavailable."}
          </p>
        ) : null}
        {integrity.unavailableImportantDetails.length > 0 ? (
          <p>
            <strong>
              {locale === "hi" ? "आपके पास नहीं" : "You don’t have"}
            </strong>
            <br />
            {integrity.unavailableImportantDetails.join(", ")}
          </p>
        ) : null}
      </section>
      <section
        className="case-knowledge-summary"
        aria-labelledby="what-we-know-heading"
      >
        <div>
          <h2 id="what-we-know-heading">
            {locale === "hi" ? "उपलब्ध जानकारी" : "Available information"}
          </h2>
          <ul>
            {integrity.knownFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        {integrity.stillUnknown.length > 0 ? (
          <div>
            <h2>
              {locale === "hi"
                ? "जानकारी उपलब्ध नहीं"
                : "Information not available"}
            </h2>
            <ul>
              {integrity.stillUnknown.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <div className="report-review-groups">
        {groups.filter((group) => group.id !== "REPORTER").map((group) => (
          <details
            key={group.id}
            className="report-review-group"
            open={openGroups.has(group.id)}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenGroups((current) => {
                if (current.has(group.id) === isOpen) return current;
                const next = new Set(current);
                if (isOpen) next.add(group.id);
                else next.delete(group.id);
                return next;
              });
            }}
          >
            <summary>
              <span>{group.label}</span>
              <strong aria-label={t("field.ready")}>✓</strong>
            </summary>
            <div className="report-review-group-content">
              <button
                className="text-button review-section-edit"
                type="button"
                onClick={() => editGroup(group.id)}
                aria-label={`${t("field.edit")} ${group.label}`}
              >
                <span aria-hidden="true">✎</span> {t("field.edit")}
              </button>
              {group.sections
                .filter(
                  (section) =>
                    section.id !== "secondary-address" &&
                    section.id !== "evidence-facts",
                )
                .flatMap((section) => section.fields)
                .map((item) => (
                  <div key={item.id} className="review-field-row">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
            </div>
          </details>
        ))}
      </div>
      <section className="review-reporter-details" aria-labelledby="review-reporter-heading">
        <div>
          <h2 id="review-reporter-heading">{locale === "hi" ? "शिकायत में अपनी जानकारी जोड़ें" : "Add your details to the complaint"}</h2>
          <p>{locale === "hi" ? "हम यह जानकारी तभी मांगते हैं जब घटना की जानकारी तैयार हो जाती है।" : "We ask for these only after the incident details are ready."}</p>
        </div>
        <div className="review-reporter-fields">
          <label>
            <span>{locale === "hi" ? "नाम" : "Name"}</span>
            <input id="reporter-name" data-report-field-id="reporter-name" autoComplete="name" value={props.reporterProfile.displayName} readOnly={props.isDemoIncident} onChange={(event) => {
              updateProfileField("displayName", event.target.value);
              props.onReporterNameChange(event.target.value);
            }} />
          </label>
          <label>
            <span>{locale === "hi" ? "मोबाइल नंबर" : "Mobile number"}</span>
            <input inputMode="tel" autoComplete="tel" value={props.reporterProfile.registeredMobile} readOnly={props.isDemoIncident} onChange={(event) => updateProfileField("registeredMobile", event.target.value)} />
          </label>
          <label>
            <span>{locale === "hi" ? "ईमेल" : "Email"}</span>
            <input type="email" autoComplete="email" value={props.reporterProfile.email} readOnly={props.isDemoIncident} onChange={(event) => updateProfileField("email", event.target.value)} />
          </label>
          <label>
            <span>{locale === "hi" ? "राज्य" : "State"}</span>
            <input autoComplete="address-level1" value={props.reporterProfile.state} readOnly={props.isDemoIncident} onChange={(event) => updateProfileField("state", event.target.value)} />
          </label>
          <label>
            <span>{locale === "hi" ? "जिला" : "District"}</span>
            <input autoComplete="address-level2" value={props.reporterProfile.district} readOnly={props.isDemoIncident} onChange={(event) => updateProfileField("district", event.target.value)} />
          </label>
        </div>
        {!reporterDetailsReady ? (
          <p className="form-error" role="status">{locale === "hi" ? "नाम, मोबाइल नंबर, राज्य और जिला भरें।" : "Enter your name, mobile number, state and district."}</p>
        ) : props.isDemoIncident ? (
          <p className="source-note">{locale === "hi" ? "सिंथेटिक डेमो जानकारी" : "Synthetic demo information"}</p>
        ) : null}
      </section>
      <details className="field-coverage-disclosure">
        <summary>
          <span>
            <strong>{t("workspace.coverage")}</strong>
            <small>{t("workspace.coverageIntroShort")}</small>
          </span>
          <span className="coverage-action">
            {t("workspace.coverageAction")}
          </span>
        </summary>
        <div className="field-coverage-content">
          <h3>{t("workspace.coverageHeading")}</h3>
          <p>{t("workspace.coverageIntro")}</p>
          <div
            className="field-coverage-table"
            role="table"
            aria-label={t("workspace.coverageHeading")}
          >
            <div className="field-coverage-header" role="row">
              <strong role="columnheader">
                {t("workspace.coverageInformation")}
              </strong>
              <strong role="columnheader">
                {t("workspace.coverageStatus")}
              </strong>
              <strong role="columnheader">
                {t("workspace.coverageSource")}
              </strong>
            </div>
            {NCRP_FIELD_DEFINITIONS.filter(
              (definition) =>
                definition.supportedInPrototype &&
                definition.id !== "declaration.accepted",
            )
              .filter((definition) =>
                complaintFieldApplies(complaint, definition),
              )
              .filter((definition) => {
                const status = complaintRequiredFieldStatus(
                  complaint,
                  definition,
                );
                return (
                  complaintFieldIsRequired(complaint, definition) ||
                  status !== "NOT_PROVIDED_OPTIONAL"
                );
              })
              .map((definition) => {
                const status = complaintRequiredFieldStatus(
                  complaint,
                  definition,
                );
                const path = definition.id.split(".");
                let current: unknown = complaint.groups;
                for (const part of path) {
                  if (current && typeof current === "object") {
                    current = (current as Record<string, unknown>)[part];
                  }
                }
                const sources =
                  current && typeof current === "object" && "sources" in current
                    ? (current as { sources: string[] }).sources
                    : ["EVIDENCE"];
                return (
                  <div
                    className="field-coverage-row"
                    role="row"
                    key={definition.id}
                  >
                    <span role="cell">{t(definition.labelKey)}</span>
                    <span
                      className={
                        status === "NOT_PROVIDED_OPTIONAL"
                          ? "coverage-optional"
                          : undefined
                      }
                      role="cell"
                    >
                      {status === "READY" || status === "CONFIRMED"
                        ? t("field.ready")
                        : status === "NOT_PROVIDED_OPTIONAL"
                          ? t("field.notProvided")
                          : status === "CITIZEN_DOES_NOT_HAVE"
                            ? t("field.notProvided")
                            : t("field.needsInput")}
                    </span>
                    <span role="cell">{sourceLabel(sources)}</span>
                  </div>
                );
              })}
          </div>
          <p className="source-note">
            {t("workspace.structureLabel")} · {complaint.schemaVersion}
          </p>
        </div>
      </details>
      <ComplaintPacket
        complaint={complaint}
        draft={props.draft}
        reference={props.reportReference}
        locale={locale}
        isDemoIncident={props.isDemoIncident}
      />
      <section
        className="before-submit-checkpoint"
        aria-labelledby="submit-checkpoint-heading"
      >
        <h2 id="submit-checkpoint-heading">
          {locale === "hi" ? "जमा करने के लिए तैयार" : "Ready to submit"}
        </h2>
        <dl>
          {reviewTotal ? (
            <div>
              <strong>{formatCurrency(reviewTotal)}</strong>
              <span>
                {locale === "hi" ? "रिपोर्ट की गई हानि" : "Reported loss"}
              </span>
            </div>
          ) : null}
          {props.draft.transactions.length > 0 ? (
            <div>
              <strong>{props.draft.transactions.length}</strong>
              <span>{locale === "hi" ? "लेन-देन" : "Transactions"}</span>
            </div>
          ) : null}
          {props.draft.evidence.length > 0 ? (
            <div>
              <strong>{props.draft.evidence.length}</strong>
              <span>{locale === "hi" ? "सबूत" : "Evidence items"}</span>
            </div>
          ) : null}
        </dl>
        <p>
          {locale === "hi"
            ? "कोई जरूरी जानकारी बाकी नहीं है। जमा करने से पहले आप अभी भी कुछ भी बदल सकते हैं।"
            : "No unresolved required details. You can still change anything before submitting."}
        </p>
      </section>
      <label className="report-declaration">
        <input
          type="checkbox"
          checked={declarationAccepted}
          onChange={(event) => setDeclarationAccepted(event.target.checked)}
        />
        <span>{t("workspace.declaration")}</span>
      </label>
      <div className="report-primary-actions">
        <button
          className="primary-button"
          type="button"
          disabled={!declarationAccepted || !reporterDetailsReady}
          onClick={() => props.onSubmit(complaint)}
        >
          {t("workspace.submitSynthetic")}
        </button>
      </div>
      <p className="prototype-submit-note">{t("workspace.noSubmit")}</p>
      {!declarationAccepted ? (
        <p className="form-hint">{t("workspace.declarationRequired")}</p>
      ) : null}
    </>
  );
}

function ReportingPathControl({
  draft,
  onReportFamilyChange,
}: Pick<ReportWorkspaceProps, "onReportFamilyChange"> & {
  draft: IncidentDraft;
}) {
  const { locale } = useI18n();
  const [changing, setChanging] = useState(false);
  const classification = draft.classification;
  const familyLabel = (
    family: Exclude<ReportFamily, "OUT_OF_SCOPE_OR_UNCLEAR">,
  ) => {
    if (locale === "hi") {
      if (family === "FINANCIAL_FRAUD") return "वित्तीय धोखाधड़ी";
      if (family === "WOMEN_CHILDREN_RELATED_CRIME")
        return "महिला / बच्चों से संबंधित अपराध";
      return "अन्य साइबर अपराध";
    }
    if (family === "FINANCIAL_FRAUD") return "Financial Fraud";
    if (family === "WOMEN_CHILDREN_RELATED_CRIME")
      return "Women / Children Related Crime";
    return "Other Cyber Crime";
  };
  const subCategoryLabel = () => {
    if (locale !== "hi") return classification.subCategory;
    const translations: Record<string, string> = {
      "Internet Banking Related Fraud": "इंटरनेट बैंकिंग से जुड़ी धोखाधड़ी",
      "Investment / Trading Fraud": "निवेश / ट्रेडिंग धोखाधड़ी",
      "Online Financial Fraud": "ऑनलाइन वित्तीय धोखाधड़ी",
      "Profile Hacking": "प्रोफ़ाइल हैकिंग",
      Ransomware: "रैनसमवेयर",
      "Online abusive-content report": "ऑनलाइन अपमानजनक सामग्री की रिपोर्ट",
      "Other supported cyber incident": "अन्य समर्थित साइबर घटना",
    };
    return classification.subCategory
      ? (translations[classification.subCategory] ?? "सुझाई गई उप-श्रेणी")
      : null;
  };
  const detailedCategoryLabel = () => {
    const category = classification.category;
    if (
      !category ||
      [
        "Financial Fraud",
        "Women / Children Related Crime",
        "Other Cyber Crime",
      ].includes(category)
    ) {
      return null;
    }
    if (
      locale === "hi" &&
      category === "Online and Social Media Related Crime"
    ) {
      return "ऑनलाइन और सोशल मीडिया से संबंधित अपराध";
    }
    return category;
  };
  const focusStory = () => {
    const input = document.querySelector<HTMLTextAreaElement>(
      "#incident-narrative",
    );
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus();
  };

  if (classification.ambiguity === "INSUFFICIENT_INFORMATION") {
    const noIncidentIdentified = classification.cyberElementPresent !== true;
    return (
      <section
        className="classification-guidance"
        role="status"
        data-report-field-id="reporting-path-clarification"
      >
        <h3>
          {noIncidentIdentified
            ? locale === "hi"
              ? "अभी रिपोर्ट करने योग्य घटना नहीं मिली"
              : "Nothing to report yet"
            : locale === "hi"
              ? "अतिरिक्त जानकारी"
              : "Additional information"}
        </h3>
        <p>
          {noIncidentIdentified
            ? locale === "hi"
              ? "आपने जो बताया, उसमें अभी साइबर अपराध की घटना पहचानने के लिए पर्याप्त जानकारी नहीं मिली।"
              : "The information provided does not yet identify a cybercrime incident."
            : locale === "hi"
              ? "घटना के बारे में जो जानकारी आपको याद हो, वह जोड़ें।"
              : "Add any incident details you remember."}
        </p>
        <button className="secondary-button" type="button" onClick={focusStory}>
          {locale === "hi" ? "जानकारी जोड़ें" : "Add details"}
        </button>
      </section>
    );
  }

  if (classification.ambiguity === "OUT_OF_CYBER_SCOPE") {
    return (
      <section
        className="classification-guidance"
        role="status"
        data-report-field-id="reporting-path-clarification"
      >
        <h3>
          {locale === "hi"
            ? "यह ऑनलाइन या साइबर घटना नहीं हो सकती है"
            : "This may not be an online or cyber incident"}
        </h3>
        <p>
          {locale === "hi"
            ? "यदि कोई तत्काल खतरे में है, तो उचित आपातकालीन या पुलिस सेवा से संपर्क करें।"
            : "If someone is in immediate danger, contact the appropriate emergency or police service."}
        </p>
        <div className="inline-field-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={focusStory}
          >
            {locale === "hi" ? "क्या हुआ, बदलें" : "Edit what happened"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => onReportFamilyChange("OTHER_CYBER_CRIME")}
          >
            {locale === "hi"
              ? "यदि इसमें ऑनलाइन या साइबर हिस्सा था, तो जारी रखें"
              : "Continue only if this involved an online or cyber element"}
          </button>
        </div>
      </section>
    );
  }

  if (classification.ambiguity === "MULTIPLE_PLAUSIBLE_PATHS") {
    return (
      <section
        className="classification-guidance"
        role="status"
        data-report-field-id="reporting-path-clarification"
      >
        <h3>
          {locale === "hi"
            ? "यह घटना एक से अधिक रिपोर्टिंग रास्तों में आ सकती है"
            : "This incident may fit more than one reporting path"}
        </h3>
        <p>
          {locale === "hi"
            ? "आप यहाँ किस हिस्से की रिपोर्ट करना चाहते हैं?"
            : "Which part would you like to report here?"}
        </p>
        <div className="classification-options">
          <button
            className="secondary-button"
            type="button"
            onClick={() => onReportFamilyChange("WOMEN_CHILDREN_RELATED_CRIME")}
          >
            {familyLabel("WOMEN_CHILDREN_RELATED_CRIME")}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onReportFamilyChange("FINANCIAL_FRAUD")}
          >
            {familyLabel("FINANCIAL_FRAUD")}
          </button>
        </div>
      </section>
    );
  }

  if (classification.reportFamily === "OUT_OF_SCOPE_OR_UNCLEAR") return null;

  const families: Array<Exclude<ReportFamily, "OUT_OF_SCOPE_OR_UNCLEAR">> = [
    "FINANCIAL_FRAUD",
    "WOMEN_CHILDREN_RELATED_CRIME",
    "OTHER_CYBER_CRIME",
  ];
  return (
    <section
      className="suggested-reporting-path"
      data-report-field-id="reporting-path-clarification"
      aria-label={
        locale === "hi"
          ? "सुझाई गई रिपोर्टिंग श्रेणी"
          : "Suggested reporting category"
      }
    >
      <p className="report-field-label">
        {locale === "hi"
          ? "सुझाई गई रिपोर्टिंग श्रेणी"
          : "Suggested reporting category"}
      </p>
      <strong>{familyLabel(classification.reportFamily)}</strong>
      {detailedCategoryLabel() ? <span>{detailedCategoryLabel()}</span> : null}
      {subCategoryLabel() ? <span>{subCategoryLabel()}</span> : null}
      <p>
        {locale === "hi"
          ? "आपके साझा किए गए विवरण के आधार पर।"
          : "Based on what you shared."}
      </p>
      <button
        className="text-button"
        type="button"
        onClick={() => setChanging((current) => !current)}
        aria-expanded={changing}
      >
        {locale === "hi" ? "बदलें" : "Change"}
      </button>
      {changing ? (
        <div
          className="classification-options"
          aria-label={
            locale === "hi" ? "दूसरी श्रेणी चुनें" : "Choose another category"
          }
        >
          {families.map((family) => (
            <button
              className="secondary-button"
              type="button"
              key={family}
              aria-pressed={classification.reportFamily === family}
              onClick={() => {
                onReportFamilyChange(family);
                setChanging(false);
              }}
            >
              {familyLabel(family)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyReportIllustration() {
  return (
    <svg
      className="empty-report-illustration"
      viewBox="0 0 260 120"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 25h62a8 8 0 0 1 8 8v27a8 8 0 0 1-8 8H50l-12 11 2-11H18a8 8 0 0 1-8-8V33a8 8 0 0 1 8-8Z" />
        <rect x="28" y="37" width="38" height="4" rx="2" />
        <rect x="28" y="49" width="48" height="4" rx="2" />
        <rect x="28" y="61" width="26" height="4" rx="2" />
        <rect x="35" y="88" width="60" height="20" rx="5" />
        <path d="M47 98h35M112 60h28m-7-7 7 7-7 7" />
        <path d="M159 13h70a10 10 0 0 1 10 10v84h-90V23a10 10 0 0 1 10-10Z" />
        <rect x="166" y="30" width="42" height="5" rx="2.5" />
        <path d="M166 50h56M166 65h56M166 80h56M166 95h38" />
        <circle cx="215" cy="95" r="7" />
        <path d="m212 95 2 2 4-5" />
      </g>
    </svg>
  );
}

function ReportStatusCard({
  readiness,
  sourceReady,
  onPrimaryAction,
  ...props
}: ReportWorkspaceProps & {
  readiness: ReportReadiness | null;
  sourceReady: boolean;
  onPrimaryAction: () => void;
}) {
  const { locale, t } = useI18n();
  const hi = locale === "hi";
  const isEmpty = !props.draft && props.mode === "INPUT";
  const noIncidentIdentified = Boolean(
    props.draft?.classification.reportFamily === "OUT_OF_SCOPE_OR_UNCLEAR" &&
    props.draft.classification.ambiguity === "INSUFFICIENT_INFORMATION" &&
    props.draft.classification.cyberElementPresent !== true,
  );
  const title =
    props.mode === "PROCESSING"
      ? hi
        ? "शिकायत तैयार हो रही है…"
        : "Preparing complaint…"
      : props.mode === "ERROR"
        ? props.preparationFailure === "TRANSLATION"
          ? hi
            ? "अनुवाद पूरा नहीं हो सका"
            : "Translation couldn't be completed"
          : props.isTranscriptionError
            ? hi
              ? "हम इस रिकॉर्डिंग को लिखित रूप में नहीं बदल पाए"
              : "We couldn't transcribe this recording"
            : hi
              ? "शिकायत अभी तैयार नहीं हो सकी"
              : "The complaint couldn't be prepared right now"
        : isEmpty
          ? hi
            ? "शिकायत की जानकारी"
            : "Complaint details"
          : noIncidentIdentified
            ? hi
              ? "अभी रिपोर्ट करने योग्य घटना नहीं मिली"
              : "Nothing to report yet"
            : readiness?.state === "STALE"
              ? hi
                ? "आपकी जानकारी बदल गई है"
                : "Your information changed"
              : readiness?.state === "NEEDS_CLARIFICATION"
                ? hi
                  ? "एक बात पर ध्यान देना है"
                  : "One thing needs your attention"
                : readiness?.state === "MISSING_REQUIRED"
                  ? hi
                    ? "शिकायत लगभग तैयार है"
                    : "Complaint almost ready"
                  : hi
                    ? "शिकायत जाँचने के लिए तैयार है"
                    : "Complaint ready to review";
  const support =
    props.mode === "PROCESSING"
      ? hi
        ? "दी गई जानकारी से शिकायत का विवरण तैयार हो रहा है।"
        : "Preparing complaint details from the information provided."
      : props.mode === "ERROR"
        ? props.preparationFailure === "TRANSLATION"
          ? hi
            ? "आपका मूल बयान सुरक्षित है।"
            : "Your original statement is saved."
          : props.isTranscriptionError
            ? hi
              ? "शिकायत की दूसरी जानकारी सुरक्षित है।"
              : "Your other complaint details are saved."
            : hi
              ? "आपका बयान और सबूत सुरक्षित हैं।"
              : "Your statement and evidence are saved."
        : isEmpty
          ? hi
            ? "घटना की जानकारी देने पर शिकायत का विवरण यहाँ दिखाई देगा।"
            : "Provide the incident information to prepare the complaint details."
          : noIncidentIdentified
            ? hi
              ? "आपने जो बताया, उसमें अभी साइबर अपराध की घटना पहचानने के लिए पर्याप्त जानकारी नहीं मिली।"
              : "The information provided does not yet identify a cybercrime incident."
            : readiness?.state === "STALE"
              ? hi
                ? "आगे बढ़ने से पहले शिकायत को नई जानकारी के साथ अपडेट करें।"
                : "Update the complaint with the new information before continuing."
              : readiness?.state === "NEEDS_CLARIFICATION"
                ? hi
                  ? "सचेत को आगे बढ़ने से पहले एक जवाब चाहिए।"
                  : "One answer is needed before सचेत can continue."
                : readiness?.state === "MISSING_REQUIRED"
                  ? hi
                    ? `${readiness.blockingItems.length} जरूरी जानकारी पर अभी ध्यान देना बाकी है।`
                    : `${readiness.blockingItems.length} required ${readiness.blockingItems.length === 1 ? "detail still needs" : "details still need"} your attention.`
                  : hi
                    ? "शिकायत की जरूरी जानकारी आपस में मेल खाती है। जो जानकारी आपके पास नहीं है, वह अनुपलब्ध के रूप में ही रहेगी।"
                    : "Important complaint details are consistent. Anything you don’t know stays marked as unavailable.";
  const actionLabel =
    props.mode === "PROCESSING"
      ? t("workspace.preparingReport")
      : props.mode === "ERROR"
        ? props.preparationFailure === "TRANSLATION"
          ? hi
            ? "अनुवाद फिर से करें"
            : "Retry translation"
          : props.isTranscriptionError
            ? hi
              ? "फिर से ट्रांसक्राइब करें"
              : "Retry transcription"
            : t("workspace.tryAgain")
        : !props.draft
          ? t("workspace.organise")
          : noIncidentIdentified
            ? hi
              ? "जानकारी जोड़ें"
              : "Add details"
            : readiness?.state === "STALE"
              ? hi
                ? "शिकायत अपडेट करें"
                : "Update complaint"
              : readiness?.state === "NEEDS_CLARIFICATION"
                ? hi
                  ? "सवाल का जवाब दें"
                  : "Answer question"
                : readiness?.state === "MISSING_REQUIRED"
                  ? hi
                    ? "अगली जरूरी जानकारी पर जाएँ"
                    : "Go to next missing detail"
                  : hi
                    ? "शिकायत जाँचें"
                    : "Review complaint";

  return (
    <section
      className={`report-status-card${isEmpty ? " report-status-card-empty" : ""}`}
      aria-live="polite"
    >
      <p
        className="report-status-label"
        id="report-details-heading"
        tabIndex={-1}
      >
        {t("workspace.reportInfo")}
      </p>
      {isEmpty ? <EmptyReportIllustration /> : null}
      <h2>{title}</h2>
      <p>{support}</p>
      {!isEmpty ? (
        <button
          className="primary-button"
          type="button"
          disabled={
            props.mode === "PROCESSING" || (!props.draft && !sourceReady)
          }
          onClick={onPrimaryAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function PreparedComplaintSummary({
  draft,
  reporterName,
}: {
  draft: IncidentDraft;
  reporterName: string;
}) {
  const { locale } = useI18n();
  const hi = locale === "hi";
  const financial = resolveFinancialLoss(draft);
  const amountClaims = draft.amountClaims ?? [];
  const displayedValueClaim = amountClaims.find(
    (claim) => claim.role === "DISPLAYED_VALUE",
  );
  const unverifiedClaim = amountClaims.find(
    (claim) => claim.role === "REPORTED_UNVERIFIED",
  );
  const hasEvidenceReconciliation = Boolean(
    displayedValueClaim &&
      financial.totalDebited &&
      financial.totalCreditedBack &&
      financial.computedTransactionLoss,
  );
  const financialMentions = deriveFinancialFactsFromText(
    [
      draft.incident.narrative,
      draft.citizenSummary.shortSummary,
      ...draft.evidence.flatMap((item) => item.extractedFacts),
    ]
      .filter(Boolean)
      .join("\n"),
  ).monetaryMentions;
  const requestedAmount = draft.adaptiveFacts.demandedAmount ?? financialMentions.find(
    (mention) => mention.role === "REQUESTED_AMOUNT",
  )?.amount;
  const requestedPaymentStatus = draft.citizenConfirmedFields.includes(
    "adaptive.requestedAmountPaymentStatus.NOT_PAID",
  )
    ? "NOT_PAID"
    : draft.citizenConfirmedFields.includes(
          "adaptive.requestedAmountPaymentStatus.PAID",
        )
      ? "PAID"
      : draft.citizenConfirmedFields.includes(
            "adaptive.requestedAmountPaymentStatus.UNKNOWN",
          )
        ? "UNKNOWN"
        : "NEEDS_CONFIRMATION";
  const displayedLoss =
    financial.resolvedLoss ?? financial.computedTransactionLoss;
  const incidentLabel = draft.adaptiveFacts.threatOrExtortion
    ? hi
      ? "ऑनलाइन जबरन वसूली"
      : "Online extortion"
    : draft.adaptiveFacts.accountCompromise
      ? hi
        ? "अकाउंट से छेड़छाड़"
        : "Account compromise"
      : /lottery|prize/i.test(draft.classification.subCategory ?? "")
        ? hi
          ? "लॉटरी या इनाम धोखाधड़ी का प्रयास"
          : "Lottery / prize scam attempt"
        : draft.classification.reportFamily === "FINANCIAL_FRAUD"
          ? hi
            ? "वित्तीय धोखाधड़ी"
            : "Financial fraud"
          : hi
            ? draft.classification.reportFamily ===
              "WOMEN_CHILDREN_RELATED_CRIME"
              ? "महिलाओं या बच्चों से जुड़ा साइबर अपराध"
              : draft.classification.reportFamily === "OTHER_CYBER_CRIME"
                ? "अन्य साइबर अपराध"
                : "साइबर अपराध की घटना"
            : draft.citizenSummary.incidentLabel;
  const summaryItems = [
    { label: hi ? "घटना" : "Incident", value: incidentLabel },
    displayedLoss && !hasEvidenceReconciliation
      ? {
          label: financial.hasExplicitTotalConflict
            ? hi
              ? "लेन-देन का कुल"
              : "Payments add up to"
            : draft.transactions.length > 0
              ? hi
                ? "वास्तव में ट्रांसफर हुई राशि"
                : "Actually transferred"
            : hi
              ? "रिपोर्ट की गई हानि"
              : "Reported loss",
          value: formatCurrency(displayedLoss),
        }
      : draft.incident.financialLossState === "NO"
        ? {
            label: hi ? "भुगतान" : "Payment",
            value: hi ? "कोई भुगतान नहीं बताया गया" : "No payment reported",
          }
        : null,
    draft.transactions.length > 0 && !hasEvidenceReconciliation
      ? {
          label: hi ? "लेन-देन" : "Transactions",
          value: String(draft.transactions.length),
        }
      : null,
    draft.incident.incidentDate
      ? {
          label: hi ? "घटना की तारीख" : "Incident date",
          value: new Intl.DateTimeFormat(hi ? "hi-IN" : "en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date(`${draft.incident.incidentDate}T12:00:00+05:30`)),
        }
      : null,
    draft.adaptiveFacts.impersonatedEntity
      ? {
          label: hi ? "दावा की गई पहचान" : "Claimed identity",
          value: draft.adaptiveFacts.impersonatedEntity,
        }
      : draft.adaptiveFacts.affectedPlatforms.length > 0
        ? {
            label: hi ? "प्रभावित सेवा" : "Affected service",
            value: draft.adaptiveFacts.affectedPlatforms.join(", "),
          }
        : null,
    requestedAmount && amountClaims.length === 0
        ? {
            label: hi ? "बाद में मांगी गई राशि" : "Additional amount requested",
            value: `${formatCurrency(requestedAmount)} · ${
              requestedPaymentStatus === "NOT_PAID"
                ? hi ? "भुगतान नहीं किया" : "Not paid"
                : requestedPaymentStatus === "PAID"
                  ? hi ? "कुछ राशि दी गई" : "Some amount paid"
                  : requestedPaymentStatus === "UNKNOWN"
                    ? hi ? "याद नहीं" : "Citizen does not remember"
                    : hi ? "पुष्टि बाकी है" : "Needs confirmation"
            }`,
          }
        : null,
    draft.adaptiveFacts.communicationChannels.length > 1
      ? {
          label: hi ? "माध्यम" : "Channels",
          value: draft.adaptiveFacts.communicationChannels.join(", "),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const factMentionsAmount = (fact: string, amount: number) => {
    const normalizedFact = fact.replaceAll(",", "");
    const formattedAmount = formatCurrency(amount).replaceAll(",", "");
    return normalizedFact.includes(formattedAmount);
  };
  const evidenceSupportsAmount = (amount: number) =>
    draft.evidence.some(
      (item) =>
        item.extractedFacts.some((fact) => factMentionsAmount(fact, amount)),
    );
  const requestedAmountHasEvidence = requestedAmount
    ? draft.evidence.some((item) =>
        item.extractedFacts.some((fact) =>
          factMentionsAmount(fact, requestedAmount),
        ),
      )
    : false;
  const requestedStatusConfirmed = draft.citizenConfirmedFields.some((field) =>
    field.startsWith("adaptive.requestedAmountPaymentStatus."),
  );
  const reporterFirstName = reporterName.trim().split(/\s+/)[0] ?? "";
  const citizenName = hi ? "नागरिक" : reporterFirstName || "the citizen";
  const knownDebits = draft.transactions.filter(
    (transaction) =>
      transaction.status === "KNOWN" && transaction.direction !== "CREDIT",
  );
  const representativeDebits = hasEvidenceReconciliation
    ? knownDebits.slice(-3)
    : knownDebits;
  const reconciliationEvidenceId = draft.transactions.find(
    (transaction) => transaction.evidenceId,
  )?.evidenceId;

  return (
    <section id="prepared-complaint-summary" className="prepared-complaint-summary" aria-labelledby="prepared-summary-heading">
      <div>
        <p className="case-file-column-label">
          {hi ? "तैयार शिकायत" : "Prepared complaint"}
        </p>
        <h2 id="prepared-summary-heading">
          {hi ? "हमने यह समझा" : "Here’s what we understood"}
        </h2>
        <p>
          {hi
            ? "देखें कि घटना, भुगतान और सबूत सही तरह से व्यवस्थित हुए हैं।"
            : "Check that the incident, payments and evidence have been organised correctly."}
        </p>
      </div>
      {hasEvidenceReconciliation && displayedValueClaim ? (
        <section className="evidence-reconciliation" aria-labelledby="evidence-reconciliation-heading">
          <div className="reconciliation-contrast">
            <div className="reconciliation-remembered">
              <p>{hi ? `${citizenName} ने बताया` : `What ${citizenName} remembers`}</p>
              <strong>{formatCurrency(displayedValueClaim.amount)}</strong>
              <span>{hi ? displayedValueClaim.labelHi : displayedValueClaim.label}</span>
              {displayedValueClaim.evidenceId ? (
                <button type="button" onClick={() => requestEvidencePreview(displayedValueClaim.evidenceId ?? "")}>
                  {hi ? "स्रोत देखें" : "View source"} →
                </button>
              ) : null}
            </div>
            <div className="reconciliation-supported">
              <p id="evidence-reconciliation-heading">{hi ? "सबूत से पुष्टि" : "What the evidence supports"}</p>
              <strong>{formatCurrency(financial.computedTransactionLoss ?? 0)}</strong>
              <span>{hi ? "सबूत से पुष्ट हानि" : "Evidence-supported loss"}</span>
              <small>
                {hi
                  ? "इससे निकला: मिलान किए गए डेबिट − मिलान किए गए क्रेडिट"
                  : "Derived from: matched debits − matched credits"}
              </small>
              {reconciliationEvidenceId ? (
                <button type="button" onClick={() => requestEvidencePreview(reconciliationEvidenceId)}>
                  {hi ? "मिलान किया गया सबूत देखें" : "View matched evidence"} →
                </button>
              ) : null}
            </div>
          </div>
          <dl className="reconciliation-calculation">
            <div>
              <dt>{hi ? "वास्तव में गए पैसे" : "Money that actually left"}</dt>
              <dd>{formatCurrency(financial.totalDebited ?? 0)}</dd>
              <small>{hi ? "स्रोत: जमा किया गया भुगतान और बैंक सबूत" : "Source: submitted payment and bank evidence"}</small>
            </div>
            <div>
              <dt>{hi ? "वापस आए पैसे" : "Money that came back"}</dt>
              <dd>− {formatCurrency(financial.totalCreditedBack ?? 0)}</dd>
              <small>{hi ? "स्रोत: मिलान किया गया आने वाला भुगतान" : "Source: matched incoming payment evidence"}</small>
              <small>{hi ? "शुरुआती भुगतान से भरोसा बना।" : "Earlier payouts helped build trust."}</small>
            </div>
            <div>
              <dt>{hi ? "सबूत से पुष्ट हानि" : "Evidence-supported loss"}</dt>
              <dd>= {formatCurrency(financial.computedTransactionLoss ?? 0)}</dd>
              <small>{hi ? "पुष्ट डेबिट − पुष्ट क्रेडिट से निकला" : "Derived from confirmed debits − confirmed credits"}</small>
            </div>
          </dl>
          <p className="reconciliation-explanation">
            {hi
              ? `${formatCurrency(displayedValueClaim.amount)} टास्क प्लेटफ़ॉर्म पर दिखता है, लेकिन जमा किए गए भुगतान सबूत में मिले या गए पैसे से इसका मेल नहीं है। नागरिक का बताया हुआ विवरण सुरक्षित है; शिकायत की कुल राशि उपलब्ध सबूत पर आधारित है।`
              : `${formatCurrency(displayedValueClaim.amount)} appears on the task platform, but it does not match money received or lost in the submitted payment evidence. ${reporterFirstName}’s story is preserved; the complaint total follows the evidence.`}
          </p>
        </section>
      ) : null}
      <dl>
        {summaryItems.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {draft.adaptiveFacts.communicationChannels.length > 1 ? (
        <div className="reconstruction-flow" aria-label={hi ? "घटना का क्रम" : "Incident flow"}>
          <p className="report-field-label">{hi ? "कैसे शुरू हुआ" : "How it started"}</p>
          <div>
            {draft.adaptiveFacts.communicationChannels.map((channel, index) => (
              <div className="reconstruction-flow-step" key={channel}>
                <span>
                  <strong>{channel}</strong>
                  <small>
                    {index === 0
                      ? hi ? "पहला संपर्क" : "Initial contact"
                      : hi ? "बातचीत जारी रही" : "Conversation continued"}
                  </small>
                </span>
                {index < draft.adaptiveFacts.communicationChannels.length - 1 ? <b aria-hidden="true">→</b> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {representativeDebits.length > 0 ? (
        <div className="reconstruction-payments">
          <p className="report-field-label">
            {hasEvidenceReconciliation
              ? hi ? "प्रतिनिधि मिलान किए गए भुगतान" : "Representative matched payments"
              : hi ? "वास्तव में किए गए भुगतान" : "Payments actually made"}
          </p>
          {representativeDebits.map((transaction, index) => (
            <article key={transaction.id}>
              <div>
                <strong>{transaction.amount ? formatCurrency(transaction.amount) : hi ? "राशि उपलब्ध नहीं" : "Amount unavailable"}</strong>
                <span>{transaction.paymentMethod ?? (hi ? `भुगतान ${index + 1}` : `Payment ${index + 1}`)}</span>
                <small className="reconstruction-source">
                  <b>{hi ? "स्रोत:" : "Source:"}</b>{" "}
                  {transaction.evidenceId
                    ? hi ? "मिलान किया गया भुगतान सबूत" : "Matched payment evidence"
                    : transaction.amount && evidenceSupportsAmount(transaction.amount)
                    ? hi ? "भुगतान रसीद + घटना का बयान" : "Payment receipt + incident statement"
                    : hi ? "घटना का बयान" : "Incident statement"}
                </small>
                {citizenVisibleValue(transaction.transactionIdOrUtr ?? transaction.referenceNumber) ? (
                  <small>{hi ? "लेन-देन संदर्भ" : "Transaction reference"}: {citizenVisibleValue(transaction.transactionIdOrUtr ?? transaction.referenceNumber)}</small>
                ) : null}
                {transaction.evidenceId ? (
                  <button className="reconstruction-source-link" type="button" onClick={() => requestEvidencePreview(transaction.evidenceId ?? "")}>
                    {hi ? "जुड़ा हुआ सबूत देखें" : "View linked evidence"} →
                  </button>
                ) : null}
              </div>
              <b>{hi ? "भुगतान किया" : "Paid"}</b>
            </article>
          ))}
          <div className="reconstruction-total">
            <span>{hasEvidenceReconciliation ? (hi ? "सबूत से पुष्ट हानि" : "Evidence-supported loss") : (hi ? "वास्तव में ट्रांसफर" : "Actually transferred")}</span>
            <strong>{displayedLoss ? formatCurrency(displayedLoss) : "—"}</strong>
          </div>
        </div>
      ) : null}
      {amountClaims.length > 0 ? (
        <section className="reconciliation-not-counted" aria-labelledby="not-counted-heading">
          <h3 id="not-counted-heading">{hi ? "अन्य महत्वपूर्ण राशियाँ" : "Other important amounts"}</h3>
          <div>
            {amountClaims.map((claim) => (
              <article key={claim.id}>
                <strong>{formatCurrency(claim.amount)}</strong>
                <b>{hi ? claim.labelHi : claim.label}</b>
                <p>{hi ? claim.noteHi : claim.note}</p>
                <small>{hi ? "स्रोत" : "Source"}: {hi ? claim.sourceLabelHi : claim.sourceLabel}</small>
                {claim.evidenceId ? (
                  <button type="button" onClick={() => requestEvidencePreview(claim.evidenceId ?? "")}>
                    {hi ? "सबूत देखें" : "View evidence"} →
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : requestedAmount ? (
        <div className="reconstruction-requested">
          <div><span>{hi ? "बाद में मांगी गई राशि" : "Additional amount requested"}</span><strong>{formatCurrency(requestedAmount)}</strong></div>
          <b>{requestedPaymentStatus === "NOT_PAID" ? (hi ? "मांगा गया · भुगतान नहीं किया" : "Requested · Not paid") : requestedPaymentStatus === "PAID" ? (hi ? "कुछ राशि दी गई" : "Some amount paid") : requestedPaymentStatus === "UNKNOWN" ? (hi ? "याद नहीं" : "Not remembered") : (hi ? "आपकी पुष्टि जरूरी है" : "Needs your confirmation")}</b>
          <p className="reconstruction-source">
            <b>{hi ? "स्रोत:" : "Source:"}</b>{" "}
            {requestedAmountHasEvidence
              ? hi ? "जुड़ी हुई बातचीत" : "Attached conversation"
              : hi ? "घटना का बयान" : "Incident statement"}
          </p>
          {requestedStatusConfirmed ? (
            <p className="reconstruction-confirmation">
              <b>
                {reporterFirstName
                  ? hi
                    ? `${reporterFirstName} द्वारा पुष्टि:`
                    : `Confirmed by ${reporterFirstName}:`
                  : hi ? "आपके द्वारा पुष्टि:" : "Confirmed by you:"}
              </b>{" "}
              {requestedPaymentStatus === "NOT_PAID"
                ? hi ? "भुगतान नहीं किया" : "Not paid"
                : requestedPaymentStatus === "PAID"
                  ? hi ? "कुछ राशि दी गई" : "Some amount paid"
                  : hi ? "याद नहीं" : "Not remembered"}
            </p>
          ) : null}
        </div>
      ) : null}
      {unverifiedClaim ? (
        <aside className="reconciliation-open-question">
          <p className="eyebrow">{hi ? "एक सवाल बाकी है" : "One open question"}</p>
          <h3>
            {hi
              ? `क्या आप बताए गए ${formatCurrency(unverifiedClaim.amount)} के लिए वॉलेट या भुगतान विवरण प्राप्त कर सकती हैं?`
              : `Can you retrieve the wallet or payment statement for the ${formatCurrency(unverifiedClaim.amount)} you mentioned?`}
          </h3>
          <p>{hi ? "यह अभी जरूरी नहीं है। जानकारी सुरक्षित रहेगी और फिलहाल शिकायत की कुल राशि में शामिल नहीं होगी।" : "This is not required right now. The detail remains recorded and is excluded from the complaint total for now."}</p>
        </aside>
      ) : null}
      {hasEvidenceReconciliation ? (
        <aside className="reconciliation-ready">
          <h3>{hi ? "आपकी जाँच के लिए तैयार" : "Ready for you to review"}</h3>
          <p>
            {unverifiedClaim
              ? hi
                ? `शिकायत की कुल राशि अभी उपलब्ध सबूत पर आधारित है। नागरिक द्वारा बताया गया ${formatCurrency(unverifiedClaim.amount)} दर्ज है, लेकिन अभी हानि में शामिल नहीं है।`
                : `The complaint total is based on the evidence currently available. ${reporterFirstName}’s unverified ${formatCurrency(unverifiedClaim.amount)} remains recorded but is not included in the loss yet.`
              : hi
                ? "शिकायत की कुल राशि अभी उपलब्ध भुगतान सबूत पर आधारित है।"
                : "The complaint total is based on the payment evidence currently available."}
          </p>
        </aside>
      ) : null}
      {draft.evidence.length > 0 ? (
        <p className="reconstruction-evidence-count">
          <strong>{hi ? "जुड़ा हुआ सबूत" : "Evidence connected"}</strong>
          <span>{draft.evidence.length} {hi ? "आइटम" : draft.evidence.length === 1 ? "item" : "items"}</span>
        </p>
      ) : null}
    </section>
  );
}

function ReportDetailsPane({
  groups,
  readiness,
  consistencyIssues,
  onResolveConsistencyIssue,
  sourceReady,
  onPrimaryAction,
  ...props
}: ReportWorkspaceProps & {
  groups: ReportGroupView[];
  readiness: ReportReadiness | null;
  consistencyIssues: CaseConsistencyIssue[];
  onResolveConsistencyIssue: (
    issue: CaseConsistencyIssue,
    resolution: ConsistencyResolution,
  ) => void;
  sourceReady: boolean;
  onPrimaryAction: () => void;
}) {
  const { locale, t } = useI18n();
  const [customReportedAmount, setCustomReportedAmount] = useState("");
  const [unavailableNotice, setUnavailableNotice] = useState(false);
  const amountConflictMissing = Boolean(
    props.amountResolution?.hasConflict &&
    !props.amountResolution.selectedAmount,
  );
  const amountConflictResolution = amountConflictMissing
    ? props.amountResolution
    : null;
  const missingQuestions = props.draft
    ? deriveMissingQuestions(props.draft)
    : [];
  const firstMissingQuestion = missingQuestions[0] ?? null;
  const evidenceMissing =
    readiness?.blockingItems.some(
      (item) => item.fieldId === "source-evidence",
    ) ?? false;
  const priorityField = firstMissingQuestion
    ? groups
        .flatMap((group) => group.sections)
        .flatMap((section) => section.fields)
        .find(
          (field) =>
            field.missingQuestion?.field === firstMissingQuestion.field &&
            field.missingQuestion?.transactionIndex ===
              firstMissingQuestion.transactionIndex,
        )
    : null;
  const clarificationDetailCount =
    missingQuestions.length + (evidenceMissing ? 1 : 0);

  useEffect(() => {
    setUnavailableNotice(false);
  }, [props.demoCase?.id, props.experienceMode]);
  const incidentGroup = groups.find((group) => group.id === "INCIDENT");
  const remainingGroups = groups.filter(
    (group) => group.id !== "INCIDENT" && group.id !== "REPORTER",
  );
  const timeline =
    props.draft && !amountConflictMissing
      ? deriveIncidentTimeline(props.draft, {
          locale,
          isDemoIncident: props.isDemoIncident,
        })
      : [];
  const sensitiveDetailDetected = Boolean(
    props.draft &&
    [
      props.narrative,
      props.transcription?.originalTranscript,
      props.transcription?.englishTranscript,
      props.draft.incident.narrative,
      props.draft.citizenSummary.shortSummary,
      ...props.draft.evidence.flatMap((item) => item.extractedFacts),
    ].some((value) => containsSensitiveDetail(value)),
  );

  if (props.mode === "REVIEW") {
    return (
      <section
        className="report-details-pane"
        aria-label={t("workspace.reviewSubmit")}
      >
        <ReportReview {...props} />
      </section>
    );
  }

  return (
    <section
      className="report-details-pane"
      aria-labelledby="report-details-heading"
    >
      {props.mode !== "READY" || !props.draft ? (
        <ReportStatusCard
          {...props}
          readiness={readiness}
          sourceReady={sourceReady}
          onPrimaryAction={onPrimaryAction}
        />
      ) : null}

      {props.mode === "READY" && props.draft ? (
        <PreparedComplaintSummary
          draft={props.draft}
          reporterName={props.reporterProfile.displayName}
        />
      ) : null}

      {props.draft?.incident.financialLossState === "YES" &&
      props.draft.transactions.length > 0 ? (
        <aside
          className="financial-triage"
          aria-labelledby="financial-triage-heading"
        >
          <div>
            <p className="eyebrow">
              {locale === "hi"
                ? "पैसे ट्रांसफर हुए हैं?"
                : "Money was transferred?"}
            </p>
            <h2 id="financial-triage-heading">
              {locale === "hi"
                ? "यदि अभी तक नहीं किया है, तो तुरंत 1930 पर कॉल करें"
                : "Call 1930 promptly if you have not already"}
            </h2>
            <p>
              {locale === "hi"
                ? "आप यहाँ अपनी रिपोर्ट तैयार करना जारी रख सकते हैं।"
                : "You can continue preparing your report here."}
            </p>
          </div>
          <a className="primary-button" href="tel:1930">
            {locale === "hi" ? "1930 पर कॉल करें" : "Call 1930"}
          </a>
          <a className="text-button" href="#prepared-complaint-summary">
            {locale === "hi" ? "शिकायत जारी रखें" : "Continue complaint"}
          </a>
        </aside>
      ) : null}

      {props.mode === "READY" && props.draft ? (
        <ReportStatusCard
          {...props}
          readiness={readiness}
          sourceReady={sourceReady}
          onPrimaryAction={onPrimaryAction}
        />
      ) : null}

      {props.mode === "PROCESSING" ? (
        <div
          className="report-processing-state"
          role="status"
          aria-live="polite"
        >
          <span className="loading-marker" aria-hidden="true" />
          <p>
            <strong>
              {props.experienceMode === "DEMO_CASE"
                ? t("workspace.organisingSample")
                : t(props.loadingMessage)}
            </strong>
          </p>
          <div className="report-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      {props.mode === "ERROR" ? (
        <div className="report-error-state" role="alert">
          <h3>{t("workspace.errorHeading")}</h3>
          <p>{props.formError ?? t("workspace.inputPreserved")}</p>
          <div className="entry-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                document
                  .querySelector<HTMLTextAreaElement>("#incident-narrative")
                  ?.focus()
              }
            >
              {locale === "hi" ? "विवरण बदलते रहें" : "Continue editing"}
            </button>
            {props.isTranscriptionError ? (
              <>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    props.onRecordAgain();
                    props.onReportMethodChange("SPEAK");
                  }}
                >
                  {t("workspace.shorter")}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => props.onReportMethodChange("TYPE")}
                >
                  {t("workspace.typeInstead")}
                </button>
              </>
            ) : null}
            <button
              className="secondary-button"
              type="button"
              onClick={props.onUseDemoIncident}
            >
              {t("workspace.useDemo")}
            </button>
          </div>
        </div>
      ) : null}

      {props.mode === "READY" &&
      props.draft &&
      props.draft.classification.ambiguity === "NONE" ? (
        <>
          {sensitiveDetailDetected ? (
            <aside className="sensitive-detail-notice" role="status">
              <strong>
                {locale === "hi"
                  ? "संवेदनशील जानकारी हटा दी गई"
                  : "Sensitive detail removed"}
              </strong>
              <p>
                {locale === "hi"
                  ? "OTP, PIN, CVV और पासवर्ड आपकी तैयार रिपोर्ट में शामिल नहीं किए जाते।"
                  : "OTPs, PINs, CVVs and passwords are not included in your prepared report."}
              </p>
            </aside>
          ) : null}

          {amountConflictResolution ? (
            <section
              className="amount-conflict"
              data-amount-conflict
              data-report-field-id="reported-amount-conflict"
              aria-labelledby="amount-conflict-heading"
            >
              <h3 id="amount-conflict-heading">
                {locale === "hi"
                  ? "यह जानकारी जाँचें"
                  : "Check this detail"}
              </h3>
              <p>
                {locale === "hi"
                  ? `आपने ${formatCurrency(amountConflictResolution.statementAmount ?? 0)} की हानि बताई। ${props.draft.transactions.length} भुगतानों का कुल ${formatCurrency(amountConflictResolution.transactionAmount ?? 0)} है।`
                  : `You said ${formatCurrency(amountConflictResolution.statementAmount ?? 0)} was lost. ${props.draft.transactions.length === 2 ? "The two payments" : `The ${props.draft.transactions.length} payments`} add up to ${formatCurrency(amountConflictResolution.transactionAmount ?? 0)}.`}
              </p>
              <dl>
                <div>
                  <dt>
                    {locale === "hi" ? "आपके बयान से" : "From your statement"}
                  </dt>
                  <dd>
                    {formatCurrency(
                      amountConflictResolution.statementAmount ?? 0,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    {locale === "hi" ? "लेन-देन से" : "From your transactions"}
                  </dt>
                  <dd>
                    {formatCurrency(
                      amountConflictResolution.transactionAmount ?? 0,
                    )}
                  </dd>
                </div>
              </dl>
              <p>
                {locale === "hi"
                  ? "इस रिपोर्ट में कौन-सी राशि उपयोग की जाए?"
                  : "Which amount should be used for this report?"}
              </p>
              <div className="inline-field-actions">
                {[
                  amountConflictResolution.statementAmount,
                  amountConflictResolution.transactionAmount,
                ]
                  .filter((amount): amount is number => amount !== null)
                  .map((amount) => (
                    <button
                      className="secondary-button"
                      type="button"
                      key={amount}
                      aria-pressed={
                        amountConflictResolution.selectedAmount === amount
                      }
                      onClick={() => props.onReportedAmountSelect(amount)}
                    >
                      {locale === "hi"
                        ? `${formatCurrency(amount)} उपयोग करें`
                        : `Use ${formatCurrency(amount)}`}
                    </button>
                  ))}
                <label className="custom-amount-choice">
                  <span>
                    {locale === "hi" ? "दूसरी राशि" : "Another amount"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={customReportedAmount}
                    onChange={(event) =>
                      setCustomReportedAmount(event.target.value)
                    }
                  />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    !Number.isFinite(Number(customReportedAmount)) ||
                    Number(customReportedAmount) <= 0
                  }
                  onClick={() =>
                    props.onReportedAmountSelect(Number(customReportedAmount))
                  }
                >
                  {locale === "hi" ? "यह राशि उपयोग करें" : "Use this amount"}
                </button>
              </div>
            </section>
          ) : null}

          {consistencyIssues.map((issue) => (
            <section
              className="case-consistency-issue"
              key={issue.id}
              data-report-field-id={issue.affectedFieldIds[0]}
              aria-labelledby={`${issue.id}-heading`}
            >
              <p className="eyebrow">
                {locale === "hi" ? "पुष्टि जरूरी है" : "Needs confirmation"}
              </p>
              <h3 id={`${issue.id}-heading`}>
                {issue.type === "ENTITY_RELATIONSHIP" && locale === "hi"
                  ? "पुष्टि करें कि ये खाते किस तरह जुड़े हैं"
                  : issue.title}
              </h3>
              <p>
                {issue.type === "ENTITY_RELATIONSHIP" && locale === "hi"
                  ? "संदेश में एक सेवा का नाम है और प्रभावित खाते के रूप में दूसरी सेवा बताई गई है। क्या ये एक ही घटना का हिस्सा हैं?"
                  : issue.explanation}
              </p>
              <dl>
                {issue.sourceValues.map((source) => (
                  <div key={source.label}>
                    <dt>
                      {issue.type === "ENTITY_RELATIONSHIP" && locale === "hi"
                        ? source.label === "Message source"
                          ? "संदेश का स्रोत"
                          : "प्रभावित बताया गया खाता"
                        : source.label}
                    </dt>
                    <dd>
                      {typeof source.value === "number"
                        ? formatCurrency(source.value)
                        : source.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="inline-field-actions">
                {issue.type === "POSSIBLE_DUPLICATE" ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onResolveConsistencyIssue(issue, "SAME")}
                    >
                      {locale === "hi" ? "एक ही लेन-देन" : "Same transaction"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "DIFFERENT")
                      }
                    >
                      {locale === "hi" ? "दो अलग लेन-देन" : "They’re different"}
                    </button>
                  </>
                ) : issue.type === "FINANCIAL_LOSS_CONTRADICTION" ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onResolveConsistencyIssue(issue, "YES")}
                    >
                      {locale === "hi" ? "पैसे गए" : "Money was lost"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onResolveConsistencyIssue(issue, "NO")}
                    >
                      {locale === "hi" ? "पैसे नहीं गए" : "No money was lost"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "UNKNOWN")
                      }
                    >
                      {locale === "hi" ? "पक्का नहीं" : "I’m not sure"}
                    </button>
                  </>
                ) : issue.type === "ENTITY_RELATIONSHIP" ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "BOTH_AFFECTED")
                      }
                    >
                      {locale === "hi"
                        ? "हाँ — दोनों खाते प्रभावित हुए"
                        : "Yes — both accounts were affected"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "SOURCE_ONLY")
                      }
                    >
                      {locale === "hi"
                        ? "नहीं — केवल संदेश वाला खाता"
                        : "No — only the message-source account"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "TARGET_ONLY")
                      }
                    >
                      {locale === "hi"
                        ? "नहीं — केवल बाद में बताया खाता"
                        : "No — only the later account was affected"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        onResolveConsistencyIssue(issue, "SEPARATE_THREADS")
                      }
                    >
                      {locale === "hi"
                        ? "ये दो अलग घटनाएँ हैं"
                        : "They are two separate incidents"}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onResolveConsistencyIssue(issue, "UNSURE")}
                    >
                      {locale === "hi" ? "पक्का नहीं" : "I’m not sure"}
                    </button>
                  </>
                ) : null}
              </div>
            </section>
          ))}

          {unavailableNotice ? (
            <div className="clarification-unavailable-confirmation" role="status">
              <strong>{locale === "hi" ? "उपलब्ध नहीं" : "Not available"}</strong>
              <p>
                {locale === "hi"
                  ? "कोई बात नहीं। यह जानकारी शिकायत में उपलब्ध नहीं के रूप में दर्ज रहेगी।"
                  : "That’s okay. This detail will remain unavailable in the complaint."}
              </p>
            </div>
          ) : null}

          {priorityField && !amountConflictMissing ? (
            <section className="priority-missing-question">
              <p className="eyebrow">
                {locale === "hi"
                  ? "ध्यान देने की जरूरत है"
                  : "Needs your attention"}
              </p>
              {clarificationDetailCount > 1 ? (
                <p className="clarification-progress" role="status">
                  {locale === "hi"
                    ? `${clarificationDetailCount} जानकारियाँ जाँचनी हैं`
                    : `${clarificationDetailCount} details to check`}
                </p>
              ) : null}
              <h3>{priorityField.label}</h3>
              <MissingFieldEditor
                field={priorityField}
                value={
                  priorityField.missingQuestion
                    ? (props.missingAnswers[
                        priorityField.missingQuestion.field
                      ] ?? "")
                    : ""
                }
                onChange={(value) => {
                  if (priorityField.missingQuestion) {
                    props.onMissingAnswerChange(
                      priorityField.missingQuestion.field,
                      value,
                    );
                  }
                }}
                onSave={(fallback) => {
                  if (priorityField.missingQuestion) {
                    setUnavailableNotice(fallback === CITIZEN_DOES_NOT_HAVE);
                    props.onSaveMissingAnswer(
                      priorityField.missingQuestion,
                      fallback,
                    );
                  }
                }}
              />
            </section>
          ) : evidenceMissing &&
            !firstMissingQuestion &&
            !amountConflictMissing ? (
            <section className="priority-missing-question">
              <p className="eyebrow">
                {locale === "hi"
                  ? "एक जानकारी जाँचें"
                  : "One detail to check"}
              </p>
              {clarificationDetailCount > 1 ? (
                <p className="clarification-progress" role="status">
                  {locale === "hi"
                    ? `${clarificationDetailCount} जानकारियाँ जाँचनी हैं`
                    : `${clarificationDetailCount} details to check`}
                </p>
              ) : null}
              <h3>{t("field.evidenceSupplied")}</h3>
              <p>
                {locale === "hi"
                  ? "वित्तीय रिपोर्ट के लिए सहायक सबूत जोड़ें।"
                  : "Add supporting evidence for this financial report."}
              </p>
              <details className="field-help-disclosure evidence-help-disclosure">
                <summary>
                  {locale === "hi" ? "क्या जोड़ना चाहिए?" : "What should I add?"}
                </summary>
                <div className="field-help-content">
                  <p>
                    {locale === "hi"
                      ? "संदेश, भुगतान रसीद, अकाउंट सूचना, प्रोफ़ाइल लिंक या स्क्रीनशॉट शिकायत को समझने में मदद कर सकते हैं।"
                      : "Messages, payment receipts, account notifications, profile links or screenshots can help support the complaint."}
                  </p>
                  <p className="evidence-safety-note">
                    {locale === "hi"
                      ? "पासवर्ड, OTP, PIN या CVV अपलोड न करें।"
                      : "Do not upload passwords, OTPs, PINs or CVVs."}
                  </p>
                </div>
              </details>
              <button
                className="primary-button"
                type="button"
                data-report-field-id="source-evidence"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>("#incident-screenshots")
                    ?.click()
                }
              >
                {locale === "hi" ? "सबूत जोड़ें" : "Add evidence"}
              </button>
            </section>
          ) : null}

          <details className="prepared-complaint-disclosure">
            <summary>
              {locale === "hi"
                ? "शिकायत की पूरी जानकारी देखें"
                : "View all complaint details"}
            </summary>
            <div className="prepared-complaint-disclosure-content">
              <ReportingPathControl
                draft={props.draft}
                onReportFamilyChange={props.onReportFamilyChange}
              />

              {incidentGroup ? (
                <section className="prepared-report-section prepared-report-core">
                  <ReportGroup
                    group={incidentGroup}
                    draft={props.draft}
                    missingAnswers={props.missingAnswers}
                    onMissingAnswerChange={props.onMissingAnswerChange}
                    onSaveMissingAnswer={props.onSaveMissingAnswer}
                    onDraftChange={props.onDraftChange}
                    showMissingEditors={false}
                    screenshots={props.screenshots}
                    isDemoIncident={props.isDemoIncident}
                    demoCase={props.demoCase}
                  />
                </section>
              ) : null}

              <IncidentTimeline
                events={timeline}
                heading={locale === "hi" ? "क्या हुआ" : "What happened"}
              />

              <div className="prepared-report-groups">
                {remainingGroups.map((group) => (
                  <section className="prepared-report-section" key={group.id}>
                    <ReportGroup
                      group={group}
                      draft={props.draft!}
                      missingAnswers={props.missingAnswers}
                      onMissingAnswerChange={props.onMissingAnswerChange}
                      onSaveMissingAnswer={props.onSaveMissingAnswer}
                      onDraftChange={props.onDraftChange}
                      showMissingEditors={false}
                      screenshots={props.screenshots}
                      isDemoIncident={props.isDemoIncident}
                      demoCase={props.demoCase}
                      blockingCount={
                        readiness?.sectionBlockingCounts[group.id] ?? 0
                      }
                    />
                  </section>
                ))}
              </div>

              <ImmediateHandoff
                draft={props.draft}
                amountResolution={props.amountResolution}
              />
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}

function DemoCaseSelector({
  activeCase,
  onChange,
  onReset,
}: {
  activeCase: DemoCaseDefinition;
  onChange: (caseId: DemoCaseId) => void;
  onReset: () => void;
}) {
  const { locale } = useI18n();
  const hi = locale === "hi";
  const otherCases = DEMO_CASES.filter((demoCase) => demoCase.id !== activeCase.id);
  const bannerTitle = hi
    ? activeCase.bannerTitleHi ?? activeCase.selectorLabelHi
    : activeCase.bannerTitle ?? activeCase.selectorLabel;
  const incidentTrail = hi
    ? activeCase.incidentTrailHi ?? activeCase.draft.citizenSummary.shortSummary
    : activeCase.incidentTrail ?? activeCase.draft.citizenSummary.shortSummary;
  return (
    <section
      className="demo-case-selector"
      aria-labelledby="demo-case-selector-heading"
    >
      <div className="demo-case-selector-heading">
        <div>
          <p className="eyebrow">
            {hi ? "डेमो मामला · सिंथेटिक" : "Demo case · Synthetic"}
          </p>
          <h2 id="demo-case-selector-heading">{bannerTitle}</h2>
          <p>{incidentTrail}</p>
        </div>
        <button className="text-button" type="button" onClick={onReset}>
          {hi ? "डेमो मामला रीसेट करें" : "Reset demo case"}
        </button>
      </div>
      <button
        type="button"
        className="demo-primary-case"
        onClick={() => onChange(activeCase.id)}
      >
        {hi ? "डेमो शुरू करें" : "Start demo"}
      </button>
      <details className="demo-other-cases">
        <summary>{hi ? "दूसरे डेमो मामले" : "Other demo cases"}</summary>
        <div className="demo-case-options" role="radiogroup" aria-label={hi ? "दूसरा डेमो मामला चुनें" : "Choose another demo case"}>
        {otherCases.map((demoCase) => (
          <button
            key={demoCase.id}
            type="button"
            role="radio"
            aria-checked={activeCase.id === demoCase.id}
            className={
              activeCase.id === demoCase.id ? "is-selected" : undefined
            }
            onClick={() => onChange(demoCase.id)}
          >
            {hi ? demoCase.selectorLabelHi : demoCase.selectorLabel}
          </button>
        ))}
        </div>
      </details>
    </section>
  );
}

export function ReportWorkspace(props: ReportWorkspaceProps) {
  const { locale } = useI18n();
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [navigationMessage, setNavigationMessage] = useState("");
  const [ignoredConsistencyIssueIds, setIgnoredConsistencyIssueIds] = useState<
    Set<string>
  >(() => new Set());
  const highlightTimerRef = useRef<number | null>(null);
  const groups = props.draft
    ? deriveReportGroups(props.draft, {
        locale,
        profile: props.reporterProfile,
        identityDocumentProvided: props.identityDocumentProvided,
        displayStatement: props.transcription
          ? locale === "hi" && props.transcription.languageCode.startsWith("hi")
            ? props.transcription.originalTranscript
            : locale === "en" && props.transcription.englishTranscript
              ? props.transcription.englishTranscript
              : props.transcription.originalTranscript
          : props.narrative,
      })
    : [];
  const complaint = props.draft
    ? buildNcrpCompatibleComplaint({
        draft: props.draft,
        profile: props.reporterProfile,
        transcription: props.transcription,
        typedNarrative: props.narrative,
        isDemoIncident: props.isDemoIncident,
        screenshotNames: props.isDemoIncident
          ? (props.demoCase?.evidence.map((item) => item.label) ?? [])
          : props.screenshots.map((file) => file.name),
        demoEvidencePaths: props.demoCase?.evidence.map((item) => item.src),
        identityDocumentProvided: props.identityDocumentProvided,
      })
    : null;
  const readiness =
    props.draft && complaint
      ? deriveReportReadiness({
          draft: props.draft,
          complaint,
          amountResolution: props.amountResolution,
          locale,
          isStale: props.isReportStale,
          ignoredConsistencyIssueIds,
        })
      : null;
  const consistencyIssues = props.draft
    ? getCaseConsistencyIssues(props.draft).filter(
        (issue) =>
          issue.type !== "TOTAL_MISMATCH" &&
          !ignoredConsistencyIssueIds.has(issue.id),
      )
    : [];
  const sourceReady = Boolean(
    !props.isTranscribing &&
      (props.narrative.trim() || props.hasAudio || props.screenshots.length > 0),
  );

  useEffect(() => {
    if (!pendingTargetId) return;
    let frame = 0;
    let attempts = 0;

    const reveal = () => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("[data-report-field-id]"),
      ).find((item) => item.dataset.reportFieldId === pendingTargetId);
      if (!target && attempts < 4) {
        attempts += 1;
        frame = window.requestAnimationFrame(reveal);
        return;
      }

      if (!target) {
        const fallback = document.querySelector<HTMLElement>(
          "#report-details-heading",
        );
        fallback?.focus({ preventScroll: true });
        fallback?.scrollIntoView({ behavior: "auto", block: "start" });
        setNavigationMessage(
          locale === "hi"
            ? "अगली जरूरी जानकारी रिपोर्ट में दिखाई गई है।"
            : "The next required detail is shown in the report.",
        );
        setPendingTargetId(null);
        return;
      }

      let disclosure = target.closest("details");
      while (disclosure) {
        disclosure.open = true;
        disclosure = disclosure.parentElement?.closest("details") ?? null;
      }
      const focusTarget = target.matches(
        "input, textarea, select, button, [tabindex]:not([tabindex='-1'])",
      )
        ? target
        : target.querySelector<HTMLElement>(
            "input, textarea, select, button, [tabindex]:not([tabindex='-1'])",
          );
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      focusTarget?.focus({ preventScroll: true });
      target.classList.add("report-field-target-highlight");
      if (highlightTimerRef.current)
        window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => {
        target.classList.remove("report-field-target-highlight");
      }, 1600);
      setNavigationMessage(
        locale === "hi" ? "जरूरी फ़ील्ड खुल गया है।" : "Required field opened.",
      );
      setPendingTargetId(null);
    };

    frame = window.requestAnimationFrame(reveal);
    return () => window.cancelAnimationFrame(frame);
  }, [locale, pendingTargetId]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current)
        window.clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setIgnoredConsistencyIssueIds(new Set());
  }, [props.demoCase?.id]);

  function runPrimaryAction() {
    if (props.mode === "PROCESSING") return;
    if (
      !props.draft ||
      props.mode === "ERROR" ||
      readiness?.state === "STALE"
    ) {
      props.onOrganizeReport();
      return;
    }
    if (
      props.draft.classification.reportFamily === "OUT_OF_SCOPE_OR_UNCLEAR" &&
      props.draft.classification.ambiguity === "INSUFFICIENT_INFORMATION" &&
      props.draft.classification.cyberElementPresent !== true
    ) {
      const input = document.querySelector<HTMLTextAreaElement>(
        "#incident-narrative",
      );
      input?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
      input?.focus({ preventScroll: true });
      return;
    }
    if (readiness?.state === "READY") {
      props.onReview([...ignoredConsistencyIssueIds]);
      return;
    }
    if (readiness?.nextBlockingItem) {
      setNavigationMessage("");
      setPendingTargetId(readiness.nextBlockingItem.fieldId);
      return;
    }
    document.querySelector<HTMLElement>("#report-details-heading")?.focus();
  }

  function resolveConsistencyIssue(
    issue: CaseConsistencyIssue,
    resolution: ConsistencyResolution,
  ) {
    if (!props.draft) return;
    if (issue.type === "POSSIBLE_DUPLICATE") {
      if (resolution === "DIFFERENT") {
        setIgnoredConsistencyIssueIds((current) =>
          new Set(current).add(issue.id),
        );
        return;
      }
      const rightIndex = Number(
        /transaction-(\d+)-amount/.exec(issue.affectedFieldIds[1] ?? "")?.[1],
      );
      props.onDraftChange({
        ...props.draft,
        transactions: props.draft.transactions.filter(
          (_, index) => index !== rightIndex,
        ),
      });
      return;
    }
    if (issue.type === "FINANCIAL_LOSS_CONTRADICTION") {
      const state =
        resolution === "YES" ? "YES" : resolution === "NO" ? "NO" : "UNKNOWN";
      props.onDraftChange({
        ...props.draft,
        classification: {
          ...props.draft.classification,
          moneyLost: state === "YES" ? true : state === "NO" ? false : null,
        },
        incident: {
          ...props.draft.incident,
          financialLossState: state,
          moneyLost: state === "YES" ? true : state === "NO" ? false : null,
          statedTotalLoss:
            state === "NO" ? null : props.draft.incident.statedTotalLoss,
          reportedAmount:
            state === "NO" ? null : props.draft.incident.reportedAmount,
        },
        transactions: state === "NO" ? [] : props.draft.transactions,
      });
      return;
    }
    if (issue.type === "ENTITY_RELATIONSHIP") {
      props.onDraftChange(
        resolveEntityRelationship(
          props.draft,
          resolution as EntityRelationshipResolution,
        ),
      );
    }
  }

  return (
    <section
      className="report-workspace-stage section-pad"
      data-journey-focus
      data-private
      tabIndex={-1}
    >
      <div className="report-workspace-shell">
        {props.isDemoIncident && props.demoCase ? (
          <DemoCaseSelector
            activeCase={props.demoCase}
            onChange={props.onDemoCaseChange}
            onReset={props.onResetDemoCase}
          />
        ) : null}
        {props.mode === "REVIEW" ? (
          <button
            className="journey-context-back"
            type="button"
            onClick={props.onBackToEdit}
          >
            <span aria-hidden="true">‹</span>{" "}
            {locale === "hi" ? "घटना की जानकारी पर वापस जाएँ" : "Back to incident"}
          </button>
        ) : null}
        <JourneyProgress
          current={props.mode === "REVIEW" ? "RESTORE" : "REPORT"}
        />
        <div
          className={`report-workspace report-workspace-${props.mode.toLowerCase()}${props.draft ? " report-workspace-case-file" : ""}`}
        >
          <ReportInputPane {...props} />
          <ReportDetailsPane
            {...props}
            groups={groups}
            readiness={readiness}
            consistencyIssues={consistencyIssues}
            onResolveConsistencyIssue={resolveConsistencyIssue}
            sourceReady={sourceReady}
            onPrimaryAction={runPrimaryAction}
          />
        </div>
        <p className="visually-hidden" aria-live="polite">
          {navigationMessage}
        </p>
      </div>
    </section>
  );
}
