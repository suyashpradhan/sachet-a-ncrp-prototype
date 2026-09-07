"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { DemoCaseDefinition } from "../../incident/demo-incident";
import {
  createCaseUpdate,
  type CaseUpdate,
  type CaseUpdateCandidate,
} from "../../incident/case-update";
import type { IncidentDraft } from "../../incident/schema";
import { resolveFinancialLoss } from "../../incident/financial-summary";
import { useI18n } from "../../i18n/i18n-provider";
import { safeDerivedIdentifier, sanitizeDerivedText } from "../../presentation/evidence-privacy";

type UpdateFieldOption = {
  id: string;
  label: string;
  previousValue: string | null;
};

type CaseUpdatesProps = {
  originalDraft: IncidentDraft;
  updates: CaseUpdate[];
  isDemoIncident: boolean;
  demoCase: DemoCaseDefinition | null;
  onAddUpdate: (update: CaseUpdate) => void;
  onProcessEvidence: (file: File) => Promise<CaseUpdateCandidate>;
};

function updateFields(
  draft: IncidentDraft,
  updates: readonly CaseUpdate[],
  hi: boolean,
): UpdateFieldOption[] {
  const loss = resolveFinancialLoss(draft).resolvedLoss;
  const phone = draft.suspectIdentifiers.find((item) => item.type === "PHONE")?.value;
  const fields: UpdateFieldOption[] = [
    {
      id: "incident.incidentDate",
      label: hi ? "घटना की तारीख" : "Incident date",
      previousValue: draft.incident.incidentDate,
    },
    {
      id: "incident.approximateTime",
      label: hi ? "घटना का समय" : "Incident time",
      previousValue: draft.incident.approximateTime,
    },
    ...(loss
      ? [{
          id: "incident.totalLoss",
          label: hi ? "कुल राशि" : "Total amount",
          previousValue: `₹${loss.toLocaleString("en-IN")}`,
        }]
      : []),
    ...draft.transactions.flatMap((transaction, index) => [
      {
        id: `transactions.${index}.transactionIdOrUtr`,
        label: hi ? `लेन-देन ${index + 1} संदर्भ` : `Transaction ${index + 1} reference`,
        previousValue: transaction.transactionIdOrUtr ?? transaction.referenceNumber,
      },
      {
        id: `transactions.${index}.institution`,
        label: hi ? `लेन-देन ${index + 1} बैंक` : `Transaction ${index + 1} bank / payment provider`,
        previousValue: transaction.institution,
      },
    ]),
    {
      id: "suspect.phone",
      label: hi ? "कॉलर का फ़ोन नंबर" : "Caller phone number",
      previousValue: safeDerivedIdentifier(phone, "PHONE"),
    },
    ...(draft.adaptiveFacts.impersonation
      ? [{
          id: "adaptive.impersonatedEntity",
          label: hi ? "दावा की गई पहचान" : "Claimed identity",
          previousValue: draft.adaptiveFacts.impersonatedEntity,
        }]
      : []),
    {
      id: "other",
      label: hi ? "अन्य जरूरी जानकारी" : "Other important detail",
      previousValue: null,
    },
  ];
  const latestValues = new Map<string, string>();
  updates.forEach((update) =>
    update.changes.forEach((change) => {
      if (change.fieldId) latestValues.set(change.fieldId, change.newValue);
    }),
  );
  return fields.map((field) => ({
    ...field,
    previousValue: latestValues.get(field.id) ?? field.previousValue,
  }));
}

export function CaseUpdates({
  originalDraft,
  updates,
  isDemoIncident,
  demoCase,
  onAddUpdate,
  onProcessEvidence,
}: CaseUpdatesProps) {
  const { locale, t } = useI18n();
  const hi = locale === "hi";
  const [mode, setMode] = useState<"EVIDENCE" | "DETAIL" | null>(null);
  const [candidate, setCandidate] = useState<CaseUpdateCandidate | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [evidencePreviews, setEvidencePreviews] = useState<Record<string, string>>({});
  const evidencePreviewUrls = useRef<string[]>([]);
  const fields = useMemo(
    () => updateFields(originalDraft, updates, hi),
    [hi, originalDraft, updates],
  );
  const demoFixtureAlreadyAdded = Boolean(
    demoCase?.caseUpdateFixture &&
      updates.some((update) =>
        update.changes.some(
          (change) =>
            change.fieldId ===
            demoCase.caseUpdateFixture?.changes[0]?.fieldId,
        ),
      ),
  );

  useEffect(
    () => () => {
      evidencePreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function resetEditor() {
    setMode(null);
    setCandidate(null);
    setSelectedFieldId("");
    setNewValue("");
    setNote("");
    setError(null);
  }

  function previewDetail() {
    const selected = fields.find((field) => field.id === selectedFieldId);
    const safeValue = sanitizeDerivedText(newValue).trim();
    if (!selected || !safeValue) return;
    setCandidate({
      type: selected.previousValue ? "CORRECTION" : "NEW_INFORMATION",
      summary: selected.previousValue
        ? hi
          ? `${selected.label} सही किया गया`
          : `${selected.label} corrected`
        : hi
          ? `${selected.label} जोड़ा गया`
          : `${selected.label} added`,
      changes: [{
        fieldId: selected.id === "other" ? null : selected.id,
        label: selected.label,
        previousValue: selected.previousValue,
        newValue: safeValue,
        sourceEvidenceIds: [],
      }],
      addedEvidenceNames: [],
      citizenNote: note.trim() || null,
    });
  }

  function useDemoFixture() {
    const fixture = demoCase?.caseUpdateFixture;
    if (!fixture) return;
    setCandidate({
      type: "NEW_EVIDENCE",
      summary: hi ? fixture.summaryHi : fixture.summary,
      changes: fixture.changes.map((change) => ({
        fieldId: change.fieldId,
        label: hi ? change.labelHi : change.label,
        previousValue: hi ? change.previousValueHi : change.previousValue,
        newValue: change.newValue,
        sourceEvidenceIds: [hi ? fixture.evidenceNameHi : fixture.evidenceName],
      })),
      addedEvidenceNames: [hi ? fixture.evidenceNameHi : fixture.evidenceName],
      citizenNote: null,
    });
  }

  async function processEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const nextCandidate = await onProcessEvidence(file);
      const previewUrl = URL.createObjectURL(file);
      evidencePreviewUrls.current.push(previewUrl);
      setEvidencePreviews((current) => ({
        ...current,
        [file.name]: previewUrl,
      }));
      setCandidate(nextCandidate);
    } catch {
      setError(t("updates.evidenceError"));
    } finally {
      setProcessing(false);
    }
  }

  function addUpdate() {
    if (!candidate) return;
    onAddUpdate(createCaseUpdate({ ...candidate, citizenNote: note.trim() || candidate.citizenNote }));
    setSavedMessage(
      isDemoIncident ? t("updates.savedDemo") : t("updates.savedLive"),
    );
    resetEditor();
  }

  return (
    <section className="companion-section case-updates-section" aria-labelledby="case-updates-heading">
      <div className="case-updates-intro">
        <div>
          <h2 id="case-updates-heading">{t("updates.foundSomething")}</h2>
          <p>{t("updates.support")}</p>
        </div>
        {!mode && !candidate ? (
          <div className="entry-actions">
            <button className="secondary-button" type="button" onClick={() => setMode("EVIDENCE")}>
              {t("updates.addEvidence")}
            </button>
            <button className="secondary-button" type="button" onClick={() => setMode("DETAIL")}>
              {t("updates.correctDetail")}
            </button>
          </div>
        ) : null}
      </div>

      {mode === "EVIDENCE" && !candidate ? (
        <div className="case-update-editor">
          {isDemoIncident && demoCase?.caseUpdateFixture && !demoFixtureAlreadyAdded ? (
            <div className="demo-update-fixture">
              <Image
                src={demoCase.caseUpdateFixture.evidenceSrc}
                alt={hi ? demoCase.caseUpdateFixture.evidenceNameHi : demoCase.caseUpdateFixture.evidenceName}
                width={720}
                height={460}
              />
              <button className="primary-button" type="button" onClick={useDemoFixture}>
                {t("updates.useDemoEvidence")}
              </button>
            </div>
          ) : (
            <label className="case-update-file-button">
              <span>{processing ? t("updates.processingEvidence") : t("updates.chooseEvidence")}</span>
              <input type="file" accept="image/*" disabled={processing} onChange={(event) => void processEvidence(event)} />
            </label>
          )}
          <button className="text-button" type="button" onClick={resetEditor}>{t("updates.goBack")}</button>
        </div>
      ) : null}

      {mode === "DETAIL" && !candidate ? (
        <div className="case-update-editor">
          <label>
            <span>{t("updates.detailLabel")}</span>
            <select value={selectedFieldId} onChange={(event) => setSelectedFieldId(event.target.value)}>
              <option value="">{t("updates.chooseDetail")}</option>
              {fields.map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
            </select>
          </label>
          <label>
            <span>{t("updates.updatedInformation")}</span>
            <input value={newValue} onChange={(event) => setNewValue(event.target.value)} />
          </label>
          <label>
            <span>{t("updates.addNote")}</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="entry-actions">
            <button className="primary-button" type="button" disabled={!selectedFieldId || !newValue.trim()} onClick={previewDetail}>
              {t("updates.preview")}
            </button>
            <button className="text-button" type="button" onClick={resetEditor}>{t("updates.goBack")}</button>
          </div>
        </div>
      ) : null}

      {candidate ? (
        <div className="case-update-preview">
          <p className="eyebrow">{t("updates.previewHeading")}</p>
          <h3>{candidate.summary}</h3>
          {isDemoIncident && demoCase?.caseUpdateFixture && candidate.addedEvidenceNames.length > 0 ? (
            <Image
              src={demoCase.caseUpdateFixture.evidenceSrc}
              alt={candidate.addedEvidenceNames[0]}
              width={720}
              height={460}
            />
          ) : candidate.addedEvidenceNames[0] && evidencePreviews[candidate.addedEvidenceNames[0]] ? (
            <Image
              src={evidencePreviews[candidate.addedEvidenceNames[0]]}
              alt={candidate.addedEvidenceNames[0]}
              width={720}
              height={460}
              unoptimized
            />
          ) : null}
          {candidate.changes.map((change, index) => (
            <dl key={`${change.label}-${index}`}>
              <div>
                <dt>{change.previousValue ? t("updates.originallyReported") : t("updates.previously")}</dt>
                <dd>{change.previousValue ?? t("updates.notKnown")}</dd>
              </div>
              <div>
                <dt>{t("updates.updatedInformation")}</dt>
                <dd>{change.newValue}</dd>
              </div>
              {change.sourceEvidenceIds.length > 0 ? (
                <div>
                  <dt>{t("updates.supportedBy")}</dt>
                  <dd>{change.sourceEvidenceIds.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          ))}
          <p className="original-case-preserved">✓ {t("updates.originalPreserved")}</p>
          <div className="entry-actions">
            <button className="primary-button" type="button" onClick={addUpdate}>{t("updates.addUpdate")}</button>
            <button className="secondary-button" type="button" onClick={() => setCandidate(null)}>{t("updates.goBack")}</button>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {savedMessage ? <p className="update-saved-message" role="status">{savedMessage}</p> : null}

      {updates.length > 0 ? (
        <div className="case-update-history">
          <h3>{t("updates.history")}</h3>
          {updates.map((update, index) => (
            <article key={update.id}>
              <div className="case-update-history-heading">
                <strong>{t("updates.number", { number: index + 1 })}</strong>
                <time dateTime={update.createdAt}>
                  {new Intl.DateTimeFormat(hi ? "hi-IN" : "en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(update.createdAt))}
                </time>
              </div>
              <p className="eyebrow">{t(`updates.type.${update.type}`)}</p>
              <h4>{update.summary}</h4>
              {update.addedEvidenceNames[0] ? (
                isDemoIncident && demoCase?.caseUpdateFixture ? (
                  <Image
                    src={demoCase.caseUpdateFixture.evidenceSrc}
                    alt={update.addedEvidenceNames[0]}
                    width={720}
                    height={460}
                  />
                ) : evidencePreviews[update.addedEvidenceNames[0]] ? (
                  <Image
                    src={evidencePreviews[update.addedEvidenceNames[0]]}
                    alt={update.addedEvidenceNames[0]}
                    width={720}
                    height={460}
                    unoptimized
                  />
                ) : (
                  <p className="source-note">{t("updates.fileUnavailable")}</p>
                )
              ) : null}
              {update.changes.map((change, changeIndex) => (
                <dl key={`${change.label}-${changeIndex}`}>
                  {change.previousValue ? <div><dt>{t("updates.originallyReported")}</dt><dd>{change.previousValue}</dd></div> : null}
                  <div><dt>{t("updates.updatedInformation")}</dt><dd>{change.newValue}</dd></div>
                  {change.sourceEvidenceIds.length > 0 ? <div><dt>{t("updates.supportedBy")}</dt><dd>{change.sourceEvidenceIds.join(", ")}</dd></div> : null}
                </dl>
              ))}
              {update.citizenNote ? <p><strong>{t("updates.note")}:</strong> {update.citizenNote}</p> : null}
              <p className="original-case-preserved">✓ {t("updates.originalPreserved")}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
