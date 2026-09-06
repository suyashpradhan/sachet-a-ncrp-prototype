"use client";

import { getDemoCase, DEFAULT_DEMO_CASE_ID } from "../../incident/demo-incident";
import { resolveFinancialLoss } from "../../incident/financial-summary";
import { useI18n } from "../../i18n/i18n-provider";
import { formatCurrency } from "../../presentation/format";

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
      <section className="landing-public-hero" aria-labelledby="landing-heading">
        <div className="shell landing-public-hero-grid">
          <div className="landing-public-hero-copy">
            <p className="landing-prototype-boundary">
              {hi
                ? "स्वतंत्र हैकाथॉन प्रोटोटाइप · NCRP से जुड़ा नहीं"
                : "Independent hackathon prototype · Not connected to NCRP"}
            </p>
            <h1 id="landing-heading">
              {hi
                ? "बताएं कि क्या हुआ। शिकायत में क्या शामिल होना चाहिए, उसे व्यवस्थित करने में हम मदद करेंगे।"
                : "Report what happened. We’ll help organise what belongs in the complaint."}
            </h1>
            <p className="landing-public-lede">
              {hi
                ? "बोलें, लिखें या स्क्रीनशॉट और भुगतान रिकॉर्ड जोड़ें। सचेत घटना, लेन-देन और सबूत को शिकायत की जानकारी में व्यवस्थित करता है, जिसे आधिकारिक प्रणाली में जमा करने से पहले आप जाँच सकते हैं।"
                : "Speak, type, or add screenshots and payment records. सचेत helps organise the incident, transactions and evidence into complaint details you can review before submitting to the official system."}
            </p>
            <p className="landing-reassurance-copy">
              {hi
                ? "आपको साइबर अपराध की श्रेणी या तकनीकी शब्द जानने की जरूरत नहीं है।"
                : "You do not need to know the cybercrime category or technical terms."}
            </p>
            <div className="landing-primary-actions">
              <button
                className="primary-button"
                type="button"
                onClick={hasSubmittedCase ? onViewSubmittedCase : onStartComplaint}
              >
                {hasSubmittedCase
                  ? hi
                    ? "जमा किया गया मामला देखें"
                    : "View submitted case"
                  : hi
                    ? "शिकायत शुरू करें"
                    : "Start complaint"}
              </button>
              <button className="landing-text-action" type="button" onClick={onViewDemo}>
                {hi ? "डेमो मामला देखें" : "See a demo case"}
              </button>
            </div>
            <p className="landing-review-note">
              {hi
                ? "आगे बढ़ने से पहले आप शिकायत की जाँच करते हैं।"
                : "You review the complaint before anything moves forward."}
            </p>
          </div>

          <aside className="landing-purpose-panel" aria-labelledby="landing-purpose-heading">
            <h2 id="landing-purpose-heading">
              {hi ? "सचेत क्या करता है" : "What सचेत does"}
            </h2>
            <ol>
              <li>
                <strong>{hi ? "आपकी बात सुरक्षित रखता है" : "Keeps your account of what happened"}</strong>
                <span>{hi ? "आपकी मूल बात और सबूत अलग रहते हैं।" : "Your original statement and evidence remain distinct."}</span>
              </li>
              <li>
                <strong>{hi ? "जानकारी को जोड़ता है" : "Connects the details"}</strong>
                <span>{hi ? "घटना, लेन-देन और सबूत एक साथ दिखते हैं।" : "The incident, transactions and evidence are shown together."}</span>
              </li>
              <li>
                <strong>{hi ? "अनुमान नहीं लगाता" : "Does not silently guess"}</strong>
                <span>{hi ? "जो साफ़ नहीं है, वह जाँचने या बताने के लिए दिखता है।" : "Unknown or conflicting details stay visible for review."}</span>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <CitizenPaths hi={hi} onStartComplaint={onStartComplaint} />
      <InlineAnilDemo hi={hi} onViewDemo={onViewDemo} onStartComplaint={onStartComplaint} />
      <HowSachetWorks hi={hi} />
      <FraudGuidance hi={hi} />
      <AfterReporting hi={hi} />
      <WhySachetExists hi={hi} />
    </div>
  );
}

function CitizenPaths({ hi, onStartComplaint }: { hi: boolean; onStartComplaint: () => void }) {
  return (
    <section className="landing-section landing-citizen-paths" aria-labelledby="citizen-paths-heading">
      <div className="shell">
        <h2 id="citizen-paths-heading" className="sr-only">
          {hi ? "आप यहाँ क्या कर सकते हैं" : "What you can do here"}
        </h2>
        <div className="landing-path-grid">
          <article className="landing-path landing-path-primary">
            <p className="landing-path-number" aria-hidden="true">01</p>
            <h3>{hi ? "शिकायत तैयार करें" : "Prepare a complaint"}</h3>
            <p>{hi ? "बताएं कि क्या हुआ और जो सबूत आपके पास हैं उन्हें जोड़ें। आगे बढ़ने से पहले शिकायत की जानकारी जाँचें।" : "Tell सचेत what happened and add the evidence you already have. Review the complaint details before anything moves forward."}</p>
            <button className="primary-button" type="button" onClick={onStartComplaint}>{hi ? "शिकायत शुरू करें" : "Start complaint"}</button>
          </article>
          <article className="landing-path landing-path-urgent">
            <p className="landing-path-number" aria-hidden="true">02</p>
            <h3>{hi ? "क्या हाल ही में पैसे गए हैं?" : "Lost money recently?"}</h3>
            <p>{hi ? "हाल की वित्तीय साइबर धोखाधड़ी के लिए तुरंत 1930 पर कॉल करें। इसके बाद सचेत में शिकायत तैयार करना जारी रख सकते हैं।" : "For recent financial cyber fraud, call 1930 immediately. You can continue preparing your complaint in सचेत afterward."}</p>
            <a className="secondary-button" href="tel:1930">{hi ? "1930 पर कॉल करें" : "Call 1930"}</a>
          </article>
          <article className="landing-path">
            <p className="landing-path-number" aria-hidden="true">03</p>
            <h3>{hi ? "पहले ही रिपोर्ट कर चुके हैं?" : "Already reported?"}</h3>
            <p>{hi ? "समझें कि आगे क्या हो सकता है, कौन-से सबूत सुरक्षित रखने हैं और आपको क्या करना पड़ सकता है।" : "Understand what may happen next, what evidence to keep safe, and the actions you may still need to take."}</p>
            <a className="landing-inline-link" href="#after-you-report">{hi ? "देखें कि आगे क्या होता है" : "See what happens next"} <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </div>
    </section>
  );
}

function InlineAnilDemo({ hi, onViewDemo, onStartComplaint }: { hi: boolean; onViewDemo: () => void; onStartComplaint: () => void }) {
  const demoCase = getDemoCase(DEFAULT_DEMO_CASE_ID);
  const financial = resolveFinancialLoss(demoCase.draft);
  const reported = demoCase.draft.incident.statedTotalLoss;
  const successfulDebits = demoCase.draft.transactions.filter(
    (transaction) => transaction.direction === "DEBIT" && transaction.amount !== 6_000,
  );

  return (
    <section className="landing-section landing-demo-section" aria-labelledby="landing-demo-heading">
      <div className="shell">
        <div className="landing-section-intro">
          <p className="eyebrow">{hi ? "अनिल · काल्पनिक डेमो" : "Anil · Synthetic demo"}</p>
          <h2 id="landing-demo-heading">{hi ? "देखें कि सचेत कैसे काम करता है" : "See how सचेत works"}</h2>
          <p>{hi ? "यह काल्पनिक उदाहरण दिखाता है कि सचेत नागरिक की बात और सबूत को शिकायत की ऐसी जानकारी में कैसे बदलता है, जिसे वह जाँच सकता है।" : "A synthetic example showing how सचेत turns a citizen’s story and evidence into complaint details they can review."}</p>
        </div>

        <div className="landing-demo-comparison">
          <article className="landing-demo-source">
            <p className="landing-demo-label">{hi ? "अनिल ने क्या कहा" : "What Anil said"}</p>
            <blockquote>{hi ? "“बैंक अधिकारी ने मुझे फोन किया और ₹36,000 चले गए।”" : "“A bank officer called me and ₹36,000 is gone.”"}</blockquote>
            <div className="landing-demo-evidence" aria-label={hi ? "काल्पनिक सबूत" : "Synthetic evidence"}>
              {[hi ? "कॉल की जानकारी" : "Call details", hi ? "बैंक SMS" : "Bank SMS", hi ? "स्टेटमेंट" : "Statement", hi ? "लेन-देन संदर्भ" : "Transaction references"].map((label) => (
                <div key={label}><span aria-hidden="true">▧</span><strong>{label}</strong></div>
              ))}
            </div>
          </article>

          <div className="landing-demo-arrow" aria-hidden="true">→</div>

          <article className="landing-demo-result">
            <p className="landing-demo-label">{hi ? "सचेत ने क्या समझा" : "What सचेत understood"}</p>
            <dl className="landing-demo-summary">
              <div><dt>{hi ? "नागरिक ने शुरू में बताया" : "Citizen initially reported"}</dt><dd>{reported ? formatCurrency(reported) : "—"}</dd></div>
            </dl>
            <p className="landing-demo-subheading">{hi ? "सबूत से मिले लेन-देन" : "Evidence-backed transactions"}</p>
            <div className="landing-demo-transactions">
              {successfulDebits.map((transaction) => (
                <div key={transaction.id}><strong>{transaction.amount ? formatCurrency(transaction.amount) : "—"}</strong><span>{hi ? "सफल अनधिकृत डेबिट" : "Successful unauthorized debit"}</span></div>
              ))}
              <div><strong>{financial.totalCreditedBack ? formatCurrency(financial.totalCreditedBack) : "₹6,000"}</strong><span>{hi ? "वापस हुआ" : "Reversed"}</span></div>
            </div>
            <div className="landing-demo-loss">
              <span>{hi ? "अभी सबूत से पुष्ट नुकसान" : "Current evidence-supported loss"}</span>
              <strong>{financial.resolvedLoss ? formatCurrency(financial.resolvedLoss) : "₹30,000"}</strong>
              <small>₹12,000 + ₹18,000 = ₹30,000</small>
            </div>
            <dl className="landing-demo-identity">
              <div><dt>{hi ? "दावा की गई पहचान" : "Claimed identity"}</dt><dd>{hi ? "बैंक प्रतिनिधि" : "Bank representative"}</dd></div>
              <div><dt>{hi ? "सत्यापित पहचान" : "Verified identity"}</dt><dd>{hi ? "उपलब्ध नहीं" : "Unavailable"}</dd></div>
            </dl>
            <p className="landing-demo-explanation">{hi ? "कॉल करने वाले ने बैंक का प्रतिनिधि होने का दावा किया। पहचान स्वतंत्र रूप से सत्यापित नहीं हुई।" : "Caller claimed to represent the bank. Identity not independently verified."}</p>
          </article>
        </div>

        <div className="landing-demo-footer">
          <div className="landing-primary-actions">
            <button className="primary-button" type="button" onClick={onViewDemo}>{hi ? "पूरा डेमो मामला देखें" : "View full demo case"}</button>
            <button className="landing-text-action" type="button" onClick={onStartComplaint}>{hi ? "अपनी शिकायत शुरू करें" : "Start your own complaint"}</button>
          </div>
          <p>{hi ? "AI सुझाव दे सकता है कि क्या हुआ। वह चुपचाप यह तय नहीं कर सकता कि क्या सच है।" : "AI can propose what happened. It cannot silently decide what is true."}</p>
        </div>
      </div>
    </section>
  );
}

function HowSachetWorks({ hi }: { hi: boolean }) {
  const steps = hi
    ? [["बताएं कि क्या हुआ", "बोलें, लिखें या स्क्रीनशॉट और भुगतान रिकॉर्ड जोड़ें।"], ["देखें कि सचेत ने क्या समझा", "लेन-देन, सबूत, दावा की गई पहचान और अनजान जानकारी को शिकायत का तथ्य बनने से पहले जाँचें।"], ["शिकायत और अगले कदम तैयार करें", "शिकायत जाँचें, समझें कि आगे क्या करना है और जरूरी सबूत सुरक्षित रखें।"]]
    : [["Tell us what happened", "Speak, type, or add screenshots and payment records."], ["Review what सचेत understood", "See transactions, evidence, claimed identities and unknowns before they become complaint facts."], ["Prepare the complaint and next steps", "Review the complaint, understand what to do next, and keep the evidence you may need."]];
  return <section id="how-sachet-works" className="landing-section landing-how" aria-labelledby="landing-how-heading"><div className="shell"><div className="landing-section-intro"><h2 id="landing-how-heading">{hi ? "सचेत कैसे काम करता है" : "How सचेत works"}</h2></div><ol>{steps.map(([title, body], index) => <li key={title}><span>{index + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></div></section>;
}

function FraudGuidance({ hi }: { hi: boolean }) {
  const patterns = hi
    ? [["नकली बैंक / OTP धोखाधड़ी", "कोई बैंक या सेवा प्रदाता बनकर OTP, कार्ड की जानकारी या तुरंत सत्यापन मांगता है।"], ["UPI / भुगतान धोखाधड़ी", "कोई नकली भुगतान लिंक, QR कोड या UPI collect request से पैसे भेजने को कहता है।"], ["निवेश / टास्क स्कैम", "आसान कमाई या ऊँचे रिटर्न का वादा करके बार-बार जमा राशि मांगी जाती है।"], ["प्रतिरूपण / डिजिटल अरेस्ट", "कोई अधिकारी बनकर डराता है और पैसे या निजी जानकारी मांगता है।"]]
    : [["Fake bank / OTP fraud", "Someone pretends to be from a bank or service provider and asks for OTPs, card details or urgent verification."], ["UPI / payment fraud", "Someone uses a fake payment link, QR code or UPI collect request to make you send money."], ["Investment / task scam", "Easy earnings or high returns are promised before repeated deposits are demanded."], ["Impersonation / digital arrest", "Someone claims to be an official, creates fear and demands money or personal information."]];
  return <section className="landing-section landing-guidance" aria-labelledby="landing-guidance-heading"><div className="shell"><div className="landing-section-intro"><h2 id="landing-guidance-heading">{hi ? "क्या आप जानते हैं कि यह किस तरह की धोखाधड़ी हो सकती है?" : "Know what kind of fraud this might be?"}</h2><p>{hi ? "शुरू करने से पहले श्रेणी जानना जरूरी नहीं है। संदर्भ के लिए कुछ सामान्य तरीके यहाँ दिए गए हैं।" : "You do not need to know the category before starting. If you want context, here are a few common patterns."}</p></div><div className="landing-guidance-grid">{patterns.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>;
}

function AfterReporting({ hi }: { hi: boolean }) {
  const items = hi
    ? [["मुझे अभी क्या करना चाहिए?", "घटना के आधार पर नागरिक के लिए तुरंत जरूरी कदम।"], ["इसे सुरक्षित रखें", "मूल संदेश, लेन-देन संदर्भ और शिकायत की जानकारी सुरक्षित रखें।"], ["आगे क्या हो सकता है", "सचेत के पास लाइव सरकारी स्थिति होने का दावा किए बिना प्रक्रिया समझें।"], ["अपनी शिकायत पर ध्यान बनाए रखें", "जो काम बाकी हैं उनके लिए ईमेल या WhatsApp रिमाइंडर इस्तेमाल करें।"]]
    : [["What should I do now?", "Immediate citizen actions based on the incident."], ["Keep this safe", "Preserve original messages, transaction references and complaint information."], ["What may happen next", "Understand the process without pretending सचेत has live government status."], ["Stay on top of your complaint", "Use email or WhatsApp reminders for actions you still need to take."]];
  return <section id="after-you-report" className="landing-section landing-after-report" aria-labelledby="after-report-heading"><div className="shell"><div className="landing-section-intro"><h2 id="after-report-heading">{hi ? "रिपोर्ट करने के बाद" : "After you report"}</h2><p>{hi ? "सचेत आपको समझने में मदद करता है कि आगे क्या हो सकता है और किन बातों पर अभी ध्यान देना है।" : "सचेत helps you understand what may happen next and what still needs your attention."}</p></div><div className="landing-after-grid">{items.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div><a className="landing-inline-link" href="#after-you-report">{hi ? "रिपोर्ट के बाद का मार्गदर्शन देखें" : "See after-reporting guidance"} <span aria-hidden="true">→</span></a></div></section>;
}

function WhySachetExists({ hi }: { hi: boolean }) {
  return <section className="landing-section landing-trust-section" aria-labelledby="why-sachet-heading"><div className="shell landing-trust-grid"><div><h2 id="why-sachet-heading">{hi ? "सचेत क्यों बनाया गया" : "Why सचेत exists"}</h2><p>{hi ? "साइबर अपराध से प्रभावित नागरिकों को अपनी बात बताने से पहले रिपोर्टिंग के तकनीकी शब्द समझने की जरूरत नहीं होनी चाहिए। सचेत नागरिक की बात और सबूत को ऐसी शिकायत की जानकारी में व्यवस्थित करता है, जिसे वे जाँच और भरोसा कर सकें।" : "Cybercrime victims should not have to understand reporting terminology before they can explain what happened. सचेत helps organise the citizen’s story and evidence into complaint details they can review and trust."}</p></div><div className="landing-boundary-note"><strong>{hi ? "स्वतंत्र प्रोटोटाइप" : "Independent prototype"}</strong><p>{hi ? "सचेत एक स्वतंत्र हैकाथॉन प्रोटोटाइप है। यह NCRP, गृह मंत्रालय, पुलिस, बैंकों या किसी सरकारी एजेंसी से संबद्ध नहीं है।" : "सचेत is an independent hackathon prototype. It is not affiliated with NCRP, the Ministry of Home Affairs, police, banks or any government agency."}</p><p>{hi ? "यह 1930 या आधिकारिक NCRP रिपोर्टिंग प्रक्रिया की जगह नहीं लेता।" : "It does not replace 1930 or the official NCRP reporting process."}</p></div></div></section>;
}
