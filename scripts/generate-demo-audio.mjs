import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadLocalEnvironment() {
  try {
    const source = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // The caller may already provide the environment variable.
  }
}

const narrations = [
  {
    file: "anil-bank-otp.mp3",
    languageCode: "en-IN",
    speaker: "shubh",
    text: "Someone claiming to be from my bank called me and said an urgent verification was needed. I shared the OTP during the call. Minutes later, three debit alerts appeared for twelve thousand, eighteen thousand and six thousand rupees. I first thought thirty six thousand rupees was gone, but the bank records show that the six thousand rupee debit was reversed.",
  },
  {
    file: "anil-bank-otp-hi.mp3",
    languageCode: "hi-IN",
    speaker: "shubh",
    text: "मेरे बैंक से होने का दावा करने वाले व्यक्ति ने फोन करके कहा कि तुरंत सत्यापन करना जरूरी है। मैंने कॉल पर ओ टी पी साझा कर दिया। कुछ मिनट बाद बारह हजार, अठारह हजार और छह हजार रुपये के तीन डेबिट संदेश आए। मुझे पहले लगा कि छत्तीस हजार रुपये चले गए, लेकिन बैंक रिकॉर्ड में छह हजार रुपये का डेबिट वापस हुआ दिखता है।",
  },
  {
    file: "sneha-task-scam.mp3",
    languageCode: "en-IN",
    speaker: "priya",
    text: "I got a WhatsApp message about part-time online tasks. At first they actually paid me small amounts, so I thought it was genuine. Then they moved me to Telegram and asked me to deposit larger amounts for bigger tasks. I made several payments. The platform later showed eighty thousand rupees, but I could not withdraw it. They kept asking for more money, including another twenty five thousand rupees, which I did not pay.",
  },
  {
    file: "sneha-task-scam-hi.mp3",
    languageCode: "hi-IN",
    speaker: "priya",
    text: "मुझे व्हाट्सऐप पर पार्ट-टाइम ऑनलाइन टास्क का संदेश मिला। शुरू में उन्होंने मुझे छोटी रकम वापस दी, इसलिए मुझे यह सही लगा। फिर वे मुझे टेलीग्राम पर ले गए और बड़े टास्क के लिए ज्यादा पैसे जमा करने को कहा। मैंने कई भुगतान किए। बाद में प्लेटफ़ॉर्म पर अस्सी हजार रुपये दिखे, लेकिन मैं वह रकम निकाल नहीं पाई। वे पच्चीस हजार रुपये और मांगते रहे, जो मैंने नहीं दिए।",
  },
  {
    file: "job-offer.mp3",
    languageCode: "en-IN",
    speaker: "priya",
    text: "I was looking for a job when someone contacted me on LinkedIn about an opportunity. They moved the conversation to WhatsApp. I paid ₹499 as a registration fee and ₹1,499 for verification. Later they asked me to pay another ₹18,000 as a security deposit, but I did not pay it. I have the LinkedIn and WhatsApp conversations and both payment receipts.",
  },
  {
    file: "job-offer-hi.mp3",
    languageCode: "hi-IN",
    speaker: "priya",
    text: "मैं नौकरी ढूँढ रही थी, तभी लिंक्डइन पर किसी ने नौकरी के अवसर के बारे में संपर्क किया। बाद में बातचीत व्हाट्सऐप पर चली गई। मैंने पंजीकरण के लिए ₹499 और सत्यापन के लिए ₹1,499 का भुगतान किया। फिर उन्होंने ₹18,000 की सुरक्षा जमा राशि मांगी, लेकिन मैंने वह राशि नहीं दी। मेरे पास लिंक्डइन और व्हाट्सऐप की बातचीत और दोनों भुगतान रसीदें हैं।",
  },
  {
    file: "amount-mismatch.mp3",
    languageCode: "en-IN",
    speaker: "priya",
    text: "Yesterday I received an SBI KYC update message on WhatsApp. I opened the link. First ₹5,000 was debited, and later another ₹15,000 was debited. I thought the total loss was ₹25,000. I do not have the exact transaction references right now.",
  },
  {
    file: "amount-mismatch-hi.mp3",
    languageCode: "hi-IN",
    speaker: "priya",
    text: "कल मुझे व्हाट्सऐप पर एसबीआई केवाईसी अपडेट का संदेश आया। उसमें लिखा था कि केवाईसी अपडेट नहीं करने पर मेरा खाता बंद हो जाएगा। मैंने लिंक खोल दिया। पहले ₹5,000 और थोड़ी देर बाद ₹15,000 डेबिट हुए। मुझे लगा कि कुल ₹25,000 गए हैं। अभी मेरे पास लेन-देन के सही संदर्भ नहीं हैं।",
  },
  {
    file: "account-compromise.mp3",
    languageCode: "en-IN",
    speaker: "shubh",
    text: "Yesterday morning I received an Instagram password reset message. I opened the link because I thought it was official. After that, my Instagram password was reset. Later, I also found that I could not access my WhatsApp account. I am not sure whether both events are connected. No money was lost.",
  },
  {
    file: "account-compromise-hi.mp3",
    languageCode: "hi-IN",
    speaker: "shubh",
    text: "कल सुबह मुझे इंस्टाग्राम पासवर्ड रीसेट करने का संदेश मिला। मैंने लिंक खोला क्योंकि मुझे लगा कि वह आधिकारिक है। उसके बाद मेरा इंस्टाग्राम पासवर्ड रीसेट हो गया। बाद में मुझे पता चला कि मैं अपने व्हाट्सऐप खाते में भी प्रवेश नहीं कर पा रहा हूँ। मुझे नहीं पता कि दोनों घटनाएँ जुड़ी हुई हैं या नहीं। कोई पैसा नहीं गया।",
  },
  {
    file: "lottery-attempt.mp3",
    languageCode: "en-IN",
    speaker: "ratan",
    text: "I was told on WhatsApp and over a phone call that my number had been selected in a KBC lucky draw and that I had won ₹25 lakh. They asked for a ₹10,000 processing fee, an Aadhaar photo, and my bank details. I did not pay or share anything.",
  },
  {
    file: "lottery-attempt-hi.mp3",
    languageCode: "hi-IN",
    speaker: "ratan",
    text: "मुझे व्हाट्सऐप और फोन कॉल पर बताया गया कि मेरा नंबर केबीसी लकी ड्रॉ में चुना गया है और मैंने ₹25 लाख जीते हैं। इनाम लेने के लिए उन्होंने ₹10,000 प्रोसेसिंग फीस, आधार की फोटो और बैंक की जानकारी मांगी। मैंने कोई पैसा नहीं दिया और कोई जानकारी साझा नहीं की।",
  },
  {
    file: "extortion.mp3",
    languageCode: "en-IN",
    speaker: "ishita",
    text: "An unknown Telegram account threatened to share my private photos with my contacts unless I paid ₹20,000. The same threat later arrived by email. I made no payment, and I do not know the sender's real identity.",
  },
  {
    file: "extortion-hi.mp3",
    languageCode: "hi-IN",
    speaker: "ishita",
    text: "कल टेलीग्राम पर एक अनजान खाते ने संदेश भेजकर कहा कि उसके पास मेरी निजी तस्वीरें हैं। उसने धमकी दी कि अगर मैंने ₹20,000 नहीं दिए तो वह तस्वीरें मेरे संपर्कों को भेज देगा। बाद में वही धमकी ईमेल पर भी आई। मैंने कोई भुगतान नहीं किया और मुझे भेजने वाले की असली पहचान नहीं पता।",
  },
];

await loadLocalEnvironment();
const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey) throw new Error("SARVAM_API_KEY is required to generate demo audio.");

const outputDirectory = resolve(process.cwd(), "public/demo/audio");
await mkdir(outputDirectory, { recursive: true });

const requestedFiles = new Set(process.argv.slice(2));
const selectedNarrations = requestedFiles.size > 0
  ? narrations.filter((narration) => requestedFiles.has(narration.file))
  : narrations;

for (const narration of selectedNarrations) {
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: narration.text,
      language_code: narration.languageCode,
      model: "bulbul:v3",
      speaker: narration.speaker,
      pace: 0.96,
      temperature: 0.7,
      output_audio_codec: "mp3",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Sarvam TTS failed for ${narration.file}: ${response.status} ${message}`);
  }

  const result = await response.json();
  const encoded = result?.audios?.[0];
  if (typeof encoded !== "string") throw new Error(`Sarvam TTS returned no audio for ${narration.file}.`);
  await writeFile(resolve(outputDirectory, narration.file), Buffer.from(encoded, "base64"));
}

console.log(`Generated ${selectedNarrations.length} local demo narration files.`);
