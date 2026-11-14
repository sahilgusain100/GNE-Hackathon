/**
 * SkillBridge Voice Assistant Service
 * Natural language intent extraction & slot filling for Artisan activities
 * Supports English, Hindi, Hinglish, and Punjabi (Gurmukhi & Romanized).
 */

const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GEMINI_TTS_API_KEY || "";
const getGroqKey = () => process.env.GROQ_API_KEY || "";
const getLlmProvider = () => (process.env.LLM_PROVIDER || "gemini").toLowerCase();

/**
 * Detect language reliably across Gurmukhi, Devanagari, and Latin transliteration
 */
export function detectSpokenLanguage(message = "") {
  const raw = String(message).trim();
  if (!raw) return "en";

  // 1. Script-based detection
  if (/[\u0A00-\u0A7F]/.test(raw)) return "pa"; // Gurmukhi
  if (/[\u0900-\u097F]/.test(raw)) return "hi"; // Devanagari

  const lower = raw.toLowerCase();

  // 2. English phrases check
  const englishMarkers = [
    "i am", "i live", "years of", "experience", "tailor", "tailoring",
    "stitching", "embroidery", "what is", "missing in", "show my",
    "create my", "my name is", "add", "to my", "from", "how many", "profile"
  ];
  let enScore = 0;
  for (const m of englishMarkers) {
    if (lower.includes(m)) enScore += 3;
  }

  // 3. Punjabi Romanized markers
  const punjabiMarkers = [
    "kamm", "kardi", "karda", "karde", "kardi aan", "karda aan", "tajrba", "tajarba",
    "mera na", "mera naam", "sat sri akal", "satsriakal", "pind", "ton haan", "vich",
    "phulkari", "fulkari", "kadhai", "tuhada", "tussi", "dasso", "daso", "jodo", "hatao",
    "bano", "karobar", "kamai", "paise", "aande", "chahida", "chahidi", "kidan"
  ];

  // 4. Hindi Romanized markers
  const hindiMarkers = [
    "karti hoon", "karta hoon", "anubhav", "saal", "sal", "gaon", "shahar",
    "namaste", "pranam", "karo", "batao", "meri kamai", "kitna", "kitne",
    "kaise", "kya", "chahiye", "karobar", "sahi", "nahi", "mujhe"
  ];

  let paScore = 0;
  for (const m of punjabiMarkers) {
    if (lower.includes(m)) paScore += 2;
  }

  let hiScore = 0;
  for (const m of hindiMarkers) {
    if (lower.includes(m)) hiScore += 2;
  }

  if (enScore > paScore && enScore > hiScore) return "en";
  if (paScore > hiScore && paScore >= 2) return "pa";
  if (hiScore > paScore && hiScore >= 2) return "hi";

  return "en";
}

/**
 * Normalizes number words to digits (English, Hindi, Punjabi)
 */
function parseSpokenNumber(text = "") {
  const numMap = {
    // English
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    // Hindi
    एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
    ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5, panch: 5, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
    // Punjabi
    ਇੱਕ: 1, ਦੋ: 2, ਤਿੰਨ: 3, ਚਾਰ: 4, ਪੰਜ: 5, ਛੇ: 6, ਸੱਤ: 7, ਅੱਠ: 8, ਨੌਂ: 9, ਦਸ: 10,
    ikk: 1, panj: 5, tin: 3, sath: 7, ath: 8
  };

  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);

  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (numMap[w] !== undefined) return numMap[w];
  }
  return null;
}

/**
 * Extract Experience from speech in English, Hindi, or Punjabi
 */
export function extractExperience(text = "") {
  const lower = text.toLowerCase();

  // Pattern 1: Number + years / sal / vare
  // e.g. "five years", "5 years", "पाँच साल", "ਪੰਜ ਸਾਲ", "5 years of experience"
  const expMatch = text.match(
    /(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|ਇੱਕ|ਦੋ|ਤਿੰਨ|ਚਾਰ|ਪੰਜ|ਛੇ|ਸੱਤ|ਅੱਠ|ਨੌਂ|ਦਸ|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|panj|paanch|ek|do)\s*(?:years?|yrs?|yr|ਸਾਲ|ਵਰੇ|साल|वर्ष|महीने|ਮਹੀਨੇ|months?))/i
  );

  if (expMatch) {
    const rawNum = expMatch[1];
    const parsedNum = parseSpokenNumber(rawNum) || rawNum;
    return `${parsedNum} years`;
  }

  // Fallback: check if just contains experience keyword with number
  if (lower.includes("experience") || text.includes("ਤਜਰਬਾ") || text.includes("अनुभव") || lower.includes("tajrba") || lower.includes("anubhav")) {
    const num = parseSpokenNumber(text);
    if (num) return `${num} years`;
    return "Experienced";
  }

  return "";
}

/**
 * Extract Skills and Craft Category from speech
 */
export function extractSkills(text = "") {
  const lower = text.toLowerCase();
  const raw = text;
  const skills = [];

  // Tailoring / Stitching
  if (
    lower.includes("tailor") || lower.includes("tailoring") || lower.includes("stitching") ||
    lower.includes("seamstress") || lower.includes("silai") ||
    raw.includes("ਸਿਲਾਈ") || raw.includes("ਦਰਜ਼ੀ") ||
    raw.includes("सिलाई") || raw.includes("दर्जी")
  ) {
    skills.push("Tailoring");
  }

  // Embroidery / Phulkari
  if (
    lower.includes("phulkari") || lower.includes("fulkari") || lower.includes("embroidery") ||
    lower.includes("needlework") || lower.includes("kadhai") ||
    raw.includes("ਫੁਲਕਾਰੀ") || raw.includes("ਕਢਾਈ") ||
    raw.includes("फुलकारी") || raw.includes("कढ़ाई") || raw.includes("कशीदाकारी")
  ) {
    skills.push("Embroidery & Phulkari");
  }

  // Pottery / Ceramics
  if (
    lower.includes("pottery") || lower.includes("ceramic") || lower.includes("clay") ||
    lower.includes("mitti") || lower.includes("ghade") ||
    raw.includes("ਮਿੱਟੀ") || raw.includes("ਘੜੇ") || raw.includes("ਕੁੰਭਾਰ") ||
    raw.includes("मिट्टी") || raw.includes("कुम्हार") || raw.includes("पॉटरी")
  ) {
    skills.push("Pottery & Ceramics");
  }

  // Weaving / Handloom
  if (
    lower.includes("weaving") || lower.includes("handloom") || lower.includes("textile") ||
    lower.includes("khaddi") || lower.includes("bunti") ||
    raw.includes("ਬੁਣਤੀ") || raw.includes("ਖੱਡੀ") || raw.includes("ਦਰੀਆਂ") ||
    raw.includes("बुनाई") || raw.includes("हथकरघा") || raw.includes("हैंडलूम")
  ) {
    skills.push("Weaving & Handloom");
  }

  // Woodwork / Carpentry
  if (
    lower.includes("wood") || lower.includes("carpentry") || lower.includes("furniture") ||
    lower.includes("lakdi") || lower.includes("tarkhan") ||
    raw.includes("ਲੱਕੜ") || raw.includes("ਤਰਖਾਣ") ||
    raw.includes("लकड़ी") || raw.includes("बढ़ई")
  ) {
    skills.push("Woodwork");
  }

  // Painting / Art
  if (
    lower.includes("paint") || lower.includes("art") || lower.includes("chitra") ||
    raw.includes("ਚਿੱਤਰਕਾਰੀ") || raw.includes("ਪੇਂਟਿੰਗ") ||
    raw.includes("चित्रकला") || raw.includes("पेंटिंग")
  ) {
    skills.push("Traditional Art & Painting");
  }

  // Jewelry / Beadwork
  if (
    lower.includes("jewelry") || lower.includes("jewellery") || lower.includes("beads") || lower.includes("gehne") ||
    raw.includes("ਗਹਿਣੇ") || raw.includes("ਜ਼ੇਵਰ") ||
    raw.includes("गहने") || raw.includes("आभूषण")
  ) {
    skills.push("Handmade Jewelry");
  }

  return skills;
}

/**
 * Extract Location / Village / City
 */
export function extractLocation(text = "") {
  const raw = text;
  const lower = text.toLowerCase();

  // Known artisan hubs in Punjab and North India
  const cities = [
    { key: "Amritsar", variants: ["amritsar", "ਅੰਮ੍ਰਿਤਸਰ", "ਅੰਮ੍ਰਿਤਸਰੋਂ", "अमृतसर"] },
    { key: "Patiala", variants: ["patiala", "ਪਟਿਆਲਾ", "ਪਟਿਆਲੇ", "पटियाला"] },
    { key: "Ludhiana", variants: ["ludhiana", "ਲੁਧਿਆਣਾ", "ਲੁਧਿਆਣੇ", "लुधियाना"] },
    { key: "Jalandhar", variants: ["jalandhar", "ਜਲੰਧਰ", "ਜਲੰਧਰੋਂ", "जालंधर"] },
    { key: "Bathinda", variants: ["bathinda", "ਬਠਿੰਡਾ", "ਬਠਿੰਡੇ", "बठिंडा"] },
    { key: "Hoshiarpur", variants: ["hoshiarpur", "ਹੁਸ਼ਿਆਰਪੁਰ", "होशियारपुर"] },
    { key: "Mohali", variants: ["mohali", "ਮੋਹਾਲੀ", "मोहाली"] },
    { key: "Chandigarh", variants: ["chandigarh", "ਚੰਡੀਗੜ੍ਹ", "चंडीगढ़"] },
    { key: "Jaipur", variants: ["jaipur", "ਜੈਪੁਰ", "जयपुर"] },
    { key: "Delhi", variants: ["delhi", "ਦਿੱਲੀ", "दिल्ली"] },
    { key: "Sultanpur", variants: ["sultanpur", "ਸੁਲਤਾਨਪੁਰ", "सुल्तानपुर"] },
  ];

  for (const c of cities) {
    for (const v of c.variants) {
      if (lower.includes(v.toLowerCase()) || raw.includes(v)) {
        return c.key;
      }
    }
  }

  // Regex patterns: "live in X", "from X", "X ton haan", "X mein rehti hoon"
  const m =
    raw.match(/(?:from|in|live in|village|city)\s+([A-Za-z]+)/i) ||
    raw.match(/([A-Za-z\u0A00-\u0A7F\u0900-\u097F]+)\s*(?:ਤੋਂ|ਤੋਂ ਹਾਂ|ਵਿੱਚ|ਵਿਚ|ਤੋਂ ਆਂ)/) ||
    raw.match(/([A-Za-z\u0A00-\u0A7F\u0900-\u097F]+)\s*(?:से हूँ|से|में रहती हूँ|में रहता हूँ)/);

  if (m && m[1] && m[1].length > 2) {
    const candidate = m[1].trim();
    if (!["tailor", "silai", "kamm", "main", "mera", "naam"].includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return "";
}

/**
 * Extract Name
 */
export function extractName(text = "") {
  const raw = text;
  const lower = text.toLowerCase();

  // If text is primarily about craft/experience, don't mistakenly treat profession/verbs as a name
  if (
    lower.includes("tailor") || lower.includes("silai") || raw.includes("ਸਿਲਾਈ") ||
    raw.includes("सिलाई") || lower.includes("experience") || raw.includes("ਤਜਰਬਾ") || raw.includes("अनुभव")
  ) {
    // Only extract name if explicitly says "my name is X" / "mera naam X"
    const explicit =
      raw.match(/(?:my name is|call me)\s+([A-Za-z\s]+?)(?:,|\.|\sand\s|$)/i) ||
      raw.match(/(?:ਮੇਰਾ ਨਾਂ|ਮੇਰਾ ਨਾਮ)\s+([A-Za-z\u0A00-\u0A7F\s]+?)(?:ਹੈ|ਹਾਂ|ਜੀ|$)/) ||
      raw.match(/(?:मेरा नाम)\s+([A-Za-z\u0900-\u097F\s]+?)(?:हूँ|है|जी|$)/);

    if (explicit && explicit[1]) {
      const cleaned = explicit[1].trim().replace(/\s+(hai|hoon|haan|ji)$/i, "");
      if (cleaned.length >= 2) return cleaned;
    }
    return "";
  }

  const nameMatch =
    raw.match(/(?:my name is|i am|call me)\s+([A-Za-z\s]+?)(?:,|\.|\sand\s|$)/i) ||
    raw.match(/(?:ਮੇਰਾ ਨਾਂ|ਮੇਰਾ ਨਾਮ|ਮੈਂ ਹਾਂ)\s+([A-Za-z\u0A00-\u0A7F\s]+?)(?:ਹੈ|ਹਾਂ|ਜੀ|$)/) ||
    raw.match(/(?:मेरा नाम|मैं)\s+([A-Za-z\u0900-\u097F\s]+?)(?:हूँ|है|जी|$)/);

  if (nameMatch && nameMatch[1]) {
    const cleaned = nameMatch[1].trim().replace(/\s+(hai|hoon|haan|ji)$/i, "");
    if (cleaned.length >= 2 && !["tailor", "silai", "artisan", "live", "from"].includes(cleaned.toLowerCase())) {
      return cleaned;
    }
  }

  return "";
}

/**
 * System prompt defining all artisan actions and extraction schema for LLM
 */
function buildAssistantSystemPrompt(artisanContext = {}, userLanguage = "pa") {
  return `You are SkillBridge's AI Voice Assistant for Indian Artisans.
Artisan Name: "${artisanContext.name || "Artisan"}"
Artisan ID: "${artisanContext.id || ""}"
Shop Name: "${artisanContext.shopName || ""}"
Active Requested Language: "${userLanguage}" (pa = Punjabi in Gurmukhi, hi = Hindi in Devanagari, en = English)

Understand natural spoken requests in English, Hindi, Hinglish, or Punjabi (Gurmukhi or Romanized).
Determine the artisan's INTENT and extract any ENTITIES.

SUPPORTED INTENTS:
1. START_GUIDED_SHOP: Guided shop creation workflow ("Create my shop", "Meri dukan banao", "ਮੇਰੀ ਦੁਕਾਨ ਬਣਾਓ", "दुकान बनानी है", "Open my shop", "Setup shop")
2. START_GUIDED_PRODUCT: Guided product creation workflow ("Add a product", "Naya product jodna hai", "ਉਤਪਾਦ ਜੋੜੋ", "उत्पाद जोड़ें", "List a product", "Add craft")
3. ASK_ME_ANYTHING: General Q&A / Platform queries ("Ask me anything", "Kuch bhi poocho", "ਕੁਝ ਵੀ ਪੁੱਛੋ", "कुछ भी पूछें", "What is SkillBridge", "How do payments work?")
4. PROFILE_GET: View profile details ("Show my profile", "Mera profile dikhao", "ਮੇਰਾ ਵੇਰਵਾ ਦਿਖਾਓ")
5. PROFILE_UPDATE: Update profile fields ("Change name to X", "Update phone to 9876543210", "Add weaving to my skills", "Change business name to X", "Update city to Patiala")
   - Entities: { name?, phone?, bio?, skills?, shopName?, city?, state? }
6. PRODUCT_LIST: View products ("Show my products", "Mera saman dikhao", "What products do I have listed?")
7. PRODUCT_SEARCH: Search products ("Find wooden chair", "Do I have dupattas?")
   - Entities: { query }
8. PRODUCT_ADD: Add a product ("Add a new product", "I want to sell wooden table", "Naya product jodna hai", "Add wooden chair for 2500")
   - Entities: { title?, category?, price?, stock?, description? }
9. PRODUCT_UPDATE: Update price or stock ("Change price of wooden chair to 2500", "Update stock of table to 10")
   - Entities: { title?, productId?, price?, stock? }
10. PRODUCT_DELETE: Delete product ("Delete wooden chair", "Remove table")
   - Entities: { title?, productId? }
11. ORDER_LIST: View orders ("Show my orders", "Do I have new orders?", "Pending orders dikhao", "Completed orders")
   - Entities: { status?: "Pending" | "Completed" | "Processing" | "All", customerName?, productTitle? }
12. ORDER_DETAILS: Order details ("Show details of order #1234", "Details of Rahul's order")
   - Entities: { orderId?, orderNumber?, customerName? }
13. ORDER_ACCEPT: Accept order ("Accept order #1234", "Accept latest order")
    - Entities: { orderId?, orderNumber? }
14. ORDER_REJECT: Reject order ("Reject order #1234 because material unavailable")
    - Entities: { orderId?, orderNumber?, reason? }
15. ORDER_COMPLETE: Mark order complete ("Mark order #1234 as completed", "Kaam poora ho gaya")
    - Entities: { orderId?, orderNumber? }
16. PAYMENT_SUMMARY: Total earnings / how much earned ("How much have I earned?", "Total earnings", "Meri kamai", "Kitne kamaye")
17. PAYMENT_PENDING: Pending payments ("Which payments are pending?", "Kitne paise aane baaki hain?")
18. PAYMENT_HISTORY: Payment history ("Show payment history", "Payouts record")
19. DASHBOARD_SUMMARY: Business summary / analytics ("Give me a summary of my business", "How is business doing?", "Karobar kaisa hai?")
20. FIND_INDUSTRIALISTS: Search industrialists / projects ("Find industrialists looking for furniture", "Factory wale dhoondo", "Open projects")
    - Entities: { query?, category? }
21. COLLABORATION_REQUESTS: View business requests / proposals ("Show collaboration requests", "New enquiries")
22. COLLABORATION_ACCEPT: Accept project proposal ("Accept project #123", "Accept latest collaboration")
    - Entities: { projectId?, title? }
23. NOTIFICATIONS_GET: Check notifications ("Show notifications", "Any new alerts?")
24. HELP: Help on features ("How to add product?", "How do payments work?")
25. AFFIRMATION: Confirmation ("Yes", "Haan", "Confirm", "Sahi hai", "Theek hai", "ਹਾਂ", "हाँ")
26. NEGATION: Rejection / cancellation ("No", "Cancel", "Nahi", "Mat karo", "ਰੱਦ ਕਰੋ", "ਨਹੀਂ", "नहीं", "रद्द करें")
27. LOGIN_HELP: Help with logging in ("How to login", "Artisan login", "Customer login", "ਲੌਗਇਨ ਕਰੋ") - Entities: { role?: "artisan" | "customer" | "expert" | "industry" }
28. SIGNUP_HELP: Help registering or starting voice registration ("Register as artisan", "Voice signup", "ਰਜਿਸਟਰ ਕਰੋ", "Account banana hai") - Entities: { role?: "artisan" | "customer" | "expert" | "industry", isVoice?: boolean }
29. NAVIGATE: Navigate across platform ("Go to marketplace", "Craft courses", "About us", "ਮਾਰਕੀਟਪਲੇਸ") - Entities: { destination?: "marketplace" | "courses" | "about" | "artisans" }
30. UNKNOWN: Unrelated or general conversation.

2. PROFILE_GET: View saved profile
   Examples: "Show my profile", "Mera profile dikhao", "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ", "What are my details?"

3. PROFILE_COMPLETION_CHECK: Check missing fields or complete profile
   Examples: "What is missing in my profile?", "Complete my profile", "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਕੀ ਅਧੂਰਾ ਹੈ?", "ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ"

4. SKILL_ADD: Add a specific craft/skill
   Examples: "Add embroidery to my skills", "ਕਢਾਈ ਦਾ ਹੁਨਰ ਜੋੜੋ", "कढ़ाई का काम जोड़ो"
   Entities: { skill: string }

5. SKILL_REMOVE: Remove a specific craft/skill
   Examples: "Remove weaving", "ਬੁਣਤੀ ਹਟਾਓ", "बुनाई हटाओ"
   Entities: { skill: string }

6. PROFILE_CREATE: Create new artisan profile
   Examples: "Create my artisan profile", "ਨਵੀਂ ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ", "कारीगर प्रोफाइल बनाओ"

7. PRODUCT_LIST: View products ("Show my products", "Mera saman dikhao")
8. PRODUCT_ADD: Add a product ("Add a new product", "Sell wooden chair for 2500")
   Entities: { title?, category?, price?, stock?, description? }
9. PRODUCT_UPDATE: Update product price or stock ("Change price of chair to 2500")
   Entities: { title?, price?, stock? }
10. PRODUCT_DELETE: Delete product ("Delete wooden chair")
11. ORDER_LIST: View orders ("Show my orders", "Pending orders")
12. ORDER_DETAILS: Order details ("Show order #1234")
13. ORDER_ACCEPT: Accept order ("Accept order #1234")
14. ORDER_COMPLETE: Complete order ("Mark order #1234 as completed")
15. PAYMENT_SUMMARY: Earnings ("How much have I earned?", "Meri kamai", "ਕਮਾਈ")
16. PAYMENT_PENDING: Pending payouts ("Pending payments")
17. DASHBOARD_SUMMARY: Business overview ("Summary of my business")
18. FIND_INDUSTRIALISTS: Industrial projects ("Find industrialists", "ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ")
19. GREETING: Greetings ("Hello", "Sat Sri Akal", "Namaste", "ਕਿਵੇਂ ਹੋ")
20. ABOUT_PLATFORM: About SkillBridge ("What is SkillBridge?", "ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?")
21. SUPPORT_HELP: Support & disputes ("Help with dispute", "Refund policy", "ਮਦਦ")
22. AFFIRMATION: Confirmation ("Yes", "Haan", "Confirm", "ਹਾਂ", "हाँ")
23. NEGATION: Rejection ("No", "Cancel", "ਰੱਦ ਕਰੋ", "नहीं")
24. HELP: Help on how to use voice assistant
25. UNKNOWN: Unrelated request

OUTPUT JSON ONLY:
{
  "intent": "INTENT_NAME",
  "entities": {
    "name": "...",
    "skills": ["Tailoring"],
    "experience": "5 years",
    "city": "Patiala",
    "phone": "9876543210",
    "skill": "Tailoring",
    "title": "...",
    "price": 2500,
    "stock": 10
  },
  "detectedLanguage": "pa" | "hi" | "en",
  "confidence": 0.95
}`;
}

/**
 * Call Gemini LLM for intent extraction
 */
async function callGeminiForIntent(message, artisanContext = {}, userLanguage = "pa") {
  const geminiKey = getGeminiKey();
  if (!geminiKey) throw new Error("No Gemini API key");

  const prompt = `${buildAssistantSystemPrompt(artisanContext, userLanguage)}

USER SPOKEN COMMAND:
"${message}"

Extract JSON only.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText.replace(/```json\n?|\n?```/g, "").trim());
}

/**
 * Call Groq to parse intent
 */
async function callGroqForIntent(message, artisanContext = {}, userLanguage = "pa") {
  const groqKey = getGroqKey();
  if (!groqKey) throw new Error("No Groq API key");

  const systemPrompt = buildAssistantSystemPrompt(artisanContext, userLanguage);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `USER COMMAND:\n"${message}"` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return JSON.parse(data?.choices?.[0]?.message?.content);
}

/**
 * Comprehensive Deterministic NLP Fallback
 * Works reliably for English, Hindi, Hinglish, and Punjabi commands
 */
export function deterministicIntentMatcher(message = "", userLanguage = "pa") {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  // Language detection: prioritize explicit script, fallback to userLanguage
  const hasGurmukhi = /[\u0A00-\u0A7F]/.test(raw);
  const hasDevanagari = /[\u0900-\u097F]/.test(raw);
  const detectedLanguage = hasGurmukhi ? "pa" : hasDevanagari ? "hi" : (userLanguage || "en");

  // Check Affirmation / Negation
  if (
    lower === "yes" || lower === "yeah" || lower === "yup" || lower === "ok" || lower === "okay" ||
    lower === "haan" || lower === "haanji" || lower === "sahi hai" || lower === "theek hai" ||
    lower === "confirm" || raw === "ਹਾਂ" || raw === "ਹਾਂਜੀ" || raw === "ਠੀਕ ਹੈ" || raw === "ਸਹੀ ਹੈ" ||
    raw === "हाँ" || raw === "हाँजी" || raw === "सही है" || raw === "ठीक है"
  ) {
    return { intent: "AFFIRMATION", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  if (
    lower === "no" || lower === "nope" || lower === "cancel" || lower === "stop" ||
    lower === "nahi" || lower === "nahin" || lower === "mat karo" ||
    raw === "ਨਹੀਂ" || raw === "ਰੱਦ ਕਰੋ" || raw === "ਰੋਕੋ" ||
    raw === "नहीं" || raw === "रद्द करो" || raw === "रद्द करें" || raw === "रोको"
  ) {
    return { intent: "NEGATION", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  // 1. GUIDED WORKFLOW OPTIONS
  if (
    lower.includes("create my shop") ||
    lower.includes("create shop") ||
    lower.includes("open my shop") ||
    lower.includes("open shop") ||
    lower.includes("setup shop") ||
    lower.includes("make shop") ||
    lower.includes("start shop") ||
    lower.includes("meri dukan") ||
    lower.includes("dukan bana") ||
    lower.includes("dukaan bana") ||
    lower.includes("shop bana") ||
    raw.includes("ਮੇਰੀ ਦੁਕਾਨ ਬਣਾਓ") ||
    raw.includes("ਦੁਕਾਨ ਬਣਾਓ") ||
    raw.includes("ਦੁਕਾਨ ਬਣਾਉਣੀ") ||
    raw.includes("मेरी दुकान बनाएँ") ||
    raw.includes("दुकान बनाएँ") ||
    raw.includes("दुकान बनानी है") ||
    raw.includes("दुकान खोल")
  ) {
    return { intent: "START_GUIDED_SHOP", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  if (
    lower === "add a product" ||
    lower === "add product" ||
    lower === "new product" ||
    lower === "list product" ||
    lower.includes("add a product") ||
    lower.includes("add new product") ||
    lower.includes("naya product") ||
    lower.includes("product add") ||
    lower.includes("product jodna") ||
    lower.includes("utpaad jodo") ||
    raw.includes("ਉਤਪਾਦ ਜੋੜੋ") ||
    raw.includes("ਨਵਾਂ ਉਤਪਾਦ") ||
    raw.includes("उत्पाद जोड़ें") ||
    raw.includes("नया उत्पाद")
  ) {
    return { intent: "START_GUIDED_PRODUCT", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  if (
    lower.includes("ask me anything") ||
    lower.includes("ask anything") ||
    lower.includes("kuch bhi poocho") ||
    raw.includes("ਕੁਝ ਵੀ ਪੁੱਛੋ") ||
    raw.includes("कुछ भी पूछें")
  ) {
    return { intent: "ASK_ME_ANYTHING", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  // GREETINGS & SOCIAL INTENTS
  if (
    lower.startsWith("hello") || lower.startsWith("hi") || lower.startsWith("hey") ||
    lower.includes("sat sri akal") || lower.includes("satsriakal") ||
    lower.includes("namaste") || lower.includes("pranam") || lower.includes("kive") ||
    raw.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ") || raw.includes("ਨਮਸਤੇ") || raw.includes("ਕਿਵੇਂ ਹੋ") ||
    raw.includes("नमस्ते") || raw.includes("प्रणाम") || raw.includes("कैसे हो")
  ) {
    return { intent: "GREETING", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  // 3. ABOUT PLATFORM / CAPABILITIES
  if (
    lower.includes("what is skillbridge") || lower.includes("who are you") ||
    lower.includes("what can you do") || lower.includes("about platform") ||
    raw.includes("ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ") || raw.includes("ਤੁਸੀਂ ਕੌਣ ਹੋ") || raw.includes("ਕੀ ਕਰ ਸਕਦੇ ਹੋ") ||
    raw.includes("स्किलब्रिज क्या है") || raw.includes("तुम कौन हो") || raw.includes("क्या कर सकते हो")
  ) {
    return { intent: "ABOUT_PLATFORM", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 4. SUPPORT & DISPUTES
  if (
    lower.includes("dispute") || lower.includes("refund") || lower.includes("return policy") ||
    lower.includes("support center") || lower.includes("customer support") ||
    raw.includes("ਰਿਫੰਡ") || raw.includes("ਵਾਪਸੀ") || raw.includes("ਸਹਾਇਤਾ ਕੇਂਦਰ") ||
    raw.includes("रिफंड") || raw.includes("वापसी") || raw.includes("शिकायत")
  ) {
    return { intent: "SUPPORT_HELP", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 5. PROFILE ACTIONS & STATEMENTS (e.g. "I am a tailor with five years of experience")
  // Check for skill + experience statement
  const detectedSkills = extractSkills(raw);
  const detectedExperience = extractExperience(raw);
  const detectedLocation = extractLocation(raw);
  const detectedName = extractName(raw);

  // If user says "Add embroidery to my skills" / "ਕਢਾਈ ਜੋੜੋ"
  if (
    (lower.includes("add") || lower.includes("jodo") || raw.includes("ਜੋੜੋ") || raw.includes("जोड़ो")) &&
    (lower.includes("skill") || raw.includes("ਹੁਨਰ") || raw.includes("हुनर") || detectedSkills.length > 0)
  ) {
    const skillName = detectedSkills[0] || raw.replace(/(add|jodo|ਜੋੜੋ|जोड़ो|skill|to my skills|ਹੁਨਰ|हुनर)/gi, "").trim();
    return {
      intent: "SKILL_ADD",
      entities: { skill: skillName },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // If user says "Remove weaving" / "ਬੁਣਤੀ ਹਟਾਓ"
  if (
    (lower.includes("remove") || lower.includes("hatao") || lower.includes("delete") || raw.includes("ਹਟਾਓ") || raw.includes("हटाओ")) &&
    (lower.includes("skill") || raw.includes("ਹੁਨਰ") || raw.includes("हुनर") || detectedSkills.length > 0)
  ) {
    const skillName = detectedSkills[0] || raw.replace(/(remove|hatao|delete|ਹਟਾਓ|हटाओ|skill|ਹੁਨਰ|हुनर)/gi, "").trim();
    return {
      intent: "SKILL_REMOVE",
      entities: { skill: skillName },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // If user provides profile facts (e.g. tailor with 5 years experience, location, or name)
  if (
    detectedSkills.length > 0 ||
    detectedExperience ||
    detectedName ||
    (detectedLocation && (lower.includes("live") || raw.includes("ਰਹਿੰਦੀ") || raw.includes("ਤੋਂ") || raw.includes("रहती") || lower.includes("from") || lower.includes("in")))
  ) {
    const phoneDigits = raw.replace(/\D/g, "");
    return {
      intent: "PROFILE_UPDATE",
      entities: {
        skills: detectedSkills,
        artCategory: detectedSkills[0] || "",
        experience: detectedExperience,
        city: detectedLocation,
        name: detectedName,
        phone: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : undefined,
      },
      detectedLanguage,
      confidence: 0.96,
    };
  }

  // Profile completion check ("What is missing?", "Complete profile", "ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ")
  if (
    lower.includes("missing") || lower.includes("complete profile") || lower.includes("completion") ||
    lower.includes("adhura") || raw.includes("ਅਧੂਰਾ") || raw.includes("ਪੂਰੀ ਕਰੋ") ||
    raw.includes("अधूरा") || raw.includes("पूरी करो")
  ) {
    return {
      intent: "PROFILE_COMPLETION_CHECK",
      entities: {},
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // Create Artisan Profile
  if (
    lower.includes("create artisan profile") || lower.includes("make artisan profile") ||
    lower.includes("new artisan profile") || raw.includes("ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ") ||
    raw.includes("कारीगर प्रोफाइल बनाओ")
  ) {
    return {
      intent: "PROFILE_CREATE",
      entities: {
        name: detectedName,
        city: detectedLocation,
        skills: detectedSkills,
        experience: detectedExperience,
      },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // Profile Get vs Update
  if (
    lower.includes("profile") || lower.includes("account") || lower.includes("my details") ||
    raw.includes("ਪ੍ਰੋਫਾਈਲ") || raw.includes("ਵੇਰਵਾ") || raw.includes("प्रोफाइल")
  ) {
    if (lower.includes("update") || lower.includes("change") || lower.includes("badlo") || raw.includes("ਬਦਲੋ") || raw.includes("बदलो")) {
      const phoneDigits = raw.replace(/\D/g, "");
      return {
        intent: "PROFILE_UPDATE",
        entities: {
          skills: detectedSkills,
          experience: detectedExperience,
          city: detectedLocation,
          name: detectedName,
          phone: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : undefined,
        },
        detectedLanguage,
        confidence: 0.92,
      };
    }
    return { intent: "PROFILE_GET", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 6. EARNINGS & PAYMENTS
  if (
    lower.includes("earn") || lower.includes("kamai") || lower.includes("kamaya") ||
    lower.includes("payout") || lower.includes("payment") || lower.includes("paise") ||
    raw.includes("ਕਮਾਈ") || raw.includes("ਪੈਸੇ") || raw.includes("कमाई") || raw.includes("भुगतान")
  ) {
    if (lower.includes("pending") || lower.includes("baaki") || raw.includes("ਬਾਕੀ") || raw.includes("बाकी")) {
      return { intent: "PAYMENT_PENDING", entities: {}, detectedLanguage, confidence: 0.95 };
    }
    return { intent: "PAYMENT_SUMMARY", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 7. ORDERS
  if (
    lower.includes("order") || lower.includes("orders") ||
    raw.includes("ਆਰਡਰ") || raw.includes("ऑर्डर")
  ) {
    if (lower.includes("accept") || raw.includes("ਸਵੀਕਾਰ") || raw.includes("स्वीकार")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return { intent: "ORDER_ACCEPT", entities: { orderNumber: match ? match[1] : "" }, detectedLanguage, confidence: 0.92 };
    }
    if (lower.includes("complete") || raw.includes("ਪੂਰਾ") || raw.includes("पूरा")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return { intent: "ORDER_COMPLETE", entities: { orderNumber: match ? match[1] : "" }, detectedLanguage, confidence: 0.92 };
    }

    let status = "All";
    if (lower.includes("pending") || raw.includes("ਨਵੇਂ") || raw.includes("लंबित")) status = "Pending";
    else if (lower.includes("completed") || raw.includes("ਪੂਰੇ") || raw.includes("पूरे")) status = "Completed";

    return { intent: "ORDER_LIST", entities: { status }, detectedLanguage, confidence: 0.95 };
  }

  // 8. PRODUCTS
  if (
    lower.startsWith("add ") || lower.includes("add a ") || lower.includes("add new") ||
    lower.includes("naya saman") || raw.includes("ਨਵਾਂ ਉਤਪਾਦ") || raw.includes("नया उत्पाद")
  ) {
    const numMatch = raw.match(/\d+/);
    return {
      intent: "PRODUCT_ADD",
      entities: {
        title: raw.replace(/(add|a|new|product|naya|saman|ਨਵਾਂ|ਉਤਪਾਦ|नया|उत्पाद)/gi, "").trim(),
        price: numMatch ? Number(numMatch[0]) : undefined,
      },
      detectedLanguage,
      confidence: 0.92,
    };
  }

  if (
    lower.includes("product") || lower.includes("products") || lower.includes("item") ||
    lower.includes("saman") || raw.includes("ਉਤਪਾਦ") || raw.includes("ਸਮਾਨ") || raw.includes("सामान")
  ) {
    if (lower.includes("update") || lower.includes("change") || lower.includes("price") || lower.includes("stock")) {
      const numMatch = raw.match(/\d+/);
      return {
        intent: "PRODUCT_UPDATE",
        entities: {
          price: lower.includes("price") || raw.includes("ਕੀਮਤ") ? (numMatch ? Number(numMatch[0]) : undefined) : undefined,
          stock: lower.includes("stock") || raw.includes("ਸਟਾਕ") ? (numMatch ? Number(numMatch[0]) : undefined) : undefined,
        },
        detectedLanguage,
        confidence: 0.9,
      };
    }
    return { intent: "PRODUCT_LIST", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 9. INDUSTRIAL PROJECTS
  if (
    lower.includes("industry") || lower.includes("industrialist") || lower.includes("factory") ||
    raw.includes("ਉਦਯੋਗ") || raw.includes("ਫੈਕਟਰੀ") || raw.includes("उद्योग")
  ) {
    return { intent: "FIND_INDUSTRIALISTS", entities: {}, detectedLanguage, confidence: 0.92 };
  }

  // 10. HELP
  if (
    lower.includes("help") || lower.includes("madad") || raw.includes("ਮਦਦ") || raw.includes("मदद")
  ) {
    return { intent: "HELP", entities: {}, detectedLanguage, confidence: 0.9 };
  }

  return {
    intent: "UNKNOWN",
    entities: { raw },
    detectedLanguage,
    confidence: 0.3,
  };
}

/**
 * Main intent parsing entry point with fallback
 */
export async function parseArtisanIntent(message, artisanContext = {}, userLanguage = "pa") {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return { intent: "UNKNOWN", entities: {}, detectedLanguage: userLanguage || "en", confidence: 0 };
  }

  let result = null;

  // Try LLM if configured
  const provider = getLlmProvider();
  const groqKey = getGroqKey();
  const geminiKey = getGeminiKey();

  if (provider === "groq" && groqKey) {
    try {
      result = await callGroqForIntent(trimmed, artisanContext, userLanguage);
    } catch (e) {
      console.warn("Groq intent parsing failed, falling back:", e.message);
    }
  }

  if (!result && geminiKey) {
    try {
      result = await callGeminiForIntent(trimmed, artisanContext, userLanguage);
    } catch (e) {
      console.warn("Gemini intent parsing failed, falling back:", e.message);
    }
  }

  // Fallback to deterministic NLP matcher
  if (!result || !result.intent) {
    result = deterministicIntentMatcher(trimmed, userLanguage);
  }

  if (result && !result.detectedLanguage) {
    result.detectedLanguage = userLanguage || "pa";
  }

  return result;
}
