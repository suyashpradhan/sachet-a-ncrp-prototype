import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { IncidentExtractionSchema } from "../../../incident/schema";
import {
  alignEvidenceToUploadedFiles,
  normalizeIncidentDraft,
} from "../../../incident/normalization";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_SCREENSHOTS = 8;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const INCIDENT_EXTRACTION_INSTRUCTIONS = `You organise supplied evidence into one structured cybercrime incident draft and suggest a reporting path for citizen review.

Rules:
1. Extract only information supported by the supplied screenshots or transcript.
2. Never invent missing details. Use null for every unknown value.
3. Do not infer a bank, account, wallet or person unless it is visible or explicitly stated.
4. Do not determine guilt or claim that a crime legally occurred.
5. Do not provide legal conclusions, predict recovery or promise a refund date.
6. officialMapping is a suggested NCRP mapping for citizen confirmation, not an authoritative legal decision.
7. Keep the citizen's description separate from the suggested official category and sub-category.
8. Never extract OTPs, CVVs, UPI PINs or passwords as complaint data. Add a warning if such credentials are visible.
9. List only genuinely missing required information in missingRequiredFields.
10. Keep citizen-facing summaries plain, concise and neutral.
11. Put the total amount the citizen says was lost in incident.reportedAmount, even when a transaction reference is unknown. Keep individual known payments in transactions.
12. Preserve an omitted year as incidentDateWithoutYear in MM-DD and leave incidentDate null. Deterministic application logic will resolve an obvious recent non-future date from the reporting date. Set incidentDateWithoutYear to null when a complete YYYY-MM-DD date is explicitly supported.
13. incident.occurredOn must be one concise supported channel: SMS / text message, WhatsApp, Telegram, Website, Mobile app, Email, Other, or null. Put contextual wording in the narrative, not this field.
14. Keep evidence files and facts extracted from evidence distinct: evidence.type identifies the supplied item; evidence.extractedFacts contains only concise supported facts.
15. When visibly supported, preserve safe suspect identifiers such as masked phone numbers, email addresses, URLs, UPI IDs, names or social handles in suspectIdentifiers. Do not unmask or complete partial identifiers.
16. Identity documents are outside this incident-understanding feature. Never extract, reproduce or expose Aadhaar, PAN, passport, driving-licence, voter-ID or other government identity numbers.
17. Populate classification and the reusable adaptiveFacts in this same response. Do not make a second classification pass.
18. Classify by the primary harm, not by a platform keyword. Instagram, WhatsApp, Telegram, Facebook and email may only be contact channels.
19. Use FINANCIAL_FRAUD when the primary supported harm is money transferred, debited, paid or lost through a digital interaction. Preserve the platform as context.
20. Use OTHER_CYBER_CRIME for supported account/profile compromise or ransomware where financial loss is not the primary supported harm.
21. Use WOMEN_CHILDREN_RELATED_CRIME only for supported online/digital sensitive harm involving women or children. Keep descriptions non-graphic and use the safe fact “Sensitive evidence — redacted” when evidence is referenced.
22. Use OUT_OF_SCOPE_OR_UNCLEAR with ambiguity OUT_OF_CYBER_SCOPE when no online, cyber or digital element is described. Do not force serious offline conduct into a cyber form.
23. Use OUT_OF_SCOPE_OR_UNCLEAR with ambiguity INSUFFICIENT_INFORMATION for incomplete input. Do not guess.
24. When both a sensitive online harm and a financial demand are plausible primary paths, use OUT_OF_SCOPE_OR_UNCLEAR with ambiguity MULTIPLE_PLAUSIBLE_PATHS and requiresCitizenConfirmation true. Do not silently choose.
25. classification.category and classification.subCategory are reporting-path suggestions, not legal conclusions. explanation must be short, neutral and supported.
26. Unknown values in classification and adaptiveFacts must be null. Never invent account handles, recovery changes, affected devices or evidence.
27. Keep officialMapping aligned with classification for the three supported report families. For OUT_OF_SCOPE_OR_UNCLEAR, officialMapping category and labels must be null.
28. For non-financial incidents, do not create placeholder bank transactions. transactions must be empty unless actual financial activity is independently supported.
29. Set incident.financialLossState to YES only when money leaving the citizen's account or a payment is supported, NO when the citizen explicitly says no payment or loss occurred, and UNKNOWN when payment status is not established. Keep incident.moneyLost and classification.moneyLost aligned with this state.
30. A financial scam, financial targeting, a prize amount, a request for bank details, or a bank name does not by itself establish financial loss. When financialLossState is NO or UNKNOWN, transactions must be empty and incident.reportedAmount must be null.
31. Record requests for bank details, identity documents, OTPs, payment links and UPI collect requests in financialExposure. Exposure is not a transaction.
32. Put institutions mentioned as incident context in mentionedInstitutions. Put an institution in transactions[].institution only when it belongs to an actual supported payment or debit.
33. Preserve every independently supported payment or credit received back in transactions. Give each transaction a stable sequential id, set direction to DEBIT for money leaving the citizen and CREDIT for money received back, use INR when rupees are stated, and set status to KNOWN, MISSING or NEEDS_CONFIRMATION from the supplied facts.
34. incident.reportedAmount is the total loss, not an additional transaction. If the citizen says “I lost ₹20,000; first ₹5,000, then ₹15,000”, create two transactions totalling ₹20,000 and do not double-count the stated total.
35. Never use the current browser time, server time or report generation time for incidentDate, incident time, transactionDate or transaction time. Unknown remains null. Preserve approximate expressions without inventing exact minutes.
36. accountCompromiseBasis records only the supported sign of possible access, such as changed recovery details, an unfamiliar security alert, changed messages/settings, or the citizen simply forgetting a password. Use null when unclear.
37. citizenConfirmedFields is application-owned follow-up metadata. Always return it as an empty array during initial extraction.
38. A monetary mention is not automatically a transaction. Classify its meaning before deciding whether it belongs in transactions.
39. Only actual completed money movement belongs in transactions: paid, sent, transferred, debited, deducted, charged, withdrawn, credited back, refunded, or a completed UPI/payment event.
40. Never create transactions from an opening or remaining balance, stated total loss, requested or demanded amount, promised prize/salary/refund, attempted debit, or blocked/failed payment.
41. When a stated total and component payments are both supplied, incident.reportedAmount is the stated total and transactions contains only the component payments. Never add the stated total as another transaction.
42. A promised lottery/prize amount is not loss. For example, a ₹25 lakh prize plus a completed ₹10,000 processing payment means one ₹10,000 transaction and ₹10,000 reported loss.
43. A demanded amount is not loss. For example, a ₹2 lakh demand plus a completed ₹50,000 transfer means one ₹50,000 transaction and ₹50,000 reported loss.
44. An attempted debit explicitly described as blocked or declined means no completed transaction. Keep transactions empty unless another completed movement is supported.
45. Preserve two same-value payments when the account describes two distinct events. Do not deduplicate solely by amount.
46. Use the transaction reference/UTR as the canonical reference. Do not duplicate it into referenceNumber unless a distinct second reference is explicitly supplied.
47. Suspicious phishing/KYC link or app-download behaviour is enough to recognize a likely financial cyber incident even when debit status is unknown. Keep financialLossState UNKNOWN and transactions empty; do not require the exact app name first.
48. Benign text with no meaningful cybercrime indicator must remain OUT_OF_SCOPE_OR_UNCLEAR. Do not turn it into a fraud report that is merely missing an app, account, or device.
49. Reconstruct transactions from supported source events. Repeated analysis of the same source must return the same transaction count and stable sequential identities.
50. adaptiveFacts.platform is an unrestricted raw service/platform name. Preserve arbitrary names such as Facebook, Snapchat, LinkedIn, Gmail or a new service; do not force them into a fixed list.
51. Set accountCompromise from supported access/takeover facts, independently of the platform and independently of financial loss. Preserve profileUrl and affectedAccount only when supplied.
52. Populate platformType with a broad value such as SOCIAL_MEDIA, MESSAGING, EMAIL, COMMERCE, PROFESSIONAL_NETWORK, OTHER, or null. It is descriptive metadata, not a reporting route.
53. Keep communicationChannels as supported raw channel names. A communication channel does not automatically mean its account was compromised.
54. Extract threatOrExtortion, demandedAmount, threatChannel, threatDescription and sensitiveMaterialInvolved from supported coercion facts. A demand is not a transaction.
55. Extract impersonation and the unrestricted raw impersonatedEntity when someone pretended or claimed to be another person or organisation.
56. Keep requestedSensitiveInfo and sharedSensitiveInfo separate. Include concise names such as OTP, Bank details, Aadhaar, PAN, Password, Email, UPI ID or Photo only when supported. Requested never means shared.
57. Set credentialExposure only when sensitive credentials were actually shared or exposed, maliciousLink only when a suspicious link interaction is supported, and remoteAccess only when remote-control or screen-sharing access is supported.
58. recoveryEmailChanged and phoneNumberChanged describe those specific supported account recovery changes. Unknown remains null.
59. Multiple harms may coexist. Preserve account compromise, financial loss, threat, impersonation and exposure facts together instead of discarding secondary dimensions.
60. Set incident.statedTotalLoss only when the citizen explicitly identifies an amount as the total, for example “in total”, “total loss” or “altogether”. A first payment or debit is never a stated total.
61. Keep openingBalance, intermediateBalances and closingBalance as balance context. Never create transactions from balance values or use a balance difference as a transaction.
62. Do not perform or rely on arithmetic for the final displayed loss. Preserve every actual debit and supported credit received back in transactions; the application deterministically resolves debits minus credits.
63. For a multi-event story, incident.approximateTime is only the time of the whole incident. Keep a time belonging to one payment on that transaction and leave the overall time null unless the source describes the whole incident at that time.
64. Preserve every supported communication channel in adaptiveFacts.communicationChannels. Use incident.occurredOn as a concise single-channel or multiple-channel summary, never “Other” when named channels are known.
65. Keep entity roles separate: messageSourcePlatforms are platforms named as the source or claimed sender of a message; affectedPlatforms are services/accounts described as inaccessible, hacked, reset or otherwise harmed. Do not put platform names into communicationChannels unless the text explicitly says communication happened through that service.
66. Leave entityRelationship null when different source and affected platforms are mentioned without a clear causal relationship. Set RELATED_BOTH_AFFECTED only when the narrative clearly establishes a linked multi-account chain.
67. Propagate an event's supported date, approximate time and payment service into the matching transaction. Do not leave a transaction field empty when the same payment event states it.
68. A bank or organisation being impersonated is not the transaction institution. Populate transactions[].institution only when the source supports the bank or payment service actually used for that payment.
69. incident.citizenConfirmedLoss is application-owned correction metadata. Always return null during initial extraction.
70. Return exactly one non-voice evidence entry for each supplied screenshot, in the same order. Do not turn multiple facts from one screenshot into multiple evidence entries. When no screenshots are supplied, evidence must be empty; the transcript and typed account are not attachments.`;

type InputContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

async function toDataUrl(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Live evidence analysis is not configured. Use the demo incident instead." },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const narrative = String(formData.get("narrative") ?? "").trim().slice(0, 8_000);
    const englishTranscript = String(formData.get("englishTranscript") ?? "").trim().slice(0, 8_000);
    const reportingFor = String(formData.get("reportingFor") ?? "SELF").slice(0, 40);
    const reportingDateValue = String(formData.get("reportingDate") ?? "");
    const reportingDate = /^\d{4}-\d{2}-\d{2}$/.test(reportingDateValue)
      ? reportingDateValue
      : undefined;
    const screenshots = formData.getAll("screenshots").filter((item): item is File => item instanceof File);

    if (!narrative && !englishTranscript && screenshots.length === 0) {
      return Response.json({ error: "Add a statement, description or screenshot to continue." }, { status: 400 });
    }
    if (screenshots.length > MAX_SCREENSHOTS) {
      return Response.json({ error: "Add no more than eight screenshots." }, { status: 400 });
    }
    for (const screenshot of screenshots) {
      if (!ACCEPTED_IMAGE_TYPES.has(screenshot.type)) {
        return Response.json({ error: "Screenshots must be PNG, JPEG or WebP images." }, { status: 415 });
      }
      if (screenshot.size === 0 || screenshot.size > MAX_IMAGE_BYTES) {
        return Response.json({ error: "Each screenshot must be under 8 MB." }, { status: 413 });
      }
    }

    const evidenceDescription = [
      `Reporting for: ${reportingFor === "HELPING" ? "another affected person" : "self"}.`,
      englishTranscript ? `English voice transcript:\n${englishTranscript}` : "No voice transcript supplied.",
      narrative ? `Typed account:\n${narrative}` : "No typed account supplied.",
      `${screenshots.length} screenshot(s) supplied.`,
    ].join("\n\n");

    const content: InputContent[] = [{ type: "input_text", text: evidenceDescription }];
    for (const screenshot of screenshots) {
      content.push({ type: "input_image", image_url: await toDataUrl(screenshot), detail: "auto" });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.parse({
      model: "gpt-5.6",
      instructions: INCIDENT_EXTRACTION_INSTRUCTIONS,
      input: [{ role: "user", content }],
      text: {
        format: zodTextFormat(
          IncidentExtractionSchema,
          "incident_draft",
          { description: "Evidence-grounded structured incident draft for citizen review." },
        ),
      },
    });

    if (!response.output_parsed) throw new Error("No structured incident draft returned.");
    const normalizedDraft = alignEvidenceToUploadedFiles(
      normalizeIncidentDraft(response.output_parsed, { reportingDate }),
      screenshots.length,
    );
    return Response.json(normalizedDraft, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "We couldn't analyse this evidence. Try again or use the demo incident." },
      { status: 502 },
    );
  }
}
