import { sanitizeSensitiveText } from "../incident/sensitive-text";

export type PrivacyFirewallSummary = {
  used: string[];
  keptOnlyInOriginal: string[];
};

const SECRET_LABEL_PATTERN = /\b(?:otp|one[\s-]?time password|pin|cvv|cvc|password|passcode|authentication code)\b/i;
const BALANCE_PATTERN = /\b(?:available|closing|current|account)\s+balance\b/i;
const FULL_CARD_PATTERN = /\b(?:card(?:\s+number)?|account(?:\s+number)?|a\/?c)\s*(?:is|was|:|#|-)?\s*([0-9][0-9\s-]{7,22}[0-9])\b/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?91[\s-]?)?([6-9]\d{9})(?!\d)/g;
const PHONE_CONTEXT_PATTERN = /\b(?:caller|phone|mobile|contact)(?:\s+(?:number|no\.?))?\s*(?:is|was|:|=|-)?\s*((?:\+?91[\s-]?)?[6-9]\d{9})\b/gi;

export function evidenceFactShouldStayOnlyInOriginal(fact: string): boolean {
  return SECRET_LABEL_PATTERN.test(fact) || BALANCE_PATTERN.test(fact);
}

function maskDigits(value: string, visibleDigits = 4): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= visibleDigits) return value;
  return `${"•".repeat(Math.min(8, digits.length - visibleDigits))}${digits.slice(-visibleDigits)}`;
}

/**
 * Central policy for text copied from evidence into derived citizen outputs.
 * It never mutates the original evidence or source transcript.
 */
export function sanitizeDerivedText(value: string): string {
  const withoutSecrets = sanitizeSensitiveText(value).text;
  return withoutSecrets
    .replace(FULL_CARD_PATTERN, (match, identifier: string) =>
      match.replace(identifier, maskDigits(identifier)),
    )
    .replace(PHONE_CONTEXT_PATTERN, (match, number: string) =>
      match.replace(number, maskDigits(number)),
    )
    .replace(
      /(?:available|closing|current|account)\s+balance\s*(?:is|was|:|=)?\s*(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d{1,2})?/gi,
      "Balance kept only in original evidence",
    );
}

export function safeDerivedIdentifier(
  value: string | null | undefined,
  kind: "ACCOUNT" | "CARD" | "PHONE" | "REFERENCE" | "GENERAL",
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (kind === "REFERENCE") return sanitizeDerivedText(trimmed);
  if (kind === "ACCOUNT" || kind === "CARD") return maskDigits(trimmed);
  if (kind === "PHONE") return trimmed.replace(PHONE_PATTERN, (_match, number: string) => maskDigits(number));
  return sanitizeDerivedText(trimmed);
}

export function derivePrivacyFirewallSummary(
  facts: readonly string[],
): PrivacyFirewallSummary {
  const used: string[] = [];
  const keptOnlyInOriginal = new Set<string>();
  for (const fact of facts) {
    if (SECRET_LABEL_PATTERN.test(fact)) {
      keptOnlyInOriginal.add("Authentication code");
      continue;
    }
    if (BALANCE_PATTERN.test(fact)) {
      keptOnlyInOriginal.add("Unrelated balance");
      continue;
    }
    if (/\b(?:full\s+)?(?:account|card)(?:\s+number|\s+details)?\b/i.test(fact)) {
      keptOnlyInOriginal.add("Full account or card details");
    }
    const safe = sanitizeDerivedText(fact).trim();
    if (safe && !used.includes(safe)) used.push(safe);
  }
  return {
    used: used.slice(0, 4),
    keptOnlyInOriginal: [...keptOnlyInOriginal],
  };
}
