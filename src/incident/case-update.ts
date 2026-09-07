import { z } from "zod";
import { sanitizeDerivedText } from "../presentation/evidence-privacy";
import type { IncidentDraft } from "./schema";
import type { UiLocale } from "../i18n/i18n-provider";
import { resolveFinancialLoss } from "./financial-summary";
import { safeDerivedIdentifier } from "../presentation/evidence-privacy";

export const CaseUpdateChangeSchema = z.object({
  fieldId: z.string().nullable(),
  label: z.string(),
  previousValue: z.string().nullable(),
  newValue: z.string(),
  sourceEvidenceIds: z.array(z.string()),
}).strict();

export const CaseUpdateSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  type: z.enum(["NEW_EVIDENCE", "NEW_INFORMATION", "CORRECTION"]),
  summary: z.string(),
  changes: z.array(CaseUpdateChangeSchema),
  addedEvidenceNames: z.array(z.string()),
  citizenNote: z.string().nullable(),
}).strict();

export type CaseUpdate = z.infer<typeof CaseUpdateSchema>;
export type CaseUpdateChange = z.infer<typeof CaseUpdateChangeSchema>;

export type CaseUpdateCandidate = Omit<CaseUpdate, "id" | "createdAt">;

function sanitizeUpdateValue(
  fieldId: string | null,
  value: string,
): string {
  if (fieldId === "suspect.phone") {
    return safeDerivedIdentifier(value, "PHONE") ?? "";
  }
  if (fieldId?.toLowerCase().includes("account")) {
    return safeDerivedIdentifier(value, "ACCOUNT") ?? "";
  }
  if (fieldId?.toLowerCase().includes("card")) {
    return safeDerivedIdentifier(value, "CARD") ?? "";
  }
  return sanitizeDerivedText(value);
}

export function createCaseUpdate(candidate: CaseUpdateCandidate): CaseUpdate {
  const bytes = new Uint32Array(2);
  window.crypto.getRandomValues(bytes);
  return CaseUpdateSchema.parse({
    ...candidate,
    id: `case-update-${bytes[0].toString(36)}${bytes[1].toString(36)}`,
    createdAt: new Date().toISOString(),
    summary: sanitizeDerivedText(candidate.summary),
    changes: candidate.changes.map((change) => ({
      ...change,
      previousValue: change.previousValue
        ? sanitizeUpdateValue(change.fieldId, change.previousValue)
        : null,
      newValue: sanitizeUpdateValue(change.fieldId, change.newValue),
      sourceEvidenceIds: change.sourceEvidenceIds.map(sanitizeDerivedText),
    })),
    addedEvidenceNames: candidate.addedEvidenceNames.map(sanitizeDerivedText),
    citizenNote: candidate.citizenNote
      ? sanitizeDerivedText(candidate.citizenNote)
      : null,
  });
}

export function deriveEvidenceUpdateCandidate(
  original: IncidentDraft,
  extracted: IncidentDraft,
  evidenceName: string,
  locale: UiLocale,
  priorUpdates: readonly CaseUpdate[] = [],
): CaseUpdateCandidate {
  const hi = locale === "hi";
  const changes: CaseUpdateChange[] = [];
  const add = (
    fieldId: string,
    label: string,
    previousValue: string | null | undefined,
    newValue: string | null | undefined,
  ) => {
    const safeNewValue = sanitizeDerivedText(newValue ?? "").trim();
    const latestUpdateValue = [...priorUpdates]
      .reverse()
      .flatMap((update) => update.changes)
      .find((change) => change.fieldId === fieldId)?.newValue;
    const safePrevious = latestUpdateValue
      ? sanitizeDerivedText(latestUpdateValue).trim()
      : previousValue
      ? sanitizeDerivedText(previousValue).trim()
      : null;
    if (!safeNewValue || safeNewValue === safePrevious) return;
    changes.push({
      fieldId,
      label,
      previousValue: safePrevious,
      newValue: safeNewValue,
      sourceEvidenceIds: [evidenceName],
    });
  };

  add(
    "incident.incidentDate",
    hi ? "घटना की तारीख" : "Incident date",
    original.incident.incidentDate,
    extracted.incident.incidentDate,
  );
  add(
    "incident.approximateTime",
    hi ? "घटना का समय" : "Incident time",
    original.incident.approximateTime,
    extracted.incident.approximateTime,
  );
  const originalPhone = original.suspectIdentifiers.find(
    (item) => item.type === "PHONE",
  )?.value;
  const extractedPhone = extracted.suspectIdentifiers.find(
    (item) => item.type === "PHONE",
  )?.value;
  add(
    "suspect.phone",
    hi ? "कॉलर का नंबर" : "Caller phone number",
    safeDerivedIdentifier(originalPhone, "PHONE"),
    safeDerivedIdentifier(extractedPhone, "PHONE"),
  );
  add(
    "adaptive.impersonatedEntity",
    hi ? "दावा की गई पहचान" : "Claimed identity",
    original.adaptiveFacts.impersonatedEntity,
    extracted.adaptiveFacts.impersonatedEntity,
  );
  extracted.transactions.forEach((transaction, index) => {
    const previous = original.transactions[index];
    add(
      `transactions.${index}.transactionIdOrUtr`,
      hi ? `लेन-देन ${index + 1} संदर्भ` : `Transaction ${index + 1} reference`,
      previous?.transactionIdOrUtr ?? previous?.referenceNumber,
      transaction.transactionIdOrUtr ?? transaction.referenceNumber,
    );
    add(
      `transactions.${index}.institution`,
      hi ? `लेन-देन ${index + 1} बैंक` : `Transaction ${index + 1} bank`,
      previous?.institution,
      transaction.institution,
    );
  });
  const originalLoss = resolveFinancialLoss(original).resolvedLoss;
  const extractedLoss = resolveFinancialLoss(extracted).resolvedLoss;
  if (extractedLoss && extractedLoss !== originalLoss) {
    add(
      "incident.totalLoss",
      hi ? "कुल रिपोर्ट की गई हानि" : "Total reported loss",
      originalLoss ? `₹${originalLoss.toLocaleString("en-IN")}` : null,
      `₹${extractedLoss.toLocaleString("en-IN")}`,
    );
  }

  if (changes.length === 0) {
    changes.push({
      fieldId: null,
      label: hi ? "सहायक सबूत" : "Supporting evidence",
      previousValue: null,
      newValue: evidenceName,
      sourceEvidenceIds: [evidenceName],
    });
  }
  const correction = changes.some((change) => Boolean(change.previousValue));
  return {
    type: correction ? "CORRECTION" : "NEW_EVIDENCE",
    summary:
      changes.length === 1 && changes[0].fieldId === null
        ? hi
          ? "नया सहायक सबूत जोड़ा गया"
          : "New supporting evidence added"
        : hi
          ? "नए सबूत से जानकारी मिली"
          : "New information found in evidence",
    changes,
    addedEvidenceNames: [evidenceName],
    citizenNote: null,
  };
}
