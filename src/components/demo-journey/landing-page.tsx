"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n-provider";

type LandingPageProps = {
  hasSubmittedCase: boolean;
  hasRecoverableComplaint: boolean;
  onStartComplaint: () => void;
  onContinueComplaint: () => void;
  onViewDemo: () => void;
  onViewSubmittedCase: () => void;
};

export function LandingPage({
  hasSubmittedCase,
  hasRecoverableComplaint,
  onStartComplaint,
  onContinueComplaint,
  onViewDemo,
  onViewSubmittedCase,
}: LandingPageProps) {
  const { locale } = useI18n();
  const hi = locale === "hi";
  const rotatingWords = hi
    ? ["रिपोर्ट करने", "समझने", "रोकने"]
    : ["report", "understand", "prevent"];
  const [rotatingWordIndex, setRotatingWordIndex] = useState(0);
  const [confirmNewComplaint, setConfirmNewComplaint] = useState(false);

  function requestStartComplaint() {
    if (hasRecoverableComplaint) {
      setConfirmNewComplaint(true);
      return;
    }
    onStartComplaint();
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      setRotatingWordIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setRotatingWordIndex((current) => (current + 1) % rotatingWords.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [rotatingWords.length]);

  return (
    <div className="landing-page">
      <section
        className="landing-public-hero"
        aria-labelledby="landing-heading"
      >
        <div className="shell landing-public-hero-grid">
          <div className="landing-public-hero-copy">
            <p className="eyebrow landing-welcome">
              {hi ? "सचेत में आपका स्वागत है" : "Welcome to सचेत"}
            </p>
            <h1 id="landing-heading">
              <span className="sr-only">
                {hi
                  ? "साइबर अपराध को रिपोर्ट करने और आगे क्या करना है, यह जानने की जगह।"
                  : "The place to report cybercrime and know what to do next."}
              </span>
              <span className="landing-headline-visual" aria-hidden="true">
                <span className="landing-headline-line">
                  {hi ? "साइबर अपराध को " : "The place to "}
                  <span
                    className="landing-rotating-word"
                    key={`${locale}-${rotatingWordIndex}`}
                  >
                    {rotatingWords[rotatingWordIndex]}
                  </span>{" "}
                  {hi ? "की जगह" : "cybercrime"}
                </span>
                <span className="landing-headline-line landing-headline-next-line">
                  {hi
                    ? "और जानें कि आगे क्या करना है —"
                    : "and know what to do next"}
                </span>
              </span>
            </h1>
            <p className="landing-public-lede">
              {hi
                ? "बताएं कि क्या हुआ। सचेत शिकायत तैयार करने, सही जानकारी सुरक्षित रखने और अगले कदम समझने में मदद करता है।"
                : "Tell us what happened. Sachet helps you prepare the complaint, keep the right information safe, and understand the next steps."}
            </p>

            <div className="landing-primary-actions">
              <button
                className="primary-button"
                type="button"
                onClick={
                  hasSubmittedCase ? onViewSubmittedCase : requestStartComplaint
                }
              >
                {hasSubmittedCase
                  ? hi
                    ? "जमा किया गया मामला देखें"
                    : "View submitted case"
                  : hi
                    ? "शिकायत शुरू करें"
                    : "Start complaint"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={onViewDemo}
              >
                {hi ? "डेमो मामला इस्तेमाल करें" : "Use demo case"}
              </button>
            </div>
            {hasRecoverableComplaint ? (
              <aside className="landing-resume-complaint">
                <div>
                  <strong>{hi ? "अपनी शिकायत जारी रखें" : "Continue your complaint"}</strong>
                  <p>{hi ? "जहाँ छोड़ा था, वहीं से शुरू करें।" : "Pick up where you left off."}</p>
                </div>
                <button className="secondary-button" type="button" onClick={onContinueComplaint}>
                  {hi ? "शिकायत जारी रखें" : "Continue complaint"}
                </button>
              </aside>
            ) : null}
            {confirmNewComplaint ? (
              <div className="landing-new-complaint-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="new-complaint-heading">
                <h2 id="new-complaint-heading">{hi ? "नई शिकायत शुरू करें?" : "Start a new complaint?"}</h2>
                <p>{hi ? "आपकी अभी सुरक्षित शिकायत बदल दी जाएगी।" : "Your current saved complaint will be replaced."}</p>
                <div className="landing-primary-actions">
                  <button className="secondary-button" type="button" onClick={() => setConfirmNewComplaint(false)}>
                    {hi ? "मौजूदा शिकायत रखें" : "Keep current complaint"}
                  </button>
                  <button className="primary-button" type="button" onClick={onStartComplaint}>
                    {hi ? "नई शिकायत शुरू करें" : "Start new complaint"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <SachetHeroIllustration />
        </div>
      </section>

      <CitizenPaths hi={hi} onStartComplaint={requestStartComplaint} />
      <HowSachetWorks hi={hi} />
      <FraudGuidance hi={hi} />
      <AfterReporting hi={hi} />
      <WhySachetExists hi={hi} />
    </div>
  );
}

function SachetHeroIllustration() {
  return (
    <div className="landing-hero-illustration" aria-hidden="true">
      <svg viewBox="0 0 520 400" role="presentation">
        <defs>
          <marker
            id="hero-flow-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path
              d="M1 1L7 4L1 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </marker>
        </defs>

        <rect
          x="12"
          y="18"
          width="496"
          height="364"
          rx="24"
          className="hero-svg-backdrop"
        />

        <path
          d="M122 112C160 112 164 92 202 92"
          className="hero-svg-flow"
          markerEnd="url(#hero-flow-arrow)"
        />
        <path
          d="M150 274C176 274 177 286 204 286"
          className="hero-svg-flow"
          markerEnd="url(#hero-flow-arrow)"
        />
        <path
          d="M390 196C420 196 421 174 446 174"
          className="hero-svg-flow"
          markerEnd="url(#hero-flow-arrow)"
        />

        <g className="hero-svg-incident">
          <rect
            x="42"
            y="61"
            width="80"
            height="112"
            rx="15"
            className="hero-svg-surface"
          />
          <rect
            x="53"
            y="75"
            width="58"
            height="74"
            rx="8"
            className="hero-svg-soft"
          />
          <path d="M71 98C75 112 84 121 98 125" className="hero-svg-stroke" />
          <path
            d="M69 92L78 89L83 102L76 106M94 119L98 111L111 117L107 127"
            className="hero-svg-accent"
          />
          <circle cx="82" cy="160" r="3" className="hero-svg-muted-fill" />
          <path
            d="M55 50H102C111 50 116 44 116 36V31L106 39H55C47 39 42 43 42 50Z"
            className="hero-svg-message"
          />
          <circle cx="60" cy="48" r="2" className="hero-svg-muted-fill" />
          <circle cx="70" cy="48" r="2" className="hero-svg-muted-fill" />
          <circle cx="80" cy="48" r="2" className="hero-svg-muted-fill" />
        </g>

        <g className="hero-svg-evidence">
          <rect
            x="34"
            y="220"
            width="116"
            height="54"
            rx="9"
            className="hero-svg-surface"
          />
          <circle cx="52" cy="238" r="7" className="hero-svg-accent-fill" />
          <path d="M68 235H132M68 247H112" className="hero-svg-muted-line" />
          <rect
            x="45"
            y="270"
            width="116"
            height="54"
            rx="9"
            className="hero-svg-surface hero-svg-layered-card"
          />
          <circle cx="63" cy="288" r="7" className="hero-svg-accent-fill" />
          <path d="M79 285H143M79 297H123" className="hero-svg-muted-line" />
        </g>

        <g className="hero-svg-document">
          <rect
            x="202"
            y="52"
            width="190"
            height="282"
            rx="16"
            className="hero-svg-document-shadow"
          />
          <rect
            x="194"
            y="44"
            width="190"
            height="282"
            rx="16"
            className="hero-svg-document-page"
          />
          <path d="M222 81H306M222 96H352" className="hero-svg-title-line" />
          <rect
            x="216"
            y="122"
            width="146"
            height="38"
            rx="8"
            className="hero-svg-row"
          />
          <path
            d="M232 138C235 145 240 149 247 151M231 134L237 132L240 140M245 149L249 143L256 147"
            className="hero-svg-stroke"
          />
          <path d="M269 137H335M269 147H318" className="hero-svg-muted-line" />
          <rect
            x="216"
            y="171"
            width="146"
            height="38"
            rx="8"
            className="hero-svg-row"
          />
          <circle cx="241" cy="190" r="10" className="hero-svg-money" />
          <path
            d="M237 185H245M237 190H244M241 185V197"
            className="hero-svg-money-mark"
          />
          <path d="M269 186H339M269 196H322" className="hero-svg-muted-line" />
          <rect
            x="216"
            y="220"
            width="146"
            height="38"
            rx="8"
            className="hero-svg-row"
          />
          <path
            d="M233 234H250V247H233ZM237 230H254V243"
            className="hero-svg-stroke"
          />
          <path d="M269 235H342M269 245H326" className="hero-svg-muted-line" />
          <path d="M228 286L239 297L260 274" className="hero-svg-confirm" />
          <path d="M278 283H347M278 296H329" className="hero-svg-muted-line" />
        </g>

        <g className="hero-svg-next">
          <circle cx="458" cy="142" r="42" className="hero-svg-action-circle" />
          <path
            d="M444 128C448 142 455 150 468 155M443 123L451 121L455 133L449 137M464 151L468 144L479 150L475 160"
            className="hero-svg-accent"
          />
          <path d="M430 247H487" className="hero-svg-muted-line" />
          <path d="M430 265H474" className="hero-svg-muted-line" />
          <path d="M430 283H481" className="hero-svg-muted-line" />
          <path
            d="M417 245L422 250L430 240M417 263L422 268L430 258M417 281L422 286L430 276"
            className="hero-svg-confirm-small"
          />
          <path
            d="M448 320C448 308 454 300 464 300C474 300 480 308 480 320L486 329H442L448 320ZM458 335H470"
            className="hero-svg-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

function CitizenPaths({
  hi,
  onStartComplaint,
}: {
  hi: boolean;
  onStartComplaint: () => void;
}) {
  return (
    <section
      className="landing-section landing-citizen-paths"
      aria-labelledby="citizen-paths-heading"
    >
      <div className="shell">
        <h2 id="citizen-paths-heading" className="sr-only">
          {hi ? "आप यहाँ क्या कर सकते हैं" : "What you can do here"}
        </h2>
        <div className="landing-path-grid">
          <article className="landing-path landing-path-primary">
            <p className="landing-path-number" aria-hidden="true">
              01
            </p>
            <h3>{hi ? "शिकायत तैयार करें" : "Prepare a complaint"}</h3>
            <p>
              {hi
                ? "सचेत को बताएं कि क्या हुआ और शिकायत की जानकारी तैयार करें।"
                : "Tell Sachet what happened and prepare the complaint details."}
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={onStartComplaint}
            >
              {hi ? "शिकायत शुरू करें" : "Start complaint"}
            </button>
          </article>

          <article className="landing-path landing-path-urgent">
            <p className="landing-path-number" aria-hidden="true">
              02
            </p>
            <h3>
              {hi ? "क्या हाल ही में पैसे गए हैं?" : "Lost money recently?"}
            </h3>
            <p>
              {hi
                ? "हाल की वित्तीय साइबर धोखाधड़ी के लिए तुरंत 1930 पर कॉल करें।"
                : "For recent financial cyber fraud, call 1930 immediately."}
            </p>
            <p className="landing-path-support">
              {hi
                ? "इसके बाद शिकायत तैयार करना जारी रख सकते हैं।"
                : "You can continue preparing the complaint afterward."}
            </p>
            <a className="secondary-button" href="tel:1930">
              {hi ? "1930 पर कॉल करें" : "Call 1930"}
            </a>
          </article>

          <article className="landing-path">
            <p className="landing-path-number" aria-hidden="true">
              03
            </p>
            <h3>{hi ? "पहले ही रिपोर्ट कर चुके हैं?" : "Already reported?"}</h3>
            <p>
              {hi
                ? "समझें कि आगे क्या हो सकता है, क्या सुरक्षित रखना है और किन बातों पर अभी ध्यान देना है।"
                : "Understand what may happen next, what to keep safe, and what still needs your attention."}
            </p>
            <a className="landing-inline-link" href="#after-you-report">
              {hi ? "देखें कि आगे क्या होता है" : "See what happens next"}{" "}
              <span aria-hidden="true">→</span>
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

function HowSachetWorks({ hi }: { hi: boolean }) {
  const steps = hi
    ? [
        [
          "बताएं कि क्या हुआ",
          "बोलें, लिखें या जो जानकारी आपके पास है उसे जोड़ें।",
        ],
        [
          "देखें कि सचेत ने क्या समझा",
          "घटना, लेन-देन, सबूत और जरूरी जानकारी की जाँच करें।",
        ],
        [
          "शिकायत और अगले कदम तैयार करें",
          "शिकायत की जाँच करें और रिपोर्ट करने के बाद क्या करना है, यह समझें।",
        ],
      ]
    : [
        [
          "Tell us what happened",
          "Speak, type, or add the information you already have.",
        ],
        [
          "Review what सचेत understood",
          "Check the incident, transactions, evidence, and important details.",
        ],
        [
          "Prepare the complaint and next steps",
          "Review the complaint and understand what to do after reporting.",
        ],
      ];

  return (
    <section
      id="how-sachet-works"
      className="landing-section landing-how"
      aria-labelledby="landing-how-heading"
    >
      <div className="shell">
        <div className="landing-section-intro">
          <h2 id="landing-how-heading">
            {hi ? "सचेत कैसे काम करता है" : "How सचेत works"}
          </h2>
        </div>
        <ol>
          {steps.map(([title, body], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FraudGuidance({ hi }: { hi: boolean }) {
  const patterns = hi
    ? [
        [
          "नकली बैंक / OTP धोखाधड़ी",
          "कोई बैंक या सेवा प्रदाता बनकर OTP, कार्ड की जानकारी या तुरंत सत्यापन मांगता है।",
        ],
        [
          "UPI / भुगतान धोखाधड़ी",
          "कोई नकली भुगतान लिंक, QR कोड या UPI collect request से पैसे भेजने को कहता है।",
        ],
        [
          "निवेश / टास्क स्कैम",
          "आसान कमाई या ऊँचे रिटर्न का वादा करके बार-बार जमा राशि मांगी जाती है।",
        ],
        [
          "प्रतिरूपण / डिजिटल अरेस्ट",
          "कोई अधिकारी बनकर डराता है और पैसे या निजी जानकारी मांगता है।",
        ],
      ]
    : [
        [
          "Fake bank / OTP fraud",
          "Someone pretends to be from a bank or service provider and asks for OTPs, card details or urgent verification.",
        ],
        [
          "UPI / payment fraud",
          "Someone uses a fake payment link, QR code or UPI collect request to make you send money.",
        ],
        [
          "Investment / task scam",
          "Easy earnings or high returns are promised before repeated deposits are demanded.",
        ],
        [
          "Impersonation / digital arrest",
          "Someone claims to be an official, creates fear and demands money or personal information.",
        ],
      ];

  return (
    <section
      className="landing-section landing-guidance"
      aria-labelledby="landing-guidance-heading"
    >
      <div className="shell">
        <div className="landing-section-intro">
          <h2 id="landing-guidance-heading">
            {hi
              ? "क्या आप जानते हैं कि यह किस तरह की धोखाधड़ी हो सकती है?"
              : "Know what kind of fraud this might be?"}
          </h2>
          <p>
            {hi
              ? "शुरू करने से पहले श्रेणी जानना जरूरी नहीं है। संदर्भ के लिए कुछ सामान्य तरीके यहाँ दिए गए हैं।"
              : "You do not need to know the category before starting. If you want context, here are a few common patterns."}
          </p>
        </div>
        <div className="landing-guidance-grid">
          {patterns.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AfterReporting({ hi }: { hi: boolean }) {
  const items = hi
    ? [
        ["मुझे अभी क्या करना चाहिए?", "जो हुआ उसके आधार पर तुरंत जरूरी कदम।"],
        [
          "इसे सुरक्षित रखें",
          "संदेश, लेन-देन संदर्भ और शिकायत की जानकारी सुरक्षित रखें।",
        ],
        ["आगे क्या हो सकता है", "रिपोर्ट करने के बाद की प्रक्रिया समझें।"],
        [
          "अपनी शिकायत पर ध्यान बनाए रखें",
          "जो काम बाकी हैं उनके लिए ईमेल या WhatsApp रिमाइंडर इस्तेमाल करें।",
        ],
      ]
    : [
        ["What should I do now?", "Immediate actions based on what happened."],
        [
          "Keep this safe",
          "Preserve messages, transaction references, and complaint information.",
        ],
        ["What may happen next", "Understand the process after reporting."],
        [
          "Stay on top of your complaint",
          "Use email or WhatsApp reminders for actions you still need to take.",
        ],
      ];

  return (
    <section
      id="after-you-report"
      className="landing-section landing-after-report"
      aria-labelledby="after-report-heading"
    >
      <div className="shell">
        <div className="landing-section-intro">
          <h2 id="after-report-heading">
            {hi ? "रिपोर्ट करने के बाद" : "After you report"}
          </h2>
          <p>
            {hi
              ? "सचेत आपको समझने में मदद करता है कि आगे क्या हो सकता है और किन बातों पर अभी ध्यान देना है।"
              : "सचेत helps you understand what may happen next and what still needs your attention."}
          </p>
        </div>
        <div className="landing-after-grid">
          {items.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhySachetExists({ hi }: { hi: boolean }) {
  return (
    <section
      className="landing-section landing-trust-section"
      aria-labelledby="why-sachet-heading"
    >
      <div className="shell landing-trust-grid">
        <div>
          <h2 id="why-sachet-heading">
            {hi ? "सचेत क्यों बनाया गया" : "Why सचेत exists"}
          </h2>
          <p>
            {hi
              ? "जब आप पहले से ही हुई घटना के तनाव से जूझ रहे हों, तब साइबर अपराध की रिपोर्ट करना मुश्किल हो सकता है। सचेत रिपोर्टिंग प्रणाली को पहले समझे बिना शिकायत तैयार करने और अगले कदम समझने में मदद करता है।"
              : "Reporting cybercrime can be difficult when you are already dealing with the stress of what happened. सचेत helps you prepare the complaint and understand the next steps without first learning the reporting system."}
          </p>
        </div>
        <div className="landing-boundary-note">
          <strong>
            {hi ? "स्वतंत्र प्रोटोटाइप" : "Independent prototype"}
          </strong>
          <p>
            {hi
              ? "सचेत एक स्वतंत्र हैकाथॉन प्रोटोटाइप है। यह NCRP, गृह मंत्रालय, पुलिस, बैंकों या किसी सरकारी एजेंसी से जुड़ा नहीं है।"
              : "सचेत is an independent hackathon prototype. It is not connected to NCRP, the Ministry of Home Affairs, police, banks, or any government agency."}
          </p>
          <p>
            {hi
              ? "यह 1930 या आधिकारिक NCRP रिपोर्टिंग प्रक्रिया की जगह नहीं लेता।"
              : "It does not replace 1930 or the official NCRP reporting process."}
          </p>
        </div>
      </div>
    </section>
  );
}
