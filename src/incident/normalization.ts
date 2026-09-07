import type {
  FinancialExposure,
  FinancialLossState,
  IncidentDraft,
} from "./schema";

const EMPTY_FINANCIAL_EXPOSURE: FinancialExposure = {
  bankDetailsRequested: null,
  identityDocumentRequested: null,
  otpRequested: null,
  paymentLinkReceived: null,
  upiCollectRequestReceived: null,
};

const INSTITUTION_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\bindian bank\b/i, "Indian Bank"],
  [/\bstate bank of india\b|\bsbi\b/i, "SBI"],
  [/\bhdfc(?: bank)?\b/i, "HDFC Bank"],
  [/\bicici(?: bank)?\b/i, "ICICI Bank"],
  [/\baxis(?: bank)?\b/i, "Axis Bank"],
  [/\bkotak(?: mahindra)?(?: bank)?\b/i, "Kotak Mahindra Bank"],
  [/\bpaytm\b/i, "Paytm"],
  [/\bphonepe\b/i, "PhonePe"],
  [/\bgoogle pay\b|\bgpay\b/i, "Google Pay"],
];

export type MonetaryRole =
  | "ACTUAL_OUTFLOW"
  | "STATED_TOTAL_LOSS"
  | "REQUESTED_AMOUNT"
  | "DEMANDED_AMOUNT"
  | "PROMISED_AMOUNT"
  | "PRIZE_AMOUNT"
  | "BALANCE_BEFORE"
  | "BALANCE_AFTER"
  | "ATTEMPTED_AMOUNT"
  | "BLOCKED_AMOUNT"
  | "REFUND_PROMISED"
  | "REFUND_RECEIVED"
  | "UNKNOWN_FINANCIAL_MENTION";

export type MonetaryMention = {
  amount: number;
  index: number;
  context: string;
  sourceKey: string;
  role: MonetaryRole;
};

/** Keep structured evidence aligned one-to-one with files actually supplied. */
export function alignEvidenceToUploadedFiles(
  draft: IncidentDraft,
  uploadedFileCount: number,
): IncidentDraft {
  const count = Math.max(0, Math.floor(uploadedFileCount));
  if (count === 0) return { ...draft, evidence: [] };

  const extractedEvidence = draft.evidence.filter(
    (item) => item.type !== "VOICE_STATEMENT",
  );
  const alignedEvidence = Array.from({ length: count }, (_, index) =>
    extractedEvidence[index] ?? { type: "OTHER" as const, extractedFacts: [] },
  );

  return { ...draft, evidence: alignedEvidence };
}

export type DeterministicFinancialFacts = {
  financialLossState: FinancialLossState;
  financialExposure: FinancialExposure;
  mentionedInstitutions: string[];
  monetaryMentions: MonetaryMention[];
  transactionAmounts: number[];
  statedTotalLoss: number | null;
  reportedAmount: number | null;
  openingBalance: number | null;
  intermediateBalances: number[];
  closingBalance: number | null;
  lossStateExplicit: boolean;
  lossUncertaintyExplicit: boolean;
};

export type IncidentNormalizationOptions = {
  reportingDate?: string;
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sept: 9, sep: 9, october: 10,
  oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function validDateOnly(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function shiftDateOnly(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

export function resolveRelativeIncidentContext(
  text: string,
  reportingDate?: string,
): { incidentDate: string | null; approximateTime: string | null } {
  if (!validDateOnly(reportingDate)) {
    return { incidentDate: null, approximateTime: null };
  }
  const normalized = text.toLowerCase();
  const twoDaysAgo = /\btwo days ago\b/.test(normalized);
  const isYesterday = /\byesterday\b|\blast night\b/.test(normalized);
  const isToday = /\btoday\b|\btonight\b/.test(normalized);
  const lastWeekday = normalized.match(/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (!twoDaysAgo && !isYesterday && !isToday && !lastWeekday) {
    return { incidentDate: null, approximateTime: null };
  }
  const approximateTime = /\bmorning\b/.test(normalized)
    ? "Morning"
    : /\bevening\b/.test(normalized)
      ? "Evening"
      : /\bnight\b|\btonight\b/.test(normalized)
        ? "Night"
        : null;
  let incidentDate = reportingDate;
  if (twoDaysAgo) incidentDate = shiftDateOnly(reportingDate, -2);
  else if (isYesterday) incidentDate = shiftDateOnly(reportingDate, -1);
  else if (lastWeekday) {
    const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(lastWeekday[1]);
    const current = new Date(`${reportingDate}T12:00:00Z`).getUTCDay();
    const daysBack = ((current - weekday + 7) % 7) || 7;
    incidentDate = shiftDateOnly(reportingDate, -daysBack);
  }
  return {
    incidentDate,
    approximateTime,
  };
}

function firstMonthDay(text: string): { month: number; day: number; index: number } | null {
  const matches: Array<{ month: number; day: number; index: number }> = [];
  const monthFirst = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi;
  const dayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/gi;
  for (const match of text.matchAll(monthFirst)) {
    const month = MONTHS[match[1].toLowerCase()];
    const day = Number(match[2]);
    if (month && day >= 1 && day <= 31 && match.index !== undefined) matches.push({ month, day, index: match.index });
  }
  for (const match of text.matchAll(dayFirst)) {
    const month = MONTHS[match[2].toLowerCase()];
    const day = Number(match[1]);
    if (month && day >= 1 && day <= 31 && match.index !== undefined) matches.push({ month, day, index: match.index });
  }
  return matches.sort((left, right) => left.index - right.index)[0] ?? null;
}

function pastEventContext(text: string): boolean {
  return /\b(?:happened|occurred|received|clicked|paid|transferred|sent|debited|lost|was|were|could not|couldn't|did not|didn't)\b/i.test(text);
}

export function resolveOmittedYearDate(
  text: string,
  reportingDate?: string,
): { incidentDate: string | null; incidentDateWithoutYear: string | null } {
  if (!validDateOnly(reportingDate)) return { incidentDate: null, incidentDateWithoutYear: null };
  const relative = resolveRelativeIncidentContext(text, reportingDate).incidentDate;
  if (relative) return { incidentDate: relative, incidentDateWithoutYear: null };
  const mention = firstMonthDay(text);
  if (!mention) return { incidentDate: null, incidentDateWithoutYear: null };
  const [reportYear] = reportingDate.split("-").map(Number);
  const partial = `${String(mention.month).padStart(2, "0")}-${String(mention.day).padStart(2, "0")}`;
  const explicitYear = text
    .slice(Math.max(0, mention.index - 8), mention.index + 35)
    .match(/\b(20\d{2})\b/)?.[1];
  if (explicitYear) {
    return { incidentDate: `${explicitYear}-${partial}`, incidentDateWithoutYear: null };
  }
  const currentYearCandidate = `${reportYear}-${partial}`;
  if (currentYearCandidate <= reportingDate) {
    return { incidentDate: currentYearCandidate, incidentDateWithoutYear: null };
  }
  const context = text.slice(Math.max(0, mention.index - 120), mention.index + 140);
  return pastEventContext(context)
    ? { incidentDate: `${reportYear - 1}-${partial}`, incidentDateWithoutYear: null }
    : { incidentDate: null, incidentDateWithoutYear: partial };
}

function parseAmount(raw: string, unit: string | undefined): number | null {
  const numeric = Number(raw.replaceAll(",", ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const multiplier = /crore/i.test(unit ?? "")
    ? 10_000_000
    : /lakh|lac/i.test(unit ?? "")
      ? 100_000
    : /thousand|hazaar|hazar|k\b/i.test(unit ?? "")
        ? 1_000
        : 1;
  return Math.round(numeric * multiplier);
}

function stableSourceKey(index: number, amount: number): string {
  return `statement-${index}-${amount}`;
}

function classifyMonetaryRole(text: string, index: number, length: number): MonetaryRole {
  const sentenceStart = Math.max(
    text.lastIndexOf(".", index - 1),
    text.lastIndexOf("!", index - 1),
    text.lastIndexOf("?", index - 1),
    text.lastIndexOf("\n", index - 1),
  ) + 1;
  const nextStops = [".", "!", "?", "\n"]
    .map((stop) => text.indexOf(stop, index + length))
    .filter((position) => position >= 0);
  const sentenceEnd = nextStops.length > 0 ? Math.min(...nextStops) : text.length;
  const sentence = text.slice(sentenceStart, sentenceEnd).toLowerCase();
  const before = text.slice(Math.max(sentenceStart, index - 55), index).toLowerCase();
  const after = text.slice(index + length, Math.min(sentenceEnd, index + length + 55)).toLowerCase();
  const near = `${before} amount ${after}`;
  const actualMovement = /\b(?:paid|transferred|sent|debited|deducted|charged|withdrew|withdrawn|money left|made (?:a |two |three )?payments?|payments? (?:was|were )?completed|actual transfer)\b/;

  if (/\b(?:attempted|tried|trying)\b/.test(before) && /\b(?:debit|deduct|charge|transfer|payment|pay)\b/.test(before)) {
    return /\b(?:blocked|declined|stopped|prevented)\b/.test(after)
      ? "BLOCKED_AMOUNT"
      : "ATTEMPTED_AMOUNT";
  }
  if (/\b(?:blocked|declined|stopped|prevented)\b/.test(sentence) && !actualMovement.test(sentence) && /\b(?:debit|deduct|charge|transfer|payment|pay)\b/.test(sentence)) {
    return "BLOCKED_AMOUNT";
  }
  if (/\b(?:balance|account had|had in (?:my|the) account|starting with|started with)\b/.test(before)) {
    return /\b(?:now|remaining|left|after|current|became|ending|closing|finally)\b/.test(near)
      ? "BALANCE_AFTER"
      : "BALANCE_BEFORE";
  }
  if (/\b(?:refund|reimburse)\b/.test(sentence)) {
    return /\b(?:received|credited|got)\b/.test(sentence)
      ? "REFUND_RECEIVED"
      : "REFUND_PROMISED";
  }
  if (
    /\b(?:total(?: loss)?|altogether|in all)\b/.test(near) ||
    /^\s*(?:was|is)?\s*(?:in\s+)?total\b/.test(after)
  ) {
    return "STATED_TOTAL_LOSS";
  }
  if (
    actualMovement.test(before.slice(-45)) ||
    /^\s*(?:was\s+)?(?:debited|deducted|charged|transferred|sent|withdrawn)\b/.test(after)
  ) {
    return "ACTUAL_OUTFLOW";
  }
  if (/\b(?:demanded|demanding|demand)(?:\s+(?:me\s+)?(?:to\s+)?(?:pay|transfer|send))?\s*$/.test(before)) {
    return "DEMANDED_AMOUNT";
  }
  if (/\b(?:asked|request(?:ed|ing)?|required|told me to)[^.!?\n]{0,35}(?:pay|transfer|send|fee|for)?\s*$/.test(before)) {
    return "REQUESTED_AMOUNT";
  }
  if (/\b(?:won|winnings?|prize|lottery|reward)(?:\s+(?:of|worth))?\s*$/.test(before)) {
    return "PRIZE_AMOUNT";
  }
  if (/\b(?:promised|offered|salary)[^.!?\n]{0,25}$/.test(before)) {
    return "PROMISED_AMOUNT";
  }
  if (actualMovement.test(sentence)) {
    return "ACTUAL_OUTFLOW";
  }
  return "UNKNOWN_FINANCIAL_MENTION";
}

function amountsFromText(text: string): MonetaryMention[] {
  const number = "(\\d[\\d,]*(?:\\.\\d+)?)";
  const unit = "(crores?|lakhs?|lacs?|thousand|hazaar|hazar|k)";
  const pattern = new RegExp(`(?:₹|rs\\.?|inr)\\s*${number}\\s*${unit}?|${number}\\s*${unit}?\\s*(?:rupees?|रुपये)|${number}\\s*${unit}|\\b(\\d[\\d,]{2,}(?:\\.\\d+)?)\\b`, "gi");
  const matches: MonetaryMention[] = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match[1] ?? match[3] ?? match[5] ?? match[7];
    const amount = raw ? parseAmount(raw, match[2] ?? match[4] ?? match[6]) : null;
    if (!amount || match.index === undefined) continue;
    const role = classifyMonetaryRole(text, match.index, match[0].length);
    if (role === "UNKNOWN_FINANCIAL_MENTION" && !/[₹]|rs\.?|inr|rupees?|रुपये|lakh|lac|crore|thousand|hazaar|hazar/i.test(match[0])) {
      continue;
    }
    matches.push({
      amount,
      index: match.index,
      context: text.slice(Math.max(0, match.index - 70), match.index + match[0].length + 45),
      sourceKey: stableSourceKey(match.index, amount),
      role,
    });
  }
  const wordValues: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, twentyfive: 25,
    thirty: 30, forty: 40, fifty: 50,
  };
  const wordPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty(?:[ -]?five)?|thirty|forty|fifty)\s+(thousand|hazaar|hazar|lakhs?|lacs?|crores?)\b/gi;
  for (const match of text.matchAll(wordPattern)) {
    if (match.index === undefined) continue;
    const word = match[1].toLowerCase().replace(/[ -]/g, "");
    const numeric = wordValues[word];
    const amount = numeric ? parseAmount(String(numeric), match[2]) : null;
    if (!amount) continue;
    matches.push({
      amount,
      index: match.index,
      context: text.slice(Math.max(0, match.index - 70), match.index + match[0].length + 45),
      sourceKey: stableSourceKey(match.index, amount),
      role: classifyMonetaryRole(text, match.index, match[0].length),
    });
  }
  matches.sort((left, right) => left.index - right.index);
  return matches.map((mention) => {
    if (mention.role !== "REQUESTED_AMOUNT") return mention;
    const sourceFollowing = text.slice(mention.index, mention.index + 180);
    if (/\b(?:paid|transferred|sent)\s+(?:it|that|the fee|this amount)\b/i.test(sourceFollowing)) {
      return { ...mention, role: "ACTUAL_OUTFLOW" };
    }
    return mention;
  });
}

export function deriveFinancialFactsFromText(text: string): DeterministicFinancialFacts {
  const normalized = text.trim();
  const explicitUncertainLoss = /\b(?:not sure|unsure|do not know|don't know|cannot tell|can't tell)\b[^.!?\n]{0,70}\b(?:money|payment|paid|debit(?:ed)?|deducted|transfer(?:red)?|loss|lost)\b|\b(?:money|payment|debit|transfer|loss)\b[^.!?\n]{0,70}\b(?:not sure|unsure|unknown)\b/i.test(normalized);
  const explicitNoLoss = /\b(?:did not|didn't|have not|haven't|no)\s+(?:pay|paid|transfer|transferred|lose|lost|make (?:a )?payment)|\bno money (?:was )?(?:lost|paid|debited|transferred)|\bwithout (?:paying|losing)\b/i.test(normalized);
  const monetaryMentions = amountsFromText(normalized);
  const actualOutflows = monetaryMentions.filter(({ role }) => role === "ACTUAL_OUTFLOW");
  const statedTotalMention = monetaryMentions.find(({ role }) => role === "STATED_TOTAL_LOSS");
  const blockedOnly = monetaryMentions.some(({ role }) => role === "BLOCKED_AMOUNT") && actualOutflows.length === 0;
  const explicitLoss = actualOutflows.length > 0 || Boolean(statedTotalMention);
  const financialLossState: FinancialLossState = explicitUncertainLoss
    ? "UNKNOWN"
    : explicitNoLoss || blockedOnly
    ? "NO"
    : explicitLoss
      ? "YES"
      : "UNKNOWN";

  const financialExposure: FinancialExposure = {
    ...EMPTY_FINANCIAL_EXPOSURE,
    bankDetailsRequested: /(?:ask(?:ed|s|ing)?|request(?:ed|s|ing)?)\s+(?:me\s+)?(?:for|to share).*bank (?:details|account)|bank (?:details|account).*(?:ask(?:ed|s|ing)?|request(?:ed|s|ing)?)/i.test(normalized) ? true : null,
    identityDocumentRequested: /(?:ask(?:ed|s|ing)?|request(?:ed|s|ing)?).*(?:aadhaar|aadhar|pan|identity (?:document|proof)|id proof)/i.test(normalized) ? true : null,
    otpRequested: /(?:ask(?:ed|s|ing)?|request(?:ed|s|ing)?).*(?:otp|one[ -]?time password)/i.test(normalized) ? true : null,
    paymentLinkReceived: /(?:sent|received|opened|clicked).*(?:payment )?link|(?:payment )?link.*(?:sent|received|opened|clicked)/i.test(normalized) ? true : null,
    upiCollectRequestReceived: /upi collect request|collect request.*upi/i.test(normalized) ? true : null,
  };
  const mentionedInstitutions = INSTITUTION_PATTERNS
    .filter(([pattern]) => pattern.test(normalized))
    .map(([, label]) => label);

  const unknownComponents = monetaryMentions.filter(({ role, context }) =>
    role === "UNKNOWN_FINANCIAL_MENTION" && /\b(?:first|then|later|next|after that)\b/i.test(context),
  );
  const componentMentions = actualOutflows.length > 0
    ? actualOutflows
    : statedTotalMention && unknownComponents.length > 0
      ? unknownComponents
      : [];
  const transactionAmounts = financialLossState === "YES"
    ? componentMentions.map(({ amount }) => amount)
    : [];
  const statedTotal = statedTotalMention?.amount ?? null;
  const componentTotal = transactionAmounts.reduce((sum, amount) => sum + amount, 0);
  const openingBalance = monetaryMentions.find(({ role }) => role === "BALANCE_BEFORE")?.amount ?? null;
  const balanceAfterValues = monetaryMentions
    .filter(({ role }) => role === "BALANCE_AFTER")
    .map(({ amount }) => amount);
  const closingBalance = balanceAfterValues.at(-1) ?? null;

  return {
    financialLossState,
    financialExposure,
    mentionedInstitutions,
    monetaryMentions: monetaryMentions.map((mention) =>
      componentMentions.includes(mention) && mention.role === "UNKNOWN_FINANCIAL_MENTION"
        ? { ...mention, role: "ACTUAL_OUTFLOW" }
        : mention,
    ),
    transactionAmounts,
    statedTotalLoss: statedTotal,
    reportedAmount: financialLossState === "YES"
      ? statedTotal ?? (componentTotal > 0 ? componentTotal : null)
      : null,
    openingBalance,
    intermediateBalances: balanceAfterValues.slice(0, -1),
    closingBalance,
    lossStateExplicit: explicitUncertainLoss || explicitNoLoss || blockedOnly || explicitLoss,
    lossUncertaintyExplicit: explicitUncertainLoss,
  };
}

const CHANNEL_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\b(?:via|through|on|over)\s+whats?app\b|\bwhats?app\s+(?:message|call|chat)\b/i, "WhatsApp"],
  [/\b(?:via|through|on|over)\s+telegram\b|\btelegram\s+(?:message|call|chat)\b/i, "Telegram"],
  [/\b(?:sms|text message)\b/i, "SMS / text message"],
  [/\b(?:e-?mail|email)\b/i, "Email"],
  [/\b(?:phone call|called me|caller|telephone call)\b/i, "Phone call"],
  [/\b(?:message|messaged|chat)\b/i, "Messages"],
  [/\b(?:website|web site|webpage|web page|https?:\/\/|www\.)\b/i, "Website"],
  [/\b(?:mobile app|banking app|application|app)\b/i, "Mobile app"],
];

function communicationChannelsFromText(text: string): string[] {
  const channels = Array.from(new Set(
    CHANNEL_PATTERNS
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => label)
      .filter((label) => label !== "Mobile app" || /\b(?:mobile app|banking app|application)\b/i.test(text)),
  ));
  const hasSpecificMessageChannel = channels.some((channel) =>
    ["WhatsApp", "Telegram", "SMS / text message", "Email"].includes(channel),
  );
  return hasSpecificMessageChannel
    ? channels.filter((channel) => channel !== "Messages")
    : channels;
}

function approximateEventTime(context: string): string | null {
  const exact = [...context.matchAll(/\b(?:at|around|about|approximately)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi)].at(-1);
  if (exact?.[1]) return exact[1];
  if (/\bmorning\b/i.test(context)) return "Morning";
  if (/\bevening\b/i.test(context)) return "Evening";
  if (/\b(?:night|tonight)\b/i.test(context)) return "Night";
  return null;
}

function incidentWideTimeIsSupported(text: string): boolean {
  return /\b(?:all (?:this|of this)|the (?:whole|entire) incident|everything)\b[^.!?\n]{0,50}\b(?:morning|afternoon|evening|night|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i.test(text);
}

function paymentInstitutionIsSupported(context: string, institution: string): boolean {
  const escaped = institution.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:from\\s+(?:my\\s+)?|using\\s+|through\\s+|via\\s+)${escaped}\\b`, "i").test(context);
}

function institutionIsOnlyImpersonated(context: string, institution: string): boolean {
  return /\b(?:impersonat|pretended|claimed|posing|fake|said (?:they|he|she) (?:were|was)|kyc)\b/i.test(context) &&
    !paymentInstitutionIsSupported(context, institution);
}

const KNOWN_PLATFORM_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\bfacebook\b/i, "Facebook"],
  [/\binstagram\b/i, "Instagram"],
  [/\bsnapchat\b/i, "Snapchat"],
  [/\b(?:x\s*\/\s*twitter|twitter)\b/i, "X"],
  [/\blinkedin\b/i, "LinkedIn"],
  [/\btelegram\b/i, "Telegram"],
  [/\bwhats?app\b/i, "WhatsApp"],
  [/\bgmail\b/i, "Gmail"],
  [/\boutlook\b/i, "Outlook"],
  [/\bdiscord\b/i, "Discord"],
  [/\byoutube\b/i, "YouTube"],
  [/\bamazon\b/i, "Amazon"],
  [/\bflipkart\b/i, "Flipkart"],
];

function platformFromIncidentText(text: string): string | null {
  for (const [pattern, name] of KNOWN_PLATFORM_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  const raw = text.match(
    /\b(?:account|profile)\s+(?:on|in)\s+([a-z][a-z0-9._-]{1,39})\b|\bmy\s+([a-z][a-z0-9._-]{1,39})\s+(?:account|profile)\b/i,
  );
  const name = raw?.[1] ?? raw?.[2];
  if (!name || /^(?:the|this|an|online|social)$/i.test(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function platformRolesFromText(text: string): {
  messageSourcePlatforms: string[];
  affectedPlatforms: string[];
  relationshipIsClear: boolean;
} {
  const messageSourcePlatforms = new Set<string>();
  const affectedPlatforms = new Set<string>();
  for (const [pattern, name] of KNOWN_PLATFORM_PATTERNS) {
    const platformExpression = pattern.source;
    const sourceRole = new RegExp(
      `(?:${platformExpression})[^.!?\\n]{0,38}(?:password[ -]?reset|security|verification|login)[^.!?\\n]{0,22}(?:message|email|link)|(?:message|email|link)[^.!?\\n]{0,35}(?:from|claiming|about)[^.!?\\n]{0,25}(?:${platformExpression})`,
      "i",
    );
    const harm = "(?:hacked|compromised|taken over|lost access|cannot access|can't access|could not access|couldn't access|cannot log in|can't log in|could not log in|couldn't log in|reset (?:my|the)|recovery (?:email|phone)[^.!?\\n]{0,24}changed)";
    const affectedRole = new RegExp(
      `(?:${platformExpression})[^.!?\\n]{0,50}${harm}|${harm}[^.!?\\n]{0,50}(?:${platformExpression})`,
      "i",
    );
    if (sourceRole.test(text)) messageSourcePlatforms.add(name);
    if (affectedRole.test(text)) affectedPlatforms.add(name);
  }
  const relationshipIsClear = /\b(?:through|via|using)\s+(?:my\s+)?(?:email|gmail|outlook|facebook|instagram|whats?app|telegram)\b|\b(?:hacked|compromised).{0,100}\b(?:then|afterwards?|subsequently)\b.{0,100}\b(?:reset|took over|compromised)\b/is.test(text);
  return {
    messageSourcePlatforms: [...messageSourcePlatforms],
    affectedPlatforms: [...affectedPlatforms],
    relationshipIsClear,
  };
}

function eventDateForMention(
  text: string,
  mentionIndex: number,
  previousMentionIndex: number,
  reportingDate?: string,
): string | null {
  const context = text.slice(Math.max(0, previousMentionIndex), Math.min(text.length, mentionIndex + 120));
  return resolveOmittedYearDate(context, reportingDate).incidentDate ??
    resolveRelativeIncidentContext(context, reportingDate).incidentDate;
}

function paymentInstitutionForMention(context: string): string | null {
  for (const [pattern, institution] of INSTITUTION_PATTERNS) {
    if (pattern.test(context) && paymentInstitutionIsSupported(context, institution)) return institution;
  }
  return null;
}

function normalizedTransactionDate(
  value: string | null,
  eventDate: string | null,
  eventContext: string,
  reportingDate?: string,
): string | null {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value && /^\d{2}-\d{2}$/.test(value) && validDateOnly(reportingDate)) {
    const [year] = reportingDate.split("-").map(Number);
    const currentYearCandidate = `${year}-${value}`;
    if (currentYearCandidate <= reportingDate) return currentYearCandidate;
    return pastEventContext(eventContext) ? `${year - 1}-${value}` : null;
  }
  return eventDate;
}

function sensitiveInformationFacts(text: string): {
  requested: string[];
  shared: string[];
} {
  const subjects: ReadonlyArray<[RegExp, string]> = [
    [/\bbank (?:details|account details)\b/i, "Bank details"],
    [/\botp\b|one[ -]?time password/i, "OTP"],
    [/\baadhaar\b|\baadhar\b/i, "Aadhaar"],
    [/\bpan\b|pan card/i, "PAN"],
    [/\bpassword\b/i, "Password"],
    [/\bupi id\b/i, "UPI ID"],
    [/\bemail(?: address)?\b/i, "Email"],
    [/\bphoto(?:graph)?\b/i, "Photo"],
  ];
  const requested = new Set<string>();
  const shared = new Set<string>();
  for (const clause of text.split(/[.!?;\n]+/)) {
    for (const [subject, label] of subjects) {
      if (!subject.test(clause)) continue;
      if (/\b(?:asked|requested|required|wanted|demanded)\b/i.test(clause)) requested.add(label);
      if (
        /\b(?:shared|gave|provided|sent|entered|disclosed)\b/i.test(clause) &&
        !/\b(?:did not|didn't|never)\s+(?:share|give|provide|send|enter|disclose)\b/i.test(clause)
      ) shared.add(label);
    }
  }
  return { requested: [...requested], shared: [...shared] };
}

function impersonatedEntityFromText(text: string): string | null {
  const match = text.match(/\b(?:pretended to be|claimed to be|posing as|impersonated?)\s+(?:a |an |the )?([^,.!?\n]{2,50})/i);
  return match?.[1]?.trim() ?? null;
}

export function normalizeIncidentChannel(draft: IncidentDraft): string | null {
  const evidenceFacts = draft.evidence.flatMap((item) => item.extractedFacts);
  const supportedSources = [
    draft.incident.occurredOn?.trim() ?? "",
    draft.classification.platform?.trim() ?? "",
    draft.adaptiveFacts.platform?.trim() ?? "",
    evidenceFacts.join(" \n"),
  ].filter(Boolean);

  if (supportedSources.length === 0) return null;
  for (const source of supportedSources) {
    for (const [pattern, label] of CHANNEL_PATTERNS) {
      if (pattern.test(source)) return label;
    }
  }
  return "Other";
}

export function normalizeIncidentDraft(
  draft: IncidentDraft,
  options: IncidentNormalizationOptions = {},
): IncidentDraft {
  const supportedText = [
    draft.incident.narrative,
    draft.citizenSummary.shortSummary,
    ...draft.evidence.flatMap((item) => item.extractedFacts),
  ].filter(Boolean).join("\n");
  // The narrative is the canonical event source. Summaries and extracted evidence
  // often repeat the same payment and must not multiply canonical transactions.
  const financialSourceText = draft.incident.narrative?.trim() ||
    draft.citizenSummary.shortSummary.trim() ||
    draft.evidence.flatMap((item) => item.extractedFacts).join("\n");
  const extracted = deriveFinancialFactsFromText(financialSourceText);
  const entityRoles = platformRolesFromText(financialSourceText);
  const platform = draft.citizenConfirmedFields.includes("adaptive.platform")
    ? draft.adaptiveFacts.platform
    : entityRoles.affectedPlatforms[0] ??
      draft.adaptiveFacts.platform ??
      draft.classification.platform ??
      platformFromIncidentText(financialSourceText);
  const sensitiveInformation = sensitiveInformationFacts(financialSourceText);
  const accountCompromise = /\b(?:hacked|taken over|took over|compromised|lost access)\b/i.test(financialSourceText) &&
    /\b(?:account|profile|facebook|instagram|snapchat|twitter|linkedin|gmail|outlook|discord|youtube)\b/i.test(financialSourceText);
  const threatOrExtortion = /\b(?:threatened|threatening|blackmail|extort|coerc)\b/i.test(financialSourceText);
  const impersonation = /\b(?:pretended to be|claimed to be|posing as|impersonat)\b/i.test(financialSourceText);
  const demandedAmount = extracted.monetaryMentions.find(
    ({ role }) => role === "DEMANDED_AMOUNT" || role === "REQUESTED_AMOUNT",
  )?.amount ?? null;
  const likelyFinancialCyberIncident = /\b(?:kyc|phishing|otp|upi collect|banking link)\b/i.test(financialSourceText) &&
    /\b(?:message|link|clicked|opened|downloaded|installed|shared|asked|request)\b/i.test(financialSourceText);
  const classification =
    draft.classification.reportFamily === "OUT_OF_SCOPE_OR_UNCLEAR" &&
    draft.classification.ambiguity === "INSUFFICIENT_INFORMATION" &&
    likelyFinancialCyberIncident
      ? {
          ...draft.classification,
          reportFamily: "FINANCIAL_FRAUD" as const,
          category: "Financial Fraud",
          subCategory: /\bkyc\b/i.test(financialSourceText)
            ? "Internet Banking Related Fraud"
            : "Online Financial Fraud",
          cyberElementPresent: true,
          moneyLost: extracted.financialLossState === "YES"
            ? true
            : extracted.financialLossState === "NO"
              ? false
              : null,
          ambiguity: "NONE" as const,
          explanation: "The account describes a likely financial cyber incident; whether money moved may still be unknown.",
          requiresCitizenConfirmation: false,
        }
      : draft.classification;
  const reportCategory = classification.reportFamily === "OUT_OF_SCOPE_OR_UNCLEAR"
    ? null
    : classification.reportFamily;
  const relativeContext = resolveRelativeIncidentContext(
    supportedText,
    options.reportingDate,
  );
  const partialDateContext = draft.incident.incidentDateWithoutYear
    ? `${draft.incident.incidentDateWithoutYear.slice(3)} ${Object.entries(MONTHS).find(([, month]) => month === Number(draft.incident.incidentDateWithoutYear?.slice(0, 2)))?.[0] ?? ""} ${pastEventContext(supportedText) ? "happened" : ""}`
    : supportedText;
  const inferredDate = resolveOmittedYearDate(partialDateContext, options.reportingDate);
  const isFinancialIncident = classification.reportFamily === "FINANCIAL_FRAUD";
  const financialLossState = isFinancialIncident
    ? draft.citizenConfirmedFields.includes("incident.financialLossState")
      ? draft.incident.financialLossState
      : extracted.lossStateExplicit
      ? extracted.financialLossState
      : draft.incident.financialLossState
    : classification.moneyLost === false || draft.incident.moneyLost === false
      ? "NO"
      : draft.incident.financialLossState;
  const moneyLost = isFinancialIncident
    ? financialLossState === "YES"
      ? true
      : financialLossState === "NO"
        ? false
        : null
    : draft.incident.moneyLost ?? classification.moneyLost;
  const existingTransactions = financialLossState === "YES" ? draft.transactions : [];
  const hasTransactionEvidence = draft.evidence.some(
    (item) => item.type === "TRANSACTION_SCREENSHOT",
  );
  const hasCitizenConfirmedTransaction = draft.citizenConfirmedFields.some((field) =>
    field.startsWith("transactions."),
  );
  const canonicalMentions = extracted.monetaryMentions.filter(
    ({ role }) => role === "ACTUAL_OUTFLOW",
  );
  const claimedExistingIndexes = new Set<number>();
  const transactionSource = financialLossState !== "YES"
    ? []
    : hasCitizenConfirmedTransaction
      ? existingTransactions
    : canonicalMentions.length > 0
      ? canonicalMentions.map((mention, index) => {
          const exactIndex = existingTransactions.findIndex(
            (transaction, transactionIndex) =>
              !claimedExistingIndexes.has(transactionIndex) &&
              transaction.amount === mention.amount,
          );
          const fallbackIndex = existingTransactions[index] &&
            existingTransactions[index].amount === null &&
            !claimedExistingIndexes.has(index)
            ? index
            : -1;
          const matchedIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
          if (matchedIndex >= 0) claimedExistingIndexes.add(matchedIndex);
          const existing = matchedIndex >= 0 ? existingTransactions[matchedIndex] : null;
          return {
            ...(existing ?? {
              id: `transaction-${mention.sourceKey}`,
              institution: null,
              currency: "INR",
              paymentMethod: null,
              accountOrUpiId: null,
              transactionIdOrUtr: null,
              transactionDate: null,
              approximateTime: null,
              referenceNumber: null,
              status: "KNOWN" as const,
            }),
            amount: mention.amount,
          };
        })
      : extracted.monetaryMentions.length > 0 && !hasTransactionEvidence
        ? []
        : existingTransactions;
  const normalizedIncidentDate = draft.incident.incidentDate ?? inferredDate.incidentDate ?? relativeContext.incidentDate;
  const evidenceHasSeparateTransactionDate = draft.evidence.some(
    (item) => item.type === "TRANSACTION_SCREENSHOT" &&
      item.extractedFacts.some((fact) => /\bdate(?:d)?\b|\btransaction date\b|तारीख/i.test(fact)),
  );
  const transactionDateFromIncident = Boolean(
    normalizedIncidentDate &&
    !evidenceHasSeparateTransactionDate &&
    /\b(?:after that|then|later|subsequently)\b[\s\S]*\b(?:paid|debited|transferred|sent)\b|\b(?:paid|debited|transferred|sent)\b[\s\S]*\b(?:after that|then|later|subsequently)\b/i.test(supportedText),
  );
  const seenTransactionIds = new Set<string>();
  const transactions = transactionSource.map((transaction, index) => {
      const mention = canonicalMentions[index];
      const previousMentionIndex = index > 0 ? (canonicalMentions[index - 1]?.index ?? 0) + 1 : 0;
      const eventDate = mention
        ? eventDateForMention(financialSourceText, mention.index, previousMentionIndex, options.reportingDate)
        : null;
      const eventInstitution = mention ? paymentInstitutionForMention(mention.context) : null;
      const eventContext = mention
        ? financialSourceText.slice(Math.max(0, previousMentionIndex), Math.min(financialSourceText.length, mention.index + 120))
        : "";
      const preferredId = transaction.id || `transaction-${index + 1}`;
      const id = seenTransactionIds.has(preferredId)
        ? `${preferredId}-${index + 1}`
        : preferredId;
      seenTransactionIds.add(id);
      const normalizedUtr = transaction.transactionIdOrUtr?.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const normalizedReference = transaction.referenceNumber?.replace(/[^a-z0-9]/gi, "").toLowerCase();
      return {
        ...transaction,
        id,
        institution: eventInstitution ?? (
          !hasCitizenConfirmedTransaction &&
          transaction.institution &&
          mention &&
          institutionIsOnlyImpersonated(mention.context, transaction.institution)
            ? null
            : transaction.institution),
        currency: transaction.currency ?? "INR",
        transactionDate: normalizedTransactionDate(
          transaction.transactionDate,
          eventDate,
          eventContext,
          options.reportingDate,
        ) ??
          (transactionDateFromIncident ? normalizedIncidentDate : null),
        referenceNumber: normalizedUtr && normalizedUtr === normalizedReference
          ? null
          : transaction.referenceNumber,
        approximateTime: transaction.approximateTime ??
          (mention ? approximateEventTime(mention.context) : null),
        status: transaction.amount || transaction.transactionIdOrUtr || transaction.referenceNumber
          ? "KNOWN" as const
          : "MISSING" as const,
      };
    });
  const derivedChannels = communicationChannelsFromText(financialSourceText);
  const knownPlatformNames = new Set(KNOWN_PLATFORM_PATTERNS.map(([, name]) => name));
  const communicationChannels = Array.from(new Set([
    ...draft.adaptiveFacts.communicationChannels.filter(
      (channel) => channel !== "Other" && (!knownPlatformNames.has(channel) || derivedChannels.includes(channel)),
    ),
    ...derivedChannels,
  ]));
  const messageSourcePlatforms = draft.citizenConfirmedFields.includes("adaptive.entityRelationship")
    ? draft.adaptiveFacts.messageSourcePlatforms
    : entityRoles.messageSourcePlatforms.length > 0
      ? entityRoles.messageSourcePlatforms
      : draft.adaptiveFacts.messageSourcePlatforms;
  const baseAffectedPlatforms = draft.citizenConfirmedFields.includes("adaptive.affectedPlatforms")
    ? draft.adaptiveFacts.affectedPlatforms
    : entityRoles.affectedPlatforms.length > 0
      ? entityRoles.affectedPlatforms
      : draft.adaptiveFacts.affectedPlatforms;
  const affectedPlatforms = Array.from(new Set([
    ...baseAffectedPlatforms,
    ...(entityRoles.relationshipIsClear ? entityRoles.messageSourcePlatforms : []),
  ]));
  const entityRelationship = draft.adaptiveFacts.entityRelationship ??
    (entityRoles.relationshipIsClear && affectedPlatforms.length > 1
      ? "RELATED_BOTH_AFFECTED" as const
      : null);
  const incidentTime = transactions.length > 1 &&
    !draft.citizenConfirmedFields.includes("incident.incidentTime") &&
    !incidentWideTimeIsSupported(financialSourceText)
      ? null
      : draft.incident.approximateTime ?? relativeContext.approximateTime;
  const mentionedInstitutions = Array.from(new Set([
    ...draft.mentionedInstitutions,
    ...extracted.mentionedInstitutions,
  ]));
  return {
    ...draft,
    classification: {
      ...classification,
      moneyLost,
    },
    officialMapping: {
      ...draft.officialMapping,
      category: reportCategory,
      categoryLabel: classification.category,
      subCategoryLabel: classification.subCategory,
    },
    adaptiveFacts: {
      ...draft.adaptiveFacts,
      platform,
      messageSourcePlatforms,
      affectedPlatforms,
      entityRelationship,
      multipleIncidentThreads: entityRelationship === "SEPARATE_INCIDENT_THREADS"
        ? true
        : draft.adaptiveFacts.multipleIncidentThreads,
      accountCompromise: draft.adaptiveFacts.accountCompromise ?? accountCompromise,
      recoveryEmailChanged: draft.adaptiveFacts.recoveryEmailChanged ??
        (/recovery email[^.!?\n]{0,30}(?:changed|removed)/i.test(financialSourceText) ? true : null),
      phoneNumberChanged: draft.adaptiveFacts.phoneNumberChanged ??
        (/(?:recovery )?phone(?: number)?[^.!?\n]{0,30}(?:changed|removed)/i.test(financialSourceText) ? true : null),
      credentialExposure: draft.adaptiveFacts.credentialExposure ??
        (sensitiveInformation.shared.length > 0 ? true : null),
      maliciousLink: draft.adaptiveFacts.maliciousLink ??
        (/\b(?:clicked|opened|downloaded from)\b[^.!?\n]{0,45}\blink\b|\blink\b[^.!?\n]{0,45}\b(?:clicked|opened)\b/i.test(financialSourceText) ? true : null),
      remoteAccess: draft.adaptiveFacts.remoteAccess ??
        (/\b(?:remote access|screen shar(?:e|ing)|anydesk|teamviewer|quick support)\b/i.test(financialSourceText) ? true : null),
      threatOrExtortion: draft.adaptiveFacts.threatOrExtortion ?? threatOrExtortion,
      demandedAmount: draft.adaptiveFacts.demandedAmount ?? demandedAmount,
      threatChannel: draft.adaptiveFacts.threatChannel ??
        (threatOrExtortion ? normalizeIncidentChannel(draft) : null),
      threatDescription: draft.adaptiveFacts.threatDescription ??
        (threatOrExtortion ? draft.incident.narrative : null),
      sensitiveMaterialInvolved: draft.adaptiveFacts.sensitiveMaterialInvolved ??
        (/\b(?:intimate|private|nude|sexual)\s+(?:image|photo|video|material)/i.test(financialSourceText) ? true : null),
      impersonation: draft.adaptiveFacts.impersonation ?? impersonation,
      impersonatedEntity: draft.adaptiveFacts.impersonatedEntity ?? impersonatedEntityFromText(financialSourceText),
      communicationChannels: communicationChannels.length > 0
        ? communicationChannels
        : [normalizeIncidentChannel(draft)].filter((value): value is string => Boolean(value)),
      requestedSensitiveInfo: Array.from(new Set([
        ...draft.adaptiveFacts.requestedSensitiveInfo,
        ...sensitiveInformation.requested,
      ])),
      sharedSensitiveInfo: Array.from(new Set([
        ...draft.adaptiveFacts.sharedSensitiveInfo,
        ...sensitiveInformation.shared,
      ])),
    },
    financialExposure: Object.fromEntries(
      Object.entries(draft.financialExposure).map(([key, value]) => [
        key,
        extracted.financialExposure[key as keyof FinancialExposure] ?? value,
      ]),
    ) as FinancialExposure,
    mentionedInstitutions,
    incident: {
      ...draft.incident,
      financialLossState,
      moneyLost,
      statedTotalLoss: financialLossState === "YES"
        ? draft.citizenConfirmedFields.includes("incident.statedTotalLoss")
          ? draft.incident.statedTotalLoss
          : extracted.statedTotalLoss
        : null,
      citizenConfirmedLoss: draft.citizenConfirmedFields.includes("incident.citizenConfirmedLoss")
        ? draft.incident.citizenConfirmedLoss
        : null,
      reportedAmount: financialLossState === "YES"
        ? extracted.reportedAmount ?? draft.incident.reportedAmount
        : null,
      openingBalance: extracted.openingBalance ?? draft.incident.openingBalance,
      intermediateBalances: extracted.intermediateBalances.length > 0
        ? extracted.intermediateBalances
        : draft.incident.intermediateBalances,
      closingBalance: extracted.closingBalance ?? draft.incident.closingBalance,
      incidentDate: normalizedIncidentDate,
      incidentDateWithoutYear: normalizedIncidentDate
        ? null
        : inferredDate.incidentDateWithoutYear ?? draft.incident.incidentDateWithoutYear,
      approximateTime: incidentTime,
      occurredOn: communicationChannels.length > 1
        ? "Multiple channels"
        : communicationChannels[0] ?? normalizeIncidentChannel(draft),
    },
    transactions,
  };
}
