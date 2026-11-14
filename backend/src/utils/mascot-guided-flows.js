/**
 * SkillBridge Backend Guided Mascot Flows & Multilingual Dictionaries
 * Defines questions, localized prompts, validations, and response builders.
 */

export const BACKEND_SHOP_QUESTIONS = [
  {
    id: "SQ1",
    key: "name",
    dbField: "name",
    required: true,
    prompts: {
      pa: "ਤੁਹਾਡੀ ਦੁਕਾਨ ਦਾ ਨਾਂ ਕੀ ਹੈ?",
      hi: "आपकी दुकान का नाम क्या है?",
      en: "What is your shop name?",
    },
  },
  {
    id: "SQ2",
    key: "category",
    dbField: "category",
    required: true,
    prompts: {
      pa: "ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦੇ ਉਤਪਾਦ ਵੇਚਦੇ ਹੋ?",
      hi: "आप किस प्रकार के उत्पाद बेचते हैं?",
      en: "What type of products do you sell?",
    },
  },
  {
    id: "SQ3",
    key: "description",
    dbField: "description",
    required: true,
    prompts: {
      pa: "ਆਪਣੀ ਦੁਕਾਨ ਬਾਰੇ ਕੁਝ ਦੱਸੋ।",
      hi: "अपनी दुकान के बारे में कुछ बताएं।",
      en: "Tell me about your shop.",
    },
  },
  {
    id: "SQ4",
    key: "location",
    dbField: "location",
    required: true,
    prompts: {
      pa: "ਤੁਹਾਡੀ ਦੁਕਾਨ ਕਿੱਥੇ ਸਥਿਤ ਹੈ?",
      hi: "आपकी दुकान कहाँ स्थित है?",
      en: "Where is your shop located?",
    },
  },
  {
    id: "SQ5",
    key: "speciality",
    dbField: "speciality",
    required: false,
    prompts: {
      pa: "ਤੁਹਾਡੀ ਦੁਕਾਨ ਦੀ ਕੀ ਖਾਸੀਅਤ ਹੈ?",
      hi: "आपकी दुकान में क्या खास है?",
      en: "What makes your shop special?",
    },
  },
  {
    id: "SQ6",
    key: "logo",
    dbField: "logo",
    required: false,
    prompts: {
      pa: "ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਦੁਕਾਨ ਦਾ ਲੋਗੋ ਜਾਂ ਕਵਰ ਫੋਟੋ ਹੈ?",
      hi: "क्या आपके पास दुकान का लोगो या कवर फोटो है?",
      en: "Do you have a shop logo or cover image?",
    },
  },
];

export const BACKEND_PRODUCT_QUESTIONS = [
  {
    id: "PQ1",
    key: "title",
    dbField: "title",
    required: true,
    prompts: {
      pa: "ਤੁਹਾਡੇ ਉਤਪਾਦ ਦਾ ਨਾਂ ਕੀ ਹੈ?",
      hi: "आपके उत्पाद का नाम क्या है?",
      en: "What is the name of your product?",
    },
  },
  {
    id: "PQ2",
    key: "category",
    dbField: "category",
    required: true,
    prompts: {
      pa: "ਇਹ ਕਿਸ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਆਉਂਦਾ ਹੈ?",
      hi: "यह किस श्रेणी में आता है?",
      en: "Which category does it belong to?",
    },
  },
  {
    id: "PQ3",
    key: "description",
    dbField: "description",
    required: true,
    prompts: {
      pa: "ਆਪਣੇ ਉਤਪਾਦ ਦਾ ਵੇਰਵਾ ਦਿਓ।",
      hi: "अपने उत्पाद का संक्षिप्त विवरण दें।",
      en: "Describe your product.",
    },
  },
  {
    id: "PQ4",
    key: "price",
    dbField: "price",
    required: true,
    type: "number",
    prompts: {
      pa: "ਤੁਹਾਡੇ ਉਤਪਾਦ ਦੀ ਕੀਮਤ ਕਿੰਨੀ ਹੈ?",
      hi: "आपके उत्पाद की कीमत क्या है?",
      en: "What is the price of your product?",
    },
  },
  {
    id: "PQ5",
    key: "stock",
    dbField: "stock",
    required: true,
    type: "number",
    prompts: {
      pa: "ਕਿੰਨੇ ਨਗ ਉਪਲਬਧ ਹਨ?",
      hi: "कितने पीस उपलब्ध हैं?",
      en: "How many units are available?",
    },
  },
  {
    id: "PQ6",
    key: "materials",
    dbField: "materials",
    required: false,
    prompts: {
      pa: "ਇਸ ਵਿੱਚ ਕਿਹੜਾ ਸਮਾਨ (ਮੈਟੀਰੀਅਲ) ਵਰਤਿਆ ਗਿਆ ਹੈ?",
      hi: "इसमें कौन सी सामग्री इस्तेमाल हुई है?",
      en: "What material is used to make this product?",
    },
  },
  {
    id: "PQ7",
    key: "craftTime",
    dbField: "craftTime",
    required: false,
    prompts: {
      pa: "ਬਣਾਉਣ ਜਾਂ ਡਿਲੀਵਰ ਕਰਨ ਵਿੱਚ ਅੰਦਾਜ਼ਨ ਕਿੰਨਾ ਸਮਾਂ ਲੱਗਦਾ ਹੈ?",
      hi: "बनाने या डिलीवर करने में कितना समय लगता है?",
      en: "What is the estimated time required to make or deliver it?",
    },
  },
  {
    id: "PQ8",
    key: "image",
    dbField: "image",
    required: false,
    prompts: {
      pa: "ਉਤਪਾਦ ਦੀ ਇੱਕ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ।",
      hi: "उत्पाद की एक फोटो अपलोड करें।",
      en: "Upload a product image.",
    },
  },
];

/**
 * Validate price
 */
export function validateBackendPrice(val) {
  if (typeof val === "number") return val > 0 ? val : null;
  if (!val || typeof val !== "string") return null;
  if (/-\s*\d/.test(val)) return null;
  const match = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(match);
  return !isNaN(num) && num > 0 ? Math.round(num) : null;
}

/**
 * Validate stock
 */
export function validateBackendStock(val) {
  if (typeof val === "number") return val >= 1 ? Math.floor(val) : null;
  if (!val || typeof val !== "string") return null;
  if (/-\s*\d/.test(val)) return null;
  const match = val.replace(/[^0-9]/g, "");
  const num = parseInt(match, 10);
  return !isNaN(num) && num >= 1 ? num : null;
}
