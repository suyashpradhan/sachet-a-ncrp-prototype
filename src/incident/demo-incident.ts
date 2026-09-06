import type { ReporterProfile } from "../experience/profile";
import { CITIZEN_DOES_NOT_HAVE, IncidentDraftSchema, type IncidentDraft, type TranscriptionResult } from "./schema";

export type DemoNarrationLanguage = "hi-IN" | "en-IN";
export type DemoCaseId =
  | "BANK_OTP"
  | "TASK_SCAM"
  | "JOB_OFFER"
  | "AMOUNT_MISMATCH"
  | "ACCOUNT_COMPROMISE"
  | "LOTTERY_ATTEMPT"
  | "EXTORTION";

export type DemoNarration = TranscriptionResult & {
  label: string;
  nativeLabel: string;
  audioPath: string;
  durationSeconds: number;
};

export type DemoEvidenceDefinition = {
  id: string;
  src: string;
  label: string;
  labelHi: string;
  typeLabel: string;
  typeLabelHi: string;
};

export type DemoCaseDefinition = {
  id: DemoCaseId;
  selectorLabel: string;
  selectorLabelHi: string;
  bannerTitle?: string;
  bannerTitleHi?: string;
  incidentTrail?: string;
  incidentTrailHi?: string;
  citizen: ReporterProfile;
  citizenNameHi?: string;
  sourceLanguage: string;
  statement: string;
  narrations: Record<DemoNarrationLanguage, DemoNarration>;
  evidence: readonly DemoEvidenceDefinition[];
  draft: IncidentDraft;
  reference: string;
};

function demoProfile(
  displayName: string,
  gender: "Female" | "Male",
  suffix: string,
  emailName: string,
): ReporterProfile {
  return {
    title: gender === "Female" ? "Ms" : "Mr",
    displayName,
    registeredMobile: `••••••${suffix}`,
    gender,
    dateOfBirth: "1992-04-18",
    parentOrSpouseRelationship: "Parent",
    parentOrSpouseName: "Synthetic Parent",
    email: `${emailName}@example.invalid`,
    relationshipWithVictim: "Self",
    houseNumber: `Demo ${suffix}`,
    street: "Synthetic Service Road",
    colony: "Prototype Layout",
    city: "Bengaluru",
    tehsil: "Synthetic Tehsil",
    country: "India",
    state: "Karnataka",
    district: "Bengaluru Urban",
    policeStation: "Synthetic jurisdiction",
    pinCode: "TEST-560000",
    source: "SIMULATED_NCRP_PROFILE",
  };
}

function narration(
  languageCode: DemoNarrationLanguage,
  originalTranscript: string,
  durationSeconds: number,
  audioPath: string,
): DemoNarration {
  return {
    label: languageCode === "hi-IN" ? "Hindi" : "English",
    nativeLabel: languageCode === "hi-IN" ? "हिन्दी" : "English",
    audioPath,
    durationSeconds,
    languageCode,
    originalTranscript,
    englishTranscript: originalTranscript,
  };
}

const emptyAdaptiveFacts = {
  platform: null,
  messageSourcePlatforms: [] as string[],
  affectedPlatforms: [] as string[],
  entityRelationship: null,
  multipleIncidentThreads: null,
  platformType: null,
  affectedAccount: null,
  profileUrl: null,
  accountAccessStatus: null,
  accountCompromise: null,
  recoveryInformationChanged: null,
  recoveryEmailChanged: null,
  phoneNumberChanged: null,
  affectedSystem: null,
  filesEncrypted: null,
  ransomMessagePresent: null,
  accountCompromiseBasis: null,
  credentialExposure: null,
  maliciousLink: null,
  remoteAccess: null,
  threatOrExtortion: null,
  demandedAmount: null,
  threatChannel: null,
  threatDescription: null,
  sensitiveMaterialInvolved: null,
  impersonation: null,
  impersonatedEntity: null,
  communicationChannels: [] as string[],
  requestedSensitiveInfo: [] as string[],
  sharedSensitiveInfo: [] as string[],
  sensitiveEvidenceRedacted: null,
};

const anilBankOtpStatement =
  "Someone claiming to be from my bank called me and said an urgent verification was needed. I shared the OTP during the call. Minutes later, three debit alerts appeared for ₹12,000, ₹18,000 and ₹6,000. I first thought ₹36,000 was gone, but the bank records show that the ₹6,000 debit was reversed.";
const anilBankOtpHindi =
  "मेरे बैंक से होने का दावा करने वाले व्यक्ति ने फोन करके कहा कि तुरंत सत्यापन करना जरूरी है। मैंने कॉल पर OTP साझा कर दिया। कुछ मिनट बाद ₹12,000, ₹18,000 और ₹6,000 के तीन डेबिट संदेश आए। मुझे पहले लगा कि ₹36,000 चले गए, लेकिन बैंक रिकॉर्ड में ₹6,000 का डेबिट वापस हुआ दिखता है।";

const anilBankOtpDraft: IncidentDraft = {
  classification: {
    reportFamily: "FINANCIAL_FRAUD",
    category: "Financial Fraud",
    subCategory: "Vishing / OTP Fraud",
    cyberElementPresent: true,
    moneyLost: true,
    platform: "Phone call and bank SMS",
    ambiguity: "NONE",
    explanation:
      "A caller claiming to represent the bank obtained an OTP before unauthorized debits appeared.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "Phone call",
    messageSourcePlatforms: ["Phone call", "Bank SMS"],
    platformType: "OTHER",
    credentialExposure: true,
    impersonation: true,
    impersonatedEntity: "Bank representative",
    communicationChannels: ["Phone call", "Bank SMS"],
    requestedSensitiveInfo: ["OTP"],
    sharedSensitiveInfo: ["OTP"],
    sensitiveEvidenceRedacted: true,
  },
  citizenSummary: {
    incidentLabel: "Bank impersonation and OTP fraud",
    shortSummary:
      "Anil shared an OTP with a caller claiming to represent his bank. Three debit alerts totalled ₹36,000, but evidence shows ₹6,000 was reversed, leaving an evidence-supported loss of ₹30,000.",
  },
  officialMapping: {
    category: "FINANCIAL_FRAUD",
    categoryLabel: "Financial Fraud",
    subCategoryLabel: "Vishing / OTP Fraud",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "YES",
    moneyLost: true,
    statedTotalLoss: 36_000,
    citizenConfirmedLoss: 30_000,
    reportedAmount: 30_000,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: "Around 3 PM",
    delayInReporting: false,
    delayReason: null,
    occurredOn: "Phone call",
    narrative: anilBankOtpStatement,
  },
  financialExposure: {
    bankDetailsRequested: null,
    identityDocumentRequested: false,
    otpRequested: true,
    paymentLinkReceived: false,
    upiCollectRequestReceived: false,
  },
  mentionedInstitutions: ["Synthetic bank"],
  transactions: [
    {
      id: "anil-debit-12000",
      direction: "DEBIT",
      evidenceId: "demo-evidence-1",
      institution: "Synthetic bank",
      currency: "INR",
      paymentMethod: "Unauthorized bank debit",
      accountOrUpiId: "Synthetic account ending 1930",
      transactionIdOrUtr: "SYN-ANIL-12000-01",
      amount: 12_000,
      transactionDate: "2026-09-03",
      approximateTime: "15:07",
      referenceNumber: "SYN-ANIL-12000-01",
      status: "KNOWN",
    },
    {
      id: "anil-debit-18000",
      direction: "DEBIT",
      evidenceId: "demo-evidence-1",
      institution: "Synthetic bank",
      currency: "INR",
      paymentMethod: "Unauthorized bank debit",
      accountOrUpiId: "Synthetic account ending 1930",
      transactionIdOrUtr: "SYN-ANIL-18000-02",
      amount: 18_000,
      transactionDate: "2026-09-03",
      approximateTime: "15:09",
      referenceNumber: "SYN-ANIL-18000-02",
      status: "KNOWN",
    },
    {
      id: "anil-debit-6000",
      direction: "DEBIT",
      evidenceId: "demo-evidence-1",
      institution: "Synthetic bank",
      currency: "INR",
      paymentMethod: "Unauthorized bank debit",
      accountOrUpiId: "Synthetic account ending 1930",
      transactionIdOrUtr: "SYN-ANIL-6000-03",
      amount: 6_000,
      transactionDate: "2026-09-03",
      approximateTime: "15:11",
      referenceNumber: "SYN-ANIL-6000-03",
      status: "KNOWN",
    },
    {
      id: "anil-credit-6000-reversal",
      direction: "CREDIT",
      evidenceId: "demo-evidence-2",
      institution: "Synthetic bank",
      currency: "INR",
      paymentMethod: "Reversal",
      accountOrUpiId: "Synthetic account ending 1930",
      transactionIdOrUtr: "SYN-ANIL-REV-6000",
      amount: 6_000,
      transactionDate: "2026-09-03",
      approximateTime: "15:18",
      referenceNumber: "SYN-ANIL-REV-6000",
      status: "KNOWN",
    },
  ],
  suspectIdentifiers: [{ type: "PHONE", value: "98XX XX1930" }],
  evidence: [
    {
      type: "OTHER",
      extractedFacts: [
        "Incoming call from synthetic number 98XX XX1930",
        "Caller claimed to represent the bank",
        "Caller identity was not independently verified",
      ],
    },
    {
      type: "TRANSACTION_SCREENSHOT",
      extractedFacts: [
        "Debit alerts for ₹12,000, ₹18,000 and ₹6,000",
        "Total debit alerts: ₹36,000",
      ],
    },
    {
      type: "OTHER",
      extractedFacts: [
        "Statement shows a ₹6,000 reversal",
        "Current evidence-supported loss: ₹30,000",
      ],
    },
    {
      type: "TRANSACTION_SCREENSHOT",
      extractedFacts: [
        "Synthetic transaction references preserved for all entries",
        "No verified identity record is available for the caller",
      ],
    },
  ],
  citizenConfirmedFields: [],
  missingRequiredFields: [],
  warnings: [
    "The citizen initially reported ₹36,000. The available statement shows ₹6,000 was reversed, leaving ₹30,000 as the current evidence-supported loss.",
  ],
};

const taskScamStatement =
  "I got a WhatsApp message about part-time online tasks. At first they actually paid me small amounts, so I thought it was genuine. Then they moved me to Telegram and asked me to deposit larger amounts for bigger tasks. I made several payments. The platform later showed ₹80,000, but I could not withdraw it. They kept asking for more money, including another ₹25,000, which I did not pay.";
const taskScamHindi =
  "मुझे WhatsApp पर पार्ट-टाइम ऑनलाइन टास्क का संदेश मिला। शुरू में उन्होंने मुझे छोटी रकम वापस दी, इसलिए मुझे यह सही लगा। फिर वे मुझे Telegram पर ले गए और बड़े टास्क के लिए ज्यादा पैसे जमा करने को कहा। मैंने कई भुगतान किए। बाद में प्लेटफ़ॉर्म पर ₹80,000 दिखे, लेकिन मैं वह रकम निकाल नहीं पाई। वे ₹25,000 और मांगते रहे, जो मैंने नहीं दिए।";

const taskScamDraft: IncidentDraft = {
  classification: {
    reportFamily: "FINANCIAL_FRAUD",
    category: "Financial Fraud",
    subCategory: "Online Job / Task Fraud",
    cyberElementPresent: true,
    moneyLost: true,
    platform: "WhatsApp, Telegram and a task platform",
    ambiguity: "NONE",
    explanation: "A part-time task offer moved from WhatsApp to Telegram and led to repeated deposits into a fake task platform.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "WhatsApp",
    messageSourcePlatforms: ["WhatsApp", "Telegram"],
    affectedPlatforms: ["Synthetic task platform"],
    entityRelationship: "RELATED_BOTH_AFFECTED",
    platformType: "MESSAGING",
    demandedAmount: 25_000,
    impersonation: true,
    impersonatedEntity: "Part-time task coordinator",
    communicationChannels: ["WhatsApp", "Telegram", "Task platform"],
  },
  citizenSummary: {
    incidentLabel: "Part-time task fraud",
    shortSummary: "Sneha received a part-time task offer on WhatsApp, moved to Telegram and made several deposits. The submitted payment evidence supports a net loss of ₹55,000.",
  },
  officialMapping: {
    category: "FINANCIAL_FRAUD",
    categoryLabel: "Financial Fraud",
    subCategoryLabel: "Online Job / Task Fraud",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "YES",
    moneyLost: true,
    statedTotalLoss: null,
    citizenConfirmedLoss: null,
    reportedAmount: 55_000,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-08-31",
    incidentDateWithoutYear: null,
    approximateTime: null,
    delayInReporting: false,
    delayReason: null,
    occurredOn: "WhatsApp, Telegram and a task platform",
    narrative: taskScamStatement,
  },
  financialExposure: {
    bankDetailsRequested: null,
    identityDocumentRequested: null,
    otpRequested: false,
    paymentLinkReceived: true,
    upiCollectRequestReceived: null,
  },
  mentionedInstitutions: ["UPI", "Wallet / payment app"],
  transactions: [
    { id: "sneha-credit-1", direction: "CREDIT", evidenceId: "demo-evidence-2", institution: "UPI", currency: "INR", paymentMethod: "Task commission", accountOrUpiId: CITIZEN_DOES_NOT_HAVE, transactionIdOrUtr: "SYN-CR-01000", amount: 1_000, transactionDate: "2026-08-31", approximateTime: "12:05", referenceNumber: null, status: "KNOWN" },
    { id: "sneha-debit-1", direction: "DEBIT", evidenceId: "demo-evidence-2", institution: "UPI", currency: "INR", paymentMethod: "Task deposit", accountOrUpiId: CITIZEN_DOES_NOT_HAVE, transactionIdOrUtr: "SYN-DB-05000", amount: 5_000, transactionDate: "2026-09-01", approximateTime: "10:45", referenceNumber: null, status: "KNOWN" },
    { id: "sneha-credit-2", direction: "CREDIT", evidenceId: "demo-evidence-2", institution: "UPI", currency: "INR", paymentMethod: "Task commission", accountOrUpiId: CITIZEN_DOES_NOT_HAVE, transactionIdOrUtr: "SYN-CR-04000", amount: 4_000, transactionDate: "2026-09-01", approximateTime: "12:10", referenceNumber: null, status: "KNOWN" },
    { id: "sneha-debit-2", direction: "DEBIT", evidenceId: "demo-evidence-2", institution: "UPI", currency: "INR", paymentMethod: "Task deposit", accountOrUpiId: CITIZEN_DOES_NOT_HAVE, transactionIdOrUtr: "SYN-DB-15000", amount: 15_000, transactionDate: "2026-09-02", approximateTime: "14:20", referenceNumber: null, status: "KNOWN" },
    { id: "sneha-debit-3", direction: "DEBIT", evidenceId: "demo-evidence-2", institution: "Bank transfer", currency: "INR", paymentMethod: "Task deposit", accountOrUpiId: CITIZEN_DOES_NOT_HAVE, transactionIdOrUtr: "SYN-DB-40000", amount: 40_000, transactionDate: "2026-09-03", approximateTime: "09:40", referenceNumber: null, status: "KNOWN" },
  ],
  amountClaims: [
    { id: "sneha-platform-value", amount: 80_000, role: "DISPLAYED_VALUE", label: "Platform-displayed value", labelHi: "प्लेटफ़ॉर्म पर दिखाई गई राशि", sourceLabel: "Fake task dashboard screenshot", sourceLabelHi: "नकली टास्क डैशबोर्ड स्क्रीनशॉट", evidenceId: "demo-evidence-3", note: "Shown on the task dashboard. Not matched to payment evidence.", noteHi: "टास्क डैशबोर्ड पर दिखाई गई। भुगतान सबूत से मेल नहीं खाती।" },
    { id: "sneha-unpaid-demand", amount: 25_000, role: "DEMANDED_UNPAID", label: "Demanded · Not paid", labelHi: "मांगा गया · भुगतान नहीं किया", sourceLabel: "Telegram / task conversation", sourceLabelHi: "Telegram / टास्क बातचीत", evidenceId: "demo-evidence-1", note: "This belongs in the incident, but no payment was made.", noteHi: "यह घटना में दर्ज है, लेकिन इसका भुगतान नहीं हुआ।" },
  ],
  suspectIdentifiers: [
    { type: "PHONE", value: "98XX XX4721" },
    { type: "SOCIAL_HANDLE", value: "@task_coordinator_demo" },
    { type: "URL", value: "https://tasks-demo.invalid" },
  ],
  evidence: [
    { type: "CHAT_SCREENSHOT", extractedFacts: ["Part-time online tasks offered on WhatsApp", "Small commissions were promised and initially paid"] },
    { type: "CHAT_SCREENSHOT", extractedFacts: ["Conversation moved to Telegram and a task platform", "A further ₹25,000 was demanded and not paid"] },
    { type: "OTHER", extractedFacts: ["Total debited: ₹60,000", "Credits received back: ₹5,000", "Net matched loss: ₹55,000"] },
    { type: "OTHER", extractedFacts: ["Synthetic task-platform value: ₹80,000", "Withdrawal shown as unavailable", "This displayed value is not a bank or payment credit"] },
  ],
  citizenConfirmedFields: ["adaptive.requestedAmountPaymentStatus.NOT_PAID"],
  missingRequiredFields: [],
  warnings: [],
};

const jobOfferStatement =
  "I was looking for a job when someone contacted me on LinkedIn about an opportunity. They moved the conversation to WhatsApp. I paid ₹499 as a registration fee and ₹1,499 for verification. Later they asked me to pay another ₹18,000 as a security deposit, but I did not pay it. I have the LinkedIn and WhatsApp conversations and both payment receipts.";
const jobOfferEnglish = jobOfferStatement;
const jobOfferHindi =
  "मैं नौकरी ढूँढ रही थी, तभी LinkedIn पर किसी ने नौकरी के अवसर के बारे में संपर्क किया। बाद में बातचीत WhatsApp पर चली गई। मैंने पंजीकरण के लिए ₹499 और सत्यापन के लिए ₹1,499 का भुगतान किया। फिर उन्होंने ₹18,000 की सुरक्षा जमा राशि मांगी, लेकिन मैंने वह राशि नहीं दी। मेरे पास LinkedIn और WhatsApp की बातचीत और दोनों भुगतान रसीदें हैं।";

const jobOfferDraft: IncidentDraft = {
  classification: {
    reportFamily: "FINANCIAL_FRAUD",
    category: "Financial Fraud",
    subCategory: "Online Job Fraud",
    cyberElementPresent: true,
    moneyLost: true,
    platform: "LinkedIn and WhatsApp",
    ambiguity: "NONE",
    explanation: "A fake job opportunity moved from LinkedIn to WhatsApp and led to two payments and a further payment request.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "LinkedIn",
    messageSourcePlatforms: ["LinkedIn", "WhatsApp"],
    affectedPlatforms: ["LinkedIn", "WhatsApp"],
    entityRelationship: "RELATED_BOTH_AFFECTED",
    platformType: "SOCIAL_MEDIA",
    impersonation: true,
    impersonatedEntity: "Job recruiter",
    demandedAmount: 18_000,
    communicationChannels: ["LinkedIn", "WhatsApp"],
  },
  citizenSummary: {
    incidentLabel: "Fake job-offer fraud",
    shortSummary: "Meera was contacted about a job on LinkedIn and moved to WhatsApp. She paid ₹499 and ₹1,499, then declined a further ₹18,000 security-deposit request.",
  },
  officialMapping: {
    category: "FINANCIAL_FRAUD",
    categoryLabel: "Financial Fraud",
    subCategoryLabel: "Online Job Fraud",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "YES",
    moneyLost: true,
    statedTotalLoss: null,
    citizenConfirmedLoss: null,
    reportedAmount: 1_998,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: null,
    delayInReporting: false,
    delayReason: null,
    occurredOn: "LinkedIn and WhatsApp",
    narrative: jobOfferStatement,
  },
  financialExposure: {
    bankDetailsRequested: null,
    identityDocumentRequested: null,
    otpRequested: null,
    paymentLinkReceived: true,
    upiCollectRequestReceived: null,
  },
  mentionedInstitutions: ["UPI"],
  transactions: [
    {
      id: "meera-registration-payment",
      institution: "UPI",
      currency: "INR",
      paymentMethod: "Registration fee",
      accountOrUpiId: CITIZEN_DOES_NOT_HAVE,
      transactionIdOrUtr: "DEMO-UPI-499-030926",
      amount: 499,
      transactionDate: "2026-09-03",
      approximateTime: "11:18",
      referenceNumber: null,
      status: "KNOWN",
    },
    {
      id: "meera-verification-payment",
      institution: "UPI",
      currency: "INR",
      paymentMethod: "Verification fee",
      accountOrUpiId: CITIZEN_DOES_NOT_HAVE,
      transactionIdOrUtr: "DEMO-UPI-1499-030926",
      amount: 1_499,
      transactionDate: "2026-09-03",
      approximateTime: "12:06",
      referenceNumber: null,
      status: "KNOWN",
    },
  ],
  suspectIdentifiers: [
    { type: "SOCIAL_HANDLE", value: "Synthetic LinkedIn recruiter" },
    { type: "PHONE", value: "98XX XX1800" },
  ],
  evidence: [
    { type: "CHAT_SCREENSHOT", extractedFacts: ["Job opportunity first shared on LinkedIn", "Conversation moved to WhatsApp"] },
    { type: "CHAT_SCREENSHOT", extractedFacts: ["₹18,000 security deposit requested", "Security deposit was not paid"] },
    { type: "TRANSACTION_SCREENSHOT", extractedFacts: ["₹499 registration payment", "Transaction reference DEMO-UPI-499-030926", "3 September 2026 at about 11:18 AM"] },
    { type: "TRANSACTION_SCREENSHOT", extractedFacts: ["₹1,499 verification payment", "Transaction reference DEMO-UPI-1499-030926", "3 September 2026 at about 12:06 PM"] },
  ],
  citizenConfirmedFields: [
    "adaptive.requestedAmountPaymentStatus.NOT_PAID",
  ],
  missingRequiredFields: [],
  warnings: [],
};

const amountMismatchStatement =
  "Kal mujhe WhatsApp pe SBI KYC update ka message aaya. Bola account block ho jayega agar KYC update nahi kiya. Maine link open kiya. Pehle ₹5,000 debit hua, phir thodi der baad ₹15,000 aur debit hua. Mujhe laga total ₹25,000 gaya hai. Exact UTR mere paas abhi nahi hai.";
const accountCompromiseStatement =
  "Yesterday morning I got an Instagram password reset message. Maine link open kiya because mujhe laga official hai. Uske baad Instagram ka password reset ho gaya, but later I also noticed ki mera WhatsApp account access nahi ho raha. I am not sure whether both things are connected. No money was lost.";
const lotteryStatement =
  "Mujhe WhatsApp aur ek call pe bola gaya ki mera number KBC lucky draw mein select hua hai aur maine ₹25 lakh jeeta hai. Prize lene ke liye ₹10,000 processing fee maang rahe the aur Aadhaar photo aur bank details WhatsApp pe bhejne ko bola. Maine koi paisa nahi diya aur details bhi share nahi ki.";
const extortionStatement =
  "Kal Telegram par kisi unknown account ne message kiya ki unke paas meri private photos hain. Unhone bola ki agar maine ₹20,000 nahi diye toh woh photos mere contacts ko bhej denge. Baad mein same threat email par bhi aaya. Maine koi payment nahi kiya. Mujhe nahi pata account real identity kiski hai.";

const amountMismatchEnglish =
  "Yesterday I received an SBI KYC update message on WhatsApp. I opened the link. First ₹5,000 was debited, and later another ₹15,000 was debited. I thought the total loss was ₹25,000. I do not have the exact transaction references right now.";
const amountMismatchHindi =
  "कल मुझे व्हाट्सऐप पर एसबीआई केवाईसी अपडेट का संदेश आया। उसमें लिखा था कि केवाईसी अपडेट नहीं करने पर मेरा खाता बंद हो जाएगा। मैंने लिंक खोल दिया। पहले ₹5,000 और थोड़ी देर बाद ₹15,000 डेबिट हुए। मुझे लगा कि कुल ₹25,000 गए हैं। अभी मेरे पास लेन-देन के सही संदर्भ नहीं हैं।";
const accountCompromiseEnglish =
  "Yesterday morning I received an Instagram password reset message. I opened the link because I thought it was official. After that, my Instagram password was reset. Later, I also found that I could not access my WhatsApp account. I am not sure whether both events are connected. No money was lost.";
const accountCompromiseHindi =
  "कल सुबह मुझे इंस्टाग्राम पासवर्ड रीसेट करने का संदेश मिला। मैंने लिंक खोला क्योंकि मुझे लगा कि वह आधिकारिक है। उसके बाद मेरा इंस्टाग्राम पासवर्ड रीसेट हो गया। बाद में मुझे पता चला कि मैं अपने व्हाट्सऐप खाते में भी प्रवेश नहीं कर पा रहा हूँ। मुझे नहीं पता कि दोनों घटनाएँ जुड़ी हुई हैं या नहीं। कोई पैसा नहीं गया।";
const lotteryEnglish =
  "I was told on WhatsApp and over a phone call that my number had been selected in a KBC lucky draw and that I had won ₹25 lakh. They asked for a ₹10,000 processing fee, an Aadhaar photo, and my bank details. I did not pay or share anything.";
const lotteryHindi =
  "मुझे व्हाट्सऐप और फोन कॉल पर बताया गया कि मेरा नंबर केबीसी लकी ड्रॉ में चुना गया है और मैंने ₹25 लाख जीते हैं। इनाम लेने के लिए उन्होंने ₹10,000 प्रोसेसिंग फीस, आधार की फोटो और बैंक की जानकारी मांगी। मैंने कोई पैसा नहीं दिया और कोई जानकारी साझा नहीं की।";
const extortionEnglish =
  "An unknown Telegram account threatened to share my private photos with my contacts unless I paid ₹20,000. The same threat later arrived by email. I made no payment, and I do not know the sender's real identity.";
const extortionHindi =
  "कल टेलीग्राम पर एक अनजान खाते ने संदेश भेजकर कहा कि उसके पास मेरी निजी तस्वीरें हैं। उसने धमकी दी कि अगर मैंने ₹20,000 नहीं दिए तो वह तस्वीरें मेरे संपर्कों को भेज देगा। बाद में वही धमकी ईमेल पर भी आई। मैंने कोई भुगतान नहीं किया और मुझे भेजने वाले की असली पहचान नहीं पता।";

const amountMismatchDraft: IncidentDraft = {
  classification: {
    reportFamily: "FINANCIAL_FRAUD",
    category: "Financial Fraud",
    subCategory: "Internet Banking Related Fraud",
    cyberElementPresent: true,
    moneyLost: true,
    platform: "WhatsApp",
    ambiguity: "NONE",
    explanation: "Two debits followed a fraudulent KYC message sent over WhatsApp.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "WhatsApp",
    messageSourcePlatforms: ["WhatsApp"],
    platformType: "MESSAGING",
    maliciousLink: true,
    impersonation: true,
    impersonatedEntity: "SBI",
    communicationChannels: ["WhatsApp"],
  },
  citizenSummary: {
    incidentLabel: "KYC-related banking fraud",
    shortSummary: "Asha opened a KYC link sent over WhatsApp. Two debits total ₹20,000, while she remembers the total as ₹25,000.",
  },
  officialMapping: {
    category: "FINANCIAL_FRAUD",
    categoryLabel: "Financial Fraud",
    subCategoryLabel: "Internet Banking Related Fraud",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "YES",
    moneyLost: true,
    statedTotalLoss: 25_000,
    citizenConfirmedLoss: null,
    reportedAmount: 25_000,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: "Morning",
    delayInReporting: false,
    delayReason: null,
    occurredOn: "WhatsApp",
    narrative: amountMismatchStatement,
  },
  financialExposure: {
    bankDetailsRequested: null,
    identityDocumentRequested: null,
    otpRequested: null,
    paymentLinkReceived: true,
    upiCollectRequestReceived: null,
  },
  mentionedInstitutions: ["SBI"],
  transactions: [
    {
      id: "asha-transaction-1",
      institution: "SBI",
      currency: "INR",
      paymentMethod: "Bank debit",
      accountOrUpiId: "Synthetic SBI account ending 0024",
      transactionIdOrUtr: CITIZEN_DOES_NOT_HAVE,
      amount: 5_000,
      transactionDate: "2026-09-03",
      approximateTime: "09:12",
      referenceNumber: "DEMO-ASHA-5000-01",
      status: "KNOWN",
    },
    {
      id: "asha-transaction-2",
      institution: "SBI",
      currency: "INR",
      paymentMethod: "Bank debit",
      accountOrUpiId: "Synthetic SBI account ending 0024",
      transactionIdOrUtr: CITIZEN_DOES_NOT_HAVE,
      amount: 15_000,
      transactionDate: "2026-09-03",
      approximateTime: "09:34",
      referenceNumber: "DEMO-ASHA-15000-02",
      status: "KNOWN",
    },
  ],
  suspectIdentifiers: [
    { type: "PHONE", value: "98XX XX4100" },
    { type: "URL", value: "https://sbi-kyc-demo.invalid/update" },
  ],
  evidence: [
    { type: "CHAT_SCREENSHOT", extractedFacts: ["WhatsApp KYC message claiming to be from SBI", "Synthetic sender 98XX XX4100", "KYC link shown"] },
    { type: "TRANSACTION_SCREENSHOT", extractedFacts: ["₹5,000 debit", "SBI account ending 0024", "3 September 2026 at about 9:12 AM"] },
    { type: "TRANSACTION_SCREENSHOT", extractedFacts: ["₹15,000 debit", "SBI account ending 0024", "3 September 2026 at about 9:34 AM"] },
  ],
  citizenConfirmedFields: [],
  missingRequiredFields: [],
  warnings: [],
};

const accountCompromiseDraft: IncidentDraft = {
  classification: {
    reportFamily: "OTHER_CYBER_CRIME",
    category: "Online and Social Media Related Crime",
    subCategory: "Profile Hacking",
    cyberElementPresent: true,
    moneyLost: false,
    platform: "WhatsApp",
    ambiguity: "NONE",
    explanation: "The account describes possible unauthorised access involving Instagram and WhatsApp.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "WhatsApp",
    messageSourcePlatforms: ["Instagram"],
    affectedPlatforms: ["WhatsApp"],
    platformType: "SOCIAL_MEDIA",
    affectedAccount: null,
    accountAccessStatus: "Lost",
    accountCompromise: true,
    accountCompromiseBasis: "Password reset and loss of account access",
    maliciousLink: true,
    communicationChannels: ["Instagram notification", "WhatsApp security notification"],
  },
  citizenSummary: {
    incidentLabel: "Possible social-media account compromise",
    shortSummary: "Shubham opened an Instagram password-reset link and later could not access WhatsApp. He is unsure whether the events are connected.",
  },
  officialMapping: {
    category: "OTHER_CYBER_CRIME",
    categoryLabel: "Online and Social Media Related Crime",
    subCategoryLabel: "Profile Hacking",
    mappingConfidence: "MEDIUM",
  },
  incident: {
    financialLossState: "NO",
    moneyLost: false,
    statedTotalLoss: null,
    citizenConfirmedLoss: null,
    reportedAmount: null,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: "Morning",
    delayInReporting: false,
    delayReason: null,
    occurredOn: "Instagram notification",
    narrative: accountCompromiseStatement,
  },
  financialExposure: {
    bankDetailsRequested: false,
    identityDocumentRequested: false,
    otpRequested: false,
    paymentLinkReceived: false,
    upiCollectRequestReceived: false,
  },
  mentionedInstitutions: [],
  transactions: [],
  suspectIdentifiers: [],
  evidence: [
    { type: "OTHER", extractedFacts: ["Instagram password-reset email", "Synthetic security notification", "Reset link was opened"] },
    { type: "CHAT_SCREENSHOT", extractedFacts: ["WhatsApp login/security notification", "Account access unavailable"] },
    { type: "OTHER", extractedFacts: ["Unknown device shown in synthetic login activity"] },
  ],
  citizenConfirmedFields: [],
  missingRequiredFields: [],
  warnings: [],
};

const lotteryDraft: IncidentDraft = {
  classification: {
    reportFamily: "FINANCIAL_FRAUD",
    category: "Financial Fraud",
    subCategory: "Online Lottery Scam",
    cyberElementPresent: true,
    moneyLost: false,
    platform: "WhatsApp",
    ambiguity: "NONE",
    explanation: "A false lottery prize was used to request a processing fee and sensitive information.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "WhatsApp",
    messageSourcePlatforms: ["WhatsApp"],
    platformType: "MESSAGING",
    impersonation: true,
    impersonatedEntity: "KBC lucky draw",
    communicationChannels: ["WhatsApp", "Phone call"],
    requestedSensitiveInfo: ["Aadhaar image", "Bank details"],
  },
  citizenSummary: {
    incidentLabel: "Online lottery attempt",
    shortSummary: "Vivek was promised a ₹25 lakh prize and asked for a ₹10,000 processing fee, Aadhaar image and bank details. He paid and shared nothing.",
  },
  officialMapping: {
    category: "FINANCIAL_FRAUD",
    categoryLabel: "Financial Fraud",
    subCategoryLabel: "Online Lottery Scam",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "NO",
    moneyLost: false,
    statedTotalLoss: null,
    citizenConfirmedLoss: null,
    reportedAmount: null,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: null,
    delayInReporting: false,
    delayReason: null,
    occurredOn: "WhatsApp and phone call",
    narrative: lotteryStatement,
  },
  financialExposure: {
    bankDetailsRequested: true,
    identityDocumentRequested: true,
    otpRequested: false,
    paymentLinkReceived: false,
    upiCollectRequestReceived: false,
  },
  mentionedInstitutions: [],
  transactions: [],
  suspectIdentifiers: [{ type: "PHONE", value: "97XX XX2500" }],
  evidence: [
    { type: "CHAT_SCREENSHOT", extractedFacts: ["Synthetic KBC lucky-draw claim", "Prize promised: ₹25,00,000", "Processing fee requested: ₹10,000"] },
    { type: "OTHER", extractedFacts: ["Synthetic missed call from 97XX XX2500"] },
    { type: "OTHER", extractedFacts: ["Synthetic prize image", "Aadhaar image and bank details requested"] },
  ],
  citizenConfirmedFields: [],
  missingRequiredFields: [],
  warnings: [],
};

const extortionDraft: IncidentDraft = {
  classification: {
    reportFamily: "WOMEN_CHILDREN_RELATED_CRIME",
    category: "Women / Children Related Crime",
    subCategory: "Online abusive-content report",
    cyberElementPresent: true,
    moneyLost: false,
    platform: "Telegram",
    ambiguity: "NONE",
    explanation: "An unknown account threatened to distribute private photos unless money was paid.",
    requiresCitizenConfirmation: false,
  },
  adaptiveFacts: {
    ...emptyAdaptiveFacts,
    platform: "Telegram",
    messageSourcePlatforms: ["Telegram", "Email"],
    platformType: "MESSAGING",
    threatOrExtortion: true,
    demandedAmount: 20_000,
    threatChannel: "Telegram and Email",
    threatDescription: "An unknown sender threatened to share private photos with the citizen's contacts unless money was paid.",
    sensitiveMaterialInvolved: true,
    communicationChannels: ["Telegram", "Email"],
    sensitiveEvidenceRedacted: true,
  },
  citizenSummary: {
    incidentLabel: "Online threat and extortion",
    shortSummary: "Riya received the same threat through Telegram and email. The sender demanded ₹20,000, but she made no payment.",
  },
  officialMapping: {
    category: "WOMEN_CHILDREN_RELATED_CRIME",
    categoryLabel: "Women / Children Related Crime",
    subCategoryLabel: "Online abusive-content report",
    mappingConfidence: "HIGH",
  },
  incident: {
    financialLossState: "NO",
    moneyLost: false,
    statedTotalLoss: null,
    citizenConfirmedLoss: null,
    reportedAmount: null,
    openingBalance: null,
    intermediateBalances: [],
    closingBalance: null,
    incidentDate: "2026-09-03",
    incidentDateWithoutYear: null,
    approximateTime: null,
    delayInReporting: false,
    delayReason: null,
    occurredOn: "Telegram and Email",
    narrative: extortionStatement,
  },
  financialExposure: {
    bankDetailsRequested: false,
    identityDocumentRequested: false,
    otpRequested: false,
    paymentLinkReceived: false,
    upiCollectRequestReceived: false,
  },
  mentionedInstitutions: [],
  transactions: [],
  suspectIdentifiers: [
    { type: "SOCIAL_HANDLE", value: "@unknown_demo_account" },
    { type: "EMAIL", value: "unknown.sender@example.invalid" },
  ],
  evidence: [
    { type: "CHAT_SCREENSHOT", extractedFacts: ["Synthetic Telegram threat message", "Sensitive wording redacted", "₹20,000 demanded"] },
    { type: "OTHER", extractedFacts: ["Synthetic email repeating the threat", "Sender address preserved"] },
    { type: "OTHER", extractedFacts: ["Synthetic Telegram profile", "Actual identity unknown"] },
  ],
  citizenConfirmedFields: [],
  missingRequiredFields: [],
  warnings: [],
};

for (const draft of [anilBankOtpDraft, taskScamDraft, jobOfferDraft, amountMismatchDraft, accountCompromiseDraft, lotteryDraft, extortionDraft]) {
  IncidentDraftSchema.parse(draft);
}

export const DEMO_CASES: readonly DemoCaseDefinition[] = [
  {
    id: "BANK_OTP",
    selectorLabel: "Anil's bank OTP fraud",
    selectorLabelHi: "अनिल का बैंक OTP फ्रॉड",
    bannerTitle: "Anil received a call claiming to be from his bank",
    bannerTitleHi: "अनिल को बैंक से होने का दावा करने वाली कॉल आई",
    incidentTrail: "Bank impersonation call → OTP shared → debit alerts → one reversal",
    incidentTrailHi: "बैंक के नाम पर कॉल → OTP साझा → डेबिट संदेश → एक राशि वापस",
    citizen: demoProfile("Anil Kumar", "Male", "1930", "anil.demo"),
    citizenNameHi: "अनिल",
    sourceLanguage: "English / Hindi",
    statement: anilBankOtpStatement,
    narrations: {
      "en-IN": narration("en-IN", anilBankOtpStatement, 18, "/demo/audio/anil-bank-otp.mp3"),
      "hi-IN": narration("hi-IN", anilBankOtpHindi, 17, "/demo/audio/anil-bank-otp-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/anil-call-details.svg", label: "Call details", labelHi: "कॉल की जानकारी", typeLabel: "Call record", typeLabelHi: "कॉल रिकॉर्ड" },
      { id: "demo-evidence-1", src: "/demo/evidence/anil-bank-alerts.svg", label: "Bank SMS alerts", labelHi: "बैंक SMS संदेश", typeLabel: "Message screenshot", typeLabelHi: "संदेश का स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/anil-bank-statement.svg", label: "Bank statement", labelHi: "बैंक स्टेटमेंट", typeLabel: "Payment statement", typeLabelHi: "भुगतान विवरण" },
      { id: "demo-evidence-3", src: "/demo/evidence/anil-transaction-references.svg", label: "Transaction references", labelHi: "लेन-देन संदर्भ", typeLabel: "Transaction record", typeLabelHi: "लेन-देन रिकॉर्ड" },
    ],
    draft: anilBankOtpDraft,
    reference: "SACHET-DEMO-ANIL-001",
  },
  {
    id: "TASK_SCAM",
    selectorLabel: "Sneha's part-time task fraud",
    selectorLabelHi: "स्नेहा का पार्ट-टाइम टास्क फ्रॉड",
    bannerTitle: "Sneha took up a part-time task offer",
    bannerTitleHi: "स्नेहा ने पार्ट-टाइम टास्क का प्रस्ताव स्वीकार किया",
    incidentTrail: "WhatsApp → Telegram → deposits → fake dashboard",
    incidentTrailHi: "WhatsApp → Telegram → जमा राशि → नकली डैशबोर्ड",
    citizen: {
      ...demoProfile("Sneha Joshi", "Female", "4721", "sneha.demo"),
      city: "Pune",
      tehsil: "Pune City",
      state: "Maharashtra",
      district: "Pune",
      policeStation: "Synthetic Pune jurisdiction",
      pinCode: "TEST-411000",
    },
    citizenNameHi: "स्नेहा",
    sourceLanguage: "English / Hindi",
    statement: taskScamStatement,
    narrations: {
      "en-IN": narration("en-IN", taskScamStatement, 25, "/demo/audio/sneha-task-scam.mp3"),
      "hi-IN": narration("hi-IN", taskScamHindi, 29, "/demo/audio/sneha-task-scam-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/sneha-conversation-demo.svg", label: "WhatsApp task offer", labelHi: "WhatsApp टास्क प्रस्ताव", typeLabel: "Conversation screenshot", typeLabelHi: "बातचीत का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/sneha-telegram-task-demo.svg", label: "Telegram and task conversation", labelHi: "Telegram और टास्क बातचीत", typeLabel: "Conversation screenshot", typeLabelHi: "बातचीत का स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/sneha-payment-statement-demo.svg", label: "Payment and bank evidence", labelHi: "भुगतान और बैंक सबूत", typeLabel: "Payment statement", typeLabelHi: "भुगतान विवरण" },
      { id: "demo-evidence-3", src: "/demo/evidence/sneha-task-dashboard-demo.svg", label: "Synthetic task dashboard", labelHi: "सिंथेटिक टास्क डैशबोर्ड", typeLabel: "Platform screenshot", typeLabelHi: "प्लेटफ़ॉर्म स्क्रीनशॉट" },
    ],
    draft: taskScamDraft,
    reference: "SACHET-DEMO-SNEHA-001",
  },
  {
    id: "JOB_OFFER",
    selectorLabel: "Meera's fake job offer",
    selectorLabelHi: "मीरा को मिला नकली नौकरी का प्रस्ताव",
    bannerTitle: "Meera received a fake job offer",
    bannerTitleHi: "मीरा को नकली नौकरी का प्रस्ताव मिला",
    incidentTrail: "LinkedIn → WhatsApp → ₹499 paid → ₹1,499 paid → ₹18,000 requested",
    incidentTrailHi: "LinkedIn → WhatsApp → ₹499 भुगतान → ₹1,499 भुगतान → ₹18,000 मांगे गए",
    citizen: demoProfile("Meera Sharma", "Female", "1800", "meera.demo"),
    sourceLanguage: "English / Hindi",
    statement: jobOfferStatement,
    narrations: {
      "en-IN": narration("en-IN", jobOfferEnglish, 24, "/demo/audio/job-offer.mp3"),
      "hi-IN": narration("hi-IN", jobOfferHindi, 29, "/demo/audio/job-offer-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/meera-linkedin-demo.svg", label: "LinkedIn conversation", labelHi: "LinkedIn बातचीत", typeLabel: "Conversation screenshot", typeLabelHi: "बातचीत का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/meera-whatsapp-demo.svg", label: "WhatsApp conversation", labelHi: "WhatsApp बातचीत", typeLabel: "Conversation screenshot", typeLabelHi: "बातचीत का स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/meera-payment-499-demo.svg", label: "₹499 payment receipt", labelHi: "₹499 भुगतान रसीद", typeLabel: "Payment receipt", typeLabelHi: "भुगतान रसीद" },
      { id: "demo-evidence-3", src: "/demo/evidence/meera-payment-1499-demo.svg", label: "₹1,499 payment receipt", labelHi: "₹1,499 भुगतान रसीद", typeLabel: "Payment receipt", typeLabelHi: "भुगतान रसीद" },
    ],
    draft: jobOfferDraft,
    reference: "DEMO-NCRP-2026-000184",
  },
  {
    id: "AMOUNT_MISMATCH",
    selectorLabel: "Amount mismatch",
    selectorLabelHi: "राशि में अंतर",
    citizen: demoProfile("Asha Verma", "Female", "0024", "asha.demo"),
    sourceLanguage: "Hinglish",
    statement: amountMismatchStatement,
    narrations: {
      "en-IN": narration("en-IN", amountMismatchEnglish, 19, "/demo/audio/amount-mismatch.mp3"),
      "hi-IN": narration("hi-IN", amountMismatchHindi, 25, "/demo/audio/amount-mismatch-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/asha-kyc-message-demo.svg", label: "WhatsApp KYC message", labelHi: "WhatsApp KYC संदेश", typeLabel: "Message screenshot", typeLabelHi: "संदेश का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/asha-transaction-5000-demo.svg", label: "₹5,000 transaction", labelHi: "₹5,000 लेन-देन", typeLabel: "Transaction screenshot", typeLabelHi: "लेन-देन का स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/asha-transaction-15000-demo.svg", label: "₹15,000 transaction", labelHi: "₹15,000 लेन-देन", typeLabel: "Transaction screenshot", typeLabelHi: "लेन-देन का स्क्रीनशॉट" },
    ],
    draft: amountMismatchDraft,
    reference: "सचेत-DEMO-AMOUNT-001",
  },
  {
    id: "ACCOUNT_COMPROMISE",
    selectorLabel: "Account compromise",
    selectorLabelHi: "अकाउंट पर कब्ज़ा",
    citizen: demoProfile("Shubham Mehta", "Male", "1187", "shubham.demo"),
    sourceLanguage: "English + Hinglish",
    statement: accountCompromiseStatement,
    narrations: {
      "en-IN": narration("en-IN", accountCompromiseEnglish, 15, "/demo/audio/account-compromise.mp3"),
      "hi-IN": narration("hi-IN", accountCompromiseHindi, 17, "/demo/audio/account-compromise-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/account-reset-demo.svg", label: "Instagram password-reset email", labelHi: "Instagram पासवर्ड-रीसेट ईमेल", typeLabel: "Email screenshot", typeLabelHi: "ईमेल का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/account-security-demo.svg", label: "WhatsApp security notification", labelHi: "WhatsApp सुरक्षा सूचना", typeLabel: "Security screenshot", typeLabelHi: "सुरक्षा स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/unknown-device-demo.svg", label: "Unknown login device", labelHi: "अनजान लॉगिन डिवाइस", typeLabel: "Account activity", typeLabelHi: "अकाउंट गतिविधि" },
    ],
    draft: accountCompromiseDraft,
    reference: "सचेत-DEMO-ACCOUNT-002",
  },
  {
    id: "LOTTERY_ATTEMPT",
    selectorLabel: "Lottery attempt",
    selectorLabelHi: "लॉटरी की कोशिश",
    citizen: demoProfile("Vivek Sharma", "Male", "2500", "vivek.demo"),
    sourceLanguage: "Hindi / Hinglish",
    statement: lotteryStatement,
    narrations: {
      "en-IN": narration("en-IN", lotteryEnglish, 16, "/demo/audio/lottery-attempt.mp3"),
      "hi-IN": narration("hi-IN", lotteryHindi, 16, "/demo/audio/lottery-attempt-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/lottery-message-demo.svg", label: "WhatsApp lottery message", labelHi: "WhatsApp लॉटरी संदेश", typeLabel: "Message screenshot", typeLabelHi: "संदेश का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/call-log-demo.svg", label: "Missed-call log", labelHi: "मिस्ड-कॉल लॉग", typeLabel: "Call record", typeLabelHi: "कॉल रिकॉर्ड" },
      { id: "demo-evidence-2", src: "/demo/evidence/prize-claim-demo.svg", label: "Prize claim image", labelHi: "इनाम के दावे की तस्वीर", typeLabel: "Claim image", typeLabelHi: "दावे की तस्वीर" },
    ],
    draft: lotteryDraft,
    reference: "सचेत-DEMO-LOTTERY-003",
  },
  {
    id: "EXTORTION",
    selectorLabel: "Extortion",
    selectorLabelHi: "धमकी और वसूली",
    citizen: demoProfile("Riya Kapoor", "Female", "7721", "riya.demo"),
    sourceLanguage: "Hindi + English",
    statement: extortionStatement,
    narrations: {
      "en-IN": narration("en-IN", extortionEnglish, 15, "/demo/audio/extortion.mp3"),
      "hi-IN": narration("hi-IN", extortionHindi, 21, "/demo/audio/extortion-hi.mp3"),
    },
    evidence: [
      { id: "demo-evidence-0", src: "/demo/evidence/telegram-threat-demo.svg", label: "Redacted Telegram threat", labelHi: "छिपाया गया Telegram धमकी संदेश", typeLabel: "Message screenshot", typeLabelHi: "संदेश का स्क्रीनशॉट" },
      { id: "demo-evidence-1", src: "/demo/evidence/email-threat-demo.svg", label: "Threat email", labelHi: "धमकी वाला ईमेल", typeLabel: "Email screenshot", typeLabelHi: "ईमेल का स्क्रीनशॉट" },
      { id: "demo-evidence-2", src: "/demo/evidence/unknown-profile-demo.svg", label: "Unknown account profile", labelHi: "अनजान अकाउंट प्रोफ़ाइल", typeLabel: "Profile screenshot", typeLabelHi: "प्रोफ़ाइल स्क्रीनशॉट" },
    ],
    draft: extortionDraft,
    reference: "सचेत-DEMO-EXTORTION-004",
  },
];

export const DEFAULT_DEMO_CASE_ID: DemoCaseId = "BANK_OTP";

export function getDemoCase(caseId: DemoCaseId): DemoCaseDefinition {
  return DEMO_CASES.find((item) => item.id === caseId) ?? DEMO_CASES[0];
}

// Backward-compatible aliases for existing consumers and domain regression fixtures.
const defaultDemo = getDemoCase(DEFAULT_DEMO_CASE_ID);
export const DEMO_NARRATIONS = defaultDemo.narrations;
export const DEMO_TYPED_DESCRIPTION = defaultDemo.statement;
export const DEMO_INCIDENT_DRAFT = defaultDemo.draft;

export function createUnknownIncidentDraft(): IncidentDraft {
  return {
    classification: {
      reportFamily: "OUT_OF_SCOPE_OR_UNCLEAR",
      category: null,
      subCategory: null,
      cyberElementPresent: null,
      moneyLost: null,
      platform: null,
      ambiguity: "INSUFFICIENT_INFORMATION",
      explanation: null,
      requiresCitizenConfirmation: false,
    },
    adaptiveFacts: { ...emptyAdaptiveFacts },
    citizenSummary: { incidentLabel: "Incident details not yet known", shortSummary: "" },
    officialMapping: {
      category: null,
      categoryLabel: null,
      subCategoryLabel: null,
      mappingConfidence: "LOW",
    },
    incident: {
      financialLossState: "UNKNOWN",
      moneyLost: null,
      statedTotalLoss: null,
      citizenConfirmedLoss: null,
      reportedAmount: null,
      openingBalance: null,
      intermediateBalances: [],
      closingBalance: null,
      incidentDate: null,
      incidentDateWithoutYear: null,
      approximateTime: null,
      delayInReporting: null,
      delayReason: null,
      occurredOn: null,
      narrative: null,
    },
    financialExposure: {
      bankDetailsRequested: null,
      identityDocumentRequested: null,
      otpRequested: null,
      paymentLinkReceived: null,
      upiCollectRequestReceived: null,
    },
    mentionedInstitutions: [],
    transactions: [],
    suspectIdentifiers: [],
    evidence: [],
    citizenConfirmedFields: [],
    missingRequiredFields: [],
    warnings: [],
  };
}
