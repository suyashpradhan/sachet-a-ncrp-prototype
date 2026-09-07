"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { appName } from "../config/brand";
import { useI18n } from "../i18n/i18n-provider";
import { useJourneyNavigation } from "../navigation/journey-navigation";
import { SachetLogo } from "./sachet-logo";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();
  const { controls } = useJourneyNavigation();
  const pathname = usePathname();

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("skip.main")}
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link
            className="brand"
            href="/"
            aria-label={
              locale === "hi"
                ? `${appName(locale)} के मुख्य पेज पर जाएँ`
                : `Go to the ${appName(locale)} home page`
            }
            onClick={(event) => {
              if (!controls || pathname !== "/") return;
              controls.onHome();
              event.preventDefault();
            }}
          >
            <SachetLogo />
          </Link>
          <div className="header-actions">
            <Link className="header-view-case" href="/view-case">
              {t("case.view")}
            </Link>
            {!controls ? (
              <nav className="landing-header-nav" aria-label={locale === "hi" ? "मुख्य पेज" : "Landing page"}>
                <a href="/#how-sachet-works">{locale === "hi" ? "यह कैसे काम करता है" : "How it works"}</a>
                <a href="/#after-you-report">{locale === "hi" ? "रिपोर्ट के बाद" : "After you report"}</a>
                <Link href="/about">{locale === "hi" ? "परिचय" : "About"}</Link>
              </nav>
            ) : null}
            <div
              className="language-switch"
              role="group"
              aria-label={t("header.languageLabel")}
            >
              <button
                type="button"
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                {t("language.english")}
              </button>
              <span aria-hidden="true">|</span>
              <button
                type="button"
                aria-pressed={locale === "hi"}
                onClick={() => setLocale("hi")}
              >
                {t("language.hindi")}
              </button>
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="shell footer-inner simple-footer">
          <p className="footer-credit">
            <a
              className="footer-link"
              href="https://buildwhatmovesindia.com"
              target="_blank"
              rel="noreferrer"
            >
              {locale === "hi"
                ? "Build What Moves India हैकाथॉन"
                : "Build What Moves India hackathon"}
            </a>
            <span aria-hidden="true">·</span>
            <span>
              {locale === "hi" ? "Suyash द्वारा बनाया गया" : "Made by Suyash"}{" "}
              <span
                className="footer-heart"
                aria-label={locale === "hi" ? "प्यार से" : "with love"}
              >
                ♥
              </span>
            </span>
          </p>
          <p className="footer-disclaimer">
            {locale === "hi"
              ? "कोई वास्तविक डेटा नहीं · कोई सरकारी संबद्धता नहीं · NCRP से संबद्ध नहीं · कोई वास्तविक शिकायत जमा नहीं होती"
              : "No real data · No government affiliation · Not affiliated with NCRP · No real complaint is submitted"}
          </p>
        </div>
      </footer>
    </>
  );
}
