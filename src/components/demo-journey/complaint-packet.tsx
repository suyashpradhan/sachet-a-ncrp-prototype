"use client";

import type { NcrpCompatibleComplaint } from "../../incident/ncrp-compatible-complaint";
import type { IncidentDraft } from "../../incident/schema";
import type { UiLocale } from "../../i18n/i18n-provider";
import { resolveFinancialLoss } from "../../incident/financial-summary";
import { formatCurrency } from "../../presentation/format";
import { deriveIncidentTimeline } from "../../presentation/incident-timeline";
import { IncidentTimeline } from "./incident-timeline";
import { isInternalCaseValue } from "../../presentation/citizen-visible-value";

type ComplaintPacketProps = {
  complaint: NcrpCompatibleComplaint;
  draft: IncidentDraft;
  reference: string;
  locale: UiLocale;
  isDemoIncident: boolean;
};

function printableValue(value: string | number | boolean | null): string | null {
  if (value === null || value === "") return null;
  if (isInternalCaseValue(value)) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function printableDate(value: string | number | boolean | null, locale: UiLocale) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return printableValue(value);
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function PacketField({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null;
}) {
  const displayed = printableValue(value);
  if (!displayed) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{displayed}</dd>
    </div>
  );
}

export function ComplaintPacket({
  complaint,
  draft,
  reference,
  locale,
  isDemoIncident,
}: ComplaintPacketProps) {
  const hi = locale === "hi";
  const transactions = complaint.groups.transactions;
  const totalLoss = resolveFinancialLoss(draft).resolvedLoss;
  const timeline = deriveIncidentTimeline(draft, { locale, isDemoIncident });
  const suspectFields = [
    [hi ? "नाम" : "Name", complaint.groups.suspect.name.value],
    [
      hi ? "मोबाइल" : "Mobile",
      complaint.groups.suspect.mobileNumber.value,
    ],
    ["Email", complaint.groups.suspect.email.value],
    [hi ? "वेबसाइट" : "Website", complaint.groups.suspect.url.value],
    ["UPI ID", complaint.groups.suspect.upiId.value],
    [
      hi ? "सोशल हैंडल" : "Social handle",
      complaint.groups.suspect.socialHandle.value,
    ],
  ] as const;
  const hasCallerContact = suspectFields.some(([, value]) =>
    printableValue(value)
  );
  const importantUnknowns = [
    !printableDate(complaint.groups.incident.incidentDate.value, locale)
      ? hi ? "घटना की तारीख" : "Incident date"
      : null,
    !printableValue(complaint.groups.incident.incidentTime.value)
      ? hi ? "घटना का समय" : "Incident time"
      : null,
    ...transactions.flatMap((transaction, index) => {
      const number = transactions.length > 1 ? ` ${index + 1}` : "";
      return [
        !printableValue(transaction.institution.value)
          ? `${hi ? "बैंक या भुगतान संस्था" : "Bank or payment institution"}${number}`
          : null,
        !printableValue(transaction.sourceAccountOrPaymentId.value)
          ? `${hi ? "प्रभावित खाता" : "Affected account"}${number}`
          : null,
        !printableValue(transaction.transactionIdOrUtr.value)
          ? `${hi ? "लेन-देन संदर्भ" : "Transaction reference"}${number}`
          : null,
      ];
    }),
    draft.adaptiveFacts.impersonation && !hasCallerContact
      ? hi ? "कॉलर या संपर्क की जानकारी" : "Caller or contact details"
      : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <button
        className="secondary-button save-report-copy no-print"
        type="button"
        onClick={() => window.print()}
      >
        {hi ? "रिपोर्ट की प्रति सहेजें" : "Save report copy"}
      </button>

      <article
        className="complaint-packet"
        aria-label={hi ? "प्रिंट करने योग्य रिपोर्ट" : "Printable report"}
      >
        <header>
          <p className="packet-brand">सचेत</p>
          <h1>
            {hi
              ? "तैयार साइबर धोखाधड़ी रिपोर्ट"
              : "Prepared cyber-fraud report"}
          </h1>
          <p>
            {isDemoIncident
              ? hi
                ? "काल्पनिक डेमो जानकारी"
                : "Synthetic demo information"
              : hi
                ? "प्रोटोटाइप रिपोर्ट"
                : "Prototype report"}
          </p>
        </header>

        {reference ? (
          <section>
            <h2>{hi ? "संदर्भ" : "Reference"}</h2>
            <p>{reference}</p>
          </section>
        ) : null}

        <section>
          <h2>{hi ? "रिपोर्टिंग श्रेणी" : "Reporting category"}</h2>
          <p>{printableValue(complaint.groups.incident.category.value)}</p>
          <p>{printableValue(complaint.groups.incident.subCategory.value)}</p>
        </section>

        <IncidentTimeline
          events={timeline}
          heading={hi ? "क्या हुआ" : "What happened"}
          interactive={false}
        />

        <section className="packet-section">
          <h2>{hi ? "घटना" : "Incident"}</h2>
          <dl>
            {draft.classification.reportFamily === "FINANCIAL_FRAUD" ? (
              <PacketField
                label={hi ? "पैसे गए" : "Money lost"}
                value={complaint.groups.incident.moneyLost.value}
              />
            ) : null}
            <PacketField
              label={hi ? "तारीख" : "Date"}
              value={printableDate(
                complaint.groups.incident.incidentDate.value,
                locale,
              )}
            />
            <PacketField label={hi ? "लगभग समय" : "Approximate time"} value={complaint.groups.incident.incidentTime.value} />
            <PacketField label={hi ? "माध्यम" : "Channel"} value={complaint.groups.incident.communicationChannel.value} />
            <PacketField label={hi ? "विवरण" : "Description"} value={complaint.groups.incident.description.value} />
          </dl>
        </section>

        {transactions.length > 0 ? (
          <section className="packet-section">
            <h2>{hi ? "पैसा और लेन-देन" : "Money & transactions"}</h2>
            {totalLoss ? (
              <dl>
                <PacketField
                  label={hi ? "कुल रिपोर्ट की गई हानि" : "Total reported loss"}
                  value={formatCurrency(totalLoss)}
                />
              </dl>
            ) : null}
            {transactions.map((transaction, index) => (
              <div className="packet-transaction" key={`packet-transaction-${index + 1}`}>
                {transactions.length > 1 ? (
                  <h3>
                    {transaction.direction.value === "CREDIT"
                      ? hi ? `वापस मिला क्रेडिट ${index + 1}` : `Credit received ${index + 1}`
                      : hi ? `लेन-देन ${index + 1}` : `Transaction ${index + 1}`}
                  </h3>
                ) : null}
                <dl>
                  <PacketField
                    label={hi ? "लेन-देन का प्रकार" : "Transaction type"}
                    value={transaction.direction.value === "CREDIT" ? (hi ? "वापस मिला क्रेडिट" : "Credit received back") : (hi ? "भुगतान / डेबिट" : "Payment / debit")}
                  />
                  <PacketField
                    label={hi ? "राशि" : "Amount"}
                    value={
                      typeof transaction.amount.value === "number"
                        ? formatCurrency(transaction.amount.value)
                        : transaction.amount.value
                    }
                  />
                  <PacketField label={hi ? "बैंक या भुगतान संस्था" : "Bank / payment institution"} value={transaction.institution.value} />
                  <PacketField label={hi ? "लेन-देन संदर्भ" : "Transaction reference"} value={transaction.transactionIdOrUtr.value} />
                  <PacketField
                    label={hi ? "लेन-देन की तारीख" : "Transaction date"}
                    value={printableDate(transaction.transactionDate.value, locale)}
                  />
                  <PacketField label={hi ? "लेन-देन का समय" : "Transaction time"} value={transaction.approximateTime.value} />
                </dl>
              </div>
            ))}
          </section>
        ) : null}

        {complaint.groups.evidence.attachments.length > 0 ? (
          <section className="packet-section">
            <h2>{hi ? "सबूत" : "Evidence"}</h2>
            <ul>
              {complaint.groups.evidence.attachments.map((attachment) => (
                <li key={attachment.id}>{attachment.displayName}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {suspectFields.some(([, value]) => printableValue(value)) ? (
          <section className="packet-section">
            <h2>{hi ? "संदिग्ध की जानकारी" : "Suspect information"}</h2>
            <dl>
              {suspectFields.map(([label, value]) => (
                <PacketField key={label} label={label} value={value} />
              ))}
            </dl>
          </section>
        ) : null}

        {draft.adaptiveFacts.impersonation ? (
          <section className="packet-section">
            <h2>{hi ? "बताई गई पहचान" : "Claimed identity"}</h2>
            <dl>
              <PacketField
                label={hi ? "कॉलर ने अपनी पहचान क्या बताई" : "Identity claimed by the caller"}
                value={draft.adaptiveFacts.impersonatedEntity}
              />
              <PacketField
                label={hi ? "पुष्टि की स्थिति" : "Confirmation status"}
                value={
                  hi
                    ? "पहचान की स्वतंत्र पुष्टि दर्ज नहीं है"
                    : "No independent confirmation of the identity is recorded"
                }
              />
            </dl>
          </section>
        ) : null}

        {importantUnknowns.length > 0 ? (
          <section className="packet-section">
            <h2>{hi ? "जरूरी अज्ञात जानकारी" : "Important unknown details"}</h2>
            <ul>
              {importantUnknowns.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ) : null}

        <section className="packet-section">
          <h2>{hi ? "आपकी जानकारी" : "Your details"}</h2>
          <dl>
            <PacketField label={hi ? "नाम" : "Name"} value={complaint.groups.complainant.name.value} />
            <PacketField label={hi ? "मोबाइल" : "Mobile"} value={complaint.groups.complainant.mobile.value} />
            <PacketField label="Email" value={complaint.groups.complainant.email.value} />
            <PacketField label={hi ? "राज्य" : "State"} value={complaint.groups.address.state.value} />
            <PacketField label={hi ? "जिला" : "District"} value={complaint.groups.address.district.value} />
            <PacketField label={hi ? "शहर" : "City"} value={complaint.groups.address.cityOrVillageOrTown.value} />
          </dl>
        </section>

        {draft.reportingPeople?.reportingFor === "SOMEONE_ELSE" ? (
          <section className="packet-section">
            <h2>{hi ? "इस शिकायत में लोग" : "People in this complaint"}</h2>
            <dl>
              <PacketField
                label={hi ? "पीड़ित" : "Victim"}
                value={draft.reportingPeople.victimName}
              />
              <PacketField
                label={hi ? "रिपोर्ट करने में मदद करने वाला व्यक्ति" : "Person helping to report"}
                value={draft.reportingPeople.helperName}
              />
              <PacketField
                label={hi ? "रिश्ता" : "Relationship"}
                value={draft.reportingPeople.relationship?.replace(/^Other:\s*/, "") ?? null}
              />
            </dl>
          </section>
        ) : null}

        <footer>
          <p>{hi ? "नागरिक द्वारा दी गई जानकारी से तैयार।" : "Prepared from information supplied by the citizen."}</p>
          <p>{hi ? "सचेत, एक स्वतंत्र प्रोटोटाइप, के साथ तैयार। यह सरकारी दस्तावेज़ नहीं है और एनसीआरपी, किसी बैंक या पुलिस से जुड़ा नहीं है।" : "Prepared with Sachet, an independent prototype. This is not a government document and is not connected to NCRP, a bank, or the police."}</p>
          {isDemoIncident ? <p>{hi ? "केवल काल्पनिक डेमो।" : "Synthetic demo only."}</p> : null}
        </footer>
      </article>
    </>
  );
}
