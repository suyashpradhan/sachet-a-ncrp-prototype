import type { IncidentDraft } from "../incident/schema";
import type { UiLocale } from "../i18n/i18n-provider";
import { getIncidentCapabilities } from "../incident/capabilities";
import { isInternalCaseValue } from "../presentation/citizen-visible-value";

export type NotificationChannel = "EMAIL" | "WHATSAPP";
export type ReminderCategory =
  | "IMPORTANT_ACTIONS"
  | "MISSING_DETAILS"
  | "EVIDENCE_SAFETY"
  | "FOLLOW_UP";
export type ReminderMode = "DEMO" | "LIVE";
export type ReminderPreferences = {
  enabled: boolean;
  channel: NotificationChannel;
  email: string;
  whatsapp: string;
  categories: Record<ReminderCategory, boolean>;
  enabledAt?: string | null;
  enabledChannel?: NotificationChannel | null;
  scheduledAt: string | null;
  sentAt: string | null;
};
export type CitizenNudgeReason =
  | "FINANCIAL_SAFETY"
  | "ACCOUNT_SECURITY"
  | "MISSING_INFORMATION"
  | "EVIDENCE_PRESERVATION"
  | "RECOVERY_SCAM_WARNING"
  | "FOLLOW_UP"
  | "SENSITIVE_INFORMATION"
  | "PERSONAL_SAFETY";
export type CitizenNudgeSchedule = "TODAY" | "TOMORROW";

export type CitizenNudge = {
  id: string;
  complaintId: string;
  category: ReminderCategory;
  title: string;
  body: string;
  reason: CitizenNudgeReason;
  schedule: CitizenNudgeSchedule;
  channel: NotificationChannel;
  recipient: string;
  source: "SACHET";
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  scheduledAt: string | null;
  sentAt: string | null;
  deliveryState: "SCHEDULED" | "SENT" | "PROTOTYPE_PREVIEW";
  mode: ReminderMode;
  relatedField?: string;
};

export function createReminderPreferences(
  isDemo: boolean,
  destination?: { email?: string; whatsapp?: string },
): ReminderPreferences {
  return {
    enabled: false,
    channel: "WHATSAPP",
    email: isDemo ? destination?.email ?? "demo@example.invalid" : "",
    whatsapp: isDemo ? destination?.whatsapp ?? "90000 00000" : "",
    categories: {
      IMPORTANT_ACTIONS: true,
      MISSING_DETAILS: true,
      EVIDENCE_SAFETY: true,
      FOLLOW_UP: false,
    },
    enabledAt: null,
    enabledChannel: null,
    scheduledAt: null,
    sentAt: null,
  };
}

function categoryForReason(reason: CitizenNudgeReason): ReminderCategory {
  if (reason === "FOLLOW_UP") return "FOLLOW_UP";
  if (reason === "MISSING_INFORMATION") return "MISSING_DETAILS";
  if (reason === "EVIDENCE_PRESERVATION" || reason === "RECOVERY_SCAM_WARNING") {
    return "EVIDENCE_SAFETY";
  }
  if (reason === "FINANCIAL_SAFETY" || reason === "ACCOUNT_SECURITY" || reason === "PERSONAL_SAFETY") {
    return "IMPORTANT_ACTIONS";
  }
  return "FOLLOW_UP";
}

export function deriveCitizenNudges(
  draft: IncidentDraft,
  locale: UiLocale,
  preferences: ReminderPreferences,
  mode: ReminderMode,
  complaintId: string,
): CitizenNudge[] {
  const hi = locale === "hi";
  const capabilities = getIncidentCapabilities(draft);
  const accountCompromise = capabilities.accountCompromise;
  const threatOrExtortion = capabilities.threatOrExtortion;
  const financialLoss =
    draft.incident.financialLossState === "YES" && draft.transactions.length > 0;
  const missingReference = draft.transactions.some(
    (transaction) => {
      const reference =
        transaction.transactionIdOrUtr ?? transaction.referenceNumber;
      return !reference || isInternalCaseValue(reference);
    },
  );

  const recipient = preferences.channel === "EMAIL"
    ? preferences.email.trim()
    : preferences.whatsapp.trim();
  const complete = (
    nudges: Array<Omit<CitizenNudge, "complaintId" | "category" | "recipient" | "source" | "scheduledAt" | "sentAt" | "deliveryState" | "mode">>,
  ): CitizenNudge[] => nudges.map((nudge) => ({
      ...nudge,
      complaintId,
      category: categoryForReason(nudge.reason),
      recipient,
      source: "SACHET" as const,
      scheduledAt: preferences.scheduledAt,
      sentAt: preferences.sentAt,
      deliveryState: preferences.sentAt
        ? "SENT" as const
        : preferences.scheduledAt
          ? "SCHEDULED" as const
          : "PROTOTYPE_PREVIEW" as const,
      mode,
    }));

  if (financialLoss) {
    return complete([
      ...(missingReference ? [{
        id: "missing-transaction-reference",
        title: hi ? "लेन-देन संदर्भ जोड़ें" : "Add the missing transaction reference",
        body: hi
          ? "अपने UPI या बैंकिंग ऐप में भुगतान खोलें और UPI ट्रांज़ैक्शन ID, UTR, बैंक संदर्भ या लेन-देन संदर्भ देखें।"
          : "Open the payment in your UPI or banking app and look for the UPI transaction ID, UTR, bank reference or transaction reference.",
        reason: "MISSING_INFORMATION" as const,
        schedule: "TODAY" as const,
        channel: preferences.channel,
        priority: "HIGH" as const,
        relatedField: "transactions.reference",
      }] : []),
      {
        id: "financial-action-today",
        title: hi
          ? "जरूरी वित्तीय कार्रवाई पूरी करें"
          : "Complete the important financial-fraud actions",
        body: hi
          ? "यदि अभी तक नहीं किया है, तो 1930 पर कॉल करें और अपने भुगतान प्रदाता को सूचित करें।"
          : "If you have not already, call 1930 and notify your payment provider.",
        reason: "FINANCIAL_SAFETY",
        schedule: "TODAY",
        channel: preferences.channel,
        priority: "HIGH",
      },
      {
        id: "recovery-scam-tomorrow",
        title: hi
          ? "रिकवरी शुल्क मांगने वालों से सावधान रहें"
          : "Be cautious of recovery-fee requests",
        body: hi
          ? "गारंटी के साथ पैसे वापस दिलाने के बदले शुल्क मांगने वाले को भुगतान न करें।"
          : "Do not pay someone who promises guaranteed recovery in exchange for a fee.",
        reason: "RECOVERY_SCAM_WARNING",
        schedule: "TOMORROW",
        channel: preferences.channel,
        priority: "MEDIUM",
      },
      {
        id: "preserve-financial-evidence",
        title: hi ? "मूल सबूत सुरक्षित रखें" : "Keep the original evidence safe",
        body: hi
          ? "अपनी बातचीत, भुगतान रसीदें और शिकायत की प्रति न मिटाएँ।"
          : "Do not delete your conversations, payment receipts or complaint copy.",
        reason: "EVIDENCE_PRESERVATION",
        schedule: "TOMORROW",
        channel: preferences.channel,
        priority: "MEDIUM",
      },
    ]);
  }

  if (accountCompromise) {
    return complete([
      {
        id: "account-security-today",
        title: hi ? "अपने रिकवरी विवरण जाँचें" : "Check your recovery details",
        body: hi
          ? "रिकवरी ईमेल और फ़ोन नंबर जाँचें। सक्रिय सत्र देखें और अपना मुख्य ईमेल सुरक्षित करें।"
          : "Check your recovery email and phone number. Review active sessions and secure your primary email account.",
        reason: "ACCOUNT_SECURITY",
        schedule: "TODAY",
        channel: preferences.channel,
        priority: "HIGH",
      },
      {
        id: "review-active-sessions-tomorrow",
        title: hi ? "अनजान सक्रिय सत्र हटाएँ" : "Sign out unfamiliar active sessions",
        body: hi
          ? "अकाउंट की आधिकारिक सुरक्षा सेटिंग में सक्रिय सत्र देखें और अनजान डिवाइस से साइन आउट करें।"
          : "Review active sessions in the account's official security settings and sign out unfamiliar devices.",
        reason: "ACCOUNT_SECURITY",
        schedule: "TOMORROW",
        channel: preferences.channel,
        priority: "MEDIUM",
      },
    ]);
  }

  if (threatOrExtortion) {
    return complete([
      {
        id: "preserve-threat-evidence-today",
        title: hi ? "धमकी वाले संदेश सुरक्षित रखें" : "Preserve the threatening messages",
        body: hi
          ? "मूल संदेश, भेजने वाले की जानकारी और उपलब्ध स्क्रीनशॉट सुरक्षित रखें।"
          : "Keep the original messages, sender details and available screenshots.",
        reason: "EVIDENCE_PRESERVATION",
        schedule: "TODAY",
        channel: preferences.channel,
        priority: "MEDIUM",
      },
      {
        id: "extortion-safety-tomorrow",
        title: hi ? "दबाव में पैसे न भेजें" : "Do not send money solely because of the threat",
        body: hi
          ? "धमकी जारी रहे या तत्काल खतरा हो तो आधिकारिक पुलिस या सहायता माध्यम का उपयोग करें।"
          : "Use official police or support channels if the threat continues or there is immediate danger.",
        reason: "PERSONAL_SAFETY",
        schedule: "TOMORROW",
        channel: preferences.channel,
        priority: "HIGH",
      },
    ]);
  }

  if (
    draft.classification.reportFamily === "FINANCIAL_FRAUD" &&
    draft.incident.financialLossState === "NO"
  ) {
    return complete([
      {
        id: "avoid-payment-today",
        title: hi ? "कोई शुल्क या भुगतान न भेजें" : "Do not pay a processing or release fee",
        body: hi
          ? "आधार, बैंक विवरण, OTP, PIN या दूसरी संवेदनशील जानकारी साझा न करें।"
          : "Do not share Aadhaar, bank details, OTPs, PINs or other sensitive information.",
        reason: "SENSITIVE_INFORMATION",
        schedule: "TODAY",
        channel: preferences.channel,
        priority: "HIGH",
      },
      {
        id: "preserve-contact-tomorrow",
        title: hi ? "संदेश और संपर्क की जानकारी रखें" : "Preserve the messages and contact details",
        body: hi
          ? "संपर्क में इस्तेमाल फोन नंबर, प्रोफ़ाइल, लिंक और स्क्रीनशॉट सुरक्षित रखें।"
          : "Keep the phone number, profile, links and screenshots used to contact you.",
        reason: "EVIDENCE_PRESERVATION",
        schedule: "TOMORROW",
        channel: preferences.channel,
        priority: "MEDIUM",
      },
    ]);
  }

  return complete([
    {
      id: "preserve-evidence-today",
      title: hi ? "सबूत सुरक्षित रखें" : "Preserve the evidence",
      body: hi
        ? "संदेश, स्क्रीनशॉट और अकाउंट सूचना सुरक्षित रखें। संदिग्ध संदेश अभी न मिटाएँ।"
        : "Keep messages, screenshots and account notifications. Do not delete suspicious messages yet.",
      reason: "EVIDENCE_PRESERVATION",
      schedule: "TODAY",
      channel: preferences.channel,
      priority: "MEDIUM",
    },
  ]);
}
