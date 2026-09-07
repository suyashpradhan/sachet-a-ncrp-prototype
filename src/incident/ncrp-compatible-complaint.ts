import { z } from "zod";
import type { ReporterProfile } from "../experience/profile";
import { sanitizeSensitiveText } from "./sensitive-text";
import {
  ReportFamilySchema,
  type IncidentDraft,
  type ReportFamily,
  type TranscriptionResult,
} from "./schema";

export const NCRP_COMPATIBLE_SCHEMA_VERSION = "prototype-2026-08" as const;

export const FieldSourceSchema = z.enum([
  "VOICE",
  "EVIDENCE",
  "TYPED",
  "SIMULATED_PROFILE",
  "USER_INPUT",
  "USER_CONFIRMED",
  "SYSTEM_DERIVED",
]);
export type FieldSource = z.infer<typeof FieldSourceSchema>;

export const ComplaintFieldStatusSchema = z.enum([
  "READY",
  "NEEDS_INPUT",
  "NOT_PROVIDED_OPTIONAL",
  "CITIZEN_DOES_NOT_HAVE",
  "NEEDS_CONFIRMATION",
  "CONFIRMED",
]);
export type ComplaintFieldStatus = z.infer<typeof ComplaintFieldStatusSchema>;

const ComplaintFieldSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  status: ComplaintFieldStatusSchema,
  sources: z.array(FieldSourceSchema),
});
export type ComplaintField = z.infer<typeof ComplaintFieldSchema>;

const AttachmentSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "CITIZEN_STATEMENT",
    "MESSAGE_SCREENSHOT",
    "TRANSACTION_SCREENSHOT",
    "OTHER_SUPPORTING_EVIDENCE",
    "IDENTITY_DOCUMENT",
  ]),
  displayName: z.string(),
  localPath: z.string().nullable(),
  mediaType: z.string().nullable(),
  synthetic: z.boolean(),
  provided: z.boolean(),
  sources: z.array(FieldSourceSchema),
});

const IncidentGroupSchema = z.object({
  category: ComplaintFieldSchema,
  subCategory: ComplaintFieldSchema,
  moneyLost: ComplaintFieldSchema,
  incidentDate: ComplaintFieldSchema,
  incidentTime: ComplaintFieldSchema,
  delayInReporting: ComplaintFieldSchema,
  reasonForDelay: ComplaintFieldSchema,
  communicationChannel: ComplaintFieldSchema,
  description: ComplaintFieldSchema,
});

const TransactionSchema = z.object({
  direction: ComplaintFieldSchema,
  institution: ComplaintFieldSchema,
  sourceAccountOrPaymentId: ComplaintFieldSchema,
  transactionIdOrUtr: ComplaintFieldSchema,
  amount: ComplaintFieldSchema,
  transactionDate: ComplaintFieldSchema,
  approximateTime: ComplaintFieldSchema,
  referenceNumber: ComplaintFieldSchema,
});

const SuspectGroupSchema = z.object({
  name: ComplaintFieldSchema,
  mobileNumber: ComplaintFieldSchema,
  email: ComplaintFieldSchema,
  url: ComplaintFieldSchema,
  upiId: ComplaintFieldSchema,
  bankAccount: ComplaintFieldSchema,
  socialHandle: ComplaintFieldSchema,
  photograph: ComplaintFieldSchema,
  address: ComplaintFieldSchema,
});

const ComplainantGroupSchema = z.object({
  title: ComplaintFieldSchema,
  name: ComplaintFieldSchema,
  mobile: ComplaintFieldSchema,
  gender: ComplaintFieldSchema,
  dateOfBirth: ComplaintFieldSchema,
  parentOrSpouseRelationship: ComplaintFieldSchema,
  parentOrSpouseName: ComplaintFieldSchema,
  email: ComplaintFieldSchema,
  relationshipWithVictim: ComplaintFieldSchema,
});

const VictimGroupSchema = z.object({
  name: ComplaintFieldSchema,
});

const AddressGroupSchema = z.object({
  houseNumber: ComplaintFieldSchema,
  street: ComplaintFieldSchema,
  colony: ComplaintFieldSchema,
  cityOrVillageOrTown: ComplaintFieldSchema,
  tehsil: ComplaintFieldSchema,
  country: ComplaintFieldSchema,
  state: ComplaintFieldSchema,
  district: ComplaintFieldSchema,
  policeStation: ComplaintFieldSchema,
  pinCode: ComplaintFieldSchema,
});

export const NcrpCompatibleComplaintSchema = z.object({
  schemaVersion: z.literal(NCRP_COMPATIBLE_SCHEMA_VERSION),
  structureLabel: z.literal("NCRP-compatible prototype complaint structure"),
  reportFamily: ReportFamilySchema,
  supportedSubCategory: z.string().nullable(),
  groups: z.object({
    incident: IncidentGroupSchema,
    transactions: z.array(TransactionSchema),
    adaptive: z.object({
      platform: ComplaintFieldSchema,
      messageSourcePlatforms: z.array(ComplaintFieldSchema),
      affectedPlatforms: z.array(ComplaintFieldSchema),
      entityRelationship: ComplaintFieldSchema,
      multipleIncidentThreads: ComplaintFieldSchema,
      platformType: ComplaintFieldSchema,
      affectedAccount: ComplaintFieldSchema,
      profileUrl: ComplaintFieldSchema,
      accountAccessStatus: ComplaintFieldSchema,
      accountCompromise: ComplaintFieldSchema,
      recoveryInformationChanged: ComplaintFieldSchema,
      recoveryEmailChanged: ComplaintFieldSchema,
      phoneNumberChanged: ComplaintFieldSchema,
      affectedSystem: ComplaintFieldSchema,
      filesEncrypted: ComplaintFieldSchema,
      ransomMessagePresent: ComplaintFieldSchema,
      accountCompromiseBasis: ComplaintFieldSchema,
      credentialExposure: ComplaintFieldSchema,
      maliciousLink: ComplaintFieldSchema,
      remoteAccess: ComplaintFieldSchema,
      threatOrExtortion: ComplaintFieldSchema,
      demandedAmount: ComplaintFieldSchema,
      threatChannel: ComplaintFieldSchema,
      threatDescription: ComplaintFieldSchema,
      sensitiveMaterialInvolved: ComplaintFieldSchema,
      impersonation: ComplaintFieldSchema,
      impersonatedEntity: ComplaintFieldSchema,
      communicationChannels: z.array(ComplaintFieldSchema),
      requestedSensitiveInfo: z.array(ComplaintFieldSchema),
      sharedSensitiveInfo: z.array(ComplaintFieldSchema),
      sensitiveEvidenceRedacted: ComplaintFieldSchema,
      financialExposure: z.object({
        bankDetailsRequested: ComplaintFieldSchema,
        identityDocumentRequested: ComplaintFieldSchema,
        otpRequested: ComplaintFieldSchema,
        paymentLinkReceived: ComplaintFieldSchema,
        upiCollectRequestReceived: ComplaintFieldSchema,
      }),
      mentionedInstitutions: z.array(ComplaintFieldSchema),
    }),
    evidence: z.object({
      citizenStatement: ComplaintFieldSchema,
      attachments: z.array(AttachmentSchema),
      extractedFacts: z.array(z.object({
        label: z.string(),
        value: z.string(),
        sourceAttachmentId: z.string(),
      })),
    }),
    suspect: SuspectGroupSchema,
    victim: VictimGroupSchema,
    complainant: ComplainantGroupSchema,
    address: AddressGroupSchema,
    identityDocument: z.object({
      provided: ComplaintFieldSchema,
      attachment: AttachmentSchema.nullable(),
      provenance: z.enum(["SYNTHETIC_DEMO", "SYNTHETIC_LIVE_TEST", "NOT_PROVIDED"]),
    }),
    declaration: z.object({
      citizenConfirmation: ComplaintFieldSchema,
      accepted: ComplaintFieldSchema,
    }),
  }),
});
export type NcrpCompatibleComplaint = z.infer<typeof NcrpCompatibleComplaintSchema>;

export type NcrpFieldGroup =
  | "INCIDENT"
  | "TRANSACTIONS"
  | "EVIDENCE"
  | "SUSPECT"
  | "COMPLAINANT"
  | "ADDRESS"
  | "IDENTITY_DOCUMENT"
  | "DECLARATION";

export type NcrpSourceReference =
  | "CURRENT_PORTAL_UI"
  | "OFFICIAL_CHECKLIST"
  | "OFFICIAL_CITIZEN_MANUAL_REFERENCE";

export type NcrpFieldDefinition = {
  id: string;
  group: NcrpFieldGroup;
  labelKey: string;
  required: boolean;
  conditionalRequired?: "WHEN_REPORTING_DELAYED";
  sourceReference: NcrpSourceReference[];
  supportedInPrototype: boolean;
  reportFamilies?: readonly ReportFamily[];
  subCategories?: readonly string[];
};

const portalAndChecklist: NcrpSourceReference[] = [
  "CURRENT_PORTAL_UI",
  "OFFICIAL_CHECKLIST",
];
const financialOnly = { reportFamilies: ["FINANCIAL_FRAUD"] as const };
const profileHackingOnly = {
  reportFamilies: ["OTHER_CYBER_CRIME"] as const,
  subCategories: ["Profile Hacking"] as const,
};
const ransomwareOnly = {
  reportFamilies: ["OTHER_CYBER_CRIME"] as const,
  subCategories: ["Ransomware"] as const,
};

export const NCRP_FIELD_DEFINITIONS: readonly NcrpFieldDefinition[] = [
  { id: "incident.category", group: "INCIDENT", labelKey: "field.category", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "incident.subCategory", group: "INCIDENT", labelKey: "field.subcategory", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "incident.moneyLost", group: "INCIDENT", labelKey: "field.moneyLost", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "incident.incidentDate", group: "INCIDENT", labelKey: "field.incidentDate", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "incident.incidentTime", group: "INCIDENT", labelKey: "field.approxTime", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "incident.delayInReporting", group: "INCIDENT", labelKey: "field.reportingDelay", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "incident.reasonForDelay", group: "INCIDENT", labelKey: "field.delayReason", required: false, conditionalRequired: "WHEN_REPORTING_DELAYED", sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "incident.communicationChannel", group: "INCIDENT", labelKey: "field.occurredOn", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "incident.description", group: "INCIDENT", labelKey: "field.description", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "transactions.0.institution", group: "TRANSACTIONS", labelKey: "field.institution", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.sourceAccountOrPaymentId", group: "TRANSACTIONS", labelKey: "field.account", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.transactionIdOrUtr", group: "TRANSACTIONS", labelKey: "field.transactionReference", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.amount", group: "TRANSACTIONS", labelKey: "field.amount", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.transactionDate", group: "TRANSACTIONS", labelKey: "field.transactionDate", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.approximateTime", group: "TRANSACTIONS", labelKey: "field.approxTime", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "transactions.0.referenceNumber", group: "TRANSACTIONS", labelKey: "field.reference", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "adaptive.platform", group: "INCIDENT", labelKey: "field.occurredOn", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, reportFamilies: ["OTHER_CYBER_CRIME", "WOMEN_CHILDREN_RELATED_CRIME"] },
  { id: "adaptive.affectedAccount", group: "INCIDENT", labelKey: "field.socialHandle", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...profileHackingOnly },
  { id: "adaptive.accountAccessStatus", group: "INCIDENT", labelKey: "field.accountAccessStatus", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...profileHackingOnly },
  { id: "adaptive.recoveryInformationChanged", group: "INCIDENT", labelKey: "field.recoveryInformationChanged", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...profileHackingOnly },
  { id: "adaptive.affectedSystem", group: "INCIDENT", labelKey: "field.affectedSystem", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...ransomwareOnly },
  { id: "evidence.citizenStatement", group: "EVIDENCE", labelKey: "field.voiceStatement", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "evidence.supportingEvidence", group: "EVIDENCE", labelKey: "field.evidenceSupplied", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true, ...financialOnly },
  { id: "suspect.name", group: "SUSPECT", labelKey: "field.name", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.mobileNumber", group: "SUSPECT", labelKey: "field.phone", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.email", group: "SUSPECT", labelKey: "field.email", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.url", group: "SUSPECT", labelKey: "field.website", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.upiId", group: "SUSPECT", labelKey: "field.upiId", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.bankAccount", group: "SUSPECT", labelKey: "field.suspectBankAccount", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.socialHandle", group: "SUSPECT", labelKey: "field.socialHandle", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.photograph", group: "SUSPECT", labelKey: "field.photograph", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "suspect.address", group: "SUSPECT", labelKey: "field.suspectAddress", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.title", group: "COMPLAINANT", labelKey: "field.title", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.name", group: "COMPLAINANT", labelKey: "field.name", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.mobile", group: "COMPLAINANT", labelKey: "field.registeredMobile", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.gender", group: "COMPLAINANT", labelKey: "field.gender", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.dateOfBirth", group: "COMPLAINANT", labelKey: "field.dateOfBirth", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.parentOrSpouseRelationship", group: "COMPLAINANT", labelKey: "field.parentOrSpouseRelationship", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.parentOrSpouseName", group: "COMPLAINANT", labelKey: "field.parentOrSpouse", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.email", group: "COMPLAINANT", labelKey: "field.email", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "complainant.relationshipWithVictim", group: "COMPLAINANT", labelKey: "field.relationshipWithVictim", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.houseNumber", group: "ADDRESS", labelKey: "field.houseNumber", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.street", group: "ADDRESS", labelKey: "field.street", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.colony", group: "ADDRESS", labelKey: "field.colony", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.state", group: "ADDRESS", labelKey: "field.state", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.district", group: "ADDRESS", labelKey: "field.district", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.cityOrVillageOrTown", group: "ADDRESS", labelKey: "field.city", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.tehsil", group: "ADDRESS", labelKey: "field.tehsil", required: false, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.country", group: "ADDRESS", labelKey: "field.country", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.policeStation", group: "ADDRESS", labelKey: "field.policeStation", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "address.pinCode", group: "ADDRESS", labelKey: "field.pinCode", required: true, sourceReference: portalAndChecklist, supportedInPrototype: true },
  { id: "identityDocument.provided", group: "IDENTITY_DOCUMENT", labelKey: "field.identityDocument", required: true, sourceReference: ["CURRENT_PORTAL_UI", "OFFICIAL_CITIZEN_MANUAL_REFERENCE"], supportedInPrototype: true, ...financialOnly },
  { id: "declaration.accepted", group: "DECLARATION", labelKey: "field.declaration", required: true, sourceReference: ["CURRENT_PORTAL_UI"], supportedInPrototype: true },
] as const;

function valueField(
  value: string | number | boolean | null | undefined,
  sources: FieldSource[],
  required = false,
): ComplaintField {
  if (value === "__CITIZEN_DOES_NOT_HAVE__") {
    return {
      value: null,
      status: "CITIZEN_DOES_NOT_HAVE",
      sources: ["USER_CONFIRMED"],
    };
  }
  const safeValue = typeof value === "string"
    ? sanitizeSensitiveText(value).text
    : value;
  const isMissing =
    safeValue === null || safeValue === undefined || safeValue === "";
  return {
    value: isMissing ? null : (safeValue ?? null),
    status: isMissing
      ? required ? "NEEDS_INPUT" : "NOT_PROVIDED_OPTIONAL"
      : "READY",
    sources: isMissing ? [] : sources,
  };
}

function optionalSuspect(
  draft: IncidentDraft,
  type: IncidentDraft["suspectIdentifiers"][number]["type"],
  source: FieldSource,
): ComplaintField {
  const value = draft.suspectIdentifiers.find((item) => item.type === type)?.value;
  return valueField(value, value ? [source] : [], false);
}

export type BuildNcrpCompatibleComplaintInput = {
  draft: IncidentDraft;
  profile: ReporterProfile;
  transcription: TranscriptionResult | null;
  typedNarrative: string;
  isDemoIncident: boolean;
  screenshotNames: string[];
  demoEvidencePaths?: string[];
  identityDocumentProvided: boolean;
  declarationAccepted?: boolean;
};

export function buildNcrpCompatibleComplaint({
  draft,
  profile,
  transcription,
  typedNarrative,
  isDemoIncident,
  screenshotNames,
  demoEvidencePaths = [],
  identityDocumentProvided,
  declarationAccepted = false,
}: BuildNcrpCompatibleComplaintInput): NcrpCompatibleComplaint {
  const narrativeSource: FieldSource = transcription
    ? "VOICE"
    : typedNarrative.trim() ? "TYPED" : "EVIDENCE";
  const profileSource: FieldSource = profile.source === "SIMULATED_NCRP_PROFILE"
    ? "SIMULATED_PROFILE"
    : "USER_INPUT";
  const evidenceAttachments = draft.evidence.map((item, index) => ({
    id: `evidence-${index + 1}`,
    kind: item.type === "CHAT_SCREENSHOT"
      ? "MESSAGE_SCREENSHOT" as const
      : item.type === "TRANSACTION_SCREENSHOT"
        ? "TRANSACTION_SCREENSHOT" as const
        : item.type === "VOICE_STATEMENT"
          ? "CITIZEN_STATEMENT" as const
          : "OTHER_SUPPORTING_EVIDENCE" as const,
    displayName: sanitizeSensitiveText(screenshotNames[index] ?? (
      item.type === "CHAT_SCREENSHOT"
        ? "Synthetic KYC message screenshot"
        : item.type === "TRANSACTION_SCREENSHOT"
          ? "Synthetic bank transaction screenshot"
          : "Supporting evidence"
    )).text,
    localPath: isDemoIncident
      ? demoEvidencePaths[index] ?? (index === 0 ? "/demo/evidence/kyc-message-demo.png" : "/demo/evidence/bank-transaction-demo.png")
      : null,
    mediaType: isDemoIncident && demoEvidencePaths[index]?.endsWith(".svg")
      ? "image/svg+xml"
      : "image/png",
    synthetic: isDemoIncident,
    provided: true,
    sources: ["EVIDENCE" as const],
  }));
  const identityAttachment = identityDocumentProvided ? {
    id: "identity-document-1",
    kind: "IDENTITY_DOCUMENT" as const,
    displayName: "Synthetic demo identity document",
    localPath: "/demo/profile/synthetic-national-id.svg",
    mediaType: "image/svg+xml",
    synthetic: true,
    provided: true,
    sources: [profileSource],
  } : null;
  const structuredSource: FieldSource = evidenceAttachments.length > 0
    ? "EVIDENCE"
    : narrativeSource;
  const classificationSource: FieldSource = draft.classification.explanation === "Reporting path confirmed by the citizen."
    ? "USER_CONFIRMED"
    : "SYSTEM_DERIVED";
  const sourceFor = (path: string, fallback: FieldSource): FieldSource =>
    draft.citizenConfirmedFields.includes(path) ? "USER_CONFIRMED" : fallback;

  const incident = {
    category: valueField(draft.officialMapping.categoryLabel, [classificationSource], true),
    subCategory: valueField(draft.officialMapping.subCategoryLabel, [classificationSource], true),
    moneyLost: valueField(draft.incident.moneyLost, [narrativeSource], true),
    incidentDate: draft.incident.incidentDateWithoutYear && !draft.incident.incidentDate
      ? {
          value: draft.incident.incidentDateWithoutYear,
          status: "NEEDS_CONFIRMATION" as const,
          sources: [sourceFor("incident.incidentDate", narrativeSource)],
        }
      : valueField(draft.incident.incidentDate, [sourceFor("incident.incidentDate", narrativeSource)], true),
    incidentTime: valueField(
      draft.incident.approximateTime ?? (
        draft.transactions.length > 0 && draft.transactions.every((transaction) => Boolean(transaction.approximateTime))
          ? "See recorded transaction times"
          : null
      ),
      [sourceFor("incident.incidentTime", narrativeSource)],
      true,
    ),
    delayInReporting: valueField(draft.incident.delayInReporting, ["SYSTEM_DERIVED"], true),
    reasonForDelay: valueField(draft.incident.delayReason, [narrativeSource], draft.incident.delayInReporting === true),
    communicationChannel: valueField(draft.incident.occurredOn, [sourceFor("incident.communicationChannel", structuredSource)], true),
    description: valueField(draft.incident.narrative, [sourceFor("incident.narrative", narrativeSource)], true),
  };

  return NcrpCompatibleComplaintSchema.parse({
    schemaVersion: NCRP_COMPATIBLE_SCHEMA_VERSION,
    structureLabel: "NCRP-compatible prototype complaint structure",
    reportFamily: draft.classification.reportFamily,
    supportedSubCategory: draft.classification.subCategory,
    groups: {
      incident,
      transactions: draft.transactions.map((transaction, index) => ({
        direction: valueField(transaction.direction ?? "DEBIT", ["SYSTEM_DERIVED"], true),
        institution: valueField(transaction.institution, [sourceFor(`transactions.${index}.institution`, structuredSource)], true),
        sourceAccountOrPaymentId: valueField(transaction.accountOrUpiId, [sourceFor(`transactions.${index}.accountOrUpiId`, profileSource)], true),
        transactionIdOrUtr: valueField(
          transaction.transactionIdOrUtr ?? transaction.referenceNumber,
          [sourceFor(`transactions.${index}.transactionIdOrUtr`, structuredSource)],
          true,
        ),
        amount: valueField(transaction.amount, [sourceFor(`transactions.${index}.amount`, structuredSource)], true),
        transactionDate: valueField(transaction.transactionDate, [sourceFor(`transactions.${index}.transactionDate`, structuredSource)], true),
        approximateTime: valueField(transaction.approximateTime, [sourceFor(`transactions.${index}.approximateTime`, structuredSource)], true),
        referenceNumber: valueField(transaction.referenceNumber, [structuredSource], false),
      })),
      adaptive: {
        platform: valueField(draft.adaptiveFacts.platform ?? draft.classification.platform, [sourceFor("adaptive.platform", structuredSource)]),
        messageSourcePlatforms: draft.adaptiveFacts.messageSourcePlatforms.map((value) => valueField(value, [structuredSource])),
        affectedPlatforms: draft.adaptiveFacts.affectedPlatforms.map((value) => valueField(value, [sourceFor("adaptive.affectedPlatforms", structuredSource)])),
        entityRelationship: valueField(draft.adaptiveFacts.entityRelationship, [sourceFor("adaptive.entityRelationship", structuredSource)]),
        multipleIncidentThreads: valueField(draft.adaptiveFacts.multipleIncidentThreads, [sourceFor("adaptive.entityRelationship", structuredSource)]),
        platformType: valueField(draft.adaptiveFacts.platformType, [structuredSource]),
        affectedAccount: valueField(draft.adaptiveFacts.affectedAccount, [sourceFor("adaptive.affectedAccount", structuredSource)]),
        profileUrl: valueField(draft.adaptiveFacts.profileUrl, [sourceFor("adaptive.profileUrl", structuredSource)]),
        accountAccessStatus: valueField(draft.adaptiveFacts.accountAccessStatus, [sourceFor("adaptive.accountAccessStatus", structuredSource)]),
        accountCompromise: valueField(draft.adaptiveFacts.accountCompromise, [structuredSource]),
        recoveryInformationChanged: valueField(draft.adaptiveFacts.recoveryInformationChanged, [structuredSource]),
        recoveryEmailChanged: valueField(draft.adaptiveFacts.recoveryEmailChanged, [structuredSource]),
        phoneNumberChanged: valueField(draft.adaptiveFacts.phoneNumberChanged, [structuredSource]),
        affectedSystem: valueField(draft.adaptiveFacts.affectedSystem, [structuredSource]),
        filesEncrypted: valueField(draft.adaptiveFacts.filesEncrypted, [structuredSource]),
        ransomMessagePresent: valueField(draft.adaptiveFacts.ransomMessagePresent, [structuredSource]),
        accountCompromiseBasis: valueField(draft.adaptiveFacts.accountCompromiseBasis, [structuredSource]),
        credentialExposure: valueField(draft.adaptiveFacts.credentialExposure, [structuredSource]),
        maliciousLink: valueField(draft.adaptiveFacts.maliciousLink, [structuredSource]),
        remoteAccess: valueField(draft.adaptiveFacts.remoteAccess, [structuredSource]),
        threatOrExtortion: valueField(draft.adaptiveFacts.threatOrExtortion, [structuredSource]),
        demandedAmount: valueField(draft.adaptiveFacts.demandedAmount, [sourceFor("adaptive.demandedAmount", structuredSource)]),
        threatChannel: valueField(draft.adaptiveFacts.threatChannel, [sourceFor("adaptive.threatChannel", structuredSource)]),
        threatDescription: valueField(draft.adaptiveFacts.threatDescription, [sourceFor("adaptive.threatDescription", structuredSource)]),
        sensitiveMaterialInvolved: valueField(draft.adaptiveFacts.sensitiveMaterialInvolved, [structuredSource]),
        impersonation: valueField(draft.adaptiveFacts.impersonation, [structuredSource]),
        impersonatedEntity: valueField(draft.adaptiveFacts.impersonatedEntity, [sourceFor("adaptive.impersonatedEntity", structuredSource)]),
        communicationChannels: draft.adaptiveFacts.communicationChannels.map((value) => valueField(value, [structuredSource])),
        requestedSensitiveInfo: draft.adaptiveFacts.requestedSensitiveInfo.map((value) => valueField(value, [sourceFor("adaptive.requestedSensitiveInfo", structuredSource)])),
        sharedSensitiveInfo: draft.adaptiveFacts.sharedSensitiveInfo.map((value) => valueField(value, [sourceFor("adaptive.sharedSensitiveInfo", structuredSource)])),
        sensitiveEvidenceRedacted: valueField(draft.adaptiveFacts.sensitiveEvidenceRedacted, [structuredSource]),
        financialExposure: {
          bankDetailsRequested: valueField(draft.financialExposure.bankDetailsRequested, [structuredSource]),
          identityDocumentRequested: valueField(draft.financialExposure.identityDocumentRequested, [structuredSource]),
          otpRequested: valueField(draft.financialExposure.otpRequested, [structuredSource]),
          paymentLinkReceived: valueField(draft.financialExposure.paymentLinkReceived, [structuredSource]),
          upiCollectRequestReceived: valueField(draft.financialExposure.upiCollectRequestReceived, [structuredSource]),
        },
        mentionedInstitutions: draft.mentionedInstitutions.map((institution) =>
          valueField(institution, [structuredSource]),
        ),
      },
      evidence: {
        citizenStatement: valueField(
          transcription?.originalTranscript ?? (typedNarrative || draft.incident.narrative),
          [narrativeSource],
          true,
        ),
        attachments: evidenceAttachments,
        extractedFacts: draft.evidence.flatMap((item, index) => item.extractedFacts.map((fact) => ({
          label: item.type === "CHAT_SCREENSHOT" ? "Message evidence fact" : "Transaction evidence fact",
          value: sanitizeSensitiveText(fact).text,
          sourceAttachmentId: `evidence-${index + 1}`,
        }))),
      },
      suspect: {
        name: optionalSuspect(draft, "NAME", structuredSource),
        mobileNumber: optionalSuspect(draft, "PHONE", structuredSource),
        email: optionalSuspect(draft, "EMAIL", structuredSource),
        url: optionalSuspect(draft, "URL", structuredSource),
        upiId: optionalSuspect(draft, "UPI_ID", structuredSource),
        bankAccount: valueField(null, [], false),
        socialHandle: optionalSuspect(draft, "SOCIAL_HANDLE", structuredSource),
        photograph: valueField(null, [], false),
        address: valueField(null, [], false),
      },
      victim: {
        name: valueField(
          draft.reportingPeople?.reportingFor === "SOMEONE_ELSE"
            ? draft.reportingPeople.victimName
            : profile.displayName,
          [profileSource],
          true,
        ),
      },
      complainant: {
        title: valueField(profile.title, [profileSource], false),
        name: valueField(profile.displayName, [profileSource], true),
        mobile: valueField(profile.registeredMobile, [profileSource], true),
        gender: valueField(profile.gender, [profileSource], true),
        dateOfBirth: valueField(profile.dateOfBirth, [profileSource], true),
        parentOrSpouseRelationship: valueField(profile.parentOrSpouseRelationship, [profileSource], true),
        parentOrSpouseName: valueField(profile.parentOrSpouseName, [profileSource], true),
        email: valueField(profile.email, [profileSource], true),
        relationshipWithVictim: valueField(
          draft.reportingPeople?.reportingFor === "SOMEONE_ELSE"
            ? draft.reportingPeople.relationship
            : profile.relationshipWithVictim || "Self",
          [profileSource],
          true,
        ),
      },
      address: {
        houseNumber: valueField(profile.houseNumber, [profileSource], false),
        street: valueField(profile.street, [profileSource], false),
        colony: valueField(profile.colony, [profileSource], false),
        cityOrVillageOrTown: valueField(profile.city, [profileSource], true),
        tehsil: valueField(profile.tehsil, [profileSource], false),
        country: valueField(profile.country, [profileSource], true),
        state: valueField(profile.state, [profileSource], true),
        district: valueField(profile.district, [profileSource], true),
        policeStation: valueField(profile.policeStation, [profileSource], true),
        pinCode: valueField(profile.pinCode, [profileSource], true),
      },
      identityDocument: {
        provided: {
          value: identityDocumentProvided,
          status: identityDocumentProvided ? "READY" : "NEEDS_INPUT",
          sources: identityDocumentProvided ? [profileSource] : [],
        },
        attachment: identityAttachment,
        provenance: identityDocumentProvided
          ? isDemoIncident ? "SYNTHETIC_DEMO" : "SYNTHETIC_LIVE_TEST"
          : "NOT_PROVIDED",
      },
      declaration: {
        citizenConfirmation: {
          value: declarationAccepted,
          status: declarationAccepted ? "CONFIRMED" : "NEEDS_CONFIRMATION",
          sources: declarationAccepted ? ["USER_CONFIRMED"] : [],
        },
        accepted: {
          value: declarationAccepted,
          status: declarationAccepted ? "CONFIRMED" : "NEEDS_CONFIRMATION",
          sources: declarationAccepted ? ["USER_CONFIRMED"] : [],
        },
      },
    },
  });
}

export function complaintRequiredFieldStatus(
  complaint: NcrpCompatibleComplaint,
  definition: NcrpFieldDefinition,
): ComplaintFieldStatus {
  if (definition.id === "evidence.supportingEvidence") {
    return complaint.groups.evidence.attachments.length > 0 ? "READY" : "NEEDS_INPUT";
  }
  const path = definition.id.split(".");
  let current: unknown = complaint.groups;
  for (const part of path) {
    if (current === null || typeof current !== "object") return "NEEDS_INPUT";
    current = (current as Record<string, unknown>)[part];
  }
  if (current && typeof current === "object" && "status" in current) {
    return (current as ComplaintField).status;
  }
  return "NEEDS_INPUT";
}

export function complaintFieldApplies(
  complaint: NcrpCompatibleComplaint,
  definition: NcrpFieldDefinition,
): boolean {
  if (
    definition.group === "TRANSACTIONS" &&
    complaint.groups.incident.moneyLost.value !== true
  ) {
    return false;
  }
  if (definition.reportFamilies && !definition.reportFamilies.includes(complaint.reportFamily)) {
    return false;
  }
  if (
    definition.subCategories &&
    !definition.subCategories.includes(complaint.supportedSubCategory ?? "")
  ) {
    return false;
  }
  return true;
}

export function complaintFieldIsRequired(
  complaint: NcrpCompatibleComplaint,
  definition: NcrpFieldDefinition,
): boolean {
  if (!complaintFieldApplies(complaint, definition)) return false;
  if (definition.required) return true;
  if (definition.conditionalRequired === "WHEN_REPORTING_DELAYED") {
    return complaint.groups.incident.delayInReporting.value === true;
  }
  return false;
}

export function requiredComplaintFieldsReady(complaint: NcrpCompatibleComplaint): boolean {
  return NCRP_FIELD_DEFINITIONS
    .filter((definition) => complaintFieldIsRequired(complaint, definition) && definition.id !== "declaration.accepted")
    .every((definition) => {
      const status = complaintRequiredFieldStatus(complaint, definition);
      return status === "READY" || status === "CONFIRMED" || status === "CITIZEN_DOES_NOT_HAVE";
    });
}
