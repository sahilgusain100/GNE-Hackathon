/**
 * SkillBridge Voice Assistant Service
 * Natural language intent extraction & slot filling for Artisan activities
 * Supports English, Hindi, Hinglish, and Punjabi.
 */

const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GEMINI_TTS_API_KEY || "";
const getGroqKey = () => process.env.GROQ_API_KEY || "";
const getLlmProvider = () => (process.env.LLM_PROVIDER || "gemini").toLowerCase();

/**
 * System prompt defining all artisan actions and extraction schema
 */
function buildAssistantSystemPrompt(artisanContext = {}, userLanguage = "pa") {
  return `You are SkillBridge's AI Voice Assistant for Indian Artisans.
The artisan is currently logged in.
Artisan Name: "${artisanContext.name || "Artisan"}"
Artisan ID: "${artisanContext.id || ""}"
Shop Name: "${artisanContext.shopName || ""}"
Active Requested Language: "${userLanguage}" (pa = Punjabi in Gurmukhi, hi = Hindi in Devanagari, en = English)

Your job is to understand natural spoken requests in English, Hindi, Hinglish (Hindi written in English/Latin script), or Punjabi (Gurmukhi or Romanized).
Determine the artisan's INTENT and extract any ENTITIES/PARAMETERS.

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

RETURN JSON SCHEMA ONLY:
{
  "intent": "INTENT_NAME",
  "entities": {
    "title": "...",
    "category": "...",
    "price": 2500,
    "stock": 10,
    "phone": "...",
    "orderNumber": "...",
    "orderId": "...",
    "status": "...",
    "query": "..."
  },
  "detectedLanguage": "pa" | "hi" | "en",
  "confidence": 0.95
}`;
}

/**
 * Call Gemini to parse intent
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
    /^(yes|yeah|yep|haan|ha|hanji|sahi hai|theek hai|confirm|bilkul|kar do|add kar do|delete kar do|yes please|ਹਾਂ|ਸਹੀ ਹੈ|ਠੀਕ ਹੈ|हाँ|सही है)$/i.test(
      lower
    ) ||
    lower.startsWith("yes") ||
    lower.startsWith("haan") ||
    lower.startsWith("hanji") ||
    raw.startsWith("ਹਾਂ") ||
    raw.startsWith("हाँ") ||
    raw.includes("ਸਹੀ ਹੈ") ||
    raw.includes("ਠੀਕ ਹੈ") ||
    raw.includes("सही है")
  ) {
    return { intent: "AFFIRMATION", entities: {}, detectedLanguage, confidence: 0.99 };
  }

  if (
    /^(no|nope|cancel|nahi|na|mat karo|rehne do|cancel karo|dont|don't|ਰੱਦ ਕਰੋ|ਨਹੀਂ|नहीं|रद्द करें)$/i.test(
      lower
    ) ||
    lower.startsWith("no ") ||
    lower.startsWith("nahi") ||
    raw.startsWith("ਨਹੀਂ") ||
    raw.startsWith("नहीं") ||
    raw.includes("ਰੱਦ") ||
    raw.includes("रद्द")
  ) {
    return { intent: "NEGATION", entities: {}, detectedLanguage, confidence: 0.99 };
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
    /^(hi|hello|hey|hey there|namaste|namaskar|sat sri akal|satsriakal|sasrikal|kem cho|adaab|good morning|good afternoon|good evening|ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ|ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ|ਨਮਸਤੇ|ਹੈਲੋ|नमस्ते|नमस्कार|हेलो)$/i.test(
      lower
    ) ||
    lower.startsWith("hi ") ||
    lower.startsWith("hello") ||
    lower.startsWith("hey ") ||
    lower.includes("sat sri akal") ||
    lower.includes("satsriakal") ||
    lower.includes("namaste") ||
    raw.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ") ||
    raw.includes("ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ") ||
    raw.includes("ਨਮਸਤੇ") ||
    raw.includes("नमस्ते")
  ) {
    return { intent: "GREETING", entities: {}, detectedLanguage, confidence: 0.98 };
  }

  // ABOUT SKILLBRIDGE & BOT CAPABILITIES
  if (
    lower.includes("what is skillbridge") ||
    lower.includes("what can you do") ||
    lower.includes("who are you") ||
    lower.includes("what are you") ||
    lower.includes("about skillbridge") ||
    lower.includes("how does this work") ||
    lower.includes("what does this app do") ||
    lower.includes("how to use") ||
    lower.includes("tell me about") ||
    raw.includes("ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ") ||
    raw.includes("ਕੀ ਕਰ ਸਕਦੇ ਹੋ") ||
    raw.includes("ਕੌਣ ਹੋ") ||
    raw.includes("ਤੁਸੀਂ ਕੌਣ ਹੋ") ||
    raw.includes("ਕੀ ਹੈ ਇਹ") ||
    raw.includes("स्किलब्रिज क्या है") ||
    raw.includes("तुम कौन हो") ||
    raw.includes("क्या कर सकते हो")
  ) {
    return { intent: "ABOUT_PLATFORM", entities: {}, detectedLanguage, confidence: 0.96 };
  }

  // SUPPORT, DISPUTES, REFUNDS & COMPLAINTS
  if (
    lower.includes("support") ||
    lower.includes("customer care") ||
    lower.includes("helpdesk") ||
    lower.includes("dispute") ||
    lower.includes("refund") ||
    lower.includes("return") ||
    lower.includes("damaged") ||
    lower.includes("complaint") ||
    lower.includes("defective") ||
    lower.includes("wrong product") ||
    lower.includes("shikayat") ||
    raw.includes("ਸਹਾਇਤਾ") ||
    raw.includes("ਸ਼ਿਕਾਇਤ") ||
    raw.includes("ਰਿਫੰਡ") ||
    raw.includes("ਵਾਪਸੀ") ||
    raw.includes("ਨੁਕਸਾਨ") ||
    raw.includes("शिकायत") ||
    raw.includes("रिफंड") ||
    raw.includes("सहायता")
  ) {
    return { intent: "SUPPORT_HELP", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // ORDER TRACKING FOR CUSTOMERS & ARTISANS
  if (
    lower.includes("track") ||
    lower.includes("tracking") ||
    lower.includes("where is my order") ||
    lower.includes("order status") ||
    lower.includes("delivery status") ||
    lower.includes("order kahan") ||
    lower.includes("parcel kahan") ||
    raw.includes("ਟ੍ਰੈਕ") ||
    raw.includes("ਕਿੱਥੇ ਹੈ") ||
    raw.includes("ਟਰੈਕ") ||
    raw.includes("ट्रैक")
  ) {
    const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
    return {
      intent: "ORDER_TRACK",
      entities: { orderNumber: match ? match[1] : "" },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // PRODUCT SEARCH & MARKETPLACE DISCOVERY
  if (
    lower.includes("show me products") ||
    lower.includes("show products") ||
    lower.includes("find products") ||
    lower.includes("browse crafts") ||
    lower.includes("explore products") ||
    lower.includes("phulkari") ||
    lower.includes("dupatta") ||
    lower.includes("juti") ||
    lower.includes("pottery") ||
    lower.includes("shawl") ||
    lower.includes("wood craft") ||
    lower.includes("buy craft") ||
    raw.includes("ਸਮਾਨ ਦਿਖਾਓ") ||
    raw.includes("ਉਤਪਾਦ ਦਿਖਾਓ") ||
    raw.includes("ਖਰੀਦਣਾ") ||
    raw.includes("ਫੁਲਕਾਰੀ") ||
    raw.includes("ਸਾਮਾਨ ਦਿਖਾਓ")
  ) {
    return {
      intent: "PRODUCT_SEARCH",
      entities: { query: raw },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // 1. LOGIN & SIGNUP (Checked first so 'Industry login' or 'Account banana' are recognized correctly)
  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in") ||
    lower.includes("signin") ||
    raw.includes("ਲੌਗਇਨ") ||
    raw.includes("लॉगिन")
  ) {
    const role = lower.includes("artisan") || raw.includes("ਦਸਤਕਾਰ") || raw.includes("ਕਾਰੀਗਰ")
      ? "artisan"
      : lower.includes("industry") || lower.includes("factory") || raw.includes("ਉਦਯੋਗ")
      ? "industry"
      : lower.includes("expert") || raw.includes("ਮਾਹਿਰ")
      ? "expert"
      : "customer";

    return {
      intent: "LOGIN_HELP",
      entities: { role },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  if (
    lower.includes("register") ||
    lower.includes("signup") ||
    lower.includes("sign up") ||
    lower.includes("account banana") ||
    lower.includes("create account") ||
    lower.includes("new account") ||
    lower.includes("registration") ||
    lower.includes("voice signup") ||
    raw.includes("ਰਜਿਸਟਰ") ||
    raw.includes("ਰਜਿਸਟ੍ਰੇਸ਼ਨ") ||
    raw.includes("रजिस्टर")
  ) {
    const role = lower.includes("industry") || raw.includes("ਉਦਯੋਗ")
      ? "industry"
      : lower.includes("expert") || raw.includes("ਮਾਹਿਰ")
      ? "expert"
      : lower.includes("customer")
      ? "customer"
      : "artisan";

    const isVoice = lower.includes("voice") || lower.includes("bol") || raw.includes("ਬੋਲ") || raw.includes("बोल");

    return {
      intent: "SIGNUP_HELP",
      entities: { role, isVoice },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // 2. NAVIGATION
  if (
    lower.includes("marketplace") ||
    lower.includes("shop page") ||
    lower.includes("courses") ||
    lower.includes("about us") ||
    lower.includes("meet artisans") ||
    raw.includes("ਮਾਰਕੀਟਪਲੇਸ")
  ) {
    const destination = lower.includes("course")
      ? "courses"
      : lower.includes("about")
      ? "about"
      : lower.includes("artisan")
      ? "artisans"
      : "marketplace";

    return {
      intent: "NAVIGATE",
      entities: { destination },
      detectedLanguage,
      confidence: 0.92,
    };
  }

  // 3. EARNINGS & PAYMENTS (earn, earned, earnings, kamai, kamaya, payout, payment, paise)
  if (
    lower.includes("earn") ||
    lower.includes("kamai") ||
    lower.includes("kamaya") ||
    lower.includes("payout") ||
    lower.includes("payment") ||
    lower.includes("paise") ||
    lower.includes("income") ||
    raw.includes("ਕਮਾਈ") ||
    raw.includes("ਪੈਸੇ") ||
    raw.includes("कमाई") ||
    raw.includes("भुगतान")
  ) {
    if (lower.includes("pending") || lower.includes("baaki") || lower.includes("baki") || raw.includes("ਬਾਕੀ")) {
      return { intent: "PAYMENT_PENDING", entities: {}, detectedLanguage, confidence: 0.95 };
    }
    if (lower.includes("history") || lower.includes("record") || lower.includes("purane") || raw.includes("ਇਤਿਹਾਸ")) {
      return { intent: "PAYMENT_HISTORY", entities: {}, detectedLanguage, confidence: 0.95 };
    }
    return { intent: "PAYMENT_SUMMARY", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 2. DASHBOARD / BUSINESS SUMMARY
  if (
    lower.includes("dashboard") ||
    lower.includes("summary") ||
    lower.includes("analytics") ||
    lower.includes("karobar kaisa") ||
    lower.includes("business kaisa") ||
    lower.includes("how is my business") ||
    lower.includes("overall status") ||
    raw.includes("ਸੰਖੇਪ") ||
    raw.includes("ਕਾਰੋਬਾਰ") ||
    raw.includes("कारोबार")
  ) {
    return { intent: "DASHBOARD_SUMMARY", entities: {}, detectedLanguage, confidence: 0.92 };
  }

  // 3. ORDERS
  if (
    lower.includes("order") ||
    lower.includes("orders") ||
    raw.includes("ਆਰਡਰ") ||
    raw.includes("ऑर्डर")
  ) {
    // Order Actions
    if (lower.includes("accept") || lower.includes("swikar") || raw.includes("ਸਵੀਕਾਰ")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return {
        intent: "ORDER_ACCEPT",
        entities: { orderNumber: match ? match[1] : "" },
        detectedLanguage,
        confidence: 0.92,
      };
    }
    if (lower.includes("reject") || lower.includes("decline") || lower.includes("mana") || raw.includes("ਰੱਦ")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return {
        intent: "ORDER_REJECT",
        entities: { orderNumber: match ? match[1] : "" },
        detectedLanguage,
        confidence: 0.92,
      };
    }
    if (lower.includes("complete") || lower.includes("poora") || lower.includes("finish") || raw.includes("ਪੂਰਾ")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return {
        intent: "ORDER_COMPLETE",
        entities: { orderNumber: match ? match[1] : "" },
        detectedLanguage,
        confidence: 0.92,
      };
    }
    if (lower.includes("detail") || lower.includes("kiska order") || lower.includes("about order")) {
      const match = raw.match(/#?([a-zA-Z0-9_-]{5,})/);
      return {
        intent: "ORDER_DETAILS",
        entities: { orderNumber: match ? match[1] : "" },
        detectedLanguage,
        confidence: 0.9,
      };
    }

    // Order Listing with Status Filter
    let status = "All";
    if (lower.includes("pending") || lower.includes("new") || lower.includes("naye") || raw.includes("ਨਵੇਂ") || raw.includes("ਲੰਬਿਤ")) {
      status = "Pending";
    } else if (lower.includes("completed") || lower.includes("poore") || raw.includes("ਪੂਰੇ")) {
      status = "Completed";
    } else if (lower.includes("processing") || lower.includes("shipped")) {
      status = "Processing";
    }

    return {
      intent: "ORDER_LIST",
      entities: { status },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // 4. ADD PRODUCT (matches "Add a new...", "I want to sell...", "Naya saman bechna hai")
  if (
    lower.startsWith("add ") ||
    lower.includes("add a ") ||
    lower.includes("add new") ||
    lower.includes("want to sell") ||
    lower.includes("sell a ") ||
    lower.includes("sell my ") ||
    lower.includes("naya product") ||
    lower.includes("bechna hai") ||
    lower.includes("jodna hai") ||
    raw.includes("ਨਵਾਂ ਉਤਪਾਦ") ||
    raw.includes("ਵੇਚਣਾ ਹੈ") ||
    raw.includes("ਜੋੜੋ")
  ) {
    const priceMatch = raw.match(/(?:for|rs\.?|inr|₹|price|rate|rupees|at)\s*(\d{2,6})/i) || raw.match(/(\d{3,6})\s*(?:rs\.?|rupees|₹)/i);
    const stockMatch = raw.match(/(?:stock|quantity|items?|units?|pieces?|chairs?|pece|nag|ਨਗ)?\s*(\d+)\s*(?:stock|quantity|items?|units?|pieces?|chairs?|pece|nag|ਨਗ)/i);

    // Try to extract title: between 'add/sell' and 'for/at/with/price/rs'
    let extractedTitle = raw
      .replace(/^(add|i want to sell|sell|add new|add a new|naya product|bechna hai|please add)\s+/i, "")
      .replace(/\s+(for|at|price|with|in category|rs|rupees|₹).*/i, "")
      .replace(/\b(product|item|saman)\b/gi, "")
      .trim();

    return {
      intent: "PRODUCT_ADD",
      entities: {
        title: extractedTitle || undefined,
        price: priceMatch ? Number(priceMatch[1]) : undefined,
        stock: stockMatch ? Number(stockMatch[1]) : undefined,
      },
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // 5. SEARCH & DISCOVERY
  if (
    (lower.startsWith("find ") ||
      lower.startsWith("search ") ||
      lower.startsWith("dhoondo ") ||
      raw.includes("ਲੱਭੋ") ||
      raw.includes("ਢੂੰਢੋ")) &&
    !lower.includes("industry") &&
    !lower.includes("industrialist") &&
    !lower.includes("factory") &&
    !lower.includes("project")
  ) {
    const query = raw
      .replace(/^(find|search|dhoondo|please find|search for|ਲੱਭੋ|ਢੂੰਢੋ)\s+/i, "")
      .replace(/\b(product|item|saman|for)\b/gi, "")
      .trim();
    return {
      intent: "PRODUCT_SEARCH",
      entities: { query: query || raw },
      detectedLanguage,
      confidence: 0.92,
    };
  }

  // 6. PRODUCTS / LISTINGS
  if (
    lower.includes("product") ||
    lower.includes("products") ||
    lower.includes("item") ||
    lower.includes("items") ||
    lower.includes("saman") ||
    lower.includes("cheez") ||
    raw.includes("ਉਤਪਾਦ") ||
    raw.includes("ਸਮਾਨ") ||
    raw.includes("सामान") ||
    raw.includes("उत्पाद")
  ) {
    if (lower.includes("delete") || lower.includes("remove") || lower.includes("hatao") || raw.includes("ਮਿਟਾਓ")) {
      const title = raw.replace(/(delete|remove|hatao|product|item|saman|ਮਿਟਾਓ)/gi, "").trim();
      return {
        intent: "PRODUCT_DELETE",
        entities: { title },
        detectedLanguage,
        confidence: 0.9,
      };
    }

    if (lower.includes("price") || lower.includes("rate") || lower.includes("stock") || lower.includes("update") || lower.includes("change")) {
      const numMatch = raw.match(/\d+/);
      return {
        intent: "PRODUCT_UPDATE",
        entities: {
          price: lower.includes("price") || lower.includes("rate") ? (numMatch ? Number(numMatch[0]) : undefined) : undefined,
          stock: lower.includes("stock") ? (numMatch ? Number(numMatch[0]) : undefined) : undefined,
        },
        detectedLanguage,
        confidence: 0.88,
      };
    }

    if (lower.includes("search") || lower.includes("find") || lower.includes("dhoondo") || raw.includes("ਲੱਭੋ")) {
      const query = raw.replace(/(search|find|dhoondo|product|item|saman|for)/gi, "").trim();
      return {
        intent: "PRODUCT_SEARCH",
        entities: { query },
        detectedLanguage,
        confidence: 0.9,
      };
    }

    return {
      intent: "PRODUCT_LIST",
      entities: {},
      detectedLanguage,
      confidence: 0.95,
    };
  }

  // 6. INDUSTRIALISTS & COLLABORATIONS
  if (
    lower.includes("industry") ||
    lower.includes("industrialist") ||
    lower.includes("factory") ||
    lower.includes("company") ||
    lower.includes("collaboration") ||
    lower.includes("proposal") ||
    lower.includes("enquiry") ||
    lower.includes("project") ||
    raw.includes("ਉਦਯੋਗ") ||
    raw.includes("ਫੈਕਟਰੀ") ||
    raw.includes("उद्योग")
  ) {
    if (lower.includes("accept") || raw.includes("ਸਵੀਕਾਰ")) {
      return { intent: "COLLABORATION_ACCEPT", entities: {}, detectedLanguage, confidence: 0.9 };
    }
    if (lower.includes("request") || lower.includes("enquir") || lower.includes("proposal")) {
      return { intent: "COLLABORATION_REQUESTS", entities: {}, detectedLanguage, confidence: 0.92 };
    }
    return { intent: "FIND_INDUSTRIALISTS", entities: {}, detectedLanguage, confidence: 0.92 };
  }

  // 7. PROFILE
  if (
    lower.includes("profile") ||
    lower.includes("account") ||
    lower.includes("mera naam") ||
    lower.includes("phone number") ||
    lower.includes("my details") ||
    raw.includes("ਪ੍ਰੋਫਾਈਲ") ||
    raw.includes("ਪ੍ਰੋਫਾਈਲ") ||
    raw.includes("प्रोफाइल")
  ) {
    if (lower.includes("change") || lower.includes("update") || lower.includes("badlo") || raw.includes("ਬਦਲੋ")) {
      const phoneDigits = raw.replace(/\D/g, "");
      return {
        intent: "PROFILE_UPDATE",
        entities: {
          phone: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : undefined,
        },
        detectedLanguage,
        confidence: 0.9,
      };
    }
    return { intent: "PROFILE_GET", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 8. NOTIFICATIONS
  if (lower.includes("notification") || lower.includes("alert") || lower.includes("message") || raw.includes("ਸੂਚਨਾ")) {
    return { intent: "NOTIFICATIONS_GET", entities: {}, detectedLanguage, confidence: 0.95 };
  }

  // 10. HELP
  if (
    lower.includes("help") ||
    lower.includes("madad") ||
    lower.includes("sahayata") ||
    lower.includes("kaise") ||
    lower.includes("how to") ||
    raw.includes("ਮਦਦ") ||
    raw.includes("ਸਹਾਇਤਾ") ||
    raw.includes("मदद") ||
    raw.includes("सहायता")
  ) {
    return { intent: "HELP", entities: {}, detectedLanguage, confidence: 0.9 };
  }

  return { intent: "UNKNOWN", entities: { raw }, detectedLanguage, confidence: 0.4 };
}

/**
 * Main intent extraction pipeline
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
