import type { ReportedAmountResolution } from "../incident/complaint-case";
import type { NcrpCompatibleComplaint } from "../incident/ncrp-compatible-complaint";
import {
  citizenVisibleValue,
  isInternalCaseValue,
} from "./citizen-visible-value";
import type { IncidentDraft } from "../incident/schema";
import {
  safeDerivedIdentifier,
  sanitizeDerivedText,
} from "./evidence-privacy";
import type { UiLocale } from "../i18n/i18n-provider";
import { formatCurrency } from "./format";
import { getIncidentCapabilities } from "../incident/capabilities";
import { resolveFinancialLoss } from "../incident/financial-summary";

export type NextAction = {
  id: string;
  title: string;
  description: string;
};

export type CallBriefItem = {
  label: string;
  value: string;
  isKnown: boolean;
};

export type BankNotification = {
  providerLabel: string;
  body: string;
};

type HandoffOptions = {
  locale: UiLocale;
  amountResolution: ReportedAmountResolution | null;
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
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)));
}

function financialContext(draft: IncidentDraft, locale: UiLocale) {
  const context = [
    draft.citizenSummary.incidentLabel,
    draft.officialMapping.subCategoryLabel,
    draft.incident.occurredOn,
  ].join(" ");
  if (/kyc/i.test(context)) {
    return locale === "hi"
      ? "केवाईसी से जुड़े संदेश के बाद"
      : "after a KYC-related message";
  }
  if (/investment|trading/i.test(context)) {
    return locale === "hi"
      ? "ऑनलाइन निवेश प्रस्ताव के बाद"
      : "after an online investment offer";
  }
  return null;
}

function unknownCallValue(locale: UiLocale) {
  return locale === "hi"
    ? "पता नहीं — ऑपरेटर को बताएं कि यह जानकारी उपलब्ध नहीं है।"
    : "Not known — tell the operator this is not known.";
}

function callBriefItem(
  label: string,
  value: string | null | undefined,
  locale: UiLocale,
): CallBriefItem {
  const safeValue = value ? sanitizeDerivedText(value).trim() : "";
  return safeValue
    ? { label, value: safeValue, isKnown: true }
    : { label, value: unknownCallValue(locale), isKnown: false };
}

function resolveHandoffFacts(
  draft: IncidentDraft,
  { locale, amountResolution }: HandoffOptions,
) {
  const transaction = draft.transactions.find(
    (item) => item.direction !== "CREDIT",
  ) ?? draft.transactions[0];
  const hasUnresolvedConflict = Boolean(
    amountResolution?.hasConflict && !amountResolution.selectedAmount,
  );
  const confirmedAmount = hasUnresolvedConflict
    ? null
    : amountResolution?.selectedAmount ?? resolveFinancialLoss(draft).resolvedLoss;
  const transactionDate = formatDate(transaction?.transactionDate ?? null, locale);
  const transactionTime = formatTime(transaction?.approximateTime ?? null, locale);
  const institution = citizenVisibleValue(transaction?.institution);
  const affectedAccount = safeDerivedIdentifier(
    citizenVisibleValue(transaction?.accountOrUpiId),
    "ACCOUNT",
  );
  const paymentMethod = citizenVisibleValue(transaction?.paymentMethod);
  const references = draft.transactions
    .map((item) => citizenVisibleValue(
      item.transactionIdOrUtr ?? item.referenceNumber,
    ))
    .filter((value): value is string => Boolean(value));
  const destinationIdentifiers = draft.suspectIdentifiers
    .filter((item) => item.type === "UPI_ID" || item.type === "OTHER")
    .map((item) => citizenVisibleValue(item.value))
    .filter((value): value is string => Boolean(value));
  const contactIdentifiers = draft.suspectIdentifiers
    .filter((item) =>
      ["PHONE", "EMAIL", "SOCIAL_HANDLE", "NAME"].includes(item.type)
    )
    .map((item) =>
      safeDerivedIdentifier(
        citizenVisibleValue(item.value),
        item.type === "PHONE" ? "PHONE" : "GENERAL",
      ),
    )
    .filter((value): value is string => Boolean(value));
  const claimedIdentity = citizenVisibleValue(
    draft.adaptiveFacts.impersonatedEntity,
  );
  const contactAndClaim = [
    contactIdentifiers.length > 0 ? contactIdentifiers.join(", ") : null,
    claimedIdentity
      ? locale === "hi"
        ? `${claimedIdentity} होने का दावा किया; पहचान की स्वतंत्र पुष्टि नहीं हुई।`
        : `claimed to be ${claimedIdentity}; the identity was not independently confirmed.`
      : null,
  ].filter(Boolean).join(locale === "hi" ? " — " : "; ");

  return {
    transaction,
    hasUnresolvedConflict,
    confirmedAmount,
    transactionDate,
    transactionTime,
    institution,
    affectedAccount,
    paymentMethod,
    references,
    destinationIdentifiers,
    contactAndClaim,
  };
}

export function buildCallBriefItems(
  draft: IncidentDraft,
  options: HandoffOptions,
): CallBriefItem[] | null {
  if (
    draft.classification.reportFamily !== "FINANCIAL_FRAUD" ||
    draft.incident.moneyLost !== true ||
    draft.transactions.length === 0
  ) {
    return null;
  }

  const { locale } = options;
  const hi = locale === "hi";
  const facts = resolveHandoffFacts(draft, options);
  const dateAndTime = [facts.transactionDate, facts.transactionTime]
    .filter(Boolean)
    .join(hi ? ", " : " at ");
  const institutionAndAccount = [facts.institution, facts.affectedAccount]
    .filter(Boolean)
    .join(" · ");

  return [
    callBriefItem(
      hi ? "क्या हुआ" : "What happened",
      hi
        ? draft.incident.narrative || draft.citizenSummary.shortSummary
        : draft.citizenSummary.shortSummary || draft.incident.narrative,
      locale,
    ),
    callBriefItem(
      hi ? "कितनी राशि गई" : "Amount lost",
      facts.confirmedAmount ? formatCurrency(facts.confirmedAmount) : null,
      locale,
    ),
    callBriefItem(
      hi ? "पहले लेन-देन की तारीख और समय" : "Date and time of the first transaction",
      dateAndTime || null,
      locale,
    ),
    callBriefItem(
      hi ? "बैंक या प्रभावित वित्तीय खाता" : "Bank or affected financial account",
      institutionAndAccount || null,
      locale,
    ),
    callBriefItem(
      hi ? "पैसे कैसे गए" : "How the money left",
      facts.paymentMethod,
      locale,
    ),
    callBriefItem(
      hi ? "लाभार्थी या गंतव्य की जानकारी" : "Beneficiary or destination identifiers",
      facts.destinationIdentifiers.length > 0
        ? facts.destinationIdentifiers.join(", ")
        : null,
      locale,
    ),
    callBriefItem(
      hi ? "लेन-देन संदर्भ" : "Transaction references",
      facts.references.length > 0 ? facts.references.join(", ") : null,
      locale,
    ),
    callBriefItem(
      hi ? "किसने संपर्क किया और क्या पहचान बताई" : "Who contacted you and what identity they claimed",
      facts.contactAndClaim || null,
      locale,
    ),
  ];
}

function safeComplaintValue(
  field: { value: string | number | boolean | null; sources: string[] },
): string | null {
  const value = field.value;
  if (value === null || value === "" || isInternalCaseValue(value)) return null;
  if (typeof value === "string" && /(?:\.invalid|^test[-_ ])/i.test(value)) {
    return null;
  }
  return sanitizeDerivedText(String(value));
}

function currentLetterDate(locale: UiLocale, now: Date) {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(now);
}

export function buildBankNotification(
  draft: IncidentDraft,
  complaint: NcrpCompatibleComplaint,
  options: HandoffOptions & { now?: Date },
): BankNotification | null {
  if (
    draft.classification.reportFamily !== "FINANCIAL_FRAUD" ||
    draft.incident.moneyLost !== true ||
    draft.transactions.length === 0
  ) {
    return null;
  }

  const { locale } = options;
  const hi = locale === "hi";
  const facts = resolveHandoffFacts(draft, options);
  const unknown = hi ? "पता नहीं" : "Not known";
  const provider = draft.transactions
    .map((item) => citizenVisibleValue(item.institution))
    .find(Boolean) ?? null;
  const providerLabel = provider ?? (
    hi ? "आपका बैंक या भुगतान सेवा प्रदाता" : "Your bank or payment provider"
  );
  const citizenName = safeComplaintValue(complaint.groups.victim.name) ?? unknown;
  const contact = [
    safeComplaintValue(complaint.groups.complainant.mobile),
    safeComplaintValue(complaint.groups.complainant.email),
  ].filter(Boolean).join(" · ") || unknown;
  const accountIdentifiers = draft.transactions
    .map((item) =>
      safeDerivedIdentifier(citizenVisibleValue(item.accountOrUpiId), "ACCOUNT"),
    )
    .filter((value): value is string => Boolean(value));
  const account = accountIdentifiers.length > 0
    ? [...new Set(accountIdentifiers)].join(", ")
    : unknown;
  const statement = sanitizeDerivedText(
    (hi
      ? draft.incident.narrative || draft.citizenSummary.shortSummary
      : draft.citizenSummary.shortSummary || draft.incident.narrative) || unknown,
  );
  const transactionLines = draft.transactions.map((transaction, index) => {
    const date = formatDate(transaction.transactionDate, locale) ?? unknown;
    const time = formatTime(transaction.approximateTime, locale) ?? unknown;
    const amount = transaction.amount ? formatCurrency(transaction.amount) : unknown;
    const reference = citizenVisibleValue(
      transaction.transactionIdOrUtr ?? transaction.referenceNumber,
    ) ?? unknown;
    return hi
      ? `${index + 1}. तारीख: ${date}\n   समय: ${time}\n   राशि: ${amount}\n   संदर्भ: ${reference}`
      : `${index + 1}. Date: ${date}\n   Time: ${time}\n   Amount: ${amount}\n   Reference: ${reference}`;
  });
  const totalLoss = facts.confirmedAmount
    ? formatCurrency(facts.confirmedAmount)
    : unknown;
  const callerContext = facts.contactAndClaim || unknown;
  const date = currentLetterDate(locale, options.now ?? new Date());

  const body = hi
    ? [
        `तारीख: ${date}`,
        "",
        "प्रति: शाखा प्रबंधक / धोखाधड़ी सहायता टीम",
        "",
        `नागरिक का नाम: ${citizenName}`,
        `खाता / कार्ड पहचान: ${account}`,
        "",
        "विषय: अनधिकृत लेन-देन की सूचना",
        "",
        statement,
        "",
        "मैं नीचे दिए गए लेन-देन को अपने द्वारा अनधिकृत के रूप में रिपोर्ट कर रहा/रही हूँ:",
        "",
        ...transactionLines,
        "",
        `कुल नुकसान: ${totalLoss}`,
        `कॉलर / घटना का संदर्भ: ${callerContext}`,
        "शिकायत पावती / संदर्भ: __________",
        "",
        "कृपया इस सूचना की प्राप्ति स्वीकार करें। कृपया विवादित लेन-देन और शिकायत को दर्ज करके उनकी समीक्षा करें।",
        "",
        `नाम: ${citizenName}`,
        `संपर्क: ${contact}`,
      ].join("\n")
    : [
        `Date: ${date}`,
        "",
        "To the Branch Manager / Fraud Support Team",
        "",
        `Citizen name: ${citizenName}`,
        `Account / card identifier: ${account}`,
        "",
        "Subject: Notification of unauthorised transactions",
        "",
        statement,
        "",
        "I am reporting the transactions listed below as unauthorised by me:",
        "",
        ...transactionLines,
        "",
        `Total loss: ${totalLoss}`,
        `Caller / incident context: ${callerContext}`,
        "Complaint acknowledgement/reference: __________",
        "",
        "Please acknowledge receipt of this notification. Please record and review the disputed transactions and this complaint.",
        "",
        `Name: ${citizenName}`,
        `Contact: ${contact}`,
      ].join("\n");

  return { providerLabel, body };
}

export function buildCallBrief(
  draft: IncidentDraft,
  { locale, amountResolution }: HandoffOptions,
): string | null {
  if (
    draft.classification.reportFamily !== "FINANCIAL_FRAUD" ||
    draft.incident.moneyLost !== true
  ) {
    return null;
  }

  const hi = locale === "hi";
  const transaction = draft.transactions[0];
  const transactionCount = draft.transactions.length;
  const facts = resolveHandoffFacts(draft, { locale, amountResolution });
  const hasUnresolvedConflict = facts.hasUnresolvedConflict;
  const confirmedAmount = facts.confirmedAmount;
  const date = formatDate(
    draft.incident.incidentDate ?? transaction?.transactionDate ?? null,
    locale,
  );
  const time = formatTime(
    draft.incident.approximateTime ?? transaction?.approximateTime ?? null,
    locale,
  );
  const institution = transactionCount === 1
    ? citizenVisibleValue(transaction?.institution)
    : null;
  const context = financialContext(draft, locale);
  const reference = transaction?.transactionIdOrUtr;
  const evidence = draft.evidence.filter(
    (item) => item.type !== "VOICE_STATEMENT",
  );
  const lines: string[] = [
    hi
      ? "मुझे वित्तीय साइबर धोखाधड़ी की रिपोर्ट करनी है।"
      : "I want to report a cyber financial fraud.",
  ];

  if (hasUnresolvedConflict) {
    lines.push(
      hi
        ? "लेन-देन की राशि की पुष्टि अभी बाकी है।"
        : "The transaction amount still needs confirmation.",
    );
  } else if (confirmedAmount) {
    const when = [
      date ? (hi ? `${date} को` : `On ${date}`) : null,
      time ? (hi ? `लगभग ${time}` : `at around ${time}`) : null,
    ]
      .filter(Boolean)
      .join(" ");
    const event = transactionCount > 1
      ? hi
        ? `${transactionCount} भुगतानों में कुल ${formatCurrency(confirmedAmount)} का नुकसान हुआ${context ? `, ${context}` : ""}।`
        : `I reported ${transactionCount} payments totalling ${formatCurrency(confirmedAmount)}${context ? ` ${context}` : ""}.`
      : hi
        ? `${formatCurrency(confirmedAmount)}${institution ? ` मेरे ${institution} खाते से` : ""} डेबिट हुए${context ? `, ${context}` : ""}।`
        : `${formatCurrency(confirmedAmount)} was debited${institution ? ` from my ${institution} account` : ""}${context ? ` ${context}` : ""}.`;
    lines.push([when, event].filter(Boolean).join(hi ? " " : ", "));
  }

  if (transactionCount === 1 && citizenVisibleValue(reference)) {
    lines.push(
      hi
        ? `लेन-देन संदर्भ: ${reference}।`
        : `Transaction reference: ${reference}.`,
    );
  }

  if (evidence.length > 0) {
    const hasMessage = evidence.some((item) => item.type === "CHAT_SCREENSHOT");
    const hasTransaction = evidence.some(
      (item) => item.type === "TRANSACTION_SCREENSHOT",
    );
    const evidenceLabel = hasMessage && hasTransaction
      ? hi
        ? "संदेश और लेन-देन के सबूत"
        : "message and transaction evidence"
      : hi
        ? "सहायक सबूत"
        : "supporting evidence";
    lines.push(
      hi
        ? `मेरे पास ${evidenceLabel} उपलब्ध हैं।`
        : `I have the ${evidenceLabel} available.`,
    );
  }

  return sanitizeDerivedText(lines.join("\n\n"));
}

export function getNextActions(
  draft: IncidentDraft,
  locale: UiLocale,
): NextAction[] {
  const hi = locale === "hi";
  const family = draft.classification.reportFamily;
  const capabilities = getIncidentCapabilities(draft);
  if (family === "OUT_OF_SCOPE_OR_UNCLEAR") return [];

  if (capabilities.financialLoss) {
    return [
      {
        id: "call-1930",
        title: hi ? "1930 पर कॉल करें" : "Call 1930",
        description: hi
          ? "वित्तीय धोखाधड़ी की तुरंत रिपोर्ट करें।"
          : "Report the financial fraud promptly.",
      },
      {
        id: "contact-bank",
        title: hi ? "अपने बैंक से संपर्क करें" : "Contact your bank",
        description: hi
          ? "बैंक या भुगतान सेवा के आधिकारिक धोखाधड़ी सहायता माध्यम का उपयोग करें।"
          : "Use its official fraud-support channel and keep the transaction reference ready.",
      },
      {
        id: "preserve-evidence",
        title: hi ? "सबूत संभालकर रखें" : "Keep your evidence",
        description: hi
          ? "संदेश, लेन-देन रिकॉर्ड और संदिग्ध की उपलब्ध जानकारी सुरक्षित रखें।"
          : "Preserve messages, transaction records and available suspect details.",
      },
      ...(capabilities.accountCompromise ? [{
        id: "account-recovery",
        title: hi ? "प्रभावित खाते की रिकवरी शुरू करें" : "Start recovery for the affected account",
        description: hi ? "प्लेटफ़ॉर्म की आधिकारिक रिकवरी प्रक्रिया का उपयोग करें।" : "Use the affected platform's official recovery process.",
      }] : []),
    ].slice(0, 3);
  }

  if (family === "WOMEN_CHILDREN_RELATED_CRIME") {
    return [
      {
        id: "preserve-identifiers",
        title: hi ? "जरूरी जानकारी सुरक्षित रखें" : "Preserve relevant details",
        description: hi
          ? "संबंधित URL, उपयोगकर्ता नाम और संदेश की जानकारी सुरक्षित रखें।"
          : "Keep relevant URLs, usernames and message information.",
      },
      {
        id: "avoid-sharing",
        title: hi ? "सामग्री आगे न भेजें" : "Avoid redistributing material",
        description: hi
          ? "संवेदनशील सामग्री को अनावश्यक रूप से आगे साझा न करें।"
          : "Do not unnecessarily forward or redistribute sensitive material.",
      },
      {
        id: "immediate-danger",
        title: hi ? "तत्काल खतरे में मदद लें" : "Seek help for immediate danger",
        description: hi
          ? "यदि कोई तत्काल शारीरिक खतरे में है, तो उचित आपातकालीन या पुलिस सहायता लें।"
          : "If someone is in immediate physical danger, seek appropriate emergency or police help.",
      },
    ];
  }

  if (capabilities.threatOrExtortion) {
    return [
      {
        id: "preserve-threat",
        title: hi ? "धमकी और मांग के सबूत सुरक्षित रखें" : "Preserve evidence of the threat and demand",
        description: hi ? "मूल संदेश, नंबर, प्रोफ़ाइल और स्क्रीनशॉट रखें।" : "Keep original messages, numbers, profiles and screenshots.",
      },
      {
        id: "stop-contact",
        title: hi ? "भेजने वाले से संपर्क सीमित करें" : "Limit contact with the sender",
        description: hi ? "सबूत सुरक्षित करने के बाद संपर्क सीमित या बंद करें।" : "After preserving evidence, limit or stop contact.",
      },
    ];
  }

  if (capabilities.ransomware) {
    return [
      {
        id: "preserve-ransom",
        title: hi ? "रैनसम संदेश सुरक्षित रखें" : "Preserve the ransom message",
        description: hi ? "संबंधित सबूत सुरक्षित रखें।" : "Keep the related evidence available.",
      },
      {
        id: "avoid-deleting",
        title: hi ? "सबूत न मिटाएँ" : "Avoid deleting evidence",
        description: hi
          ? "घटना से जुड़ी फाइलों और संदेशों को न मिटाएँ।"
          : "Do not delete files or messages related to the incident.",
      },
      {
        id: "use-report",
        title: hi ? "तैयार रिपोर्ट का उपयोग करें" : "Use the prepared report",
        description: hi
          ? "साइबर घटना की रिपोर्ट करते समय तैयार जानकारी साथ रखें।"
          : "Keep the prepared information available when reporting the incident.",
      },
    ];
  }

  if (capabilities.accountCompromise) return [
    {
      id: "account-recovery",
      title: hi ? "आधिकारिक खाता रिकवरी का उपयोग करें" : "Use official account recovery",
      description: hi
        ? "प्लेटफ़ॉर्म की आधिकारिक खाता रिकवरी प्रक्रिया का उपयोग करें।"
        : "Use the platform’s official account-recovery process.",
    },
    {
      id: "secure-credentials",
      title: hi ? "जुड़े खाते सुरक्षित करें" : "Secure associated accounts",
      description: hi
        ? "जुड़ा ईमेल या खाता सुरक्षित करें और प्रभावित पासवर्ड बदलें।"
        : "Secure the associated email or account and change compromised credentials.",
    },
    {
      id: "preserve-account-evidence",
      title: hi ? "सबूत संभालकर रखें" : "Preserve account evidence",
      description: hi
        ? "स्क्रीनशॉट, प्रोफ़ाइल URL, उपयोगकर्ता नाम और संबंधित संदेश सुरक्षित रखें।"
        : "Keep screenshots, profile URLs, usernames and relevant messages.",
    },
  ];

  if (capabilities.attemptedFinancialScam) return [
    {
      id: "stop-contact",
      title: hi ? "भेजने वाले से संपर्क बंद करें" : "Stop contact with the sender",
      description: hi ? "आगे पैसे या संवेदनशील जानकारी साझा न करें।" : "Do not send money or share sensitive information.",
    },
    {
      id: "preserve-evidence",
      title: hi ? "उपलब्ध सबूत सुरक्षित रखें" : "Preserve the available evidence",
      description: hi ? "संदेश, नंबर, प्रोफ़ाइल, URL या स्क्रीनशॉट रखें।" : "Keep messages, numbers, profiles, URLs or screenshots.",
    },
  ];

  return [{
    id: "preserve-evidence",
    title: hi ? "उपलब्ध सबूत सुरक्षित रखें" : "Preserve the available evidence",
    description: hi ? "घटना से जुड़े मूल रिकॉर्ड सुरक्षित रखें।" : "Keep the original records connected to the incident.",
  }];
}
