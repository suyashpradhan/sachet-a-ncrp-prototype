"use client";

import { useEffect, useState } from "react";
import type { ReportedAmountResolution } from "../../incident/complaint-case";
import type { NcrpCompatibleComplaint } from "../../incident/ncrp-compatible-complaint";
import type { IncidentDraft } from "../../incident/schema";
import { useI18n } from "../../i18n/i18n-provider";
import {
  buildBankNotification,
  buildCallBrief,
  buildCallBriefItems,
  getNextActions,
} from "../../presentation/report-handoff";
import { ComplaintPacket } from "./complaint-packet";

type HandoffView = "CALL" | "BANK" | "SUMMARY" | null;
type CopyTarget = "CALL" | "BANK" | null;

async function copyToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy is unavailable.");
}

export function ImmediateHandoff({
  draft,
  complaint,
  amountResolution,
  reference,
  isDemoIncident,
}: {
  draft: IncidentDraft;
  complaint: NcrpCompatibleComplaint;
  amountResolution: ReportedAmountResolution | null;
  reference: string;
  isDemoIncident: boolean;
}) {
  const { locale, t } = useI18n();
  const [activeView, setActiveView] = useState<HandoffView>(null);
  const [copyTarget, setCopyTarget] = useState<CopyTarget>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const options = { locale, amountResolution };
  const callBrief = buildCallBrief(draft, options);
  const callItems = buildCallBriefItems(draft, options);
  const bankNotification = buildBankNotification(draft, complaint, options);
  const actions = getNextActions(draft, locale);
  const showPreparedFinancialHandoff = Boolean(
    callItems &&
      bankNotification &&
      draft.incident.delayInReporting !== true,
  );

  useEffect(() => {
    setActiveView(null);
    setCopyTarget(null);
    setCopyFailed(false);
  }, [draft, locale]);

  async function copy(value: string, target: Exclude<CopyTarget, null>) {
    try {
      await copyToClipboard(value);
      setCopyTarget(target);
      setCopyFailed(false);
    } catch {
      setCopyTarget(target);
      setCopyFailed(true);
    }
  }

  function printBankNotification() {
    document.body.dataset.printTarget = "bank-notification";
    window.print();
    delete document.body.dataset.printTarget;
  }

  if (!showPreparedFinancialHandoff) {
    if (actions.length === 0 && !callBrief) return null;
    return (
      <div className="immediate-handoff">
        {actions.length > 0 ? (
          <section className="next-actions" aria-labelledby="next-actions-heading">
            <h2 id="next-actions-heading">
              {locale === "hi" ? "अब क्या करें" : "What to do next"}
            </h2>
            <ol>
              {actions.slice(0, 3).map((action, index) => (
                <li key={action.id}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    );
  }

  const callCopy = callItems!
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");

  return (
    <section className="immediate-handoff prepared-handoff" aria-labelledby="prepared-handoff-heading">
      <header className="prepared-handoff-header">
        <h2 id="prepared-handoff-heading">{t("handoff.heading")}</h2>
        <p>{t("handoff.intro")}</p>
      </header>

      <div className="handoff-action-list">
        <article className="handoff-action-card">
          <span className="handoff-action-number" aria-hidden="true">1</span>
          <div>
            <h3>{t("handoff.call.title")}</h3>
            <p>{t("handoff.call.description")}</p>
            <div className="handoff-action-buttons">
              <a className="primary-button call-1930-button" href="tel:1930">
                {t("handoff.call.title")}
              </a>
              <button
                className="secondary-button"
                type="button"
                aria-expanded={activeView === "CALL"}
                aria-controls="prepared-call-brief"
                onClick={() => setActiveView(activeView === "CALL" ? null : "CALL")}
              >
                {t("handoff.call.view")}
              </button>
            </div>
          </div>
        </article>

        <article className="handoff-action-card">
          <span className="handoff-action-number" aria-hidden="true">2</span>
          <div>
            <h3>{t("handoff.bank.title")}</h3>
            <p>{t("handoff.bank.description")}</p>
            <button
              className="secondary-button"
              type="button"
              aria-expanded={activeView === "BANK"}
              aria-controls="prepared-bank-notification"
              onClick={() => setActiveView(activeView === "BANK" ? null : "BANK")}
            >
              {t("handoff.bank.view")}
            </button>
          </div>
        </article>

        <article className="handoff-action-card">
          <span className="handoff-action-number" aria-hidden="true">3</span>
          <div>
            <h3>{t("handoff.summary.title")}</h3>
            <p>{t("handoff.summary.description")}</p>
            <button
              className="secondary-button"
              type="button"
              aria-expanded={activeView === "SUMMARY"}
              aria-controls="prepared-case-summary"
              onClick={() => setActiveView(activeView === "SUMMARY" ? null : "SUMMARY")}
            >
              {t("handoff.summary.view")}
            </button>
          </div>
        </article>
      </div>

      {activeView === "CALL" ? (
        <section id="prepared-call-brief" className="handoff-expanded-view call-read-aloud" aria-labelledby="prepared-call-heading">
          <div className="handoff-expanded-heading">
            <div>
              <h3 id="prepared-call-heading">{t("handoff.call.heading")}</h3>
              <p>{t("handoff.call.support")}</p>
            </div>
            <button className="text-button" type="button" onClick={() => setActiveView(null)}>
              {t("handoff.close")}
            </button>
          </div>
          <ol className="call-brief-items">
            {callItems!.map((item) => (
              <li className={item.isKnown ? undefined : "call-brief-item-unknown"} key={item.label}>
                <span aria-hidden="true">{callItems!.indexOf(item) + 1}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="call-brief-actions">
            <a className="primary-button call-1930-button" href="tel:1930">
              {t("handoff.call.title")}
            </a>
            <button className="secondary-button" type="button" onClick={() => copy(callCopy, "CALL")}>
              {t("handoff.call.copy")}
            </button>
          </div>
          <p className="copy-feedback" role="status" aria-live="polite">
            {copyTarget === "CALL" ? (copyFailed ? t("handoff.copyError") : t("handoff.copied")) : ""}
          </p>
        </section>
      ) : null}

      {activeView === "BANK" ? (
        <section id="prepared-bank-notification" className="handoff-expanded-view bank-notification-print" aria-labelledby="prepared-bank-heading">
          <div className="handoff-expanded-heading no-print">
            <div>
              <h3 id="prepared-bank-heading">{t("handoff.bank.heading")}</h3>
              <p>{t("handoff.bank.support")}</p>
              <small>{bankNotification!.providerLabel}</small>
            </div>
            <button className="text-button" type="button" onClick={() => setActiveView(null)}>
              {t("handoff.close")}
            </button>
          </div>
          <pre className="bank-notification-body">{bankNotification!.body}</pre>
          <div className="handoff-document-actions no-print">
            <button className="secondary-button" type="button" onClick={() => copy(bankNotification!.body, "BANK")}>
              {t("handoff.copy")}
            </button>
            <button className="secondary-button" type="button" onClick={printBankNotification}>
              {t("handoff.print")}
            </button>
          </div>
          <p className="copy-feedback no-print" role="status" aria-live="polite">
            {copyTarget === "BANK" ? (copyFailed ? t("handoff.copyError") : t("handoff.copied")) : ""}
          </p>
        </section>
      ) : null}

      {activeView === "SUMMARY" ? (
        <section id="prepared-case-summary" className="handoff-expanded-view" aria-labelledby="prepared-summary-heading">
          <div className="handoff-expanded-heading no-print">
            <h3 id="prepared-summary-heading">{t("handoff.summary.heading")}</h3>
            <button className="text-button" type="button" onClick={() => setActiveView(null)}>
              {t("handoff.close")}
            </button>
          </div>
          <ComplaintPacket
            complaint={complaint}
            draft={draft}
            reference={reference}
            locale={locale}
            isDemoIncident={isDemoIncident}
          />
        </section>
      ) : null}

      {isDemoIncident ? <p className="handoff-demo-boundary">{t("handoff.demoBoundary")}</p> : null}
    </section>
  );
}
