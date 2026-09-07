import {
  deriveMissingQuestions,
  type MissingQuestion,
} from "../incident/missing-information";
import {
  NCRP_FIELD_DEFINITIONS,
  complaintFieldApplies,
  complaintFieldIsRequired,
  complaintRequiredFieldStatus,
  type NcrpCompatibleComplaint,
  type NcrpFieldDefinition,
} from "../incident/ncrp-compatible-complaint";
import type { ReportedAmountResolution } from "../incident/complaint-case";
import type { IncidentDraft } from "../incident/schema";
import { getCaseConsistencyIssues } from "../incident/case-consistency";
import { textForLocale, type UiLocale } from "../i18n/i18n-provider";
import type { ReportGroupId } from "./report-details";

export type ReportFieldId = string;

export type MissingRequirementLevel = "BLOCKING" | "RECOMMENDED" | "OPTIONAL";

export type MissingRequirement = {
  id: string;
  fieldId: ReportFieldId;
  sectionId: ReportGroupId;
  label: string;
  level: MissingRequirementLevel;
  blocking: boolean;
  kind: "FIELD" | "CLARIFICATION" | "CONFIRMATION";
  questionField?: MissingQuestion["field"];
};

export type ReportReadinessState =
  | "STALE"
  | "NEEDS_CLARIFICATION"
  | "MISSING_REQUIRED"
  | "READY";

export type ReportReadiness = {
  state: ReportReadinessState;
  blockingItems: MissingRequirement[];
  recommendedItems: MissingRequirement[];
  optionalItems: MissingRequirement[];
  sectionBlockingCounts: Record<ReportGroupId, number>;
  nextBlockingItem: MissingRequirement | null;
  preparedRequiredCount: number;
};

const QUESTION_TARGETS: Record<
  MissingQuestion["field"],
  { fieldId: ReportFieldId; sectionId: ReportGroupId }
> = {
  requestedAmountPaymentStatus: {
    fieldId: "requested-amount-payment-status",
    sectionId: "THREAT_IMPERSONATION",
  },
  moneyLost: { fieldId: "money-lost", sectionId: "INCIDENT" },
  incidentDate: { fieldId: "incident-date", sectionId: "INCIDENT" },
  incidentDateYear: { fieldId: "incident-date", sectionId: "INCIDENT" },
  incidentApproximateTime: { fieldId: "incident-time", sectionId: "INCIDENT" },
  delayInReporting: { fieldId: "reporting-delay", sectionId: "INCIDENT" },
  delayReason: { fieldId: "delay-reason", sectionId: "INCIDENT" },
  occurredOn: { fieldId: "occurred-on", sectionId: "INCIDENT" },
  institution: { fieldId: "transaction-0-institution", sectionId: "TRANSACTIONS" },
  accountOrUpiId: { fieldId: "transaction-0-account", sectionId: "TRANSACTIONS" },
  transactionAmount: { fieldId: "transaction-0-amount", sectionId: "TRANSACTIONS" },
  transactionIdOrUtr: { fieldId: "transaction-0-utr", sectionId: "TRANSACTIONS" },
  transactionDate: { fieldId: "transaction-0-date", sectionId: "TRANSACTIONS" },
  transactionApproximateTime: { fieldId: "transaction-0-time", sectionId: "TRANSACTIONS" },
  platform: { fieldId: "platform", sectionId: "ACCOUNT_SYSTEM" },
  affectedAccount: { fieldId: "affected-account", sectionId: "ACCOUNT_SYSTEM" },
  accountAccessStatus: { fieldId: "account-access", sectionId: "ACCOUNT_SYSTEM" },
  recoveryInformationChanged: { fieldId: "recovery-information", sectionId: "ACCOUNT_SYSTEM" },
  accountCompromiseBasis: { fieldId: "account-compromise-basis", sectionId: "ACCOUNT_SYSTEM" },
  affectedSystem: { fieldId: "affected-system", sectionId: "ACCOUNT_SYSTEM" },
};

const QUESTION_CONTRACT_IDS: Partial<Record<MissingQuestion["field"], string>> = {
  moneyLost: "incident.moneyLost",
  incidentDate: "incident.incidentDate",
  incidentDateYear: "incident.incidentDate",
  incidentApproximateTime: "incident.incidentTime",
  delayInReporting: "incident.delayInReporting",
  delayReason: "incident.reasonForDelay",
  occurredOn: "incident.communicationChannel",
  institution: "transactions.0.institution",
  accountOrUpiId: "transactions.0.sourceAccountOrPaymentId",
  transactionAmount: "transactions.0.amount",
  transactionIdOrUtr: "transactions.0.transactionIdOrUtr",
  transactionDate: "transactions.0.transactionDate",
  transactionApproximateTime: "transactions.0.approximateTime",
  platform: "adaptive.platform",
  affectedAccount: "adaptive.affectedAccount",
  accountAccessStatus: "adaptive.accountAccessStatus",
  recoveryInformationChanged: "adaptive.recoveryInformationChanged",
  accountCompromiseBasis: "adaptive.accountCompromiseBasis",
  affectedSystem: "adaptive.affectedSystem",
};

const CONTRACT_TARGETS: Record<string, { fieldId: ReportFieldId; sectionId: ReportGroupId }> = {
  "incident.category": { fieldId: "reporting-path-clarification", sectionId: "INCIDENT" },
  "incident.subCategory": { fieldId: "reporting-path-clarification", sectionId: "INCIDENT" },
  "incident.description": { fieldId: "incident-narrative", sectionId: "INCIDENT" },
  "evidence.citizenStatement": { fieldId: "incident-narrative", sectionId: "EVIDENCE_SUSPECT" },
  "evidence.supportingEvidence": { fieldId: "source-evidence", sectionId: "EVIDENCE_SUSPECT" },
  "complainant.name": { fieldId: "reporter-name", sectionId: "REPORTER" },
};

const CLARIFICATION_FIELDS = new Set<MissingQuestion["field"]>([
  "requestedAmountPaymentStatus",
  "moneyLost",
  "accountCompromiseBasis",
  "incidentDateYear",
]);

function questionTarget(question: MissingQuestion) {
  const base = QUESTION_TARGETS[question.field];
  if (question.transactionIndex === undefined) return base;
  return {
    ...base,
    fieldId: base.fieldId.replace(
      /^transaction-0-/,
      `transaction-${question.transactionIndex}-`,
    ),
  };
}

function contractSection(definition: NcrpFieldDefinition): ReportGroupId {
  if (definition.group === "TRANSACTIONS") return "TRANSACTIONS";
  if (definition.group === "COMPLAINANT" || definition.group === "ADDRESS" || definition.group === "IDENTITY_DOCUMENT") {
    return "REPORTER";
  }
  if (definition.group === "EVIDENCE" || definition.group === "SUSPECT") {
    return "EVIDENCE_SUSPECT";
  }
  return "INCIDENT";
}

function missingStatus(status: ReturnType<typeof complaintRequiredFieldStatus>): boolean {
  return status !== "READY" && status !== "CONFIRMED" && status !== "CITIZEN_DOES_NOT_HAVE";
}

function contractLevel(definition: NcrpFieldDefinition): MissingRequirementLevel {
  if (!definition.required && !definition.conditionalRequired) return "OPTIONAL";
  if (
    definition.group === "COMPLAINANT" ||
    definition.group === "ADDRESS" ||
    definition.group === "IDENTITY_DOCUMENT"
  ) {
    // Reporter details are collected together in the Review step. They should
    // not block incident reconstruction or hide the prepared complaint.
    return "RECOMMENDED";
  }
  return "BLOCKING";
}

function emptySectionCounts(): Record<ReportGroupId, number> {
  return {
    INCIDENT: 0,
    TRANSACTIONS: 0,
    ACCOUNT_SYSTEM: 0,
    THREAT_IMPERSONATION: 0,
    INFORMATION: 0,
    EVIDENCE_SUSPECT: 0,
    REPORTER: 0,
  };
}

export function deriveReportReadiness(input: {
  draft: IncidentDraft;
  complaint: NcrpCompatibleComplaint;
  amountResolution: ReportedAmountResolution | null;
  locale: UiLocale;
  isStale?: boolean;
  ignoredConsistencyIssueIds?: ReadonlySet<string>;
}): ReportReadiness {
  const {
    draft,
    complaint,
    amountResolution,
    locale,
    isStale = false,
    ignoredConsistencyIssueIds = new Set<string>(),
  } = input;
  const questions = deriveMissingQuestions(draft);
  const representedContractIds = new Set(
    questions
      .map((question) =>
        question.transactionIndex && question.transactionIndex > 0
          ? null
          : QUESTION_CONTRACT_IDS[question.field],
      )
      .filter(Boolean),
  );
  const items: MissingRequirement[] = questions.map((question) => {
    const target = questionTarget(question);
    return {
      id: `question.${question.field}.${question.transactionIndex ?? "case"}`,
      fieldId: target.fieldId,
      sectionId: target.sectionId,
      label: locale === "hi" ? question.questionHi : question.question,
      level: "BLOCKING",
      blocking: true,
      kind: CLARIFICATION_FIELDS.has(question.field) ? "CLARIFICATION" : "FIELD",
      questionField: question.field,
    };
  });

  if (
    draft.classification.ambiguity !== "NONE" &&
    (
      draft.classification.cyberElementPresent === true ||
      draft.classification.ambiguity === "MULTIPLE_PLAUSIBLE_PATHS"
    )
  ) {
    items.unshift({
      id: "classification.clarification",
      fieldId: "reporting-path-clarification",
      sectionId: "INCIDENT",
      label: locale === "hi" ? "रिपोर्टिंग श्रेणी की पुष्टि करें" : "Confirm the reporting category",
      level: "BLOCKING",
      blocking: true,
      kind: "CLARIFICATION",
    });
  }

  if (amountResolution?.hasConflict && !amountResolution.selectedAmount) {
    items.unshift({
      id: "financial.reportedAmountConflict",
      fieldId: "reported-amount-conflict",
      sectionId: "INCIDENT",
      label: locale === "hi" ? "रिपोर्ट की राशि चुनें" : "Choose the reported amount",
      level: "BLOCKING",
      blocking: true,
      kind: "CONFIRMATION",
    });
  }

  const knownDebitCount = draft.transactions.filter(
    (transaction) =>
      transaction.status === "KNOWN" &&
      transaction.direction !== "CREDIT" &&
      Boolean(transaction.amount),
  ).length;
  if (
    !amountResolution?.hasConflict &&
    amountResolution?.resolvedLoss &&
    knownDebitCount > 0 &&
    !draft.citizenConfirmedFields.includes("incident.citizenConfirmedLoss")
  ) {
    items.unshift({
      id: "financial.confirmedLoss",
      fieldId: "financial-loss-confirmation",
      sectionId: "INCIDENT",
      label:
        locale === "hi"
          ? "कुल नुकसान की पुष्टि करें"
          : "Confirm the total amount lost",
      level: "BLOCKING",
      blocking: true,
      kind: "CONFIRMATION",
    });
  }

  for (const issue of getCaseConsistencyIssues(draft)) {
    if (
      issue.type === "TOTAL_MISMATCH" ||
      issue.severity !== "BLOCKING" ||
      ignoredConsistencyIssueIds.has(issue.id)
    ) continue;
    items.unshift({
      id: `consistency.${issue.id}`,
      fieldId: issue.affectedFieldIds[0] ?? "report-details-heading",
      sectionId: issue.type === "POSSIBLE_DUPLICATE"
        ? "TRANSACTIONS"
        : issue.type === "ENTITY_RELATIONSHIP"
          ? "ACCOUNT_SYSTEM"
          : "INCIDENT",
      label: issue.title,
      level: "BLOCKING",
      blocking: true,
      kind: "CONFIRMATION",
    });
  }

  for (const definition of NCRP_FIELD_DEFINITIONS) {
    if (definition.id === "declaration.accepted" || representedContractIds.has(definition.id)) continue;
    if (!complaintFieldApplies(complaint, definition)) continue;
    const status = complaintRequiredFieldStatus(complaint, definition);
    if (!missingStatus(status)) continue;

    const level = complaintFieldIsRequired(complaint, definition)
      ? contractLevel(definition)
      : "OPTIONAL";
    const target = CONTRACT_TARGETS[definition.id] ?? {
      fieldId: definition.id,
      sectionId: contractSection(definition),
    };
    items.push({
      id: `contract.${definition.id}`,
      fieldId: target.fieldId,
      sectionId: target.sectionId,
      label: textForLocale(locale, definition.labelKey),
      level,
      blocking: level === "BLOCKING",
      kind: status === "NEEDS_CONFIRMATION" ? "CONFIRMATION" : "FIELD",
    });
  }

  const blockingItems = items.filter((item) => item.level === "BLOCKING");
  const recommendedItems = items.filter((item) => item.level === "RECOMMENDED");
  const optionalItems = items.filter((item) => item.level === "OPTIONAL");
  const sectionBlockingCounts = emptySectionCounts();
  for (const item of blockingItems) sectionBlockingCounts[item.sectionId] += 1;

  const nextBlockingItem = blockingItems[0] ?? null;
  const needsClarification = nextBlockingItem?.kind === "CLARIFICATION" ||
    nextBlockingItem?.kind === "CONFIRMATION";
  const state: ReportReadinessState = isStale
    ? "STALE"
    : needsClarification
      ? "NEEDS_CLARIFICATION"
      : blockingItems.length > 0
        ? "MISSING_REQUIRED"
        : "READY";
  const requiredDefinitions = NCRP_FIELD_DEFINITIONS.filter(
    (definition) =>
      definition.id !== "declaration.accepted" &&
      complaintFieldIsRequired(complaint, definition) &&
      contractLevel(definition) === "BLOCKING",
  );

  return {
    state,
    blockingItems,
    recommendedItems,
    optionalItems,
    sectionBlockingCounts,
    nextBlockingItem,
    preparedRequiredCount: Math.max(0, requiredDefinitions.length - blockingItems.length),
  };
}
