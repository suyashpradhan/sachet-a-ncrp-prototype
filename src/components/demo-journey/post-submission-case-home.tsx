"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CITIZEN_DOES_NOT_HAVE,
  type IncidentDraft,
  type TranscriptionResult,
} from "../../incident/schema";
import type { NcrpCompatibleComplaint } from "../../incident/ncrp-compatible-complaint";
import { resolveReportedAmount } from "../../incident/complaint-case";
import { useI18n } from "../../i18n/i18n-provider";
import { deriveEvidenceContributions } from "../../presentation/evidence-contributions";
import { getSafeCaseSummary } from "../../presentation/safe-case-copy";
import {
  getCaseSummary,
  getCaseStateExplanation,
  getKeepReadyPacket,
  getPostReportActions,
  getProcessExplainer,
  getPostSubmissionTimeline,
  type PostReportMilestones,
} from "../../presentation/post-report-case";
import { IncidentTimeline } from "./incident-timeline";
import { JourneyProgress } from "./journey-progress";
import { formatCurrency, formatIndiaShortDateWithYear } from "../../presentation/format";
import type { DemoCaseDefinition } from "../../incident/demo-incident";
import {
  deriveCitizenNudges,
  type ReminderPreferences,
} from "../../notifications/citizen-nudges";
import { citizenVisibleValue } from "../../presentation/citizen-visible-value";
import {
  OPEN_EVIDENCE_PREVIEW_EVENT,
  requestEvidencePreview,
} from "./evidence-preview-events";
import { ImmediateHandoff } from "./immediate-handoff";
import {
  derivePrivacyFirewallSummary,
  safeDerivedIdentifier,
  sanitizeDerivedText,
} from "../../presentation/evidence-privacy";
import { CaseUpdates } from "./case-updates";
import {
  createCaseUpdate,
  type CaseUpdate,
  type CaseUpdateCandidate,
} from "../../incident/case-update";
import type { IncidentTimelineEvent } from "../../presentation/incident-timeline";

function formatCaseTimestamp(value: string, hi: boolean) {
  return new Intl.DateTimeFormat(hi ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

type PostSubmissionCaseHomeProps = {
  draft: IncidentDraft;
  complaint: NcrpCompatibleComplaint;
  prototypeReference: string;
  screenshots: File[];
  caseUpdateEvidenceFiles: File[];
  unavailableEvidenceNames?: string[];
  caseUpdates: CaseUpdate[];
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
  milestones: PostReportMilestones;
  transcription: TranscriptionResult | null;
  reminderPreferences: ReminderPreferences;
  onReminderPreferencesChange: (preferences: ReminderPreferences) => void;
  onAddCaseUpdate: (update: CaseUpdate) => void;
  onProcessUpdateEvidence: (file: File) => Promise<CaseUpdateCandidate>;
  onStartNewReport: () => void;
};

function PrintableCaseReport({
  draft,
  prototypeReference,
  milestones,
  transcription,
}: Pick<
  PostSubmissionCaseHomeProps,
  "draft" | "prototypeReference" | "milestones" | "transcription"
>) {
  const { locale } = useI18n();
  const hi = locale === "hi";
  const summary = getCaseSummary(draft, locale);
  const submitted = new Intl.DateTimeFormat(hi ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(milestones.submittedAt));
  const displayedStatement = transcription
    ? hi && transcription.languageCode.startsWith("hi")
      ? transcription.originalTranscript
      : !hi && transcription.englishTranscript
        ? transcription.englishTranscript
        : transcription.originalTranscript
    : draft.incident.narrative;
  const affectedPlatforms = draft.adaptiveFacts.affectedPlatforms
    .map((value) => citizenVisibleValue(value))
    .filter((value): value is string => Boolean(value));
  const messageSourcePlatforms = draft.adaptiveFacts.messageSourcePlatforms
    .map((value) => citizenVisibleValue(value))
    .filter((value): value is string => Boolean(value));
  const affectedPlatform = citizenVisibleValue(draft.adaptiveFacts.platform);
  const affectedAccount = safeDerivedIdentifier(
    citizenVisibleValue(draft.adaptiveFacts.affectedAccount),
    "ACCOUNT",
  );
  const profileUrl = citizenVisibleValue(draft.adaptiveFacts.profileUrl);
  const accountAccessStatus = citizenVisibleValue(
    draft.adaptiveFacts.accountAccessStatus,
  );
  const threatChannel = citizenVisibleValue(draft.adaptiveFacts.threatChannel);
  const impersonatedEntity = citizenVisibleValue(
    draft.adaptiveFacts.impersonatedEntity,
  );
  const showAffectedAccount = Boolean(
    draft.adaptiveFacts.accountCompromise ||
    affectedAccount ||
    affectedPlatform ||
    affectedPlatforms.length > 0,
  );
  return (
    <article
      className="complaint-packet"
      aria-label={hi ? "प्रिंट करने योग्य रिपोर्ट" : "Printable report"}
    >
      <header>
        <p className="packet-brand">सचेत</p>
        <h1>
          {hi ? "तैयार साइबर अपराध रिपोर्ट" : "Prepared cybercrime report"}
        </h1>
        <p>
          {draft.officialMapping.subCategoryLabel ??
            draft.officialMapping.categoryLabel ??
            draft.citizenSummary.incidentLabel}
        </p>
      </header>
      {prototypeReference ? (
        <section>
          <h2>{hi ? "संदर्भ" : "Reference"}</h2>
          <p>{prototypeReference}</p>
          <p>
            {hi ? "जमा किया गया" : "Submitted"}: {submitted}
          </p>
        </section>
      ) : null}
      {draft.reportingPeople?.reportingFor === "SOMEONE_ELSE" ? (
        <section>
          <h2>{hi ? "इस शिकायत में लोग" : "People in this complaint"}</h2>
          <dl>
            <div>
              <dt>{hi ? "पीड़ित" : "Victim"}</dt>
              <dd>{draft.reportingPeople.victimName}</dd>
            </div>
            <div>
              <dt>{hi ? "रिपोर्ट करने में मदद करने वाला व्यक्ति" : "Person helping to report"}</dt>
              <dd>
                {draft.reportingPeople.helperName}
                {draft.reportingPeople.relationship
                  ? ` · ${draft.reportingPeople.relationship.replace(/^Other:\s*/, "")}`
                  : ""}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      <section>
        <h2>{hi ? "शिकायत की जानकारी" : "Complaint details"}</h2>
        <dl>
          {summary.map((item) => (
            <div key={item.id}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {displayedStatement ? (
        <section>
          <h2>
            {draft.reportingPeople?.reportingFor === "SOMEONE_ELSE" && draft.reportingPeople.victimName
              ? hi
                ? `${draft.reportingPeople.victimName} ने हमें क्या बताया`
                : `What ${draft.reportingPeople.victimName} told us`
              : hi ? "घटना का विवरण" : "Incident summary"}
          </h2>
          <p>{sanitizeDerivedText(displayedStatement)}</p>
        </section>
      ) : null}
      {draft.transactions.length > 0 ? (
        <section>
          <h2>{hi ? "लेन-देन" : "Transactions"}</h2>
          {draft.transactions.map((transaction, index) => {
            const reference = citizenVisibleValue(
              transaction.transactionIdOrUtr ?? transaction.referenceNumber,
            );
            const credit = transaction.direction === "CREDIT";
            return (
              <dl key={transaction.id}>
                <div>
                  <dt>{hi ? "लेन-देन" : "Transaction"}</dt>
                  <dd>{index + 1}</dd>
                </div>
                <div>
                  <dt>{hi ? "प्रकार" : "Type"}</dt>
                  <dd>
                    {credit
                      ? hi
                        ? "वापस मिला क्रेडिट"
                        : "Credit received back"
                      : hi
                        ? "भुगतान / डेबिट"
                        : "Payment / debit"}
                  </dd>
                </div>
                {transaction.amount ? (
                  <div>
                    <dt>{hi ? "राशि" : "Amount"}</dt>
                    <dd>₹{transaction.amount.toLocaleString("en-IN")}</dd>
                  </div>
                ) : null}
                {citizenVisibleValue(transaction.institution) ? (
                  <div>
                    <dt>{hi ? "बैंक या भुगतान ऐप" : "Bank or payment app"}</dt>
                    <dd>{citizenVisibleValue(transaction.institution)}</dd>
                  </div>
                ) : null}
                {transaction.transactionDate ? (
                  <div>
                    <dt>{hi ? "तारीख" : "Date"}</dt>
                    <dd>
                      {formatIndiaShortDateWithYear(
                        transaction.transactionDate,
                        locale,
                      )}
                    </dd>
                  </div>
                ) : null}
                {citizenVisibleValue(transaction.approximateTime) ? (
                  <div>
                    <dt>{hi ? "समय" : "Time"}</dt>
                    <dd>{citizenVisibleValue(transaction.approximateTime)}</dd>
                  </div>
                ) : null}
                {reference ? (
                  <div>
                    <dt>
                      {hi
                        ? "लेन-देन संदर्भ / UTR"
                        : "Transaction reference / UTR"}
                    </dt>
                    <dd>{reference}</dd>
                  </div>
                ) : null}
              </dl>
            );
          })}
        </section>
      ) : null}
      {showAffectedAccount ? (
        <section>
          <h2>{hi ? "प्रभावित खाता" : "Affected account"}</h2>
          <dl>
            {affectedPlatforms.length > 0 ? (
              <div>
                <dt>
                  {hi
                    ? "प्रभावित खाते या सेवाएँ"
                    : "Affected accounts or services"}
                </dt>
                <dd>{affectedPlatforms.join(", ")}</dd>
              </div>
            ) : affectedPlatform ? (
              <div>
                <dt>{hi ? "प्लेटफ़ॉर्म" : "Platform"}</dt>
                <dd>{affectedPlatform}</dd>
              </div>
            ) : null}
            {messageSourcePlatforms.length > 0 ? (
              <div>
                <dt>
                  {hi ? "संदेश में बताई गई सेवा" : "Message source platform"}
                </dt>
                <dd>{messageSourcePlatforms.join(", ")}</dd>
              </div>
            ) : null}
            {affectedAccount ? (
              <div>
                <dt>{hi ? "खाता या प्रोफ़ाइल" : "Account or profile"}</dt>
                <dd>{affectedAccount}</dd>
              </div>
            ) : null}
            {profileUrl ? (
              <div>
                <dt>{hi ? "प्रोफ़ाइल URL" : "Profile URL"}</dt>
                <dd>{profileUrl}</dd>
              </div>
            ) : null}
            {accountAccessStatus ? (
              <div>
                <dt>{hi ? "पहुँच की स्थिति" : "Access status"}</dt>
                <dd>{accountAccessStatus}</dd>
              </div>
            ) : null}
            {draft.adaptiveFacts.multipleIncidentThreads ? (
              <div>
                <dt>{hi ? "घटना के हिस्से" : "Incident threads"}</dt>
                <dd>
                  {hi
                    ? "दो अलग घटना-क्रम दर्ज हैं"
                    : "Two separate incident threads are recorded"}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      {draft.adaptiveFacts.threatOrExtortion ||
      draft.adaptiveFacts.impersonation ? (
        <section>
          <h2>{hi ? "धमकी या प्रतिरूपण" : "Threat or impersonation"}</h2>
          <dl>
            {draft.adaptiveFacts.demandedAmount ? (
              <div>
                <dt>{hi ? "मांगी गई राशि" : "Amount demanded"}</dt>
                <dd>
                  ₹{draft.adaptiveFacts.demandedAmount.toLocaleString("en-IN")}
                </dd>
              </div>
            ) : null}
            {threatChannel ? (
              <div>
                <dt>{hi ? "माध्यम" : "Channel"}</dt>
                <dd>{threatChannel}</dd>
              </div>
            ) : null}
            {impersonatedEntity ? (
              <div>
                <dt>{hi ? "दावा की गई पहचान" : "Claimed identity"}</dt>
                <dd>{impersonatedEntity}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
      {draft.adaptiveFacts.requestedSensitiveInfo.length > 0 ||
      draft.adaptiveFacts.sharedSensitiveInfo.length > 0 ? (
        <section>
          <h2>
            {hi
              ? "मांगी या साझा की गई जानकारी"
              : "Information requested or shared"}
          </h2>
          {draft.adaptiveFacts.requestedSensitiveInfo.length > 0 ? (
            <p>
              <strong>{hi ? "मांगी गई:" : "Requested:"}</strong>{" "}
              {draft.adaptiveFacts.requestedSensitiveInfo.join(", ")}
            </p>
          ) : null}
          {draft.adaptiveFacts.sharedSensitiveInfo.length > 0 ? (
            <p>
              <strong>{hi ? "साझा की गई:" : "Shared:"}</strong>{" "}
              {draft.adaptiveFacts.sharedSensitiveInfo.join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}
      {draft.evidence.length > 0 ? (
        <section>
          <h2>{hi ? "सबूत" : "Evidence"}</h2>
          <p>
            {draft.evidence.length}{" "}
            {hi
              ? "सबूत आइटम रिपोर्ट में शामिल"
              : "evidence items included with the report"}
          </p>
        </section>
      ) : null}
      <footer>
        <p>
          {hi
            ? "प्रोटोटाइप प्रति। यह आधिकारिक NCRP पावती या सरकारी सबमिशन रसीद नहीं है।"
            : "Prototype copy. Not an official NCRP acknowledgement or government submission receipt."}
        </p>
      </footer>
    </article>
  );
}

function EvidenceIncluded({
  draft,
  screenshots,
  caseUpdateEvidenceFiles,
  unavailableEvidenceNames = [],
  caseUpdates,
  isDemoIncident,
  demoCase,
}: Pick<
  PostSubmissionCaseHomeProps,
  "draft" | "screenshots" | "caseUpdateEvidenceFiles" | "caseUpdates" | "isDemoIncident" | "demoCase"
> & { unavailableEvidenceNames?: string[] }) {
  const { locale, t } = useI18n();
  const hi = locale === "hi";
  const originalItems = deriveEvidenceContributions(draft, {
    locale,
    isDemoIncident,
    screenshotNames: isDemoIncident
      ? (demoCase?.evidence.map((item) => item.label) ?? [])
      : screenshots.length > 0
        ? screenshots.map((file) => file.name)
        : unavailableEvidenceNames,
    demoEvidence: demoCase?.evidence,
  });
  const sourceEvidence = draft.evidence.filter(
    (item) => item.type !== "VOICE_STATEMENT",
  );
  const originalEvidenceNames = new Set(originalItems.map((item) => item.evidenceLabel));
  const updateEvidenceNames = Array.from(
    new Set(caseUpdates.flatMap((update) => update.addedEvidenceNames)),
  ).filter((name) => !originalEvidenceNames.has(name));
  const items = [
    ...originalItems.map((item, index) => ({
      ...item,
      rawFacts: sourceEvidence[index]?.extractedFacts ?? [],
      updateEvidence: false,
    })),
    ...updateEvidenceNames.map((name, index) => ({
      evidenceId: `case-update-evidence-${index}`,
      evidenceLabel: name,
      evidenceType: hi ? "मामले के अपडेट का सबूत" : "Case update evidence",
      contributions: caseUpdates.flatMap((update) =>
        update.changes
          .filter((change) => change.sourceEvidenceIds.includes(name))
          .map((change) => ({
            fieldKey: change.fieldId ?? `${update.id}-${change.label}`,
            label: change.label,
            displayValue: change.newValue,
          })),
      ),
      rawFacts: [] as string[],
      updateEvidence: true,
    })),
  ];
  const keptLabel = (value: string) => {
    if (value === "Authentication code") return t("privacy.authenticationCode");
    if (value === "Full account or card details") return t("privacy.fullIdentifier");
    if (value === "Unrelated balance") return t("privacy.unrelatedBalance");
    return value;
  };
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const activeItem = items.find((item) => item.evidenceId === activeEvidenceId);
  const demoEvidencePath = demoCase?.evidence.find(
    (item) => item.id === activeEvidenceId,
  )?.src ?? (
    activeItem?.updateEvidence &&
    demoCase?.caseUpdateFixture &&
    activeItem.evidenceLabel === (hi
      ? demoCase.caseUpdateFixture.evidenceNameHi
      : demoCase.caseUpdateFixture.evidenceName)
      ? demoCase.caseUpdateFixture.evidenceSrc
      : undefined
  );

  useEffect(() => {
    if (!activeEvidenceId || isDemoIncident) {
      setUploadedPreviewUrl(null);
      return;
    }
    const match = /^uploaded-(\d+)$/.exec(activeEvidenceId);
    const file = match
      ? screenshots[Number(match[1])]
      : activeItem?.updateEvidence
        ? caseUpdateEvidenceFiles.find((item) => item.name === activeItem.evidenceLabel)
        : null;
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUploadedPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [activeEvidenceId, activeItem?.evidenceLabel, activeItem?.updateEvidence, caseUpdateEvidenceFiles, isDemoIncident, screenshots]);

  useEffect(() => {
    if (activeItem && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [activeItem]);

  useEffect(() => {
    const openRequestedEvidence = (event: Event) => {
      const evidenceId = (event as CustomEvent<string>).detail;
      if (items.some((item) => item.evidenceId === evidenceId)) {
        setActiveEvidenceId(evidenceId);
      }
    };
    window.addEventListener(OPEN_EVIDENCE_PREVIEW_EVENT, openRequestedEvidence);
    return () =>
      window.removeEventListener(
        OPEN_EVIDENCE_PREVIEW_EVENT,
        openRequestedEvidence,
      );
  }, [items]);

  function closePreview() {
    dialogRef.current?.close();
    setActiveEvidenceId(null);
  }

  return (
    <section
      className="companion-section post-report-evidence"
      aria-labelledby="post-report-evidence-heading"
    >
      <h2 id="post-report-evidence-heading">
        {hi ? "शामिल सबूत" : "Evidence included"}
      </h2>
      {items.length === 0 ? (
        <p className="companion-section-note">
          {hi ? "कोई सबूत संलग्न नहीं है।" : "No evidence attached."}
        </p>
      ) : (
        <div className="evidence-contribution-list">
          {items.map((item) => (
            <article className="evidence-contribution" key={item.evidenceId}>
              <div className="evidence-contribution-title">
                <div>
                  <strong>{item.evidenceLabel}</strong>
                  <span>
                    {item.evidenceType}
                    {item.contributions.length > 0
                      ? ` · ${hi ? `${item.contributions.length} जानकारियों से जुड़ा` : `linked to ${item.contributions.length} ${item.contributions.length === 1 ? "detail" : "details"}`}`
                      : ""}
                  </span>
                </div>
                <button
                  className="text-button"
                  type="button"
                  data-evidence-id={item.evidenceId}
                  aria-haspopup="dialog"
                  onClick={() => requestEvidencePreview(item.evidenceId)}
                >
                  {hi ? "देखें" : "View"} →
                </button>
              </div>
              {item.updateEvidence && demoCase?.caseUpdateFixture &&
              item.evidenceLabel === (hi
                ? demoCase.caseUpdateFixture.evidenceNameHi
                : demoCase.caseUpdateFixture.evidenceName) ? (
                <button
                  className="update-evidence-thumbnail-button"
                  type="button"
                  aria-label={`${hi ? "मूल सबूत देखें" : "View original evidence"}: ${item.evidenceLabel}`}
                  onClick={() => requestEvidencePreview(item.evidenceId)}
                >
                  <Image
                    src={demoCase.caseUpdateFixture.evidenceSrc}
                    alt=""
                    width={220}
                    height={150}
                  />
                </button>
              ) : null}
              {item.updateEvidence && item.contributions.length > 0 ? (
                <div className="update-evidence-findings">
                  <strong>{hi ? "इस सबूत में मिला" : "Found in this evidence"}</strong>
                  <dl>
                    {item.contributions.slice(0, 3).map((fact) => (
                      <div key={`finding-${item.evidenceId}-${fact.fieldKey}`}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.displayValue}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {item.contributions.length > 0 ? (
                <details className="evidence-linkage-details">
                  <summary>
                    {hi ? "जुड़ी हुई जानकारी" : "Linked complaint details"}
                  </summary>
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
                  <div className="evidence-privacy-context">
                    <h4>{t("privacy.used")}</h4>
                    <ul>
                      {item.contributions.slice(0, 5).map((fact) => (
                        <li key={`used-${item.evidenceId}-${fact.fieldKey}`}>
                          {fact.label}: {fact.displayValue}
                        </li>
                      ))}
                    </ul>
                    {derivePrivacyFirewallSummary(item.rawFacts).keptOnlyInOriginal.length > 0 ? (
                      <>
                        <h4>{t("privacy.kept")}</h4>
                        <ul>
                          {derivePrivacyFirewallSummary(item.rawFacts).keptOnlyInOriginal.map((detail) => (
                            <li key={`${item.evidenceId}-${detail}`}>{keptLabel(detail)}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <p>{t("privacy.principle")}</p>
                  </div>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {!isDemoIncident && unavailableEvidenceNames.length > 0 ? (
        <p className="evidence-reattach-note" role="status">
          {t("case.evidenceReattach")}
        </p>
      ) : null}
      {activeItem ? (
        <dialog
          ref={dialogRef}
          className="evidence-preview-dialog"
          aria-labelledby="case-evidence-preview-title"
          onClose={() => setActiveEvidenceId(null)}
        >
          <>
            <div className="evidence-preview-dialog-header">
              <div>
                <p className="companion-eyebrow">
                  {hi ? "शामिल सबूत" : "Evidence included"}
                </p>
                <h2 id="case-evidence-preview-title">
                  {activeItem.evidenceLabel}
                </h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={closePreview}
              >
                {hi ? "बंद करें" : "Close"}
              </button>
            </div>
            {demoEvidencePath || uploadedPreviewUrl ? (
              <Image
                src={demoEvidencePath ?? uploadedPreviewUrl ?? ""}
                alt={activeItem.evidenceLabel}
                width={960}
                height={720}
                sizes="(max-width: 720px) 90vw, 720px"
                unoptimized={Boolean(uploadedPreviewUrl)}
              />
            ) : (
              <p>
                {hi
                  ? "पूर्वावलोकन उपलब्ध नहीं है।"
                  : "Preview is not available."}
              </p>
            )}
          </>
        </dialog>
      ) : null}
    </section>
  );
}

export function PostSubmissionCaseHome({
  draft,
  complaint,
  prototypeReference,
  screenshots,
  caseUpdateEvidenceFiles,
  unavailableEvidenceNames = [],
  caseUpdates,
  isDemoIncident,
  demoCase,
  milestones,
  transcription,
  reminderPreferences,
  onReminderPreferencesChange,
  onAddCaseUpdate,
  onProcessUpdateEvidence,
  onStartNewReport,
}: PostSubmissionCaseHomeProps) {
  const { locale, t } = useI18n();
  const hi = locale === "hi";
  const showPreparedFinancialHandoff =
    draft.classification.reportFamily === "FINANCIAL_FRAUD" &&
    draft.incident.moneyLost === true &&
    draft.transactions.length > 0 &&
    draft.incident.delayInReporting !== true;
  const summary = getCaseSummary(draft, locale);
  const actions = getPostReportActions(draft, locale).slice(0, 3);
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1);
  const keepReady = getKeepReadyPacket(draft, locale);
  const process = getProcessExplainer(draft, locale);
  const baseTimeline = getPostSubmissionTimeline(
    draft,
    locale,
    isDemoIncident,
    milestones,
  );
  const [copiedValue, setCopiedValue] = useState<
    "REFERENCE" | "SUMMARY" | null
  >(null);
  const missingReferenceIndex = draft.transactions.findIndex((transaction, index) => {
    if (transaction.transactionIdOrUtr === CITIZEN_DOES_NOT_HAVE) return false;
    const resolvedByUpdate = caseUpdates.some((update) =>
      update.changes.some(
        (change) =>
          change.fieldId === `transactions.${index}.transactionIdOrUtr`,
      ),
    );
    return (
      !resolvedByUpdate &&
      !transaction.transactionIdOrUtr &&
      !transaction.referenceNumber
    );
  });
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpValue, setFollowUpValue] = useState("");
  const [followUpSaved, setFollowUpSaved] = useState(false);
  const [managingReminders, setManagingReminders] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const nudges = deriveCitizenNudges(
    draft,
    locale,
    reminderPreferences,
    isDemoIncident ? "DEMO" : "LIVE",
    prototypeReference,
  ).filter(
    (nudge) =>
      missingReferenceIndex >= 0 || nudge.id !== "missing-transaction-reference",
  );
  const updateTimeline: IncidentTimelineEvent[] = caseUpdates.map(
    (update, index) => ({
      id: `case-update-${update.id}`,
      timeLabel: formatCaseTimestamp(update.createdAt, hi).replace(",", " ·"),
      title: hi
        ? `मामले का अपडेट #${index + 1} जोड़ा गया — ${update.summary}`
        : `Case update #${index + 1} added — ${update.summary}`,
      sourceRefs: [
        {
          type: "USER_CONFIRMED" as const,
          label:
            update.addedEvidenceNames.length > 0
              ? `${hi ? "स्रोत" : "Source"}: ${update.addedEvidenceNames.join(", ")}`
              : hi
                ? "स्रोत: नागरिक का अपडेट"
                : "Source: Citizen update",
        },
      ],
    }),
  );
  const timeline = [...baseTimeline, ...updateTimeline];
  const stateExplanation = getCaseStateExplanation(
    missingReferenceIndex >= 0 ? "ADDITIONAL_INFO_REQUESTED" : "SUBMITTED",
    locale,
  );
  const compactSummaryIds = [
    "reporting-path",
    "reported-loss",
    "additional-amount-requested",
    "money-lost",
    "transactions",
    "incident-date",
    "channel",
    "claimed-identity",
    "affected-platforms",
    "affected-account",
    "affected-platform",
  ];
  const compactSummary = compactSummaryIds
    .map((id) => summary.find((item) => item.id === id))
    .filter((item): item is (typeof summary)[number] => Boolean(item))
    .slice(0, 6);
  const latestUpdateValues = new Map<string, string>();
  caseUpdates.forEach((update) =>
    update.changes.forEach((change) => {
      if (change.fieldId) latestUpdateValues.set(change.fieldId, change.newValue);
    }),
  );
  const currentCaseSummary = compactSummary.map((item) => {
    const fieldId =
      item.id === "reported-loss"
        ? "incident.totalLoss"
        : item.id === "incident-date"
          ? "incident.incidentDate"
          : item.id === "claimed-identity"
            ? "adaptive.impersonatedEntity"
            : null;
    const updatedValue = fieldId ? latestUpdateValues.get(fieldId) : null;
    return {
      ...item,
      value:
        item.id === "incident-date" && updatedValue && /^\d{4}-\d{2}-\d{2}$/.test(updatedValue)
          ? formatIndiaShortDateWithYear(updatedValue, locale)
          : updatedValue ?? item.value,
      updated: Boolean(updatedValue),
    };
  });
  const currentIncidentTime = latestUpdateValues.get("incident.approximateTime");
  if (currentIncidentTime) {
    currentCaseSummary.splice(
      Math.min(4, currentCaseSummary.length),
      0,
      {
        id: "incident-time",
        label: hi ? "घटना का समय" : "Incident time",
        value: currentIncidentTime,
        updated: true,
      },
    );
  }
  const reportedLoss = summary.find((item) => item.id === "reported-loss")?.value;
  const evidenceToKeep = isDemoIncident
    ? (demoCase?.evidence.map((item) => (hi ? item.labelHi : item.label)) ?? [])
    : screenshots.length > 0
      ? screenshots.map((file) => file.name)
      : unavailableEvidenceNames;
  const updateEvidenceNames = Array.from(
    new Set(caseUpdates.flatMap((update) => update.addedEvidenceNames)),
  );
  const totalEvidenceCount = evidenceToKeep.length + updateEvidenceNames.length;
  const caseAtAGlance = [
    reportedLoss ? `${reportedLoss} ${hi ? "रिपोर्ट किया गया" : "reported"}` : null,
    draft.transactions.length > 0
      ? hi
        ? `${draft.transactions.length} लेन-देन`
        : `${draft.transactions.length} ${draft.transactions.length === 1 ? "transaction" : "transactions"}`
      : null,
    hi
      ? `${totalEvidenceCount} सबूत आइटम`
      : `${totalEvidenceCount} evidence ${totalEvidenceCount === 1 ? "item" : "items"}`,
  ].filter((item): item is string => Boolean(item));
  const processBoundaries = Array.from(
    new Set([
      stateExplanation.whatItDoesNotMean,
      ...process.importantBoundaries,
    ]),
  );
  const activeRecipient =
    reminderPreferences.channel === "EMAIL"
      ? reminderPreferences.email.trim()
      : reminderPreferences.whatsapp.trim();
  const recipientIsValid =
    reminderPreferences.channel === "EMAIL"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activeRecipient)
      : /^\+?91\s?[6-9](?:[\s-]?\d){9}$/.test(activeRecipient);
  const maskedRecipient =
    reminderPreferences.channel === "EMAIL"
      ? activeRecipient.replace(/^(.{1,2}).*(@.*)$/, "$1••••$2")
      : `+91 ••••• ${activeRecipient.replace(/\D/g, "").slice(-4)}`;
  function updateReminderPreferences(update: Partial<ReminderPreferences>) {
    onReminderPreferencesChange({ ...reminderPreferences, ...update });
  }

  function enableReminders() {
    if (!recipientIsValid) {
      setReminderError(
        reminderPreferences.channel === "EMAIL"
          ? hi
            ? "सही ईमेल पता दर्ज करें।"
            : "Enter a valid email address."
          : hi
            ? "सही भारतीय मोबाइल नंबर दर्ज करें।"
            : "Enter a valid Indian mobile number.",
      );
      return;
    }
    setReminderError(null);
    setManagingReminders(false);
    const normalizedWhatsapp = `+91 ${activeRecipient
      .replace(/\D/g, "")
      .slice(-10)
      .replace(/(\d{5})(\d{5})/, "$1 $2")}`;
    updateReminderPreferences({
      enabled: true,
      email: reminderPreferences.email.trim(),
      whatsapp:
        reminderPreferences.channel === "WHATSAPP"
          ? normalizedWhatsapp
          : reminderPreferences.whatsapp.trim(),
      scheduledAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      sentAt: null,
    });
  }

  function saveTransactionReference(value: string) {
    if (missingReferenceIndex < 0) return;
    const displayedValue =
      value === CITIZEN_DOES_NOT_HAVE
        ? hi
          ? "नागरिक के पास यह जानकारी नहीं है"
          : "Citizen does not have this information"
        : value;
    onAddCaseUpdate(
      createCaseUpdate({
        type: "NEW_INFORMATION",
        summary: hi
          ? `लेन-देन ${missingReferenceIndex + 1} संदर्भ जोड़ा गया`
          : `Transaction ${missingReferenceIndex + 1} reference added`,
        changes: [
          {
            fieldId: `transactions.${missingReferenceIndex}.transactionIdOrUtr`,
            label: hi
              ? `लेन-देन ${missingReferenceIndex + 1} संदर्भ`
              : `Transaction ${missingReferenceIndex + 1} reference`,
            previousValue: null,
            newValue: displayedValue,
            sourceEvidenceIds: [],
          },
        ],
        addedEvidenceNames: [],
        citizenNote: null,
      }),
    );
    setFollowUpOpen(false);
    setFollowUpSaved(true);
  }

  async function copyText(value: string, kind: "REFERENCE" | "SUMMARY") {
    await navigator.clipboard.writeText(value);
    setCopiedValue(kind);
    window.setTimeout(() => setCopiedValue(null), 1600);
  }

  function printReport() {
    const previousTitle = document.title;
    document.title = "सचेत — Prepared cybercrime report";
    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  }

  return (
    <section
      className="journey-stage post-submission-case section-pad"
      data-journey-focus
      tabIndex={-1}
    >
      <div className="shell post-submission-shell">
        <JourneyProgress current="RESOLUTION" completeCurrent />
        <div className="reading-shell post-submission-content">
          <header className="post-submission-header">
            <p className="companion-eyebrow">{hi ? "आपका मामला" : "Your case"}</p>
            <div className="post-submission-title-row">
              <h1 tabIndex={-1}>{prototypeReference}</h1>
              <button
                className="text-button"
                type="button"
                onClick={() => void copyText(prototypeReference, "REFERENCE")}
              >
                {copiedValue === "REFERENCE"
                  ? hi ? "कॉपी हो गया" : "Copied"
                  : t("case.copyReference")}
              </button>
            </div>
            <p className="case-at-a-glance">{caseAtAGlance.join(" · ")}</p>
            <div className="prototype-reference-line">
              <span className="success-mark" aria-hidden="true">✓</span>
              <strong>
                {isDemoIncident
                  ? hi ? "डेमो शिकायत जमा हो गई" : "Demo complaint submitted"
                  : hi ? "शिकायत सचेत में तैयार है" : "Complaint ready in Sachet"}
              </strong>
              <span>· {formatCaseTimestamp(milestones.submittedAt, hi)}</span>
            </div>
            {!isDemoIncident ? (
              <p className="source-note">
                {t("case.keepReference")}
              </p>
            ) : null}
            <p className="prototype-boundary">
              {isDemoIncident
                ? hi
                  ? "यह एक सिंथेटिक डेमो है। कोई शिकायत NCRP या किसी अन्य सरकारी प्रणाली को नहीं भेजी गई।"
                  : "This is a synthetic demo. No complaint was sent to NCRP or another government system."
                : hi
                  ? "शिकायत की जानकारी इस प्रोटोटाइप में तैयार हुई है। इसे NCRP या किसी अन्य सरकारी प्रणाली को नहीं भेजा गया।"
                  : "Your complaint details were prepared in this prototype. They have not been sent to NCRP or another government system."}
            </p>
          </header>

          <nav className="case-home-anchor-nav" aria-label={hi ? "मामले के हिस्से" : "Case sections"}>
            <a href="#case-overview">{hi ? "सारांश" : "Overview"}</a>
            <a href="#case-updates-heading">{hi ? "अपडेट" : "Updates"}</a>
            <a href="#post-report-evidence-heading">{hi ? "सबूत" : "Evidence"}</a>
            <a href="#incident-timeline-heading">{hi ? "इतिहास" : "History"}</a>
          </nav>

          <div id="case-updates">
            <CaseUpdates
              originalDraft={draft}
              updates={caseUpdates}
              isDemoIncident={isDemoIncident}
              demoCase={demoCase}
              onAddUpdate={onAddCaseUpdate}
              onProcessEvidence={onProcessUpdateEvidence}
            />
          </div>

          {showPreparedFinancialHandoff ? (
            <div id="case-overview">
              <ImmediateHandoff
                draft={draft}
                complaint={complaint}
                amountResolution={resolveReportedAmount(draft)}
                reference={prototypeReference}
                isDemoIncident={isDemoIncident}
                sourceLanguageCode={transcription?.languageCode}
                onViewCaseSummary={() => {
                  const target = document.querySelector<HTMLElement>(
                    "#post-submission-case-summary",
                  );
                  target?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "auto"
                      : "smooth",
                    block: "start",
                  });
                  target?.focus({ preventScroll: true });
                }}
              />
            </div>
          ) : null}

          <div
            id={showPreparedFinancialHandoff ? undefined : "case-overview"}
            className={`post-submission-priority-grid${showPreparedFinancialHandoff ? " post-submission-priority-grid-single" : ""}`}
          >
            {!showPreparedFinancialHandoff ? (
              <section
              className="companion-section immediate-action-section"
              aria-labelledby="post-report-actions-heading"
              >
              <h2 id="post-report-actions-heading">
                {hi ? "अब मुझे क्या करना चाहिए?" : "What should I do now?"}
              </h2>
              {primaryAction ? (
                <article className="post-report-primary-action">
                  <p className="companion-eyebrow">
                    {hi ? "सबसे पहले" : "First"}
                  </p>
                  <h3>{primaryAction.title}</h3>
                  <p>{primaryAction.description}</p>
                  {primaryAction.href ? (
                    <a className="primary-button" href={primaryAction.href}>
                      {primaryAction.title}
                    </a>
                  ) : null}
                </article>
              ) : null}
              {secondaryActions.length > 0 ? (
                <ol className="post-report-action-list post-report-secondary-actions">
                  {secondaryActions.map((action, index) => (
                    <li key={action.id}>
                      <span aria-hidden="true">
                        {String(index + 2).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>
                          {action.href ? (
                            <a href={action.href}>{action.title}</a>
                          ) : (
                            action.title
                          )}
                        </h3>
                        <p>{action.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              </section>
            ) : null}

            <section
              id="post-submission-case-summary"
              className="companion-section complaint-summary-section"
              aria-labelledby="case-summary-heading"
              tabIndex={-1}
            >
              <h2 id="case-summary-heading">
                {hi ? "मौजूदा मामला" : "Current case"}
              </h2>
              <dl className="companion-summary-list current-case-summary-list">
                {currentCaseSummary.map((item) => (
                  <div key={item.id}>
                    <dt>{item.label}</dt>
                    <dd>
                      {item.value}
                      {item.updated ? (
                        <small className="updated-after-report">
                          {hi ? "मूल रिपोर्ट के बाद अपडेट हुआ" : "Updated after original report"}
                        </small>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <details className="submitted-complaint-details current-case-details">
                <summary>{hi ? "मौजूदा मामले की पूरी जानकारी देखें" : "View full complaint"}</summary>
                <dl className="companion-summary-list">
                  {currentCaseSummary.map((item) => (
                    <div key={`current-${item.id}`}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <details className="keep-safe-details">
                <summary>{hi ? "इन्हें सुरक्षित रखें" : "Keep these safe"}</summary>
                <ul className="post-submit-keep-list">
                  {[...evidenceToKeep, ...updateEvidenceNames].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>{hi ? "शिकायत की प्रति" : "Complaint copy"}</li>
                </ul>
              </details>
              <details className="submitted-complaint-details">
                <summary>
                  {hi
                    ? "मूल शिकायत देखें"
                    : "View original complaint"}
                </summary>
                <div className="submitted-complaint-details-content">
                  <h3 className="post-submit-summary-heading">{t("updates.originalComplaint")}</h3>
                  <dl className="companion-summary-list">
                    {summary.map((item) => (
                      <div key={`full-${item.id}`}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {draft.incident.narrative ? (
                    <div className="submitted-statement">
                      <h3>{hi ? "बयान" : "Statement"}</h3>
                      <p>{sanitizeDerivedText(draft.incident.narrative)}</p>
                    </div>
                  ) : null}
                  {draft.transactions.length > 0 ? (
                    <div className="submitted-transaction-details">
                      <h3>{hi ? "लेन-देन" : "Transactions"}</h3>
                      <div className="submitted-transaction-list">
                        {draft.transactions.map((transaction, index) => (
                          <article key={transaction.id}>
                            <h4>
                              {transaction.direction === "CREDIT"
                                ? hi
                                  ? `वापस मिला क्रेडिट ${index + 1}`
                                  : `Credit received ${index + 1}`
                                : hi
                                  ? `लेन-देन ${index + 1}`
                                  : `Transaction ${index + 1}`}
                            </h4>
                            <dl>
                              {transaction.amount ? (
                                <div>
                                  <dt>{hi ? "राशि" : "Amount"}</dt>
                                  <dd>
                                    ₹
                                    {transaction.amount.toLocaleString("en-IN")}
                                  </dd>
                                </div>
                              ) : null}
                              {citizenVisibleValue(transaction.institution) ? (
                                <div>
                                  <dt>
                                    {hi
                                      ? "बैंक या भुगतान ऐप"
                                      : "Bank or payment app"}
                                  </dt>
                                  <dd>
                                    {citizenVisibleValue(
                                      transaction.institution,
                                    )}
                                  </dd>
                                </div>
                              ) : null}
                              {transaction.transactionDate ? (
                                <div>
                                  <dt>{hi ? "तारीख" : "Date"}</dt>
                                  <dd>
                                    {formatIndiaShortDateWithYear(
                                      transaction.transactionDate,
                                      locale,
                                    )}
                                  </dd>
                                </div>
                              ) : null}
                              {citizenVisibleValue(
                                transaction.approximateTime,
                              ) ? (
                                <div>
                                  <dt>{hi ? "समय" : "Time"}</dt>
                                  <dd>
                                    {citizenVisibleValue(
                                      transaction.approximateTime,
                                    )}
                                  </dd>
                                </div>
                              ) : null}
                              {citizenVisibleValue(
                                transaction.transactionIdOrUtr ??
                                  transaction.referenceNumber,
                              ) ? (
                                <div>
                                  <dt>
                                    {hi
                                      ? "लेन-देन संदर्भ / UTR"
                                      : "Transaction reference / UTR"}
                                  </dt>
                                  <dd>
                                    {citizenVisibleValue(
                                      transaction.transactionIdOrUtr ??
                                        transaction.referenceNumber,
                                    )}
                                  </dd>
                                </div>
                              ) : null}
                            </dl>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {keepReady.length > 0 ? (
                    <div className="case-keep-ready">
                      <h3>
                        {hi
                          ? "ये जानकारी तैयार रखें"
                          : "Keep these details ready"}
                      </h3>
                      <ul>
                        {keepReady.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {missingReferenceIndex >= 0 || followUpSaved ? (
                    <div
                      className="prototype-follow-up"
                      aria-labelledby="follow-up-heading"
                    >
                      <h3 id="follow-up-heading">
                        {followUpSaved
                          ? hi
                            ? "जानकारी अपडेट हो गई"
                            : "Detail updated"
                          : hi
                            ? "लेन-देन संदर्भ जोड़ें"
                            : "Add transaction reference"}
                      </h3>
                      {followUpSaved ? (
                        <p>
                          {hi
                            ? "लेन-देन संदर्भ की पुष्टि आपने की है।"
                            : "The transaction reference is now confirmed by you."}
                        </p>
                      ) : (
                        <>
                          <p>
                            {hi
                              ? `लेन-देन ${missingReferenceIndex + 1} का UTR या संदर्भ उपलब्ध हो तो जोड़ें।`
                              : `Add the UTR or reference for transaction ${missingReferenceIndex + 1} if it is available.`}
                          </p>
                          {followUpOpen ? (
                            <div className="prototype-follow-up-form">
                              <label htmlFor="post-report-transaction-reference">
                                {hi
                                  ? "लेन-देन संदर्भ / UTR"
                                  : "Transaction reference / UTR"}
                              </label>
                              <input
                                id="post-report-transaction-reference"
                                value={followUpValue}
                                onChange={(event) =>
                                  setFollowUpValue(event.target.value)
                                }
                                autoFocus
                              />
                              <div className="entry-actions">
                                <button
                                  className="primary-button"
                                  type="button"
                                  disabled={!followUpValue.trim()}
                                  onClick={() =>
                                    saveTransactionReference(
                                      followUpValue.trim(),
                                    )
                                  }
                                >
                                  {hi ? "जानकारी जोड़ें" : "Add detail"}
                                </button>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() =>
                                    saveTransactionReference(
                                      CITIZEN_DOES_NOT_HAVE,
                                    )
                                  }
                                >
                                  {hi
                                    ? "यह मेरे पास नहीं है"
                                    : "I don’t have this"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => setFollowUpOpen(true)}
                            >
                              {hi ? "जानकारी जोड़ें" : "Add detail"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </details>
            </section>
          </div>

          <section
            className="companion-section secondary-process-section"
            aria-labelledby="post-report-process-heading"
          >
            <details className="secondary-process-disclosure">
              <summary>
                <span id="post-report-process-heading">
                  <strong>{hi ? "आगे क्या हो सकता है" : "What may happen next"}</strong>
                  <small>
                    {hi
                      ? "आधिकारिक पावती, शिकायत की प्रक्रिया और वित्तीय धोखाधड़ी की कार्रवाई आगे हो सकती है।"
                      : "Official acknowledgement, complaint handling and financial-fraud response may follow."}
                  </small>
                </span>
                <span>{hi ? "प्रक्रिया समझें" : "Understand the process"}</span>
              </summary>
              <div className="secondary-process-content">
                <ol className="post-report-stage-list compact-process-list">
                  {process.possibleNextStages.slice(0, 3).map((stage, index) => (
                    <li key={stage.id}>
                      <span aria-hidden="true">{index + 1}</span>
                      <div>
                        <strong>{stage.title}</strong>
                        <p>{stage.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="source-note">
                  {hi
                    ? "सचेत के पास सरकार, पुलिस, बैंक या भुगतान प्रदाता की लाइव केस स्थिति उपलब्ध नहीं है।"
                    : "Sachet does not have live access to government, police, bank or payment-provider case status."}
                </p>
                <details className="process-boundaries-disclosure">
                  <summary>
                    {hi ? "इसका क्या अर्थ नहीं है" : "What this does not mean"}
                  </summary>
                  <ul className="post-report-boundary-list">
                    {processBoundaries.map((boundary) => (
                      <li key={boundary}>{boundary}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </details>
          </section>

          <section className="companion-section post-report-timeline-section">
            <IncidentTimeline
              events={timeline}
              heading={hi ? "मामले की समयरेखा" : "Case timeline"}
              groupByDate
            />
          </section>

          <section
            className="companion-section stay-informed"
            aria-labelledby="stay-informed-heading"
          >
            <div>
              <h2 id="stay-informed-heading">
                {hi
                  ? "अपनी शिकायत पर नज़र रखें"
                  : "Stay on top of your complaint"}
              </h2>
              <p>
                {hi
                  ? "जरूरी अगले कदमों और सुरक्षित रखने वाले सबूतों के बारे में आसान रिमाइंडर पाएँ।"
                  : "Get simple reminders about important next steps and evidence you may need to keep safe."}
              </p>
            </div>
            {reminderPreferences.enabled && !managingReminders ? (
              <div className="reminders-confirmed" role="status">
                <span className="success-mark" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <h3>{hi ? "रिमाइंडर चालू हैं" : "Reminders on"}</h3>
                  <strong>
                    {reminderPreferences.channel === "EMAIL"
                      ? hi
                        ? "ईमेल"
                        : "Email"
                      : "WhatsApp"}{" "}
                    · {maskedRecipient}
                  </strong>
                  <p>
                    {hi
                      ? "हम आपको जरूरी अगले कदमों, सबूतों और फॉलो-अप कार्रवाई के बारे में याद दिलाएँगे।"
                      : "We’ll remind you about important next steps, evidence and follow-up actions."}
                  </p>
                  {isDemoIncident ? (
                    <p className="source-note">
                      {hi
                        ? "केवल डेमो पूर्वावलोकन — कोई असली संदेश नहीं भेजा गया।"
                        : "Demo preview only — no real message was sent."}
                    </p>
                  ) : null}
                  <div className="entry-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setManagingReminders(true)}
                    >
                      {hi ? "माध्यम बदलें" : "Change channel"}
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        updateReminderPreferences({
                          enabled: false,
                          scheduledAt: null,
                          sentAt: null,
                        })
                      }
                    >
                      {hi ? "रिमाइंडर बंद करें" : "Turn off reminders"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="reminder-setup">
                <fieldset className="reminder-channel-options">
                  <legend>
                    {hi ? "रिमाइंडर का माध्यम" : "Reminder channel"}
                  </legend>
                  <label>
                    <input
                      type="radio"
                      name="notification-channel"
                      value="EMAIL"
                      checked={reminderPreferences.channel === "EMAIL"}
                      onChange={() =>
                        updateReminderPreferences({ channel: "EMAIL" })
                      }
                    />
                    <span>{hi ? "ईमेल" : "Email"}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="notification-channel"
                      value="WHATSAPP"
                      checked={reminderPreferences.channel === "WHATSAPP"}
                      onChange={() =>
                        updateReminderPreferences({ channel: "WHATSAPP" })
                      }
                    />
                    <span>WhatsApp</span>
                  </label>
                </fieldset>
                <label className="reminder-contact-field">
                  <span>
                    {reminderPreferences.channel === "EMAIL"
                      ? hi
                        ? "ईमेल पता"
                        : "Email address"
                      : hi
                        ? "WhatsApp नंबर"
                        : "WhatsApp number"}
                  </span>
                  <input
                    type={
                      reminderPreferences.channel === "EMAIL" ? "email" : "tel"
                    }
                    inputMode={
                      reminderPreferences.channel === "EMAIL" ? "email" : "tel"
                    }
                    autoComplete={
                      reminderPreferences.channel === "EMAIL" ? "email" : "tel"
                    }
                    value={
                      reminderPreferences.channel === "EMAIL"
                        ? reminderPreferences.email
                        : reminderPreferences.whatsapp
                    }
                    onChange={(event) =>
                      updateReminderPreferences(
                        reminderPreferences.channel === "EMAIL"
                          ? { email: event.target.value }
                          : { whatsapp: event.target.value },
                      )
                    }
                    placeholder={
                      reminderPreferences.channel === "EMAIL"
                        ? "name@example.com"
                        : "+91 98765 43210"
                    }
                  />
                </label>
                {reminderError ? (
                  <p className="form-error" role="alert">
                    {reminderError}
                  </p>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  onClick={enableReminders}
                >
                  {hi ? "रिमाइंडर चालू करें" : "Turn on reminders"}
                </button>
                {managingReminders ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setManagingReminders(false)}
                  >
                    {hi ? "रद्द करें" : "Cancel"}
                  </button>
                ) : null}
                <p className="source-note">
                  {isDemoIncident
                    ? hi
                      ? "सिंथेटिक संपर्क · केवल डेमो पूर्वावलोकन"
                      : "Synthetic contact · Demo preview only"
                    : hi
                      ? "यह संपर्क केवल आपके द्वारा चालू किए गए प्रोटोटाइप रिमाइंडर के लिए इस सत्र में उपयोग होता है। कोई असली संदेश नहीं भेजा जाएगा।"
                      : "This contact is used only in this session for the prototype reminders you enable. No real message will be sent."}
                </p>
              </div>
            )}
            {reminderPreferences.enabled ? (
              <div
                className="reminder-preview"
                aria-label={hi ? "आने वाले रिमाइंडर" : "Upcoming reminders"}
              >
                <h3>
                  {reminderPreferences.sentAt
                    ? hi
                      ? "रिमाइंडर भेजा गया"
                      : "Reminder sent"
                    : hi
                      ? "आने वाले रिमाइंडर"
                      : "Upcoming reminders"}
                </h3>
                {nudges.slice(0, 2).map((nudge) => (
                  <article key={nudge.id}>
                    <span>
                      {nudge.deliveryState === "SENT"
                        ? hi
                          ? "भेजा गया"
                          : "Sent"
                        : nudge.schedule === "TODAY"
                          ? hi
                            ? "आज"
                            : "Today"
                          : hi
                            ? "कल"
                            : "Tomorrow"}
                    </span>
                    <strong>{nudge.title}</strong>
                    <p>{nudge.body}</p>
                  </article>
                ))}
                <p className="source-note">
                  {isDemoIncident
                    ? hi
                      ? "सिंथेटिक डेमो · NCRP से जुड़ा नहीं · कोई असली संदेश नहीं भेजा गया"
                      : "Synthetic demo · Not connected to NCRP · No real message was sent"
                    : hi
                      ? "इस प्रोटोटाइप सत्र में रिमाइंडर सहेजा गया · कोई बाहरी संदेश नहीं भेजा गया"
                      : "Reminder saved in this prototype session · No external message was sent"}
                </p>
              </div>
            ) : null}
          </section>

          <EvidenceIncluded
            draft={draft}
            screenshots={screenshots}
            caseUpdateEvidenceFiles={caseUpdateEvidenceFiles}
            unavailableEvidenceNames={unavailableEvidenceNames}
            caseUpdates={caseUpdates}
            isDemoIncident={isDemoIncident}
            demoCase={demoCase}
          />

          <section
            className="companion-section case-copy-section"
            aria-labelledby="complaint-actions-heading"
          >
            <h2 id="complaint-actions-heading">
              {hi ? "मामले के विकल्प" : "Case actions"}
            </h2>
            <div className="case-copy-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  void copyText(
                    getSafeCaseSummary(draft, prototypeReference, locale),
                    "SUMMARY",
                  )
                }
              >
                {copiedValue === "SUMMARY"
                  ? hi ? "सार कॉपी हो गया" : "Summary copied"
                  : hi ? "मामले का सार कॉपी करें" : "Copy case summary"}
              </button>
              <button className="secondary-button" type="button" onClick={printReport}>
                {hi ? "प्रिंट करें या PDF सहेजें" : "Print or save PDF"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={onStartNewReport}
              >
                {hi ? "नई शिकायत शुरू करें" : "Start new complaint"}
              </button>
            </div>
          </section>
          <PrintableCaseReport
            draft={draft}
            prototypeReference={prototypeReference}
            milestones={milestones}
            transcription={transcription}
          />
        </div>
      </div>
    </section>
  );
}
