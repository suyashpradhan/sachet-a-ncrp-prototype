"use client";

import type { NcrpCompatibleComplaint } from "../../incident/ncrp-compatible-complaint";
import type { IncidentDraft } from "../../incident/schema";
import type { UiLocale } from "../../i18n/i18n-provider";
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

        <footer>
          <p>{hi ? "नागरिक द्वारा दी गई जानकारी से तैयार।" : "Prepared from information supplied by the citizen."}</p>
          <p>{hi ? "केवल प्रोटोटाइप। यह रिपोर्ट एनसीआरपी या किसी अन्य सरकारी प्रणाली में जमा नहीं हुई।" : "Prototype only. This report was not submitted to NCRP or another government system."}</p>
        </footer>
      </article>
    </>
  );
}
