import {
  createEmptyTestProfile,
  type ReporterProfile,
} from "../experience/profile";
import type { UiLocale } from "../i18n/i18n-provider";
import {
  IncidentDraftSchema,
  TranscriptionResultSchema,
  type IncidentDraft,
  type TranscriptionResult,
} from "../incident/schema";
import {
  NcrpCompatibleComplaintSchema,
  type NcrpCompatibleComplaint,
} from "../incident/ncrp-compatible-complaint";
import type { ReminderPreferences } from "../notifications/citizen-nudges";
import type { PostReportMilestones } from "../presentation/post-report-case";
import {
  CaseUpdateSchema,
  type CaseUpdate,
} from "../incident/case-update";

const SAVED_CASES_KEY = "sachet-saved-cases-v1";
const MAX_SAVED_CASES = 8;

export type SavedCaseRecord = {
  version: 1;
  reference: string;
  savedAt: string;
  completionState: "PREPARED";
  draft: IncidentDraft;
  complaint: NcrpCompatibleComplaint;
  reporterProfile: ReporterProfile;
  transcription: TranscriptionResult | null;
  milestones: PostReportMilestones;
  reminderPreferences: ReminderPreferences;
  evidenceNames: string[];
  locale: UiLocale;
  caseUpdates: CaseUpdate[];
};

function isReporterProfile(value: unknown): value is ReporterProfile {
  const requiredKeys = Object.keys(createEmptyTestProfile());
  return Boolean(
    value &&
      typeof value === "object" &&
      requiredKeys.every(
        (key) => typeof (value as Record<string, unknown>)[key] === "string",
      ) &&
      ["SIMULATED_NCRP_PROFILE", "TEST_INPUT"].includes(
        (value as ReporterProfile).source,
      ),
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
      (candidate.sentAt === null || typeof candidate.sentAt === "string")
  );
}

function parseRecord(value: unknown): SavedCaseRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedCaseRecord>;
  const draft = IncidentDraftSchema.safeParse(candidate.draft);
  const complaint = NcrpCompatibleComplaintSchema.safeParse(candidate.complaint);
  const transcription = candidate.transcription
    ? TranscriptionResultSchema.safeParse(candidate.transcription)
    : null;
  const milestones = candidate.milestones;
  const reminders = candidate.reminderPreferences;
  const caseUpdates = Array.isArray(candidate.caseUpdates)
    ? candidate.caseUpdates
        .map((update) => CaseUpdateSchema.safeParse(update))
        .filter((result) => result.success)
        .map((result) => result.data)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    : [];
  if (
    candidate.version !== 1 ||
    typeof candidate.reference !== "string" ||
    typeof candidate.savedAt !== "string" ||
    candidate.completionState !== "PREPARED" ||
    !draft.success ||
    !complaint.success ||
    (transcription && !transcription.success) ||
    !isReporterProfile(candidate.reporterProfile) ||
    !milestones ||
    typeof milestones.preparedAt !== "string" ||
    typeof milestones.reviewedAt !== "string" ||
    typeof milestones.submittedAt !== "string" ||
    !isReminderPreferences(reminders) ||
    !Array.isArray(candidate.evidenceNames) ||
    !candidate.evidenceNames.every((name) => typeof name === "string") ||
    (candidate.locale !== "en" && candidate.locale !== "hi")
  ) {
    return null;
  }
  return {
    version: 1,
    reference: candidate.reference.trim().toUpperCase(),
    savedAt: candidate.savedAt,
    completionState: "PREPARED",
    draft: draft.data,
    complaint: complaint.data,
    reporterProfile: candidate.reporterProfile,
    transcription: transcription?.success ? transcription.data : null,
    milestones,
    reminderPreferences: reminders,
    evidenceNames: candidate.evidenceNames,
    locale: candidate.locale,
    caseUpdates,
  };
}

export function readSavedCases(): SavedCaseRecord[] {
  try {
    const raw = window.localStorage.getItem(SAVED_CASES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(parseRecord).filter((item): item is SavedCaseRecord => Boolean(item))
      : [];
  } catch {
    return [];
  }
}

export function findSavedCase(reference: string): SavedCaseRecord | null {
  const normalized = reference.trim().toUpperCase();
  return readSavedCases().find((item) => item.reference === normalized) ?? null;
}

export function saveCaseRecord(record: SavedCaseRecord): void {
  try {
    const remaining = readSavedCases().filter(
      (item) => item.reference !== record.reference,
    );
    window.localStorage.setItem(
      SAVED_CASES_KEY,
      JSON.stringify([record, ...remaining].slice(0, MAX_SAVED_CASES)),
    );
  } catch {
    // Saving locally is optional when browser storage is unavailable.
  }
}

export function createSachetCaseReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existing = new Set(readSavedCases().map((item) => item.reference));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
    const reference = `SCHT-${token.slice(0, 4)}-${token.slice(4)}`;
    if (!existing.has(reference)) return reference;
  }
  return `SCHT-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 6)}`;
}
