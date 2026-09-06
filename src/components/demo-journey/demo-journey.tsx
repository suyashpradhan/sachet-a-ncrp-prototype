"use client";

import posthog from "posthog-js";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  DEFAULT_DEMO_CASE_ID,
  getDemoCase,
  type DemoCaseId,
  type DemoNarrationLanguage,
} from "../../incident/demo-incident";
import {
  buildSyntheticCaseFromComplaint,
  resolveReportedAmount,
} from "../../incident/complaint-case";
import {
  applyMissingAnswer,
  type MissingQuestion,
} from "../../incident/missing-information";
import { normalizeIncidentDraft } from "../../incident/normalization";
import { sanitizeSensitiveText } from "../../incident/sensitive-text";
import {
  buildNcrpCompatibleComplaint,
  type NcrpCompatibleComplaint,
} from "../../incident/ncrp-compatible-complaint";
import {
  IncidentDraftSchema,
  safeParseIncidentDraft,
  TranscriptionResultSchema,
  type IncidentDraft,
  type ReportFamily,
  type TranscriptionResult,
} from "../../incident/schema";
import { applyReportFamily } from "../../incident/classification";
import {
  SYNTHETIC_NCRP_PROFILE,
  createEmptyTestProfile,
} from "../../experience/profile";
import { useI18n } from "../../i18n/i18n-provider";
import { useJourneyNavigation } from "../../navigation/journey-navigation";
import { deriveReportReadiness } from "../../presentation/report-readiness";
import type { PostReportMilestones } from "../../presentation/post-report-case";
import {
  createReminderPreferences,
  type ReminderPreferences,
} from "../../notifications/citizen-nudges";
import { DEMO_CASE_ACCESS, useDemoCase } from "../demo-case/demo-case-provider";
import { PostSubmissionCaseHome } from "./post-submission-case-home";
import { LandingPage } from "./landing-page";
import {
  ReportWorkspace,
  type PreparationFailure,
  type ReportMethod,
  type ReportWorkspaceMode,
} from "./report-workspace";

type JourneyView =
  | "ENTRY"
  | "REPORT_INPUT"
  | "ANALYSING"
  | "ANALYSIS_RESULT"
  | "REVIEW"
  | "SUCCESS"
  | "ANALYSIS_ERROR";

const DEMO_SESSION_KEY = "sachet-deterministic-demo-v3";
const UNFINISHED_REPORT_KEY = "sachet-unfinished-report-v1";
const DEMO_POST_REPORT_MILESTONES: PostReportMilestones = {
  preparedAt: "2026-09-04T04:30:00.000Z",
  reviewedAt: "2026-09-04T04:33:00.000Z",
  submittedAt: "2026-09-04T04:35:00.000Z",
};
const DEMO_RESTORABLE_VIEWS = new Set<JourneyView>([
  "ANALYSIS_RESULT",
  "REVIEW",
]);

type PersistedDemoSession = {
  version: 3;
  view: JourneyView;
  draft: IncidentDraft;
  narrative: string;
  transcription: TranscriptionResult;
  demoNarrationLanguage: DemoNarrationLanguage;
  recordingSeconds: number;
  submittedReference: string;
  postReportMilestones?: PostReportMilestones | null;
  demoCaseId?: DemoCaseId;
  reminderPreferences?: ReminderPreferences;
};

type PersistedEvidenceMetadata = {
  name: string;
  type: string;
  size: number;
  lastModified: number;
};

type PersistedUnfinishedReport = {
  version: 1;
  view: "REPORT_INPUT" | "ANALYSIS_RESULT" | "REVIEW";
  reportMethod: ReportMethod;
  reporterName: string;
  narrative: string;
  transcription: TranscriptionResult | null;
  draft: IncidentDraft | null;
  missingAnswers: Record<string, string>;
  selectedReportedAmount: number | null;
  recordingSeconds: number;
  hadRecording: boolean;
  evidenceMetadata: PersistedEvidenceMetadata[];
  preparedSourceSignature: string | null;
};

function isPostReportMilestones(
  value: PostReportMilestones | null | undefined,
): value is PostReportMilestones {
  return Boolean(
    value &&
      typeof value.preparedAt === "string" &&
      typeof value.reviewedAt === "string" &&
      typeof value.submittedAt === "string",
  );
}

function isReminderPreferences(value: unknown): value is ReminderPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReminderPreferences>;
  return Boolean(
    typeof candidate.enabled === "boolean" &&
      (candidate.channel === "EMAIL" || candidate.channel === "WHATSAPP") &&
      typeof candidate.email === "string" &&
      typeof candidate.whatsapp === "string" &&
      candidate.categories &&
      typeof candidate.categories.IMPORTANT_ACTIONS === "boolean" &&
      typeof candidate.categories.MISSING_DETAILS === "boolean" &&
      typeof candidate.categories.EVIDENCE_SAFETY === "boolean" &&
      typeof candidate.categories.FOLLOW_UP === "boolean" &&
      (candidate.scheduledAt === null || typeof candidate.scheduledAt === "string") &&
      (candidate.sentAt === null || typeof candidate.sentAt === "string"),
  );
}

function sanitizeForDeviceStorage<T>(value: T): T {
  if (typeof value === "string") return sanitizeSensitiveText(value).text as T;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForDeviceStorage(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeForDeviceStorage(item),
      ]),
    ) as T;
  }
  return value;
}

function readUnfinishedReport(): PersistedUnfinishedReport | null {
  try {
    const stored = window.localStorage.getItem(UNFINISHED_REPORT_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<PersistedUnfinishedReport>;
    if (
      candidate.version !== 1 ||
      !["REPORT_INPUT", "ANALYSIS_RESULT", "REVIEW"].includes(
        candidate.view ?? "",
      ) ||
      !["SPEAK", "UPLOAD", "TYPE"].includes(candidate.reportMethod ?? "") ||
      typeof candidate.reporterName !== "string" ||
      typeof candidate.narrative !== "string" ||
      typeof candidate.recordingSeconds !== "number" ||
      typeof candidate.hadRecording !== "boolean" ||
      !Array.isArray(candidate.evidenceMetadata)
    ) {
      window.localStorage.removeItem(UNFINISHED_REPORT_KEY);
      return null;
    }
    const parsedDraft = candidate.draft
      ? safeParseIncidentDraft(candidate.draft)
      : null;
    const parsedTranscription = candidate.transcription
      ? TranscriptionResultSchema.safeParse(candidate.transcription)
      : null;
    if (
      (parsedDraft && !parsedDraft.success) ||
      (parsedTranscription && !parsedTranscription.success)
    ) {
      window.localStorage.removeItem(UNFINISHED_REPORT_KEY);
      return null;
    }
    return {
      version: 1,
      view: candidate.view as PersistedUnfinishedReport["view"],
      reportMethod: candidate.reportMethod as ReportMethod,
      reporterName: candidate.reporterName,
      narrative: candidate.narrative,
      transcription: parsedTranscription?.success
        ? parsedTranscription.data
        : null,
      draft: parsedDraft?.success ? parsedDraft.data : null,
      missingAnswers:
        candidate.missingAnswers && typeof candidate.missingAnswers === "object"
          ? candidate.missingAnswers
          : {},
      selectedReportedAmount:
        typeof candidate.selectedReportedAmount === "number"
          ? candidate.selectedReportedAmount
          : null,
      recordingSeconds: candidate.recordingSeconds,
      hadRecording: candidate.hadRecording,
      evidenceMetadata: candidate.evidenceMetadata.filter(
        (item): item is PersistedEvidenceMetadata =>
          Boolean(
            item &&
              typeof item.name === "string" &&
              typeof item.type === "string" &&
              typeof item.size === "number" &&
              typeof item.lastModified === "number",
          ),
      ),
      preparedSourceSignature:
        typeof candidate.preparedSourceSignature === "string"
          ? candidate.preparedSourceSignature
          : null,
    };
  } catch {
    return null;
  }
}

function clearUnfinishedReport() {
  try {
    window.localStorage.removeItem(UNFINISHED_REPORT_KEY);
  } catch {
    // Local recovery is optional when storage is unavailable.
  }
}

function restoredJourneyHistory(view: JourneyView): JourneyView[] {
  const history: JourneyView[] = ["ENTRY"];
  if (view === "ANALYSIS_RESULT") return history;
  if (view === "SUCCESS") return history;
  history.push("ANALYSIS_RESULT");
  if (view === "REVIEW") return history;
  return history;
}

function clearPersistedDemoSession() {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // The deterministic demo still works in memory when storage is unavailable.
  }
}

function reportSourceSignature(input: {
  narrative: string;
  reporterName: string;
  transcription: TranscriptionResult | null;
  screenshots: File[];
  audio: Blob | null;
}): string {
  return JSON.stringify({
    narrative: input.narrative.trim(),
    transcript: input.transcription?.englishTranscript ?? "",
    screenshots: input.screenshots.map((file) => [
      file.name,
      file.size,
      file.lastModified,
    ]),
    audio: input.audio ? [input.audio.size, input.audio.type] : null,
  });
}

function currentIndiaDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function compressScreenshot(file: File): Promise<File> {
  if (file.size <= 1_500_000 || typeof createImageBitmap === "undefined") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export function DemoJourney() {
  const { locale, setLocale, t } = useI18n();
  const { registerControls } = useJourneyNavigation();
  const {
    experienceMode,
    reporterProfile,
    beginExperience,
    setReporterProfile,
    hydrateComplaintCase,
    resetDemo,
  } = useDemoCase();
  const [view, setView] = useState<JourneyView>("ENTRY");
  const [reportMethod, setReportMethod] = useState<ReportMethod>("SPEAK");
  const [draft, setDraft] = useState<IncidentDraft | null>(null);
  const [narrative, setNarrative] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingLevels, setRecordingLevels] = useState<number[]>(
    () => Array.from({ length: 24 }, () => 0.08),
  );
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(
    "workspace.readingEvidence",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [missingAnswers, setMissingAnswers] = useState<Record<string, string>>(
    {},
  );
  const [isDemoIncident, setIsDemoIncident] = useState(false);
  const [demoNarrationLanguage, setDemoNarrationLanguage] =
    useState<DemoNarrationLanguage>("en-IN");
  const [selectedDemoCaseId, setSelectedDemoCaseId] =
    useState<DemoCaseId>(DEFAULT_DEMO_CASE_ID);
  const [demoCaseRevision, setDemoCaseRevision] = useState(0);
  const activeDemoCase = getDemoCase(selectedDemoCaseId);
  const [selectedReportedAmount, setSelectedReportedAmount] = useState<
    number | null
  >(null);
  const [isTranscriptionError, setIsTranscriptionError] = useState(false);
  const [preparationFailure, setPreparationFailure] =
    useState<PreparationFailure>(null);
  const [submittedReference, setSubmittedReference] = useState("");
  const [postReportMilestones, setPostReportMilestones] =
    useState<PostReportMilestones | null>(null);
  const [submittedDraft, setSubmittedDraft] = useState<IncidentDraft | null>(null);
  const [submittedTranscription, setSubmittedTranscription] = useState<TranscriptionResult | null>(null);
  const [reminderPreferences, setReminderPreferences] =
    useState<ReminderPreferences>(() => createReminderPreferences(false));
  const [recoverableReport, setRecoverableReport] =
    useState<PersistedUnfinishedReport | null>(null);
  const [unavailableEvidenceNames, setUnavailableEvidenceNames] = useState<
    string[]
  >([]);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const preparedAtRef = useRef<string | null>(null);
  const [preparedSourceSignature, setPreparedSourceSignature] = useState<
    string | null
  >(null);
  const viewRef = useRef<JourneyView>("ENTRY");
  const journeyHistoryRef = useRef<JourneyView[]>([]);
  const attemptedDemoRestoreRef = useRef(false);
  const analysisRunRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingTranscriptionRunRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const pendingReportFocusRef = useRef(false);
  const draftRecoveryReadyRef = useRef(false);
  const amountResolution =
    draft?.classification.reportFamily === "FINANCIAL_FRAUD" &&
    draft.incident.financialLossState === "YES"
      ? resolveReportedAmount(draft, selectedReportedAmount)
      : null;
  const baseProfile = experienceMode === "LIVE_TEST"
    ? reporterProfile ?? createEmptyTestProfile()
    : reporterProfile ?? SYNTHETIC_NCRP_PROFILE;
  const activeProfile =
    experienceMode === "LIVE_TEST"
      ? {
          ...baseProfile,
          displayName: reporterName.trim(),
          source: "TEST_INPUT" as const,
        }
      : baseProfile;
  const currentSourceSignature = reportSourceSignature({
    narrative,
    reporterName: activeProfile.displayName,
    transcription,
    screenshots,
    audio,
  });
  const isReportStale = Boolean(
    !isDemoIncident &&
      draft &&
      preparedSourceSignature &&
      currentSourceSignature !== preparedSourceSignature,
  );
  const hasSubmittedCase = Boolean(submittedDraft && postReportMilestones);

  useEffect(() => {
    const unfinished = readUnfinishedReport();
    if (unfinished) setRecoverableReport(unfinished);
    draftRecoveryReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (
      !draftRecoveryReadyRef.current ||
      experienceMode !== "LIVE_TEST" ||
      isDemoIncident ||
      hasSubmittedCase ||
      view === "ENTRY" ||
      view === "SUCCESS" ||
      view === "ANALYSING"
    ) {
      return;
    }
    const meaningful = Boolean(
      narrative.trim() ||
        transcription ||
        draft ||
        screenshots.length > 0 ||
        audio,
    );
    if (!meaningful) return;
    setIsDraftSaved(false);
    const timer = window.setTimeout(() => {
      const safeDraft = draft
        ? IncidentDraftSchema.safeParse(sanitizeForDeviceStorage(draft))
        : null;
      const safeTranscription = transcription
        ? TranscriptionResultSchema.safeParse(
            sanitizeForDeviceStorage(transcription),
          )
        : null;
      const savedView: PersistedUnfinishedReport["view"] =
        view === "REVIEW"
          ? "REVIEW"
          : draft
            ? "ANALYSIS_RESULT"
            : "REPORT_INPUT";
      const persisted: PersistedUnfinishedReport = {
        version: 1,
        view: savedView,
        reportMethod,
        reporterName: sanitizeSensitiveText(reporterName).text,
        narrative: sanitizeSensitiveText(narrative).text,
        transcription: safeTranscription?.success
          ? safeTranscription.data
          : null,
        draft: safeDraft?.success ? safeDraft.data : null,
        missingAnswers: sanitizeForDeviceStorage(missingAnswers),
        selectedReportedAmount,
        recordingSeconds,
        hadRecording: Boolean(audio),
        evidenceMetadata: [
          ...screenshots.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          })),
          ...unavailableEvidenceNames
            .filter((name) => !screenshots.some((file) => file.name === name))
            .map((name) => ({
              name,
              type: "",
              size: 0,
              lastModified: 0,
            })),
        ],
        preparedSourceSignature,
      };
      try {
        window.localStorage.setItem(
          UNFINISHED_REPORT_KEY,
          JSON.stringify(persisted),
        );
        setIsDraftSaved(true);
      } catch {
        setIsDraftSaved(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    audio,
    draft,
    experienceMode,
    hasSubmittedCase,
    isDemoIncident,
    missingAnswers,
    narrative,
    preparedSourceSignature,
    recordingSeconds,
    reportMethod,
    reporterName,
    screenshots,
    selectedReportedAmount,
    transcription,
    unavailableEvidenceNames,
    view,
  ]);

  useEffect(() => {
    if (attemptedDemoRestoreRef.current) return;
    attemptedDemoRestoreRef.current = true;

    try {
      const stored = window.sessionStorage.getItem(DEMO_SESSION_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return;
      const candidate = parsed as Partial<PersistedDemoSession>;
      if (
        candidate.version !== 3 ||
        typeof candidate.view !== "string" ||
        !DEMO_RESTORABLE_VIEWS.has(candidate.view as JourneyView) ||
        typeof candidate.narrative !== "string" ||
        typeof candidate.recordingSeconds !== "number" ||
        typeof candidate.submittedReference !== "string" ||
        !["hi-IN", "en-IN"].includes(candidate.demoNarrationLanguage ?? "")
      ) {
        clearPersistedDemoSession();
        return;
      }

      const restoredDraft = safeParseIncidentDraft(candidate.draft);
      const restoredTranscription = TranscriptionResultSchema.safeParse(
        candidate.transcription,
      );
      if (!restoredDraft.success || !restoredTranscription.success) {
        clearPersistedDemoSession();
        return;
      }

      const restoredMilestones = candidate.postReportMilestones;
      const validRestoredMilestones = isPostReportMilestones(
        restoredMilestones,
      );
      if (candidate.view === "SUCCESS" && !validRestoredMilestones) {
        clearPersistedDemoSession();
        return;
      }

      const restoredDemoCase = getDemoCase(
        candidate.demoCaseId ?? DEFAULT_DEMO_CASE_ID,
      );
      setSelectedDemoCaseId(restoredDemoCase.id);
      beginExperience("DEMO_CASE", restoredDemoCase.citizen);
      setDraft(restoredDraft.data);
      setNarrative(candidate.narrative);
      setTranscription(restoredTranscription.data);
      setDemoNarrationLanguage(
        candidate.demoNarrationLanguage as DemoNarrationLanguage,
      );
      setRecordingSeconds(candidate.recordingSeconds);
      setSubmittedReference(candidate.submittedReference);
      if (candidate.view === "SUCCESS" && validRestoredMilestones) {
        setPostReportMilestones(restoredMilestones);
        setSubmittedDraft(structuredClone(restoredDraft.data));
        setSubmittedTranscription(structuredClone(restoredTranscription.data));
        preparedAtRef.current = restoredMilestones?.preparedAt ?? null;
        setReminderPreferences(
          isReminderPreferences(candidate.reminderPreferences)
            ? candidate.reminderPreferences
            : createReminderPreferences(true),
        );
      } else {
        setPostReportMilestones(null);
        setSubmittedDraft(null);
        setSubmittedTranscription(null);
        preparedAtRef.current = DEMO_POST_REPORT_MILESTONES.preparedAt;
      }
      setIsDemoIncident(true);
      setPreparedSourceSignature(
        reportSourceSignature({
          narrative: candidate.narrative,
          reporterName: restoredDemoCase.citizen.displayName,
          transcription: restoredTranscription.data,
          screenshots: [],
          audio: null,
        }),
      );
      journeyHistoryRef.current = restoredJourneyHistory(
        candidate.view as JourneyView,
      );
      viewRef.current = candidate.view as JourneyView;
      setView(candidate.view as JourneyView);
    } catch {
      clearPersistedDemoSession();
    }
  }, [beginExperience]);

  useEffect(() => {
    if (view === "SUCCESS") {
      clearPersistedDemoSession();
      return;
    }

    if (
      !attemptedDemoRestoreRef.current ||
      !isDemoIncident ||
      experienceMode !== "DEMO_CASE" ||
      !draft ||
      !transcription ||
      !DEMO_RESTORABLE_VIEWS.has(view)
    ) {
      return;
    }

    const session: PersistedDemoSession = {
      version: 3,
      view,
      draft,
      narrative,
      transcription,
      demoNarrationLanguage,
      recordingSeconds,
      submittedReference,
      postReportMilestones,
      demoCaseId: selectedDemoCaseId,
      reminderPreferences,
    };
    try {
      window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage can be unavailable in restricted browsing modes; do not break the demo.
    }
  }, [
    demoNarrationLanguage,
    draft,
    experienceMode,
    isDemoIncident,
    narrative,
    reminderPreferences,
    postReportMilestones,
    recordingSeconds,
    selectedDemoCaseId,
    submittedReference,
    transcription,
    view,
  ]);

  useEffect(() => {
    if (view !== "ENTRY") {
      document.querySelector<HTMLElement>("[data-journey-focus]")?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (view !== "SUCCESS") return;
    const frame = window.requestAnimationFrame(() => {
      const caseHome = document.querySelector<HTMLElement>(".post-submission-case");
      const heading = caseHome?.querySelector<HTMLElement>("h1");
      caseHome?.scrollIntoView({ behavior: "auto", block: "start" });
      heading?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    if (view !== "ANALYSIS_RESULT" || !draft || !pendingReportFocusRef.current) return;
    pendingReportFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("#report-details-heading");
      if (!heading) return;
      heading.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 820px)").matches) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        heading.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draft, view]);

  useEffect(() => {
    posthog.capture("sachet_journey_viewed", {
      journey_view: view,
      experience_mode: experienceMode ?? "NOT_SELECTED",
      locale,
    });
  }, [experienceMode, locale, view]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((current) => {
        const next = current + 1;
        if (next >= 120 && recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
          recorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
          stopAudioVisualization();
          setIsRecording(false);
        }
        return Math.min(next, 120);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  function stopAudioVisualization() {
    if (audioFrameRef.current !== null) {
      window.cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setRecordingLevels(Array.from({ length: 24 }, () => 0.08));
  }

  function resetInputs() {
    recordingTranscriptionRunRef.current += 1;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state === "recording") recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
    }
    recorderChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setDraft(null);
    setNarrative("");
    setReporterName("");
    setScreenshots([]);
    setAudio(null);
    setTranscription(null);
    setRecordingSeconds(0);
    setFormError(null);
    setMissingAnswers({});
    setSelectedReportedAmount(null);
    setIsTranscriptionError(false);
    setIsTranscribing(false);
    stopAudioVisualization();
    setPreparationFailure(null);
    setIsDemoIncident(false);
    setSubmittedReference("");
    setPostReportMilestones(null);
    setSubmittedDraft(null);
    setSubmittedTranscription(null);
    setReminderPreferences(createReminderPreferences(false));
    setUnavailableEvidenceNames([]);
    setIsDraftSaved(false);
    preparedAtRef.current = null;
    setPreparedSourceSignature(null);
    setReportMethod("SPEAK");
  }

  function setCurrentView(nextView: JourneyView) {
    viewRef.current = nextView;
    setView(nextView);
  }

  function navigateTo(nextView: JourneyView) {
    const currentView = viewRef.current;
    if (currentView === nextView) return;
    journeyHistoryRef.current.push(currentView);
    setCurrentView(nextView);
  }

  function replaceView(nextView: JourneyView) {
    while (journeyHistoryRef.current.at(-1) === nextView) {
      journeyHistoryRef.current.pop();
    }
    setCurrentView(nextView);
  }

  function goBackInJourney() {
    if (viewRef.current === "ANALYSING") {
      analysisRunRef.current += 1;
    }
    const previousView = journeyHistoryRef.current.pop() ?? "ENTRY";
    setCurrentView(previousView);
  }

  function returnToReportDetails() {
    const reportIndex =
      journeyHistoryRef.current.lastIndexOf("ANALYSIS_RESULT");
    if (reportIndex >= 0) {
      journeyHistoryRef.current = journeyHistoryRef.current.slice(
        0,
        reportIndex,
      );
    }
    setCurrentView("ANALYSIS_RESULT");
  }

  function returnHome() {
    analysisRunRef.current += 1;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    if (hasSubmittedCase) {
      journeyHistoryRef.current = [];
      setCurrentView("ENTRY");
      return;
    }
    setRecoverableReport(readUnfinishedReport());
    clearPersistedDemoSession();
    resetDemo();
    resetInputs();
    journeyHistoryRef.current = [];
    setCurrentView("ENTRY");
  }

  useEffect(() => {
    if (view === "ENTRY") return;
    return registerControls({
      onBack: goBackInJourney,
      onHome: returnHome,
    });
  }, [hasSubmittedCase, registerControls, view]);

  function openSubmittedCase() {
    if (!hasSubmittedCase) return;
    journeyHistoryRef.current = ["ENTRY"];
    setCurrentView("SUCCESS");
  }

  function startReport() {
    clearPersistedDemoSession();
    clearUnfinishedReport();
    setRecoverableReport(null);
    resetDemo();
    resetInputs();
    setSelectedDemoCaseId(DEFAULT_DEMO_CASE_ID);
    beginExperience("LIVE_TEST", createEmptyTestProfile());
    setSubmittedReference("");
    journeyHistoryRef.current = ["ENTRY"];
    setCurrentView("REPORT_INPUT");
  }

  function useDemoIncident(caseId: DemoCaseId = DEFAULT_DEMO_CASE_ID) {
    const demoCase = getDemoCase(caseId);
    const selectedNarrationLanguage: DemoNarrationLanguage =
      demoCase.id === DEFAULT_DEMO_CASE_ID
        ? "hi-IN"
        : locale === "hi"
          ? "hi-IN"
          : "en-IN";
    clearPersistedDemoSession();
    clearUnfinishedReport();
    setRecoverableReport(null);
    resetDemo();
    resetInputs();
    setSelectedDemoCaseId(demoCase.id);
    setDemoCaseRevision((current) => current + 1);
    beginExperience("DEMO_CASE", demoCase.citizen);
    setNarrative(demoCase.statement);
    setDemoNarrationLanguage(selectedNarrationLanguage);
    setTranscription(demoCase.narrations[selectedNarrationLanguage]);
    setRecordingSeconds(
      demoCase.narrations[selectedNarrationLanguage].durationSeconds,
    );
    setIsDemoIncident(true);
    setReminderPreferences(createReminderPreferences(true));
    setDraft(structuredClone(demoCase.draft));
    setSubmittedReference(demoCase.reference);
    preparedAtRef.current = DEMO_POST_REPORT_MILESTONES.preparedAt;
    setPreparedSourceSignature(
      reportSourceSignature({
        narrative: demoCase.statement,
        reporterName: demoCase.citizen.displayName,
        transcription: demoCase.narrations[selectedNarrationLanguage],
        screenshots: [],
        audio: null,
      }),
    );
    pendingReportFocusRef.current = true;
    journeyHistoryRef.current = ["ENTRY"];
    setCurrentView("ANALYSIS_RESULT");
  }

  function continueRecoveredReport() {
    if (!recoverableReport) return;
    resetDemo();
    resetInputs();
    beginExperience("LIVE_TEST", createEmptyTestProfile());
    setSubmittedReference("");
    setReportMethod(recoverableReport.reportMethod);
    setReporterName(recoverableReport.reporterName);
    setNarrative(recoverableReport.narrative);
    setTranscription(recoverableReport.transcription);
    setDraft(recoverableReport.draft);
    setMissingAnswers(recoverableReport.missingAnswers);
    setSelectedReportedAmount(recoverableReport.selectedReportedAmount);
    setRecordingSeconds(recoverableReport.recordingSeconds);
    setPreparedSourceSignature(
      recoverableReport.draft && recoverableReport.evidenceMetadata.length === 0
        ? reportSourceSignature({
            narrative: recoverableReport.narrative,
            reporterName: recoverableReport.reporterName,
            transcription: recoverableReport.transcription,
            screenshots: [],
            audio: null,
          })
        : recoverableReport.preparedSourceSignature,
    );
    setUnavailableEvidenceNames(
      recoverableReport.evidenceMetadata.map((item) => item.name),
    );
    const binarySourceMissing =
      recoverableReport.evidenceMetadata.length > 0 ||
      (recoverableReport.hadRecording && !recoverableReport.transcription);
    const restoredView = binarySourceMissing
      ? recoverableReport.draft
        ? "ANALYSIS_RESULT"
        : "REPORT_INPUT"
      : recoverableReport.view;
    if (recoverableReport.hadRecording && !recoverableReport.transcription) {
      setFormError(
        locale === "hi"
          ? "रिकॉर्डिंग ब्राउज़र में सुरक्षित नहीं रह सकती। कृपया इसे दोबारा रिकॉर्ड करें; आपकी दूसरी जानकारी सुरक्षित है।"
          : "The recording could not be stored by the browser. Record it again; your other details are saved.",
      );
    }
    journeyHistoryRef.current =
      restoredView === "REVIEW"
        ? ["ENTRY", "ANALYSIS_RESULT"]
        : ["ENTRY"];
    setRecoverableReport(null);
    setCurrentView(restoredView);
  }

  function chooseDemoNarration(language: DemoNarrationLanguage) {
    setDemoNarrationLanguage(language);
    setTranscription(activeDemoCase.narrations[language]);
    setRecordingSeconds(activeDemoCase.narrations[language].durationSeconds);
  }

  async function startRecording() {
    setFormError(null);
    setPreparationFailure(null);
    setIsTranscriptionError(false);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus",
      )
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferredType });
      const transcriptionRun = recordingTranscriptionRunRef.current + 1;
      recordingTranscriptionRunRef.current = transcriptionRun;
      try {
        const audioContext = new window.AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = audioContext;
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const drawLevels = () => {
          analyser.getByteFrequencyData(samples);
          setRecordingLevels(
            Array.from({ length: 24 }, (_, index) =>
              Math.max(0.08, Math.min(1, (samples[index] ?? 0) / 190)),
            ),
          );
          audioFrameRef.current = window.requestAnimationFrame(drawLevels);
        };
        drawLevels();
      } catch {
        setRecordingLevels(Array.from({ length: 24 }, () => 0.22));
      }
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stopAudioVisualization();
        const recording = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType,
        });
        const startedAt = recordingStartedAtRef.current ?? Date.now();
        const duration = Math.min(
          120,
          Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        );
        recordingStartedAtRef.current = null;
        setRecordingSeconds(duration);
        setAudio(recording);
        setIsTranscribing(true);
        try {
          const result = await transcribeRecording(recording, duration);
          if (recordingTranscriptionRunRef.current !== transcriptionRun) return;
          setTranscription(result);
        } catch {
          if (recordingTranscriptionRunRef.current !== transcriptionRun) return;
          setIsTranscriptionError(true);
          setFormError(
            locale === "hi"
              ? "हम रिकॉर्डिंग को लिखित रूप में नहीं बदल पाए। आपकी रिकॉर्डिंग और दूसरी जानकारी सुरक्षित है।"
              : "We couldn't transcribe this recording. Your recording and other information are still here.",
          );
        } finally {
          if (recordingTranscriptionRunRef.current === transcriptionRun) {
            setIsTranscribing(false);
          }
        }
      };
      recorderRef.current = recorder;
      setAudio(null);
      setTranscription(null);
      setRecordingSeconds(0);
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
      recorder.start();
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      stopAudioVisualization();
      setFormError(
        locale === "hi"
          ? "माइक्रोफ़ोन उपलब्ध नहीं है। आप घटना लिख सकते हैं या सबूत जोड़ सकते हैं।"
          : "Microphone access is unavailable. You can type what happened or add evidence instead.",
      );
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    stopAudioVisualization();
    setIsRecording(false);
  }

  function recordAgain() {
    recordingTranscriptionRunRef.current += 1;
    setAudio(null);
    setTranscription(null);
    setRecordingSeconds(0);
    setIsTranscriptionError(false);
    setPreparationFailure(null);
    setFormError(null);
    setIsTranscribing(false);
    stopAudioVisualization();
  }

  async function handleScreenshots(event: ChangeEvent<HTMLInputElement>) {
    setFormError(null);
    const selected = Array.from(event.target.files ?? []);
    const uniqueSelected = selected.filter(
      (file, index, files) =>
        !screenshots.some(
          (current) =>
            current.name === file.name &&
            current.size === file.size &&
            current.lastModified === file.lastModified,
        ) &&
        files.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified,
        ) === index,
    );
    if (uniqueSelected.length !== selected.length) {
      setFormError(
        locale === "hi"
          ? "यह फ़ाइल पहले से जुड़ी हुई है। इसे दोबारा प्रोसेस नहीं किया गया।"
          : "This file is already attached. It was not processed again.",
      );
    }
    if (uniqueSelected.length + screenshots.length > 8) {
      setFormError(
        locale === "hi"
          ? "अधिकतम आठ स्क्रीनशॉट जोड़ें।"
          : "Add no more than eight screenshots.",
      );
      event.target.value = "";
      return;
    }
    if (
      uniqueSelected.some(
        (file) =>
          !["image/png", "image/jpeg", "image/webp"].includes(file.type),
      )
    ) {
      setFormError(
        locale === "hi"
          ? "PNG, JPEG या WebP चित्र जोड़ें।"
          : "Screenshots must be PNG, JPEG or WebP images.",
      );
      event.target.value = "";
      return;
    }
    if (uniqueSelected.some((file) => file.size > 8 * 1024 * 1024)) {
      setFormError(
        locale === "hi"
          ? "हर चित्र 8 MB से छोटा होना चाहिए।"
          : "Each screenshot must be under 8 MB before compression.",
      );
      event.target.value = "";
      return;
    }
    const prepared = await Promise.all(uniqueSelected.map(compressScreenshot));
    setScreenshots((current) => [...current, ...prepared]);
    setUnavailableEvidenceNames((current) =>
      current.filter(
        (name) => !prepared.some((file) => file.name === name),
      ),
    );
    event.target.value = "";
  }

  async function transcribeRecording(
    recording: Blob | null,
    durationSeconds: number,
  ): Promise<TranscriptionResult> {
    if (!recording) throw new Error("No recording is available.");
    const data = new FormData();
    data.append("audio", recording, "statement.webm");
    data.append("durationSeconds", String(durationSeconds));

    if (durationSeconds > 30) {
      setLoadingMessage("workspace.transcribingLong");
      const startResponse = await fetch("/api/transcribe-long/start", {
        method: "POST",
        body: data,
      });
      const startResult: unknown = await startResponse.json().catch(() => null);
      if (
        !startResponse.ok ||
        !startResult ||
        typeof startResult !== "object" ||
        !("jobId" in startResult)
      ) {
        throw new Error("We couldn't transcribe this recording.");
      }

      const jobId = String(startResult.jobId);
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 5_000));
        const statusResponse = await fetch(
          `/api/transcribe-long/status?jobId=${encodeURIComponent(jobId)}`,
          { cache: "no-store" },
        );
        const statusResult: unknown = await statusResponse
          .json()
          .catch(() => null);
        if (
          !statusResponse.ok ||
          !statusResult ||
          typeof statusResult !== "object"
        ) {
          throw new Error("We couldn't transcribe this recording.");
        }
        const status =
          "status" in statusResult ? String(statusResult.status) : "FAILED";
        if (status === "FAILED")
          throw new Error("We couldn't transcribe this recording.");
        if (status === "COMPLETED") {
          const resultResponse = await fetch("/api/transcribe-long/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
          const result: unknown = await resultResponse.json().catch(() => null);
          if (!resultResponse.ok)
            throw new Error("We couldn't transcribe this recording.");
          return TranscriptionResultSchema.parse(result);
        }
      }
      throw new Error("We couldn't transcribe this recording.");
    }

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: data,
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      if (
        result &&
        typeof result === "object" &&
        "stage" in result &&
        result.stage === "TRANSLATION"
      ) {
        const originalTranscript =
          "originalTranscript" in result &&
          typeof result.originalTranscript === "string"
            ? result.originalTranscript
            : "";
        const languageCode =
          "languageCode" in result && typeof result.languageCode === "string"
            ? result.languageCode
            : "unknown";
        if (originalTranscript) {
          setTranscription({
            originalTranscript,
            englishTranscript: "",
            languageCode,
          });
        }
        throw new Error("TRANSLATION_FAILED");
      }
      throw new Error(
        typeof result === "object" && result && "error" in result
          ? String(result.error)
          : "We couldn't read this recording.",
      );
    }
    return TranscriptionResultSchema.parse(result);
  }

  async function buildComplaint() {
    if (
      !narrative.trim() &&
      screenshots.length === 0 &&
      !transcription &&
      !audio
    ) {
      setFormError(
        locale === "hi"
          ? "आगे बढ़ने से पहले बोलें, लिखें या सबूत जोड़ें।"
          : "Speak, type what happened or add evidence before continuing.",
      );
      return;
    }

    if (isDemoIncident) {
      setFormError(null);
      setIsTranscriptionError(false);
      setPreparationFailure(null);
      setPreparedSourceSignature(currentSourceSignature);
      pendingReportFocusRef.current = true;
      replaceView("ANALYSIS_RESULT");
      return;
    }

    setFormError(null);
    setIsTranscriptionError(false);
    setPreparationFailure(null);
    setLoadingMessage(
      audio && !transcription
        ? "workspace.readingStatement"
        : "workspace.organisingReport",
    );
    const analysisRun = analysisRunRef.current + 1;
    analysisRunRef.current = analysisRun;
    if (viewRef.current === "ANALYSIS_ERROR") {
      replaceView("ANALYSING");
    } else {
      navigateTo("ANALYSING");
    }
    try {
      let preparedTranscription = transcription;
      if (audio && !preparedTranscription?.englishTranscript) {
        preparedTranscription = await transcribeRecording(
          audio,
          recordingSeconds,
        );
        if (analysisRunRef.current !== analysisRun) return;
        setTranscription(preparedTranscription);
      }

      if (preparedTranscription?.languageCode.startsWith("hi")) setLocale("hi");
      else if (preparedTranscription?.languageCode.startsWith("en")) setLocale("en");
      else if (!preparedTranscription && /[\u0900-\u097f]/.test(narrative)) setLocale("hi");

      setLoadingMessage("workspace.organisingReport");
      const data = new FormData();
      data.append("narrative", narrative);
      data.append(
        "englishTranscript",
        preparedTranscription?.englishTranscript ?? "",
      );
      data.append("reportingFor", "SELF");
      data.append("reportingDate", currentIndiaDate());
      screenshots.forEach((file) =>
        data.append("screenshots", file, file.name),
      );
      const response = await fetch("/api/analyze-incident", {
        method: "POST",
        body: data,
      });
      const result: unknown = await response.json().catch(() => null);
      if (analysisRunRef.current !== analysisRun) return;
      if (!response.ok) throw new Error("REPORT_PREPARATION_FAILED");
      setDraft(normalizeIncidentDraft(IncidentDraftSchema.parse(result)));
      preparedAtRef.current = new Date().toISOString();
      setPreparedSourceSignature(
        reportSourceSignature({
          narrative,
          reporterName: activeProfile.displayName,
          transcription: preparedTranscription,
          screenshots,
          audio,
        }),
      );
      setSelectedReportedAmount(null);
      pendingReportFocusRef.current = true;
      replaceView("ANALYSIS_RESULT");
    } catch (error) {
      if (analysisRunRef.current !== analysisRun) return;
      setFormError(null);
      const failure: Exclude<PreparationFailure, null> =
        error instanceof Error && error.message === "TRANSLATION_FAILED"
          ? "TRANSLATION"
          : audio && !transcription
            ? "TRANSCRIPTION"
            : "REPORT";
      setPreparationFailure(failure);
      setIsTranscriptionError(failure === "TRANSCRIPTION");
      replaceView("ANALYSIS_ERROR");
    }
  }

  function saveMissingAnswer(question: MissingQuestion, fallback?: string) {
    if (!draft) return;
    const answer = fallback ?? missingAnswers[question.field] ?? "";
    if (!answer.trim()) {
      setFormError(
        locale === "hi"
          ? "जानकारी लिखें या बताएं कि यह आपके पास नहीं है।"
          : "Enter the detail, or choose that you do not have it.",
      );
      return;
    }
    setDraft(applyMissingAnswer(
      draft,
      question.field,
      answer,
      question.transactionIndex ?? 0,
    ));
    if (question.transactionIndex !== undefined) {
      setSelectedReportedAmount(null);
    }
    setMissingAnswers({});
    setFormError(null);
  }

  function reviewReport(ignoredConsistencyIssueIds: readonly string[] = []) {
    const complaint = draft
      ? buildNcrpCompatibleComplaint({
          draft,
          profile: activeProfile,
          transcription,
          typedNarrative: narrative,
          isDemoIncident,
          screenshotNames: isDemoIncident
            ? activeDemoCase.evidence.map((item) => item.label)
            : screenshots.map((file) => file.name),
          demoEvidencePaths: isDemoIncident
            ? activeDemoCase.evidence.map((item) => item.src)
            : undefined,
          identityDocumentProvided: isDemoIncident,
        })
      : null;
    if (!draft || !complaint) return;
    const readiness = deriveReportReadiness({
      draft,
      complaint,
      amountResolution,
      locale,
      isStale: isReportStale,
      ignoredConsistencyIssueIds: new Set(ignoredConsistencyIssueIds),
    });
    if (readiness.state !== "READY") return;
    setFormError(null);
    navigateTo("REVIEW");
  }

  function changeReportFamily(
    reportFamily: Exclude<ReportFamily, "OUT_OF_SCOPE_OR_UNCLEAR">,
  ) {
    setDraft((current) => {
      if (!current) return current;
      const classification = applyReportFamily(
        reportFamily,
        current.classification,
      );
      return normalizeIncidentDraft({
        ...current,
        classification,
      });
    });
    setSelectedReportedAmount(null);
    setFormError(null);
  }

  function submitComplaint(complaint: NcrpCompatibleComplaint) {
    if (!draft) return;
    try {
      if (complaint.groups.declaration.accepted.status !== "CONFIRMED") {
        throw new Error("Confirm the synthetic declaration before submitting.");
      }
      const submissionTime = isDemoIncident
        ? DEMO_POST_REPORT_MILESTONES.submittedAt
        : new Date().toISOString();
      const milestones: PostReportMilestones = {
        preparedAt: preparedAtRef.current ?? submissionTime,
        reviewedAt: isDemoIncident
          ? DEMO_POST_REPORT_MILESTONES.reviewedAt
          : submissionTime,
        submittedAt: submissionTime,
      };
      const submittedCaseDraft = structuredClone(draft);
      const submittedCaseTranscription = transcription ? structuredClone(transcription) : null;
      const reference = isDemoIncident
        ? activeDemoCase.reference
        : `SACHET-${Date.now().toString().slice(-8)}`;
      if (
        draft.classification.reportFamily !== "FINANCIAL_FRAUD" ||
        draft.incident.financialLossState !== "YES"
      ) {
        setSubmittedReference(reference);
        setSubmittedDraft(submittedCaseDraft);
        setSubmittedTranscription(submittedCaseTranscription);
        setPostReportMilestones(milestones);
        setFormError(null);
        clearUnfinishedReport();
        setRecoverableReport(null);
        journeyHistoryRef.current = ["ENTRY"];
        setCurrentView("SUCCESS");
        return;
      }
      const built = buildSyntheticCaseFromComplaint({
        incidentDraft: draft,
        syntheticCitizen: { displayName: activeProfile.displayName },
        acknowledgementId: DEMO_CASE_ACCESS.acknowledgementNumber,
        submittedAt: submissionTime,
        caseOrigin: isDemoIncident ? "DEMO_INCIDENT" : "LIVE_TEST",
        selectedReportedAmount,
      });
      hydrateComplaintCase(built.caseData, built.now);
      setSubmittedReference(reference);
      setSubmittedDraft(submittedCaseDraft);
      setSubmittedTranscription(submittedCaseTranscription);
      setPostReportMilestones(milestones);
      setFormError(null);
      clearUnfinishedReport();
      setRecoverableReport(null);
      journeyHistoryRef.current = ["ENTRY"];
      setCurrentView("SUCCESS");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Check the report before submitting.",
      );
      replaceView("ANALYSIS_RESULT");
    }
  }

  let content: ReactNode;

  if (view === "ENTRY") {
    content = recoverableReport && !hasSubmittedCase ? (
      <section className="service-entry section-pad" data-journey-focus tabIndex={-1}>
        <div className="shell reading-shell draft-recovery-card">
          <p className="eyebrow">
            {locale === "hi" ? "इस डिवाइस पर सुरक्षित" : "Saved on this device"}
          </p>
          <h1>{locale === "hi" ? "अपनी शिकायत जारी रखें?" : "Continue your complaint?"}</h1>
          <p>
            {locale === "hi"
              ? "आपकी प्रगति इस डिवाइस पर सुरक्षित है।"
              : "Your progress was saved on this device."}
          </p>
          <div className="entry-actions">
            <button className="primary-button" type="button" onClick={continueRecoveredReport}>
              {locale === "hi" ? "जारी रखें" : "Continue"}
            </button>
            <button className="secondary-button" type="button" onClick={startReport}>
              {locale === "hi" ? "नई शिकायत शुरू करें" : "Start new complaint"}
            </button>
          </div>
        </div>
      </section>
    ) : (
      <LandingPage
        hasSubmittedCase={hasSubmittedCase}
        onStartComplaint={startReport}
        onViewDemo={() => useDemoIncident()}
        onViewSubmittedCase={openSubmittedCase}
      />
    );
  } else if (
    view === "REPORT_INPUT" ||
    view === "ANALYSING" ||
    view === "ANALYSIS_ERROR" ||
    view === "ANALYSIS_RESULT" ||
    view === "REVIEW"
  ) {
    const mode: ReportWorkspaceMode =
      view === "ANALYSING"
        ? "PROCESSING"
        : view === "ANALYSIS_ERROR"
          ? "ERROR"
          : view === "REVIEW"
            ? "REVIEW"
            : draft
              ? "READY"
              : "INPUT";
    content = (
      <ReportWorkspace
        key={isDemoIncident ? `${selectedDemoCaseId}-${demoCaseRevision}` : "live"}
        mode={mode}
        reportMethod={reportMethod}
        narrative={narrative}
        reporterName={reporterName}
        screenshots={screenshots}
        unavailableEvidenceNames={unavailableEvidenceNames}
        transcription={transcription}
        hasAudio={Boolean(audio)}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        recordingLevels={recordingLevels}
        recordingSeconds={recordingSeconds}
        isDemoIncident={isDemoIncident}
        demoCase={isDemoIncident ? activeDemoCase : null}
        experienceMode={experienceMode}
        reporterProfile={activeProfile}
        identityDocumentProvided={isDemoIncident}
        isReportStale={isReportStale}
        isDraftSaved={isDraftSaved}
        demoNarrationLanguage={demoNarrationLanguage}
        isTranscriptionError={isTranscriptionError}
        preparationFailure={preparationFailure}
        draft={draft}
        loadingMessage={loadingMessage}
        formError={formError}
        missingAnswers={missingAnswers}
        amountResolution={amountResolution}
        reportReference={submittedReference}
        onReportMethodChange={setReportMethod}
        onNarrativeChange={setNarrative}
        onReporterNameChange={setReporterName}
        onReporterProfileChange={(profile) => {
          setReporterProfile(profile);
          setReporterName(profile.displayName);
        }}
        onStartRecording={() => void startRecording()}
        onStopRecording={stopRecording}
        onRecordAgain={recordAgain}
        onTranscriptionChange={setTranscription}
        onScreenshotsChange={(event) => void handleScreenshots(event)}
        onRemoveScreenshot={(index) => {
          setScreenshots((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
          );
          setDraft((current) => {
            if (!current) return current;
            let screenshotIndex = -1;
            return {
              ...current,
              evidence: current.evidence.filter((item) => {
                if (item.type === "VOICE_STATEMENT") return true;
                screenshotIndex += 1;
                return screenshotIndex !== index;
              }),
            };
          });
        }}
        onOrganizeReport={() => void buildComplaint()}
        onUseDemoIncident={() => useDemoIncident()}
        onStartNewReport={startReport}
        onDemoCaseChange={useDemoIncident}
        onResetDemoCase={() => useDemoIncident(selectedDemoCaseId)}
        onMissingAnswerChange={(field, value) =>
          setMissingAnswers((current) => ({ ...current, [field]: value }))
        }
        onSaveMissingAnswer={saveMissingAnswer}
        onDraftChange={(nextDraft) => {
          setDraft(nextDraft);
          setSelectedReportedAmount(null);
        }}
        onReportedAmountSelect={(amount) => {
          setSelectedReportedAmount(amount);
          setDraft((current) => current ? {
            ...current,
            incident: { ...current.incident, citizenConfirmedLoss: amount },
            citizenConfirmedFields: Array.from(new Set([
              ...current.citizenConfirmedFields,
              "incident.citizenConfirmedLoss",
            ])),
          } : current);
        }}
        onReportFamilyChange={changeReportFamily}
        onDemoNarrationLanguageChange={chooseDemoNarration}
        onReview={reviewReport}
        onBackToEdit={returnToReportDetails}
        onSubmit={submitComplaint}
      />
    );
  } else if (view === "SUCCESS" && submittedDraft && postReportMilestones) {
    content = (
      <PostSubmissionCaseHome
        draft={submittedDraft}
        prototypeReference={submittedReference}
        screenshots={screenshots}
        isDemoIncident={isDemoIncident}
        demoCase={isDemoIncident ? activeDemoCase : null}
        milestones={postReportMilestones}
        transcription={submittedTranscription}
        reminderPreferences={reminderPreferences}
        onReminderPreferencesChange={setReminderPreferences}
        onDraftChange={(nextDraft) => {
          setDraft(nextDraft);
          setSubmittedDraft(nextDraft);
        }}
        onStartNewReport={startReport}
      />
    );
  } else {
    content = null;
  }

  return content;
}
