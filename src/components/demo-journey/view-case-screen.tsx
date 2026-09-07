"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "../../i18n/i18n-provider";

type ViewCaseScreenProps = {
  hasSavedCases: boolean;
  demoReference: string;
  onFindCase: (reference: string) => boolean;
  onUseDemoReference: () => void;
};

export function ViewCaseScreen({
  hasSavedCases,
  demoReference,
  onFindCase,
  onUseDemoReference,
}: ViewCaseScreenProps) {
  const { t } = useI18n();
  const [reference, setReference] = useState("");
  const [notFound, setNotFound] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reference.trim()) return;
    setNotFound(!onFindCase(reference));
  }

  return (
    <section className="view-case-page section-pad" data-journey-focus tabIndex={-1}>
      <div className="shell reading-shell view-case-shell">
        <p className="eyebrow">{t("case.savedEyebrow")}</p>
        <h1>{t("case.findHeading")}</h1>
        <p className="view-case-intro">
          {t("case.findSupport")}
        </p>

        <form className="view-case-form" onSubmit={submit}>
          <label htmlFor="sachet-case-reference">
            {t("case.reference")}
          </label>
          <input
            id="sachet-case-reference"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="SCHT-XXXX-XXXX"
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setNotFound(false);
            }}
          />
          <button className="primary-button" type="submit" disabled={!reference.trim()}>
            {t("case.view")}
          </button>
        </form>

        {notFound ? (
          <aside className="view-case-not-found" role="alert">
            <h2>{t("case.notFoundHeading")}</h2>
            <p>{t("case.notFoundSupport")}</p>
            <div className="entry-actions">
              <button className="secondary-button" type="button" onClick={() => {
                setReference("");
                setNotFound(false);
                document.querySelector<HTMLInputElement>("#sachet-case-reference")?.focus();
              }}>
                {t("case.tryAnother")}
              </button>
              <Link className="text-button" href="/">
                {t("case.startNew")}
              </Link>
            </div>
          </aside>
        ) : null}

        {!hasSavedCases ? (
          <p className="source-note">
            {t("case.noneSaved")}
          </p>
        ) : null}

        <div className="view-case-demo">
          <div>
            <strong>{t("case.demoUse")}</strong>
            <p>{t("case.demoSupport")}</p>
            <code>{demoReference}</code>
          </div>
          <button className="secondary-button" type="button" onClick={onUseDemoReference}>
            {t("case.demoView")}
          </button>
        </div>

        <p className="view-case-boundary">
          {t("case.lookupBoundary")}
        </p>
      </div>
    </section>
  );
}
