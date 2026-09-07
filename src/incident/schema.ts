import { z } from "zod";

export const CITIZEN_DOES_NOT_HAVE = "__CITIZEN_DOES_NOT_HAVE__";

export const ReportFamilySchema = z.enum([
  "FINANCIAL_FRAUD",
  "WOMEN_CHILDREN_RELATED_CRIME",
  "OTHER_CYBER_CRIME",
  "OUT_OF_SCOPE_OR_UNCLEAR",
]);
export type ReportFamily = z.infer<typeof ReportFamilySchema>;

export const FinancialLossStateSchema = z.enum(["YES", "NO", "UNKNOWN"]);
export type FinancialLossState = z.infer<typeof FinancialLossStateSchema>;

export const ReportingPeopleSchema = z.object({
  reportingFor: z.enum(["SELF", "SOMEONE_ELSE"]),
  victimName: z.string().nullable(),
  helperName: z.string().nullable(),
  relationship: z.string().nullable(),
  statementProvidedBy: z.enum(["VICTIM", "HELPER"]),
}).strict();
export type ReportingPeople = z.infer<typeof ReportingPeopleSchema>;

export const FinancialExposureSchema = z.object({
  bankDetailsRequested: z.boolean().nullable(),
  identityDocumentRequested: z.boolean().nullable(),
  otpRequested: z.boolean().nullable(),
  paymentLinkReceived: z.boolean().nullable(),
  upiCollectRequestReceived: z.boolean().nullable(),
}).strict();
export type FinancialExposure = z.infer<typeof FinancialExposureSchema>;

export const TransactionDirectionSchema = z.enum(["DEBIT", "CREDIT"]);
export type TransactionDirection = z.infer<typeof TransactionDirectionSchema>;

export const ReportedAmountClaimSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  role: z.enum([
    "DISPLAYED_VALUE",
    "DEMANDED_UNPAID",
    "REPORTED_UNVERIFIED",
  ]),
  label: z.string(),
  labelHi: z.string(),
  sourceLabel: z.string(),
  sourceLabelHi: z.string(),
  evidenceId: z.string().nullable(),
  note: z.string(),
  noteHi: z.string(),
}).strict();
export type ReportedAmountClaim = z.infer<typeof ReportedAmountClaimSchema>;

export const IncidentTransactionSchema = z.object({
  id: z.string(),
  direction: TransactionDirectionSchema.optional(),
  evidenceId: z.string().nullable().optional(),
  institution: z.string().nullable(),
  currency: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  accountOrUpiId: z.string().nullable(),
  transactionIdOrUtr: z.string().nullable(),
  amount: z.number().nullable(),
  transactionDate: z.string().nullable(),
  approximateTime: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  status: z.enum(["KNOWN", "MISSING", "NEEDS_CONFIRMATION"]),
});

export const IncidentClassificationSchema = z.object({
  reportFamily: ReportFamilySchema,
  category: z.string().nullable(),
  subCategory: z.string().nullable(),
  cyberElementPresent: z.boolean().nullable(),
  moneyLost: z.boolean().nullable(),
  platform: z.string().nullable(),
  ambiguity: z.enum([
    "NONE",
    "INSUFFICIENT_INFORMATION",
    "MULTIPLE_PLAUSIBLE_PATHS",
    "OUT_OF_CYBER_SCOPE",
  ]),
  explanation: z.string().nullable(),
  requiresCitizenConfirmation: z.boolean(),
}).strict();
export type IncidentClassification = z.infer<typeof IncidentClassificationSchema>;

export const AdaptiveIncidentFactsSchema = z.object({
  platform: z.string().nullable(),
  messageSourcePlatforms: z.array(z.string()),
  affectedPlatforms: z.array(z.string()),
  entityRelationship: z.enum([
    "RELATED_BOTH_AFFECTED",
    "ONLY_SOURCE_AFFECTED",
    "ONLY_TARGET_AFFECTED",
    "SEPARATE_INCIDENT_THREADS",
    "UNSURE",
  ]).nullable(),
  multipleIncidentThreads: z.boolean().nullable(),
  platformType: z.string().nullable(),
  affectedAccount: z.string().nullable(),
  profileUrl: z.string().nullable(),
  accountAccessStatus: z.string().nullable(),
  accountCompromise: z.boolean().nullable(),
  recoveryInformationChanged: z.boolean().nullable(),
  recoveryEmailChanged: z.boolean().nullable(),
  phoneNumberChanged: z.boolean().nullable(),
  affectedSystem: z.string().nullable(),
  filesEncrypted: z.boolean().nullable(),
  ransomMessagePresent: z.boolean().nullable(),
  accountCompromiseBasis: z.string().nullable(),
  credentialExposure: z.boolean().nullable(),
  maliciousLink: z.boolean().nullable(),
  remoteAccess: z.boolean().nullable(),
  threatOrExtortion: z.boolean().nullable(),
  demandedAmount: z.number().positive().nullable(),
  threatChannel: z.string().nullable(),
  threatDescription: z.string().nullable(),
  sensitiveMaterialInvolved: z.boolean().nullable(),
  impersonation: z.boolean().nullable(),
  impersonatedEntity: z.string().nullable(),
  communicationChannels: z.array(z.string()),
  requestedSensitiveInfo: z.array(z.string()),
  sharedSensitiveInfo: z.array(z.string()),
  sensitiveEvidenceRedacted: z.boolean().nullable(),
}).strict();
export type AdaptiveIncidentFacts = z.infer<typeof AdaptiveIncidentFactsSchema>;

export const IncidentDraftSchema = z.object({
  reportingPeople: ReportingPeopleSchema.optional(),
  classification: IncidentClassificationSchema,
  adaptiveFacts: AdaptiveIncidentFactsSchema,
  citizenSummary: z.object({
    incidentLabel: z.string(),
    shortSummary: z.string(),
  }),
  officialMapping: z.object({
    category: ReportFamilySchema.nullable(),
    categoryLabel: z.string().nullable(),
    subCategoryLabel: z.string().nullable(),
    mappingConfidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  }),
  incident: z.object({
    financialLossState: FinancialLossStateSchema,
    moneyLost: z.boolean().nullable(),
    statedTotalLoss: z.number().positive().nullable(),
    citizenConfirmedLoss: z.number().positive().nullable(),
    reportedAmount: z.number().positive().nullable(),
    openingBalance: z.number().nonnegative().nullable(),
    intermediateBalances: z.array(z.number().nonnegative()),
    closingBalance: z.number().nonnegative().nullable(),
    incidentDate: z.string().nullable(),
    incidentDateWithoutYear: z.string().regex(/^\d{2}-\d{2}$/).nullable(),
    approximateTime: z.string().nullable(),
    delayInReporting: z.boolean().nullable(),
    delayReason: z.string().nullable(),
    occurredOn: z.string().nullable(),
    narrative: z.string().nullable(),
  }),
  financialExposure: FinancialExposureSchema,
  mentionedInstitutions: z.array(z.string()),
  transactions: z.array(IncidentTransactionSchema),
  amountClaims: z.array(ReportedAmountClaimSchema).optional(),
  suspectIdentifiers: z.array(z.object({
    type: z.enum([
      "PHONE",
      "EMAIL",
      "URL",
      "UPI_ID",
      "SOCIAL_HANDLE",
      "NAME",
      "OTHER",
    ]),
    value: z.string(),
  })),
  evidence: z.array(z.object({
    type: z.enum([
      "CHAT_SCREENSHOT",
      "TRANSACTION_SCREENSHOT",
      "VOICE_STATEMENT",
      "OTHER",
    ]),
    extractedFacts: z.array(z.string()),
  })),
  citizenConfirmedFields: z.array(z.string()),
  missingRequiredFields: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type IncidentDraft = z.infer<typeof IncidentDraftSchema>;

/** Provider-facing schema keeps application-owned evidence links and amount claims out of model output. */
export const IncidentExtractionSchema = IncidentDraftSchema
  .omit({ amountClaims: true, transactions: true, reportingPeople: true })
  .extend({
    transactions: z.array(
      IncidentTransactionSchema.omit({ direction: true, evidenceId: true }).extend({
        direction: TransactionDirectionSchema,
      }),
    ),
  });

const LEGACY_ADAPTIVE_FACT_DEFAULTS: Pick<
  AdaptiveIncidentFacts,
  | "platformType"
  | "messageSourcePlatforms"
  | "affectedPlatforms"
  | "entityRelationship"
  | "multipleIncidentThreads"
  | "profileUrl"
  | "accountCompromise"
  | "recoveryEmailChanged"
  | "phoneNumberChanged"
  | "credentialExposure"
  | "maliciousLink"
  | "remoteAccess"
  | "threatOrExtortion"
  | "demandedAmount"
  | "threatChannel"
  | "threatDescription"
  | "sensitiveMaterialInvolved"
  | "impersonation"
  | "impersonatedEntity"
  | "communicationChannels"
  | "requestedSensitiveInfo"
  | "sharedSensitiveInfo"
> = {
  platformType: null,
  messageSourcePlatforms: [],
  affectedPlatforms: [],
  entityRelationship: null,
  multipleIncidentThreads: null,
  profileUrl: null,
  accountCompromise: null,
  recoveryEmailChanged: null,
  phoneNumberChanged: null,
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
  communicationChannels: [],
  requestedSensitiveInfo: [],
  sharedSensitiveInfo: [],
};

/** Keeps locally saved drafts from before the dynamic-facts pass recoverable. */
export function safeParseIncidentDraft(value: unknown) {
  if (!value || typeof value !== "object") return IncidentDraftSchema.safeParse(value);
  const candidate = value as Record<string, unknown>;
  const adaptiveFacts = candidate.adaptiveFacts;
  if (!adaptiveFacts || typeof adaptiveFacts !== "object") {
    return IncidentDraftSchema.safeParse(value);
  }
  return IncidentDraftSchema.safeParse({
    ...candidate,
    incident: candidate.incident && typeof candidate.incident === "object"
      ? {
          statedTotalLoss: null,
          citizenConfirmedLoss: null,
          openingBalance: null,
          intermediateBalances: [],
          closingBalance: null,
          ...(candidate.incident as Record<string, unknown>),
        }
      : candidate.incident,
    adaptiveFacts: {
      ...LEGACY_ADAPTIVE_FACT_DEFAULTS,
      ...(adaptiveFacts as Record<string, unknown>),
    },
  });
}

export const TranscriptionResultSchema = z.object({
  originalTranscript: z.string(),
  englishTranscript: z.string(),
  languageCode: z.string(),
});

export type TranscriptionResult = z.infer<typeof TranscriptionResultSchema>;
