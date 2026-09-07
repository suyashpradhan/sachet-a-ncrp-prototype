"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Message } from "../domain/messages";
import { HI_MESSAGE_OVERRIDES, HI_TEXT } from "./hi";

export type UiLocale = "en" | "hi";

const STORAGE_KEY = "ncrp-prototype-ui-locale-v1";

const EN_TEXT: Record<string, string> = {
  "language.english": "English",
  "language.hindi": "हिन्दी",
  "header.languageLabel": "Interface language",
  "header.secondaryNavigation": "Secondary navigation",
  "case.view": "View case",
  "case.savedEyebrow": "Case saved on this device",
  "case.findHeading": "Find your saved case",
  "case.findSupport": "Enter the Sachet case reference you received when your complaint was prepared.",
  "case.reference": "Sachet case reference",
  "case.demoUse": "Use demo reference",
  "case.demoSupport": "Open the synthetic Rajesh demo case.",
  "case.demoView": "View demo case",
  "case.noneSaved": "No saved live cases were found on this device yet.",
  "case.notFoundHeading": "We couldn’t find this case on this device",
  "case.notFoundSupport": "Sachet currently saves cases only in this browser. A case cannot be recovered from another device or after browser data has been cleared.",
  "case.tryAnother": "Try another reference",
  "case.startNew": "Start a new complaint",
  "case.lookupBoundary": "Sachet only reopens a case saved in this browser. This is not an official NCRP lookup or live police, bank or payment-provider status.",
  "case.keepReference": "Keep this reference. You can use it to reopen this case on this device.",
  "case.copyReference": "Copy reference",
  "case.evidenceReattach": "This file needs to be added again to view the original evidence. Its name and extracted case details remain in the saved case.",
  "brand.description": "National Cyber Reporting Portal",
  "brand.prototype": "Rethinking NCRP Journey",
  "skip.main": "Skip to main content",
  "entry.context": "Financial cyber fraud reporting",
  "entry.heading": "Report a cybercrime",
  "entry.support": "",
  "entry.welcome": "Welcome to",
  "entry.heroPrefix": "The place to",
  "entry.heroSuffix": "cyber crime and fraud",
  "entry.heroReport": "REPORT",
  "entry.heroPrevent": "PREVENT",
  "entry.heroUnderstand": "UNDERSTAND",
  "entry.heroReportHi": "साइबर अपराध और धोखाधड़ी की रिपोर्ट करने की जगह",
  "entry.heroPreventHi": "साइबर अपराध और धोखाधड़ी से बचाव की जगह",
  "entry.heroUnderstandHi": "साइबर अपराध और धोखाधड़ी को समझने की जगह",
  "entry.demo": "Try demo",
  "entry.live": "Start report",
  "entry.note": "Uses synthetic information. No personal data required.",
  "entry.urgent": "Money lost recently? Call 1930 now.",
  "entry.urgentQuestion": "Money lost recently?",
  "entry.urgentAction": "Call 1930 now.",
  "entry.noLogin": "",
  "entry.benefitsTitle": "Report in the way that is easiest for you",
  "entry.stepSpeak": "Speak in your language",
  "entry.stepEvidence": "Upload existing evidence",
  "entry.stepReview": "Type what happened",
  "entry.principle":
    "The information needed for the complaint stays structured. You review everything before submission.",
  "header.helpline": "Cyber fraud helpline",
  "header.official": "Official helpline",
  "journey.report": "Incident",
  "journey.restoration": "Review",
  "journey.resolution": "Submit",
  "journey.progressLabel": "Service journey progress",
  "journey.completed": "completed",
  "report.forWhom": "Who are you reporting for?",
  "report.myself": "Myself",
  "report.someoneElse": "Someone else",
  "report.helpingHint":
    "The affected person should review the information before submission. Keep the person preparing the report separate from the person affected.",
  "report.continue": "Continue",
  "profile.heading": "Test profile information",
  "profile.support":
    "Use test information only. Do not enter a real identity or mobile number.",
  "profile.useSynthetic": "Use synthetic profile",
  "profile.fromSimulated": "From simulated NCRP profile",
  "profile.fromTest": "Test information",
  "profile.name": "Name",
  "profile.state": "State",
  "profile.mobile": "Mobile",
  "profile.required":
    "Complete the test profile or use the synthetic profile to continue.",
  "workspace.tell": "Incident details",
  "workspace.yourInformation": "Statement and evidence",
  "workspace.intro":
    "Speak, type, or add evidence. You don't need to know the report category.",
  "workspace.reporterNameQuestion": "Name",
  "workspace.reporterNamePlaceholder": "Enter a test name",
  "workspace.reporterNameHelp": "Use test information only for this prototype.",
  "workspace.reviewIntro": "The statement and evidence provided for this complaint.",
  "workspace.speak": "Speak",
  "workspace.upload": "Upload evidence",
  "workspace.type": "Type",
  "workspace.shareWays": "Statement",
  "workspace.speakLanguage": "Speak in your language",
  "workspace.describeNaturally": "Describe what happened naturally.",
  "workspace.startRecording": "Start recording",
  "workspace.stopRecording": "Stop recording",
  "workspace.recordAgain": "Record again",
  "workspace.addEvidence": "Add evidence",
  "workspace.useDemo": "Try demo case",
  "workspace.chooseScreenshots": "Choose screenshots",
  "workspace.maxImages": "Maximum 8 images.",
  "workspace.safety":
    "Use test information only. Do not upload OTPs, PINs, passwords or CVVs.",
  "workspace.describe": "Describe what happened",
  "workspace.whatHappened": "What happened?",
  "workspace.placeholder":
    "I received a message asking me to update my SBI KYC…",
  "workspace.organise": "Prepare complaint",
  "workspace.preparingReport": "Preparing complaint…",
  "workspace.informationShared": "Information you shared",
  "workspace.sampleStatement": "Sample statement",
  "workspace.yourStatement": "Your statement",
  "workspace.typedDescription": "Typed description",
  "workspace.viewStatement": "View statement",
  "workspace.transcript": "Statement transcript",
  "workspace.viewEnglish": "View English translation",
  "workspace.evidence": "Evidence",
  "workspace.evidenceAdded": "Evidence added",
  "workspace.screenshots": "screenshots",
  "workspace.added": "Added",
  "workspace.openEvidence": "Open evidence preview",
  "workspace.closeEvidence": "Close",
  "workspace.demoMessage": "Synthetic message screenshot",
  "workspace.demoBank": "Synthetic bank transaction",
  "workspace.sampleNarration": "Sample narration",
  "workspace.play": "Play",
  "workspace.pause": "Pause",
  "workspace.playSample": "▶ Play sample",
  "workspace.pauseSample": "❚❚ Pause",
  "workspace.syntheticEvidence": "Synthetic demo evidence",
  "workspace.approxSeconds": "approximately {seconds} seconds",
  "workspace.changeLanguage": "Change sample narration language",
  "workspace.reportInfo": "Complaint details",
  "workspace.reportInfoSupport":
    "We used what you shared to prepare the structured information below.",
  "workspace.organisingSample":
    "Organising the information from the sample incident…",
  "workspace.readingEvidence": "Reading your evidence…",
  "workspace.readingStatement": "Reading your statement…",
  "workspace.transcribingLong":
    "Transcribing your statement… This may take a little longer for longer recordings.",
  "workspace.organisingReport": "Organising your report…",
  "workspace.emptyStrong":
    "Start by speaking, uploading evidence or typing what happened.",
  "workspace.emptyBody": "The information prepared from your statement will appear here.",
  "workspace.errorHeading": "We couldn’t prepare the report yet.",
  "workspace.inputPreserved":
    "Your statement and evidence are still available on the left.",
  "workspace.tryAgain": "Try again",
  "workspace.shorter": "Record a shorter statement",
  "workspace.typeInstead": "Type instead",
  "workspace.ready": "Complaint details ready",
  "workspace.preparedReuse":
    "Information from your statement, evidence and simulated profile has been reused below.",
  "workspace.detailNeeded": "{count} required details still needed",
  "workspace.fromProfile": "From profile",
  "workspace.complete": "Complete",
  "workspace.actionNeeded": "action needed",
  "workspace.reviewContinue": "Review & continue",
  "workspace.reviewSubmit": "Review complaint",
  "workspace.reviewSupport": "Check the information below before continuing.",
  "workspace.submitSynthetic": "Submit complaint",
  "workspace.backEdit": "Back to edit",
  "workspace.noSubmit":
    "This does not submit information to NCRP or any government system.",
  "workspace.coverage": "Technical details",
  "workspace.coverageAction": "View details →",
  "workspace.coverageIntroShort":
    "See how the prepared report maps to the supported NCRP information.",
  "workspace.coverageHeading": "NCRP reporting information",
  "workspace.coverageIntro":
    "Required information prepared for this supported prototype complaint path.",
  "workspace.coverageInformation": "Required information",
  "workspace.coverageStatus": "Status",
  "workspace.coverageSource": "Source",
  "workspace.structureLabel": "NCRP-compatible prototype complaint structure",
  "workspace.declaration": "I have reviewed this information.",
  "workspace.evidenceMessageType": "Message evidence",
  "workspace.evidenceTransactionType": "Transaction evidence",
  "workspace.view": "View →",
  "workspace.sampleLanguage": "Language",
  "workspace.fullProfile": "View full profile details",
  "workspace.officialDetails": "View all prepared information",
  "workspace.informationFound": "Information found",
  "workspace.claimedIssue": "Claimed issue",
  "workspace.transactionFound": "Transaction",
  "workspace.evidenceItems": "{count} synthetic evidence items",
  "workspace.fullEvidenceDetails": "View extracted evidence details",
  "handoff.heading": "What you need to do now",
  "handoff.intro": "You already told Sachet what happened. Use these prepared details so you do not have to explain the incident again from memory.",
  "handoff.call.title": "Call 1930",
  "handoff.call.description": "Keep this screen open while you call. We’ve arranged the details you may need to read out.",
  "handoff.call.view": "View what to say",
  "handoff.call.heading": "What to say when you call 1930",
  "handoff.call.support": "Read these details in order. If something is not known, tell the operator that it is not known.",
  "handoff.call.copy": "Copy details",
  "handoff.bank.title": "Tell your bank",
  "handoff.bank.description": "We’ve prepared a written summary of the unauthorised transactions so you do not have to write it again.",
  "handoff.bank.view": "View bank notification",
  "handoff.bank.heading": "Bank notification",
  "handoff.bank.support": "Use this to email your bank or take it to a branch.",
  "handoff.summary.title": "Keep your case summary ready",
  "handoff.summary.description": "Keep one clear record of what happened, the transactions, and the evidence in case you need to show it in person.",
  "handoff.summary.view": "View case summary",
  "handoff.summary.heading": "Case summary",
  "handoff.copy": "Copy",
  "handoff.print": "Print",
  "handoff.close": "Close",
  "handoff.copied": "Copied",
  "handoff.copyError": "Could not copy",
  "handoff.demoBoundary": "In this demo, no call is placed automatically, no notification is sent, and no information is submitted to an external system.",
  "workspace.declarationRequired":
    "Confirm the declaration before submitting this synthetic complaint.",
  "field.remove": "Remove",
  "workspace.whatShared": "What you shared",
  "workspace.reportDetails": "Report details",
  "workspace.saved": "Your statement has been saved.",
  "workspace.reportingView": "Complaint preparation view",
  "field.incident": "Incident",
  "field.transactions": "Transaction",
  "field.evidenceSuspect": "Evidence and person or account involved",
  "field.reporter": "Your details",
  "field.category": "Category of complaint",
  "field.subcategory": "Sub-category",
  "field.moneyLost": "Money lost?",
  "field.incidentDate": "Incident date",
  "field.approxTime": "Approximate time",
  "field.approxTimeHelp": "Approximate time is okay if you don't remember the exact time.",
  "field.reportingDelay": "Delay in reporting",
  "field.delayReason": "Reason for delay",
  "field.occurredOn": "Where the conversation happened",
  "field.description": "Incident description",
  "field.amount": "Amount",
  "field.institution": "Bank / payment institution",
  "field.account": "Account, wallet or UPI ID",
  "field.transactionReference": "Transaction reference / UTR",
  "field.transactionReferenceHelp": "Usually shown in your bank or UPI transaction details; it may be called a UTR.",
  "field.transactionDate": "Transaction date",
  "field.reference": "Reference number",
  "field.totalLost": "Total money reported lost",
  "field.evidenceSupplied": "Evidence supplied",
  "field.suspectFound": "Person or account involved",
  "field.name": "Name",
  "field.state": "State",
  "field.registeredMobile": "Registered mobile",
  "field.fromShared": "From what you shared",
  "field.suggested": "Suggested from your information",
  "field.fromEvidence": "From uploaded evidence",
  "field.fromProfile": "From simulated profile",
  "field.fromStatement": "Statement",
  "field.fromConfirmation": "Statement + confirmation",
  "field.attached": "Attached",
  "field.extractedFact": "Extracted fact",
  "field.factsExtracted": "Facts extracted from evidence",
  "field.personalDetails": "Personal details",
  "field.address": "Address",
  "field.identity": "Identity document",
  "field.identityDocument": "National ID document",
  "field.syntheticIdentity": "Synthetic demo ID",
  "field.gender": "Gender",
  "field.dateOfBirth": "Date of birth",
  "field.relationshipWithVictim": "Relationship with victim",
  "field.parentOrSpouse": "Parent / spouse",
  "field.parentOrSpouseRelationship": "Parent / spouse relationship",
  "field.email": "Email",
  "field.title": "Title",
  "field.upiId": "UPI ID",
  "field.suspectBankAccount": "Suspect bank account",
  "field.socialHandle": "Social handle",
  "field.accountAccessStatus": "Account access",
  "field.recoveryInformationChanged": "Recovery information changed",
  "field.affectedSystem": "Affected device or system",
  "field.photograph": "Photograph",
  "field.suspectAddress": "Suspect address",
  "field.district": "District",
  "field.city": "City / village / town",
  "field.pinCode": "PIN code",
  "field.otherAddressDetails": "Other address details",
  "field.houseNumber": "House number",
  "field.street": "Street",
  "field.colony": "Colony / locality",
  "field.country": "Country",
  "field.tehsil": "Tehsil",
  "field.policeStation": "Police station",
  "field.declaration": "Declaration accepted",
  "field.provided": "Provided",
  "field.notProvided": "Not provided",
  "field.notAvailable": "Not available",
  "field.yes": "Yes",
  "field.no": "No",
  "field.transaction": "Transaction {number}",
  "field.chatScreenshot": "Chat screenshot",
  "field.paymentConfirmation": "Payment confirmation",
  "field.voiceStatement": "Voice statement",
  "field.otherEvidence": "Other evidence",
  "field.website": "Website",
  "field.phone": "Phone number",
  "field.change": "Change",
  "field.edit": "Edit",
  "field.save": "Save",
  "field.cancel": "Cancel",
  "field.ready": "Ready",
  "field.needsInput": "Needs your input",
  "field.syntheticSbiAccount": "Synthetic SBI account ending 0024",
  "field.demoNarrative":
    "Asha received a message claiming that the KYC for her SBI account needed to be updated. She opened the supplied link and followed the app instructions. At about 7:05 AM on 22 August 2026, ₹40,000 was transferred from her account. She later tried to contact the sender but received no response.",
  "complaint.registered": "Complaint prepared and registered",
  "complaint.response":
    "This demo shows how a citizen’s voice and evidence can be turned into a structured complaint while keeping the citizen in control of the final review.",
  "complaint.noGovernment":
    "No government system is connected. All information is synthetic.",
  "complaint.startAnother": "Start another demo",
  "complaint.viewPrepared": "View how the report was prepared",
  "complaint.next": "What happens next?",
  "complaint.nextBody":
    "Banks and law-enforcement agencies may act on the financial trail connected to the complaint.",
  "complaint.demoAdvance":
    "For this demo, we’ll move to a later stage where part of the reported amount is recorded as held and can enter the Money Restoration journey.",
  "complaint.continueRestoration": "Continue to Money Restoration",
  "mrm.existing": "Existing government stage · simplified for this prototype",
  "mrm.title": "Money Restoration Module",
  "mrm.request": "Restoration request",
  "mrm.complaint": "NCRP complaint",
  "mrm.reported": "Reported amount",
  "mrm.held": "Amounts currently recorded as held",
  "mrm.refund": "Refund account",
  "mrm.documents": "Required documents",
  "mrm.ready": "Ready",
  "mrm.submit": "Submit synthetic restoration request",
  "mrm.submitted": "Restoration request submitted",
  "mrm.response":
    "This synthetic request represents the existing government restoration stage in simplified form.",
  "mrm.split":
    "Different portions of the reported amount can now be in different recorded states across banks and police processes.",
  "mrm.questions": "This prototype explores a clearer way to answer:",
  "mrm.where": "Where is my money?",
  "mrm.who": "Who needs to act next?",
  "mrm.action": "Do I need to do anything?",
  "mrm.proposed": "Proposed Financial Resolution experience",
  "mrm.open": "See Financial Resolution",
  "case.where": "Where does your {amount} stand?",
  "case.amountSummary": "Amount summary",
  "case.viewSummary": "View summary",
  "case.reported": "Reported",
  "case.active": "Currently recorded in active held/restoration processes",
  "case.cash": "Cash withdrawal recorded",
  "case.notSecured": "Not currently secured",
  "detail.primaryCash": "A cash withdrawal is recorded.",
  "detail.primaryNotHeld":
    "This amount is not currently recorded as held by a financial institution.",
  "detail.primaryReceived":
    "The amount has been credited under the recorded process.",
  "detail.primaryBank":
    "The required direction has already been received by the bank.",
  "detail.account": "Synthetic account",
  "detail.outcomes": "Recorded outcomes",
  "detail.received": "{amount} received",
  "detail.cashHeld": "{amount} put on hold",
  "detail.cashWithdrawal": "Cash withdrawal recorded",
  "detail.day": "Day {day}",
  "detail.bankClock":
    "The recorded bank process requires action within {days} calendar days after receiving the direction.",
  "detail.processClock": "Recorded process window: {days} calendar days",
  "detail.currentCase": "Current synthetic case: {day}",
  "detail.overdue":
    "This step is currently {days} days beyond its recorded process window.",
  "detail.currentActorIo": "Investigating Officer",
  "detail.currentActorBank": "Bank",
  "detail.currentActorPolice": "Police",
  "detail.currentActorCitizen": "Citizen",
  "detail.currentActorCourt": "Court",
  "detail.currentActorNone": "No action currently recorded",
  "history.held": "{amount} put on hold",
  "history.cash": "Cash withdrawal recorded",
  "history.current": "Current",
  "demo.control": "Demo mode",
  "demo.reset": "Reset demo",
  "about.profile":
    "In a live NCRP implementation, verified citizen details could come from the existing authenticated NCRP profile. This prototype uses synthetic profile information and does not authenticate users.",
  "about.phase1Title": "Scope",
  "about.phase1Body":
    "The prototype focuses on the NCRP reporting experience. Financial response and Money Restoration are separate downstream government processes and are outside this submission’s primary reporting flow.",
  "about.phase1Principle":
    "The prototype preserves the need for structured and complete information while exploring a lower-effort way for citizens to provide it.",
  "how.title": "How this works",
  "how.oneTitle": "1. Share what happened",
  "how.oneBody":
    "The citizen speaks, adds synthetic evidence or types a description in the redesigned reporting workspace.",
  "how.twoTitle": "2. Prepare the NCRP reporting information",
  "how.twoBody":
    "The prototype structures supported information and asks the citizen only for required details that are still missing.",
  "how.threeTitle": "3. Verify the complete complaint",
  "how.threeBody":
    "The citizen reviews the NCRP-compatible prototype complaint structure, inspects field coverage and accepts the synthetic declaration before submission.",
};

export function textForLocale(
  locale: UiLocale,
  key: string,
  values?: Record<string, I18nValue>,
): string {
  const template = locale === "hi" ? HI_TEXT[key] : EN_TEXT[key];
  return interpolate(template ?? EN_TEXT[key] ?? key, values);
}

type I18nValue = string | number;
type I18nContextValue = {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: (key: string, values?: Record<string, I18nValue>) => string;
  m: (message: Message) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(
  template: string,
  values?: Record<string, I18nValue>,
): string {
  if (!values) return template;
  return template.replace(/\{([^}]+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : `{${key}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "hi" || saved === "en") setLocaleState(saved);
    } catch {
      // The language switch still works in memory when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
    document.documentElement.dataset.uiLocale = locale;
  }, [locale]);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Restricted browsing modes may block storage; do not block the UI.
    }
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, I18nValue>) => {
      return textForLocale(locale, key, values);
    },
    [locale],
  );

  const m = useCallback(
    (message: Message) =>
      locale === "hi"
        ? (HI_MESSAGE_OVERRIDES[message.key] ?? message.defaultMessage)
        : message.defaultMessage,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, m }),
    [locale, setLocale, t, m],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider.");
  return context;
}
