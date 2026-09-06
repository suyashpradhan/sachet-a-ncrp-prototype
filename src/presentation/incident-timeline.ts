import type { IncidentDraft } from "../incident/schema";
import type { UiLocale } from "../i18n/i18n-provider";
import { formatCurrency } from "./format";
import { citizenVisibleValue } from "./citizen-visible-value";

export type TimelineSourceRef = {
  type:
    | "STATEMENT"
    | "EVIDENCE"
    | "TRANSACTION"
    | "USER_CONFIRMED"
    | "SYSTEM"
    | "PROTOTYPE";
  label: string;
  evidenceId?: string;
};

export type IncidentTimelineEvent = {
  id: string;
  timeLabel: string | null;
  title: string;
  sourceRefs: TimelineSourceRef[];
};

type TimelineOptions = {
  locale: UiLocale;
  isDemoIncident: boolean;
};

function displayTime(value: string | null, locale: UiLocale, approximate = false) {
  const visibleValue = citizenVisibleValue(value);
  if (!visibleValue) return null;
  const [hours, minutes] = visibleValue.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return visibleValue;
  const date = new Date(Date.UTC(2020, 0, 1, hours, minutes));
  const formatted = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: minutes === 0 ? undefined : "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  if (!approximate) return formatted;
  return locale === "hi" ? `लगभग ${formatted}` : `Around ${formatted}`;
}

function statementSupportsInstructionStep(draft: IncidentDraft) {
  return /opened|followed|clicked|instructions|खोला|निर्देश/i.test(
    draft.incident.narrative ?? "",
  );
}

function uploadedScreenshotId(
  draft: IncidentDraft,
  evidenceIndex: number,
  isDemoIncident: boolean,
) {
  const screenshotIndex = draft.evidence
    .slice(0, evidenceIndex)
    .filter((item) => item.type !== "VOICE_STATEMENT").length;
  return isDemoIncident
    ? `demo-evidence-${screenshotIndex}`
    : `uploaded-${screenshotIndex}`;
}

export function deriveIncidentTimeline(
  draft: IncidentDraft,
  { locale, isDemoIncident }: TimelineOptions,
): IncidentTimelineEvent[] {
  if (draft.classification.ambiguity !== "NONE") return [];

  const events: IncidentTimelineEvent[] = [];
  const messageEvidenceIndex = draft.evidence.findIndex(
    (item) => item.type === "CHAT_SCREENSHOT",
  );
  if (messageEvidenceIndex >= 0) {
    const facts = draft.evidence[messageEvidenceIndex]?.extractedFacts.join(" ") ?? "";
    const kyc = /KYC|केवाईसी/i.test(facts);
    events.push({
      id: "message-evidence",
      timeLabel: displayTime(draft.incident.approximateTime, locale, true),
      title: kyc
        ? locale === "hi"
          ? "केवाईसी अपडेट संदेश मिला"
          : "Received a KYC update message"
        : locale === "hi"
          ? "संदेश या चैट मिली"
          : "Received a message or chat",
      sourceRefs: [
        {
          type: "EVIDENCE",
          label: locale === "hi" ? "संदेश का स्क्रीनशॉट" : "Message screenshot",
          evidenceId: uploadedScreenshotId(draft, messageEvidenceIndex, isDemoIncident),
        },
      ],
    });
  }

  if (statementSupportsInstructionStep(draft)) {
    events.push({
      id: "statement-action",
      timeLabel: locale === "hi" ? "बाद में" : "Later",
      title:
        locale === "hi"
          ? "संदेश में दिए निर्देश खोले या उनका पालन किया"
          : "Opened or followed the instructions in the message",
      sourceRefs: [
        {
          type: "STATEMENT",
          label: locale === "hi" ? "बयान" : "Statement",
        },
      ],
    });
  }

  draft.transactions.forEach((transaction, index) => {
    if (!transaction.amount) return;
    const institution = citizenVisibleValue(transaction.institution);
    const transactionEvidenceIndexes = draft.evidence
      .map((item, evidenceIndex) => item.type === "TRANSACTION_SCREENSHOT" ? evidenceIndex : -1)
      .filter((evidenceIndex) => evidenceIndex >= 0);
    const transactionEvidenceIndex = transactionEvidenceIndexes[index] ?? -1;
    const credit = transaction.direction === "CREDIT";
    events.push({
      id: `transaction-${transaction.id}`,
      timeLabel: displayTime(transaction.approximateTime, locale) ??
        (index > 0 ? (locale === "hi" ? "बाद में" : "Later") : null),
      title:
        credit
          ? locale === "hi"
            ? `${formatCurrency(transaction.amount)} का क्रेडिट वापस मिला`
            : `${formatCurrency(transaction.amount)} credit was received back`
          : locale === "hi"
          ? `लेन-देन ${index + 1}: ${formatCurrency(transaction.amount)}${institution ? ` का ${institution} लेन-देन` : " का भुगतान"} दर्ज हुआ`
          : `Transaction ${index + 1}: ${formatCurrency(transaction.amount)} payment${institution ? ` using ${institution}` : ""} was recorded`,
      sourceRefs: [
        transaction.evidenceId || transactionEvidenceIndex >= 0
          ? {
              type: "TRANSACTION",
              label: locale === "hi" ? "बैंक लेन-देन" : "Bank transaction",
              evidenceId: transaction.evidenceId ?? uploadedScreenshotId(draft, transactionEvidenceIndex, isDemoIncident),
            }
          : {
              type: "STATEMENT",
              label: locale === "hi" ? "बयान" : "Statement",
            },
      ],
    });
  });

  return events.length >= 2 ? events : [];
}
