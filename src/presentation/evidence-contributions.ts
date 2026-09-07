import type { IncidentDraft } from "../incident/schema";
import {
  evidenceFactShouldStayOnlyInOriginal,
  sanitizeDerivedText,
} from "./evidence-privacy";
import type { UiLocale } from "../i18n/i18n-provider";
import { formatCurrency } from "./format";
import { citizenVisibleValue } from "./citizen-visible-value";

export type EvidenceFact = {
  fieldKey: string;
  label: string;
  displayValue: string;
};

export type EvidenceContribution = {
  evidenceId: string;
  evidenceLabel: string;
  evidenceType: string;
  contributions: EvidenceFact[];
};

type EvidenceContributionOptions = {
  locale: UiLocale;
  isDemoIncident: boolean;
  screenshotNames: string[];
  demoEvidence?: readonly {
    id: string;
    label: string;
    labelHi: string;
  }[];
};

function formatDate(value: string | null, locale: UiLocale) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatTime(value: string | null, locale: UiLocale) {
  const visibleValue = citizenVisibleValue(value);
  if (!visibleValue) return null;
  const [hours, minutes] = visibleValue.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return visibleValue;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)));
}

function contribution(
  fieldKey: string,
  label: string,
  displayValue: string | null | undefined,
): EvidenceFact | null {
  if (displayValue && evidenceFactShouldStayOnlyInOriginal(displayValue)) {
    return null;
  }
  const value = citizenVisibleValue(displayValue);
  return value
    ? { fieldKey, label, displayValue: sanitizeDerivedText(value) }
    : null;
}

function uniqueFacts(facts: Array<EvidenceFact | null>) {
  const seen = new Set<string>();
  return facts
    .filter((fact): fact is EvidenceFact => Boolean(fact))
    .filter((fact) => {
      const key = `${fact.label}:${fact.displayValue}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function demoContributions(
  draft: IncidentDraft,
  evidence: IncidentDraft["evidence"][number],
  evidenceIndex: number,
  locale: UiLocale,
  evidenceId?: string,
) {
  const hi = locale === "hi";
  if (evidence.type === "CHAT_SCREENSHOT") {
    const phone = draft.suspectIdentifiers.find((item) => item.type === "PHONE")?.value;
    const url = draft.suspectIdentifiers.find((item) => item.type === "URL")?.value;
    return uniqueFacts([
      contribution("suspect.mobileNumber", hi ? "भेजने वाले का फ़ोन" : "Sender phone", phone),
      contribution("suspect.url", hi ? "संदिग्ध वेबसाइट" : "Suspicious URL", url),
      ...evidence.extractedFacts.map((fact, index) => contribution(
        `evidence.${evidenceIndex}.fact.${index}`,
        hi ? "सबूत में मिली जानकारी" : "Detail found",
        fact,
      )),
    ]);
  }

  if (evidence.type === "TRANSACTION_SCREENSHOT") {
    const transactionIndex = draft.evidence
      .slice(0, evidenceIndex)
      .filter((item) => item.type === "TRANSACTION_SCREENSHOT").length;
    const transaction = draft.transactions.find(
      (item) => item.evidenceId === evidenceId,
    ) ?? draft.transactions[transactionIndex] ?? draft.transactions[0];
    const date = formatDate(transaction?.transactionDate ?? null, locale);
    const time = formatTime(transaction?.approximateTime ?? null, locale);
    return uniqueFacts([
      contribution(
        `transactions.${transactionIndex}.amount`,
        hi ? "राशि" : "Amount",
        transaction?.amount ? formatCurrency(transaction.amount) : null,
      ),
      contribution(
        `transactions.${transactionIndex}.institution`,
        hi ? "बैंक" : "Bank",
        transaction?.institution,
      ),
      contribution(
        `transactions.${transactionIndex}.transactionDate`,
        hi ? "लेन-देन का समय" : "Transaction time",
        [date, time].filter(Boolean).join(" · "),
      ),
      contribution(
        `transactions.${transactionIndex}.transactionIdOrUtr`,
        hi ? "लेन-देन संदर्भ" : "Transaction reference",
        transaction?.transactionIdOrUtr,
      ),
      ...evidence.extractedFacts.map((fact, index) => contribution(
        `evidence.${evidenceIndex}.fact.${index}`,
        hi ? "सबूत में मिली जानकारी" : "Detail found",
        fact,
      )),
    ]);
  }

  return uniqueFacts(evidence.extractedFacts.map((fact, index) => contribution(
    `evidence.${evidenceIndex}.fact.${index}`,
    hi ? "सबूत में मिली जानकारी" : "Detail found",
    fact,
  )));
}

function liveContributions(
  draft: IncidentDraft,
  evidence: IncidentDraft["evidence"][number],
  evidenceIndex: number,
  locale: UiLocale,
) {
  const hi = locale === "hi";
  const factText = evidence.extractedFacts.join(" ");

  if (evidence.type === "TRANSACTION_SCREENSHOT") {
    const transactionEvidenceBefore = draft.evidence
      .slice(0, evidenceIndex)
      .filter((item) => item.type === "TRANSACTION_SCREENSHOT").length;
    const transaction =
      draft.transactions[transactionEvidenceBefore] ?? draft.transactions[0];
    const amountText = transaction?.amount
      ? formatCurrency(transaction.amount)
      : null;
    const date = formatDate(transaction?.transactionDate ?? null, locale);
    const time = formatTime(transaction?.approximateTime ?? null, locale);
    const referenceMentioned = /reference|transaction id|utr|संदर्भ/i.test(factText);
    return uniqueFacts([
      contribution(
        "transactions.amount",
        hi ? "राशि" : "Amount",
        amountText && factText.includes(amountText) ? amountText : null,
      ),
      contribution(
        "transactions.institution",
        hi ? "बैंक या भुगतान संस्था" : "Bank or payment institution",
        transaction?.institution &&
          factText.toLowerCase().includes(transaction.institution.toLowerCase())
          ? transaction.institution
          : null,
      ),
      contribution(
        "transactions.dateTime",
        hi ? "लेन-देन का समय" : "Transaction time",
        /date|dated|time|समय|तारीख/i.test(factText)
          ? [date, time].filter(Boolean).join(" · ")
          : null,
      ),
      contribution(
        "transactions.reference",
        hi ? "लेन-देन संदर्भ" : "Transaction reference",
        referenceMentioned ? transaction?.transactionIdOrUtr : null,
      ),
      ...evidence.extractedFacts.map((fact, index) =>
        contribution(
          `evidence.${evidenceIndex}.fact.${index}`,
          hi ? "सबूत में मिली जानकारी" : "Detail found",
          fact,
        ),
      ),
    ]);
  }

  const identifiers = draft.suspectIdentifiers.filter((identifier) =>
    factText.toLowerCase().includes(
      identifier.value
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .toLowerCase(),
    ),
  );
  return uniqueFacts([
    ...identifiers.map((identifier) =>
      contribution(
        `suspect.${identifier.type.toLowerCase()}`,
        identifier.type === "PHONE"
          ? hi
            ? "फ़ोन"
            : "Phone"
          : identifier.type === "URL"
            ? hi
              ? "वेबसाइट"
              : "Website"
            : hi
              ? "पहचान"
              : "Identifier",
        identifier.value,
      ),
    ),
    ...evidence.extractedFacts.map((fact, index) =>
      contribution(
        `evidence.${evidenceIndex}.fact.${index}`,
        hi ? "सबूत में मिली जानकारी" : "Detail found",
        fact,
      ),
    ),
  ]);
}

export function deriveEvidenceContributions(
  draft: IncidentDraft,
  { locale, isDemoIncident, screenshotNames, demoEvidence }: EvidenceContributionOptions,
): EvidenceContribution[] {
  let screenshotIndex = 0;
  return draft.evidence.flatMap((evidence, evidenceIndex) => {
    if (evidence.type === "VOICE_STATEMENT") return [];

    const currentScreenshotIndex = screenshotIndex;
    screenshotIndex += 1;
    const isMessage = evidence.type === "CHAT_SCREENSHOT";
    const demoMetadata = demoEvidence?.[currentScreenshotIndex];
    const evidenceLabel = isDemoIncident
      ? demoMetadata
        ? locale === "hi" ? demoMetadata.labelHi : demoMetadata.label
        : isMessage
          ? locale === "hi"
            ? "केवाईसी संदेश का स्क्रीनशॉट"
            : "KYC message screenshot"
          : locale === "hi"
            ? "बैंक लेन-देन का स्क्रीनशॉट"
            : "Bank transaction screenshot"
      : screenshotNames[currentScreenshotIndex] ??
        (locale === "hi" ? "जोड़ा गया सबूत" : "Uploaded evidence");

    return [
      {
        evidenceId: isDemoIncident
          ? demoMetadata?.id ?? (isMessage ? "demo-message" : "demo-transaction")
          : `uploaded-${currentScreenshotIndex}`,
        evidenceLabel,
        evidenceType:
          evidence.type === "CHAT_SCREENSHOT"
            ? locale === "hi"
              ? "संदेश"
              : "Message"
            : evidence.type === "TRANSACTION_SCREENSHOT"
              ? locale === "hi"
                ? "लेन-देन"
                : "Transaction"
              : locale === "hi"
                ? "सबूत"
                : "Evidence",
        contributions: isDemoIncident
          ? demoContributions(
              draft,
              evidence,
              evidenceIndex,
              locale,
              demoMetadata?.id,
            )
          : liveContributions(draft, evidence, evidenceIndex, locale),
      },
    ];
  });
}
