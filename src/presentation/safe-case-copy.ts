import { CITIZEN_DOES_NOT_HAVE, type IncidentDraft } from "../incident/schema";
import { sanitizeDerivedText } from "./evidence-privacy";
import type { UiLocale } from "../i18n/i18n-provider";
import { formatCurrency } from "./format";
import { getIncidentCapabilities } from "../incident/capabilities";
import { resolveFinancialLoss } from "../incident/financial-summary";

function line(label: string, value: string | null | undefined) {
  if (!value || value === CITIZEN_DOES_NOT_HAVE || value === "UNKNOWN") return null;
  return `${label}: ${sanitizeDerivedText(value)}`;
}

function citizenDate(value: string | null, locale: UiLocale): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function getSafeCaseSummary(
  draft: IncidentDraft,
  reference: string,
  locale: UiLocale,
): string {
  const hi = locale === "hi";
  const capabilities = getIncidentCapabilities(draft);
  const total = resolveFinancialLoss(draft).resolvedLoss;
  const safeType = capabilities.threatOrExtortion
    ? hi ? "धमकी / जबरन वसूली" : "Threat / extortion"
    : capabilities.accountCompromise
      ? hi ? "खाता समझौता" : "Account compromise"
      : draft.officialMapping.subCategoryLabel ?? draft.citizenSummary.incidentLabel;
  return [
    hi ? "साइबर अपराध रिपोर्ट सार" : "Cybercrime report summary",
    line(hi ? "प्रकार" : "Type", safeType),
    line(
      hi ? "प्रभावित प्लेटफ़ॉर्म" : "Affected platforms",
      draft.adaptiveFacts.affectedPlatforms.length > 0
        ? draft.adaptiveFacts.affectedPlatforms.join(", ")
        : draft.adaptiveFacts.platform,
    ),
    line(
      hi ? "संदेश में बताई गई सेवा" : "Message source platform",
      draft.adaptiveFacts.messageSourcePlatforms.join(", "),
    ),
    draft.adaptiveFacts.multipleIncidentThreads
      ? (hi ? "घटना के हिस्से: दो अलग घटना-क्रम दर्ज हैं" : "Incident threads: Two separate incident threads are recorded")
      : null,
    line(hi ? "वित्तीय नुकसान" : "Financial loss", draft.incident.financialLossState === "YES" ? "Yes" : draft.incident.financialLossState === "NO" ? "No" : "Not confirmed"),
    total ? line(hi ? "रिपोर्ट की गई हानि" : "Reported loss", formatCurrency(total)) : null,
    draft.transactions.length > 0
      ? line(hi ? "लेन-देन" : "Transactions", String(draft.transactions.length))
      : null,
    line(hi ? "घटना की तारीख" : "Incident date", citizenDate(draft.incident.incidentDate, locale)),
    line(hi ? "संदर्भ" : "Reference", reference),
  ].filter((item): item is string => Boolean(item)).join("\n");
}
