"use client";

import { useI18n } from "../../i18n/i18n-provider";

type LandingPageProps = {
  hasSubmittedCase: boolean;
  onStartComplaint: () => void;
  onViewDemo: () => void;
  onViewSubmittedCase: () => void;
};

export function LandingPage({
  hasSubmittedCase,
  onStartComplaint,
  onViewDemo,
  onViewSubmittedCase,
}: LandingPageProps) {
  const { locale } = useI18n();
  const hi = locale === "hi";

  return (
    <div className="landing-page">
      <section
        className="landing-public-hero"
        aria-labelledby="landing-heading"
      >
        <div className="shell landing-public-hero-simple">
          <p className="eyebrow landing-welcome">
            {hi ? "सचेत में आपका स्वागत है" : "Welcome to Sachet"}
          </p>
          <h1 id="landing-heading">
            {hi
              ? "साइबर अपराध की रिपोर्ट करने और आगे क्या करना है, यह समझने की जगह।"
              : "The place to report cybercrime and understand what to do next."}
          </h1>
          <p className="landing-public-lede">
            {hi
              ? "बताएं कि क्या हुआ। सचेत शिकायत तैयार करने, सही जानकारी सुरक्षित रखने और अगले कदम समझने में मदद करता है।"
              : "Tell us what happened. Sachet helps you prepare the complaint, keep the right information safe, and understand the next steps."}
          </p>
          <p className="landing-reassurance-copy">
            {hi
              ? "शुरू करने से पहले आपको साइबर अपराध की श्रेणी जानने की जरूरत नहीं है।"
              : "You do not need to know the cybercrime category before you start."}
          </p>
          <div className="landing-primary-actions">
            <button
              className="primary-button"
              type="button"
              onClick={
                hasSubmittedCase ? onViewSubmittedCase : onStartComplaint
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
            <a className="landing-text-action" href="#how-sachet-works">
              {hi ? "यह कैसे काम करता है" : "How it works"}
            </a>
          </div>
          <p className="landing-prototype-boundary">
            {hi
              ? "स्वतंत्र हैकाथॉन प्रोटोटाइप · NCRP से जुड़ा नहीं"
              : "Independent hackathon prototype · Not connected to NCRP"}
          </p>
        </div>
      </section>

      <CitizenPaths hi={hi} onStartComplaint={onStartComplaint} />
      <HowSachetWorks hi={hi} />
      <FraudGuidance hi={hi} />
      <AfterReporting hi={hi} />
      <WhySachetExists hi={hi} />
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
          "Review what Sachet understood",
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
            {hi ? "सचेत कैसे काम करता है" : "How Sachet works"}
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
              : "Sachet helps you understand what may happen next and what still needs your attention."}
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
            {hi ? "सचेत क्यों बनाया गया" : "Why Sachet exists"}
          </h2>
          <p>
            {hi
              ? "जब आप पहले से ही हुई घटना के तनाव से जूझ रहे हों, तब साइबर अपराध की रिपोर्ट करना मुश्किल हो सकता है। सचेत रिपोर्टिंग प्रणाली को पहले समझे बिना शिकायत तैयार करने और अगले कदम समझने में मदद करता है।"
              : "Reporting cybercrime can be difficult when you are already dealing with the stress of what happened. Sachet helps you prepare the complaint and understand the next steps without first learning the reporting system."}
          </p>
        </div>
        <div className="landing-boundary-note">
          <strong>
            {hi ? "स्वतंत्र प्रोटोटाइप" : "Independent prototype"}
          </strong>
          <p>
            {hi
              ? "सचेत एक स्वतंत्र हैकाथॉन प्रोटोटाइप है। यह NCRP, गृह मंत्रालय, पुलिस, बैंकों या किसी सरकारी एजेंसी से जुड़ा नहीं है।"
              : "Sachet is an independent hackathon prototype. It is not connected to NCRP, the Ministry of Home Affairs, police, banks, or any government agency."}
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
