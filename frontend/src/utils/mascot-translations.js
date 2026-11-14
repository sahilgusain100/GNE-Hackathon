/**
 * SkillBridge AI Mascot - Multilingual Translations, Guided Questions & Templates
 * Strict language support:
 * - pa: Punjabi in Gurmukhi script
 * - hi: Natural Hindi in Devanagari script
 * - en: English
 */

export const SHOP_QUESTIONS = [
  {
    id: 'SQ1',
    key: 'name',
    dbField: 'name',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਚਲੋ ਤੁਹਾਡੀ ਦੁਕਾਨ ਬਣਾਉਂਦੇ ਹਾਂ। ਪਹਿਲਾ ਸਵਾਲ: ਤੁਹਾਡੀ ਦੁਕਾਨ ਦਾ ਨਾਂ ਕੀ ਹੈ?',
        display: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਦਾ ਨਾਂ ਕੀ ਹੈ?',
        hint: 'ਜਿਵੇਂ: ਗੁਰਪ੍ਰੀਤ ਫੁਲਕਾਰੀ ਹਾਊਸ, ਪੰਜਾਬ ਹੈਂਡੀਕਰਾਫਟਸ',
      },
      hi: {
        spoken: 'नमस्ते जी! चलिए आपकी दुकान बनाते हैं। पहला सवाल: आपकी दुकान का नाम क्या है?',
        display: 'आपकी दुकान का नाम क्या है?',
        hint: 'जैसे: गुरप्रीत फुलकारी हाउस, पंजाब हैंडीक्राफ्ट्स',
      },
      en: {
        spoken: "Welcome! Let's set up your shop. First question: What is your shop name?",
        display: 'What is your shop name?',
        hint: 'e.g. Gurpreet Phulkari House, Punjab Handicrafts',
      },
    },
  },
  {
    id: 'SQ2',
    key: 'category',
    dbField: 'category',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਤੁਸੀਂ ਆਪਣੀ ਦੁਕਾਨ ਵਿੱਚ ਕਿਸ ਤਰ੍ਹਾਂ ਦੇ ਉਤਪਾਦ ਵੇਚਦੇ ਹੋ ਜੀ?',
        display: 'ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦੇ ਉਤਪਾਦ ਵੇਚਦੇ ਹੋ?',
        hint: 'ਜਿਵੇਂ: ਫੁਲਕਾਰੀ, ਕਢਾਈ ਵਾਲੇ ਕੱਪੜੇ, ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ, ਲੱਕੜੀ ਦੀ ਦਸਤਕਾਰੀ',
      },
      hi: {
        spoken: 'आप अपनी दुकान में किस प्रकार के उत्पाद बेचते हैं जी?',
        display: 'आप किस प्रकार के उत्पाद बेचते हैं?',
        hint: 'जैसे: फुलकारी, कढ़ाई के वस्त्र, हस्तनिर्मित आभूषण, लकड़ी के शिल्प',
      },
      en: {
        spoken: 'What type of products do you sell in your shop?',
        display: 'What type of products do you sell?',
        hint: 'e.g. Phulkari, Hand Embroidery, Pottery, Wooden Crafts',
      },
    },
  },
  {
    id: 'SQ3',
    key: 'description',
    dbField: 'description',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਆਪਣੀ ਦੁਕਾਨ ਅਤੇ ਕੰਮ ਬਾਰੇ ਕੁਝ ਸ਼ਬਦਾਂ ਵਿੱਚ ਦੱਸੋ ਜੀ।',
        display: 'ਆਪਣੀ ਦੁਕਾਨ ਬਾਰੇ ਕੁਝ ਦੱਸੋ।',
        hint: 'ਜਿਵੇਂ: ਅਸੀਂ ਪਿਛਲੇ ਕਈ ਸਾਲਾਂ ਤੋਂ ਰਵਾਇਤੀ ਹੱਥ ਦੀ ਕਾਰੀਗਰੀ ਨਾਲ ਸੂਟ ਅਤੇ ਸ਼ਾਲ ਤਿਆਰ ਕਰਦੇ ਹਾਂ।',
      },
      hi: {
        spoken: 'अपनी दुकान और अपने काम के बारे में कुछ बताइए जी।',
        display: 'अपनी दुकान के बारे में कुछ बताएं।',
        hint: 'जैसे: हम कई वर्षों से पारंपरिक हस्तकला और बारीक कढ़ाई के उत्पाद तैयार करते हैं।',
      },
      en: {
        spoken: 'Tell me about your shop and your craft work.',
        display: 'Tell me about your shop.',
        hint: 'e.g. We have been handcrafting heritage embroidery and authentic textiles for years.',
      },
    },
  },
  {
    id: 'SQ4',
    key: 'location',
    dbField: 'location',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਕਿਹੜੇ ਸ਼ਹਿਰ ਜਾਂ ਪਿੰਡ ਵਿੱਚ ਸਥਿਤ ਹੈ ਜੀ?',
        display: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਕਿੱਥੇ ਸਥਿਤ ਹੈ?',
        hint: 'ਜਿਵੇਂ: ਅੰਮ੍ਰਿਤਸਰ, ਪਟਿਆਲਾ, ਲੁਧਿਆਣਾ, ਜਲੰਧਰ',
      },
      hi: {
        spoken: 'आपकी दुकान किस शहर या गाँव में स्थित है जी?',
        display: 'आपकी दुकान कहाँ स्थित है?',
        hint: 'जैसे: अमृतसर, पटियाला, लुधियाना, जयपुर',
      },
      en: {
        spoken: 'Where is your shop located? Name the city or village.',
        display: 'Where is your shop located?',
        hint: 'e.g. Amritsar, Patiala, Ludhiana, Jaipur',
      },
    },
  },
  {
    id: 'SQ5',
    key: 'speciality',
    dbField: 'speciality',
    required: false,
    prompts: {
      pa: {
        spoken: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਜਾਂ ਕਾਰੀਗਰੀ ਵਿੱਚ ਕੀ ਖਾਸ ਹੈ ਜੋ ਗਾਹਕਾਂ ਨੂੰ ਪਸੰਦ ਆਉਂਦਾ ਹੈ?',
        display: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਦੀ ਕੀ ਖਾਸੀਅਤ ਹੈ?',
        hint: 'ਜਿਵੇਂ: 100% ਸ਼ੁੱਧ ਰੇਸ਼ਮੀ ਧਾਗਾ, ਪੁਰਾਤਨ ਰਵਾਇਤੀ ਡਿਜ਼ਾਈਨ, ਨਿਰਪੱਖ ਕੀਮਤ',
      },
      hi: {
        spoken: 'आपकी दुकान या कला में ऐसी क्या खासियत है जो ग्राहकों को पसंद आती है?',
        display: 'आपकी दुकान में क्या खास है?',
        hint: 'जैसे: 100% शुद्ध रेशम, प्रामाणिक पारंपरिक डिज़ाइन, टिकाऊ गुणवत्ता',
      },
      en: {
        spoken: 'What makes your shop and craft special or unique?',
        display: 'What makes your shop special?',
        hint: 'e.g. 100% pure silk thread, authentic heritage designs, premium quality',
      },
    },
  },
  {
    id: 'SQ6',
    key: 'logo',
    dbField: 'logo',
    required: false,
    isImageUpload: true,
    prompts: {
      pa: {
        spoken: 'ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਦੁਕਾਨ ਦਾ ਲੋਗੋ ਜਾਂ ਕਵਰ ਫੋਟੋ ਹੈ? ਤੁਸੀਂ ਫੋਟੋ ਚੁਣ ਸਕਦੇ ਹੋ ਜਾਂ ਛੱਡ ਸਕਦੇ ਹੋ।',
        display: 'ਕੀ ਤੁਹਾਡੇ ਕੋਲ ਦੁਕਾਨ ਦਾ ਲੋਗੋ ਜਾਂ ਕਵਰ ਫੋਟੋ ਹੈ?',
        hint: 'ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ ਜਾਂ ਅੱਗੇ ਵਧਣ ਲਈ ਛੱਡੋ',
      },
      hi: {
        spoken: 'क्या आपके पास दुकान का लोगो या कवर फोटो है? आप फोटो अपलोड कर सकते हैं या छोड़ सकते हैं।',
        display: 'क्या आपके पास दुकान का लोगो या कवर फोटो है?',
        hint: 'फोटो अपलोड करें या आगे बढ़ने के लिए छोड़ें',
      },
      en: {
        spoken: 'Do you have a shop logo or cover image? You can upload a photo or skip this step.',
        display: 'Do you have a shop logo or cover image?',
        hint: 'Upload an image or skip to continue',
      },
    },
  },
]

export const PRODUCT_QUESTIONS = [
  {
    id: 'PQ1',
    key: 'title',
    dbField: 'title',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਚਲੋ ਨਵਾਂ ਉਤਪਾਦ ਜੋੜਦੇ ਹਾਂ! ਤੁਹਾਡੇ ਉਤਪਾਦ ਦਾ ਨਾਂ ਕੀ ਹੈ ਜੀ?',
        display: 'ਤੁਹਾਡੇ ਉਤਪਾਦ ਦਾ ਨਾਂ ਕੀ ਹੈ?',
        hint: 'ਜਿਵੇਂ: ਹੱਥ ਨਾਲ ਕੱਢੀ ਫੁਲਕਾਰੀ ਦੁਪੱਟਾ, ਸ਼ਾਹੀ ਪੰਜਾਬੀ ਜੁੱਤੀ',
      },
      hi: {
        spoken: 'चलिए नया उत्पाद जोड़ते हैं! आपके उत्पाद का नाम क्या है जी?',
        display: 'आपके उत्पाद का नाम क्या है?',
        hint: 'जैसे: हाथ से कढ़ा फुलकारी दुपट्टा, शाही पंजाबी जूती',
      },
      en: {
        spoken: "Let's add your product! What is the name of your product?",
        display: 'What is the name of your product?',
        hint: 'e.g. Handcrafted Phulkari Dupatta, Royal Punjabi Jutti',
      },
    },
  },
  {
    id: 'PQ2',
    key: 'category',
    dbField: 'category',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਇਹ ਉਤਪਾਦ ਕਿਸ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਆਉਂਦਾ ਹੈ ਜੀ?',
        display: 'ਇਹ ਕਿਸ ਸ਼੍ਰੇਣੀ ਵਿੱਚ ਆਉਂਦਾ ਹੈ?',
        hint: 'ਜਿਵੇਂ: ਫੁਲਕਾਰੀ ਤੇ ਕੱਪੜੇ, ਜੁੱਤੀਆਂ, ਮਿੱਟੀ ਦੇ ਬਰਤਨ, ਗਹਿਣੇ',
      },
      hi: {
        spoken: 'यह उत्पाद किस श्रेणी (कैटेगरी) में आता है जी?',
        display: 'यह किस श्रेणी में आता है?',
        hint: 'जैसे: वस्त्र व फुलकारी, पारंपरिक जूतियाँ, मिट्टी के बर्तन, आभूषण',
      },
      en: {
        spoken: 'Which category does this product belong to?',
        display: 'Which category does it belong to?',
        hint: 'e.g. Apparel & Phulkari, Traditional Footwear, Pottery, Jewelry',
      },
    },
  },
  {
    id: 'PQ3',
    key: 'description',
    dbField: 'description',
    required: true,
    prompts: {
      pa: {
        spoken: 'ਆਪਣੇ ਉਤਪਾਦ ਦਾ ਸੰਖੇਪ ਵੇਰਵਾ ਦਿਓ, ਜਿਵੇਂ ਡਿਜ਼ਾਈਨ, ਰੰਗ ਜਾਂ ਆਕਾਰ।',
        display: 'ਆਪਣੇ ਉਤਪਾਦ ਦਾ ਵੇਰਵਾ ਦਿਓ।',
        hint: 'ਜਿਵੇਂ: ਸ਼ੁੱਧ ਜੌਰਜੈੱਟ ਕੱਪੜੇ ਉੱਤੇ ਰੇਸ਼ਮੀ ਧਾਗੇ ਨਾਲ ਕੱਢਿਆ ਲਾਲ ਫੁਲਕਾਰੀ ਦੁਪੱਟਾ',
      },
      hi: {
        spoken: 'अपने उत्पाद का संक्षिप्त विवरण दें, जैसे डिज़ाइन, रंग या साइज़।',
        display: 'अपने उत्पाद का विवरण दें।',
        hint: 'जैसे: शुद्ध जॉर्जेट पर रेशमी धागों से बारीक कढ़ा हुआ खूबसूरत लाल दुपट्टा',
      },
      en: {
        spoken: 'Describe your product, including design, color, or dimensions.',
        display: 'Describe your product.',
        hint: 'e.g. Intricate silk embroidery on pure georgette fabric in vibrant crimson',
      },
    },
  },
  {
    id: 'PQ4',
    key: 'price',
    dbField: 'price',
    required: true,
    type: 'number',
    min: 1,
    prompts: {
      pa: {
        spoken: 'ਤੁਹਾਡੇ ਉਤਪਾਦ ਦੀ ਕੀਮਤ ਰੁਪਏ ਵਿੱਚ ਕਿੰਨੀ ਰੱਖਣੀ ਹੈ ਜੀ?',
        display: 'ਤੁਹਾਡੇ ਉਤਪਾਦ ਦੀ ਕੀਮਤ ਕਿੰਨੀ ਹੈ?',
        hint: 'ਜਿਵੇਂ: 1500, 2400 (ਸਿਰਫ਼ ਰੁਪਏ ਲਿਖੋ)',
        error: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਕੀਮਤ ਰੁਪਏ ਵਿੱਚ ਦੱਸੋ (ਜਿਵੇਂ: 1500)। ਇਹ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।',
      },
      hi: {
        spoken: 'आपके उत्पाद की कीमत रुपये में क्या रखनी है जी?',
        display: 'आपके उत्पाद की कीमत क्या है?',
        hint: 'जैसे: 1500, 2400 (केवल संख्या)',
        error: 'कृपया सही कीमत रुपये में दर्ज करें (जैसे: 1500)। यह 0 से अधिक होनी चाहिए।',
      },
      en: {
        spoken: 'What is the price of your product in rupees?',
        display: 'What is the price of your product?',
        hint: 'e.g. 1500, 2400 (numbers only)',
        error: 'Please enter a valid price in rupees (e.g. 1500). Price must be greater than 0.',
      },
    },
  },
  {
    id: 'PQ5',
    key: 'stock',
    dbField: 'stock',
    required: true,
    type: 'number',
    min: 1,
    prompts: {
      pa: {
        spoken: 'ਵਿਕਰੀ ਲਈ ਕਿੰਨੇ ਨਗ (ਸਟਾਕ) ਉਪਲਬਧ ਹਨ ਜੀ?',
        display: 'ਕਿੰਨੇ ਨਗ ਉਪਲਬਧ ਹਨ?',
        hint: 'ਜਿਵੇਂ: 5, 10, 25',
        error: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਗਿਣਤੀ ਦੱਸੋ (ਜਿਵੇਂ: 5)। ਇਹ ਘੱਟੋ-ਘੱਟ 1 ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।',
      },
      hi: {
        spoken: 'बिक्री के लिए कितने पीस (स्टॉक) उपलब्ध हैं जी?',
        display: 'कितने पीस उपलब्ध हैं?',
        hint: 'जैसे: 5, 10, 25',
        error: 'कृपया सही संख्या दर्ज करें (जैसे: 5)। यह कम से कम 1 होनी चाहिए।',
      },
      en: {
        spoken: 'How many units are available for sale?',
        display: 'How many units are available?',
        hint: 'e.g. 5, 10, 25',
        error: 'Please enter a valid quantity (e.g. 5). Must be at least 1 unit.',
      },
    },
  },
  {
    id: 'PQ6',
    key: 'materials',
    dbField: 'materials',
    required: false,
    prompts: {
      pa: {
        spoken: 'ਇਸ ਉਤਪਾਦ ਨੂੰ ਬਣਾਉਣ ਲਈ ਕਿਹੜਾ ਸਮਾਨ (ਮੈਟੀਰੀਅਲ) ਵਰਤਿਆ ਗਿਆ ਹੈ ਜੀ?',
        display: 'ਇਸ ਵਿੱਚ ਕਿਹੜਾ ਸਮਾਨ (ਮੈਟੀਰੀਅਲ) ਵਰਤਿਆ ਗਿਆ ਹੈ?',
        hint: 'ਜਿਵੇਂ: ਸ਼ੁੱਧ ਸੂਤੀ ਕੱਪੜਾ, ਰੇਸ਼ਮੀ ਧਾਗਾ, ਲੱਕੜ, ਚਮੜਾ',
      },
      hi: {
        spoken: 'इस उत्पाद को बनाने के लिए कौन सी सामग्री इस्तेमाल की गई है जी?',
        display: 'इसमें कौन सी सामग्री इस्तेमाल हुई है?',
        hint: 'जैसे: शुद्ध सूती वस्त्र, रेशमी धागा, शीशम की लकड़ी, प्राकृतिक रंग',
      },
      en: {
        spoken: 'What material is used to make this product?',
        display: 'What material is used to make this product?',
        hint: 'e.g. Pure Cotton, Silk Thread, Sheesham Wood, Natural Dyes',
      },
    },
  },
  {
    id: 'PQ7',
    key: 'craftTime',
    dbField: 'craftTime',
    required: false,
    prompts: {
      pa: {
        spoken: 'ਇਸਨੂੰ ਬਣਾਉਣ ਜਾਂ ਡਿਲੀਵਰ ਕਰਨ ਵਿੱਚ ਅੰਦਾਜ਼ਨ ਕਿੰਨਾ ਸਮਾਂ ਲੱਗਦਾ ਹੈ ਜੀ?',
        display: 'ਬਣਾਉਣ ਜਾਂ ਡਿਲੀਵਰ ਕਰਨ ਵਿੱਚ ਅੰਦਾਜ਼ਨ ਕਿੰਨਾ ਸਮਾਂ ਲੱਗਦਾ ਹੈ?',
        hint: 'ਜਿਵੇਂ: 3-5 ਦਿਨ, 1 ਹਫ਼ਤਾ',
      },
      hi: {
        spoken: 'इसे तैयार करने या डिलीवर करने में अनुमानित कितना समय लगता है जी?',
        display: 'बनाने या डिलीवर करने में कितना समय लगता है?',
        hint: 'जैसे: 3-5 दिन, 1 हफ्ता',
      },
      en: {
        spoken: 'What is the estimated time required to make or deliver it?',
        display: 'What is the estimated time required to make or deliver it?',
        hint: 'e.g. 3-5 days, 1 week',
      },
    },
  },
  {
    id: 'PQ8',
    key: 'image',
    dbField: 'image',
    required: false,
    isImageUpload: true,
    prompts: {
      pa: {
        spoken: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਉਤਪਾਦ ਦੀ ਇੱਕ ਸਾਫ਼ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ ਜੀ।',
        display: 'ਉਤਪਾਦ ਦੀ ਇੱਕ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ।',
        hint: 'ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ ਜਾਂ ਬਾਅਦ ਵਿੱਚ ਜੋੜਨ ਲਈ ਛੱਡੋ',
      },
      hi: {
        spoken: 'कृपया अपने उत्पाद की एक स्पष्ट फोटो अपलोड करें जी।',
        display: 'उत्पाद की एक फोटो अपलोड करें।',
        hint: 'फोटो अपलोड करें या बाद में जोड़ने के लिए छोड़ें',
      },
      en: {
        spoken: 'Please upload a photograph of your product.',
        display: 'Upload a product image.',
        hint: 'Upload an image or skip to add later',
      },
    },
  },
]

export const MASCOT_UI = {
  options: {
    createShop: {
      pa: 'ਮੇਰੀ ਦੁਕਾਨ ਬਣਾਓ',
      hi: 'मेरी दुकान बनाएँ',
      en: 'Create My Shop',
      desc: {
        pa: 'ਕਦਮ-ਦਰ-ਕਦਮ ਆਪਣੀ ਦੁਕਾਨ ਸਥਾਪਿਤ ਕਰੋ',
        hi: 'आसान चरणों में अपनी दुकान स्थापित करें',
        en: 'Step-by-step guided shop setup',
      },
    },
    addProduct: {
      pa: 'ਉਤਪਾਦ ਜੋੜੋ',
      hi: 'उत्पाद जोड़ें',
      en: 'Add a Product',
      desc: {
        pa: 'ਨਵਾਂ ਦਸਤਕਾਰੀ ਉਤਪਾਦ ਜੋੜੋ ਤੇ ਪਬਲਿਸ਼ ਕਰੋ',
        hi: 'नया हस्तशिल्प उत्पाद जोड़ें और प्रकाशित करें',
        en: 'List and publish handmade craft',
      },
    },
    askAnything: {
      pa: 'ਕੁਝ ਵੀ ਪੁੱਛੋ',
      hi: 'कुछ भी पूछें',
      en: 'Ask Me Anything',
      desc: {
        pa: 'ਪਲੇਟਫਾਰਮ, ਆਰਡਰਾਂ ਤੇ ਕੀਮਤਾਂ ਬਾਰੇ ਪੁੱਛੋ',
        hi: 'प्लेटफॉर्म, ऑर्डर और कीमत के बारे में पूछें',
        en: 'Questions about platform, orders & pricing',
      },
    },
  },

  status: {
    listening: {
      pa: '🎙️ ਸੁਣ ਰਿਹਾ ਹਾਂ... ਬੋਲੋ ਜੀ',
      hi: '🎙️ सुन रहा हूँ... बोलिए जी',
      en: '🎙️ Listening to you... speak now',
    },
    speaking: {
      pa: '🔊 ਮੈਸਕੌਟ ਬੋਲ ਰਿਹਾ ਹੈ...',
      hi: '🔊 मैस्कॉट बोल रहा है...',
      en: '🔊 Mascot speaking...',
    },
    processing: {
      pa: '⚡ ਸੋਚ ਰਿਹਾ ਹਾਂ...',
      hi: '⚡ सोच रहा हूँ...',
      en: '⚡ Mascot thinking...',
    },
    ready: {
      pa: '✨ ਮਦਦ ਲਈ ਤਿਆਰ • ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ',
      hi: '✨ मदद के लिए तैयार • बोलने के लिए माइक दबाएं',
      en: '✨ Ready to help • Tap mic to speak',
    },
  },

  actions: {
    next: { pa: 'ਅੱਗੇ ਵਧੋ', hi: 'आगे बढ़ें', en: 'Next' },
    back: { pa: 'ਪਿੱਛੇ', hi: 'पीछे', en: 'Back' },
    cancel: { pa: 'ਰੱਦ ਕਰੋ', hi: 'रद्द करें', en: 'Cancel' },
    edit: { pa: 'ਬਦਲੋ', hi: 'बदलें', en: 'Edit' },
    skip: { pa: 'ਛੱਡੋ', hi: 'छोड़ें', en: 'Skip' },
    confirmCreateShop: { pa: 'ਪੁਸ਼ਟੀ ਕਰੋ ਤੇ ਦੁਕਾਨ ਬਣਾਓ', hi: 'पुष्टि करें और दुकान बनाएँ', en: 'Confirm & Create Shop' },
    confirmPublishProduct: { pa: 'ਪੁਸ਼ਟੀ ਕਰੋ ਤੇ ਉਤਪਾਦ ਪਬਲਿਸ਼ ਕਰੋ', hi: 'पुष्टि करें और उत्पाद प्रकाशित करें', en: 'Confirm & Publish Product' },
    uploadImage: { pa: 'ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ', hi: 'फोटो अपलोड करें', en: 'Upload Photo' },
    changeImage: { pa: 'ਫੋਟੋ ਬਦਲੋ', hi: 'फोटो बदलें', en: 'Change Photo' },
    saving: { pa: 'ਸੰਭਾਲਿਆ ਜਾ ਰਿਹਾ ਹੈ...', hi: 'सुरक्षित हो रहा है...', en: 'Saving...' },
    viewShop: { pa: 'ਮੇਰੀ ਦੁਕਾਨ ਦੇਖੋ', hi: 'मेरी दुकान देखें', en: 'View My Shop' },
    viewProduct: { pa: 'ਉਤਪਾਦ ਸੂਚੀ ਦੇਖੋ', hi: 'उत्पाद सूची देखें', en: 'View Product Listing' },
    resumeWorkflow: { pa: 'ਸਵਾਲ ਜਾਰੀ ਰੱਖੋ', hi: 'सवाल जारी रखें', en: 'Resume Question' },
    backToMenu: { pa: 'ਮੁੱਖ ਮੀਨੂ', hi: 'मुख्य मेनू', en: 'Main Menu' },
    yes: { pa: 'ਹਾਂ, ਪੁਸ਼ਟੀ ਕਰੋ', hi: 'हाँ, पुष्टि करें', en: 'Yes, Confirm' },
    no: { pa: 'ਰੱਦ ਕਰੋ', hi: 'रद्द करें', en: 'Cancel' },
  },

  preview: {
    shopTitle: { pa: 'ਦੁਕਾਨ ਵੇਰਵੇ ਦੀ ਝਲਕ (ਪ੍ਰੀਵਿਊ)', hi: 'दुकान विवरण पूर्वावलोकन', en: 'Shop Information Preview' },
    productTitle: { pa: 'ਉਤਪਾਦ ਵੇਰਵੇ ਦੀ ਝਲਕ (ਪ੍ਰੀਵਿਊ)', hi: 'उत्पाद विवरण पूर्वावलोकन', en: 'Product Information Preview' },
    name: { pa: 'ਦੁਕਾਨ ਦਾ ਨਾਂ', hi: 'दुकान का नाम', en: 'Shop Name' },
    category: { pa: 'ਸ਼੍ਰੇਣੀ', hi: 'श्रेणी', en: 'Category' },
    description: { pa: 'ਵੇਰਵਾ', hi: 'विवरण', en: 'Description' },
    location: { pa: 'ਸਥਾਨ', hi: 'स्थान', en: 'Location' },
    speciality: { pa: 'ਖਾਸੀਅਤ', hi: 'खासियत', en: 'Speciality' },
    logo: { pa: 'ਲੋਗੋ / ਕਵਰ ਫੋਟੋ', hi: 'लोगो / कवर फोटो', en: 'Logo / Cover Image' },
    productName: { pa: 'ਉਤਪਾਦ ਦਾ ਨਾਂ', hi: 'उत्पाद का नाम', en: 'Product Name' },
    price: { pa: 'ਕੀਮਤ', hi: 'कीमत', en: 'Price' },
    stock: { pa: 'ਉਪਲਬਧ ਨਗ (ਸਟਾਕ)', hi: 'उपलब्ध पीस (स्टॉक)', en: 'Available Stock' },
    materials: { pa: 'ਸਮਾਨ (ਮੈਟੀਰੀਅਲ)', hi: 'सामग्री', en: 'Materials' },
    craftTime: { pa: 'ਤਿਆਰੀ / ਡਿਲੀਵਰੀ ਦਾ ਸਮਾਂ', hi: 'बनाने / डिलीवरी का समय', en: 'Craft / Delivery Time' },
    image: { pa: 'ਉਤਪਾਦ ਫੋਟੋ', hi: 'उत्पाद फोटो', en: 'Product Photo' },
    notProvided: { pa: 'ਨਹੀਂ ਦਿੱਤਾ', hi: 'उपलब्ध नहीं', en: 'Not provided' },
  },

  feedback: {
    requireShopFirst: {
      pa: 'ਤੁਹਾਡੇ ਕੋਲ ਅਜੇ ਕੋਈ ਦੁਕਾਨ ਨਹੀਂ ਹੈ! ਉਤਪਾਦ ਜੋੜਨ ਤੋਂ ਪਹਿਲਾਂ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਦੁਕਾਨ ਬਣਾਓ।',
      hi: 'आपके पास अभी कोई दुकान नहीं है! उत्पाद जोड़ने से पहले कृपया अपनी दुकान बनाएँ।',
      en: "You don't have a shop yet! Please create your shop before adding products.",
    },
    alreadyHasShop: {
      pa: 'ਤੁਹਾਡੀ ਦੁਕਾਨ ਪਹਿਲਾਂ ਹੀ ਬਣੀ ਹੋਈ ਹੈ। ਤੁਸੀਂ ਆਪਣੇ ਵੇਰਵੇ ਅਪਡੇਟ ਕਰ ਸਕਦੇ ਹੋ ਜਾਂ ਨਵਾਂ ਉਤਪਾਦ ਜੋੜ ਸਕਦੇ ਹੋ।',
      hi: 'आपकी दुकान पहले से बनी हुई है। आप विवरण अपडेट कर सकते हैं या नया उत्पाद जोड़ सकते हैं।',
      en: 'Your shop already exists. You can update your shop details or add a product.',
    },
    shopCreatedSuccess: {
      pa: '🎉 ਮੁਬਾਰਕਾਂ! ਤੁਹਾਡੀ ਦੁਕਾਨ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਈ ਹੈ। ਹੁਣ ਤੁਸੀਂ ਆਸਾਨੀ ਨਾਲ ਉਤਪਾਦ ਜੋੜ ਸਕਦੇ ਹੋ!',
      hi: '🎉 बधाई हो! आपकी दुकान सफलतापूर्वक बन गई है। अब आप आसानी से उत्पाद जोड़ सकते हैं!',
      en: '🎉 Congratulations! Your shop has been created successfully. You can now add products!',
    },
    productPublishedSuccess: {
      pa: '🎉 ਸ਼ਾਨਦਾਰ! ਤੁਹਾਡਾ ਉਤਪਾਦ ਤਿਆਰ ਹੋ ਕੇ ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਪਬਲਿਸ਼ ਹੋ ਗਿਆ ਹੈ। ਗਾਹਕ ਇਸਨੂੰ ਹੁਣੇ ਖਰੀਦ ਸਕਦੇ ਹਨ!',
      hi: '🎉 बहुत बढ़िया! आपका उत्पाद तैयार होकर मार्केटप्लेस में प्रकाशित हो चुका है। ग्राहक इसे अभी खरीद सकते हैं!',
      en: '🎉 Excellent! Your product has been created and published to the marketplace. Customers can now discover and purchase it!',
    },
    loginRequired: {
      pa: 'ਦੁਕਾਨ ਬਣਾਉਣ ਜਾਂ ਉਤਪਾਦ ਜੋੜਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰੋ।',
      hi: 'दुकान बनाने या उत्पाद जोड़ने के लिए कृपया अपने कारीगर खाते में लॉगिन करें।',
      en: 'Please log in to your artisan account to create a shop or add products.',
    },
    errorOccurred: {
      pa: 'ਮਾਫ਼ ਕਰਨਾ, ਕੋਈ ਤਕਨੀਕੀ ਖਰਾਬੀ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      hi: 'क्षमा करें, कोई तकनीकी समस्या आई है। कृपया पुनः प्रयास करें।',
      en: 'Sorry, something went wrong. Please try again.',
    },
    workflowCancelled: {
      pa: 'ਕਾਰਵਾਈ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਮੈਂ ਹੋਰ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
      hi: 'कार्रवाई रद्द कर दी गई है। मैं आपकी और क्या मदद कर सकता हूँ?',
      en: 'Action cancelled. How else can I assist you?',
    },
  },

  suggestions: {
    artisan: {
      pa: [
        { label: '📦 ਮੇਰੇ ਉਤਪਾਦ ਦਿਖਾਓ', command: 'ਮੇਰੇ ਉਤਪਾਦ ਦਿਖਾਓ' },
        { label: '📋 ਪੈਂਡਿੰਗ ਆਰਡਰ', command: 'ਪੈਂਡਿੰਗ ਆਰਡਰ ਦਿਖਾਓ' },
        { label: '💰 ਕੁੱਲ ਕਮਾਈ', command: 'ਮੇਰੀ ਕਮਾਈ ਕਿੰਨੀ ਹੈ?' },
        { label: '🏭 ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ', command: 'ਖੁੱਲ੍ਹੇ ਪ੍ਰੋਜੈਕਟ ਲੱਭੋ' },
        { label: '💬 ਸਹਾਇਤਾ ਕੇਂਦਰ', command: 'ਸਹਾਇਤਾ ਕੇਂਦਰ ਖੋਲ੍ਹੋ' },
      ],
      hi: [
        { label: '📦 मेरे उत्पाद दिखाओ', command: 'मेरे उत्पाद दिखाओ' },
        { label: '📋 पेंडिंग ऑर्डर', command: 'पेंडिंग ऑर्डर दिखाओ' },
        { label: '💰 कुल कमाई', command: 'मेरी कमाई कितनी है?' },
        { label: '🏭 उद्योग प्रोजेक्ट', command: 'प्रोजेक्ट खोजें' },
        { label: '💬 सहायता केंद्र', command: 'सहायता केंद्र खोलें' },
      ],
      en: [
        { label: '📦 Show My Products', command: 'Show my products' },
        { label: '📋 Pending Orders', command: 'Show my pending orders' },
        { label: '💰 Total Earnings', command: 'How much have I earned?' },
        { label: '🏭 Industrial Projects', command: 'Find open industrial projects' },
        { label: '💬 Support Desk', command: 'Open support desk' },
      ],
    },
    customer: {
      pa: [
        { label: '🛍️ ਉਤਪਾਦ ਦੇਖੋ', command: 'ਫੁਲਕਾਰੀ ਦਿਖਾਓ' },
        { label: '📦 ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ', command: 'ਮੇਰਾ ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ' },
        { label: '🛡️ ਵਾਪਸੀ ਤੇ ਸਹਾਇਤਾ', command: 'ਵਾਪਸੀ ਬਾਰੇ ਮਦਦ' },
        { label: '❓ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?', command: 'ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?' },
      ],
      hi: [
        { label: '🛍️ हस्तशिल्प देखें', command: 'हस्तशिल्प दिखाओ' },
        { label: '📦 ऑर्डर ट्रैक करें', command: 'मेरा ऑर्डर ट्रैक करो' },
        { label: '🛡️ रिटर्न व सहायता', command: 'सहायता केंद्र' },
        { label: '❓ स्किलब्रिज क्या है?', command: 'स्किलब्रिज क्या है?' },
      ],
      en: [
        { label: '🛍️ Browse Crafts', command: 'Show me handmade products' },
        { label: '📦 Track Order', command: 'Track my order' },
        { label: '🛡️ Help & Returns', command: 'Help with return or support' },
        { label: '❓ What is SkillBridge?', command: 'What is SkillBridge?' },
      ],
    },
    guest: {
      pa: [
        { label: '🎙️ ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ', command: 'ਮੈਂ ਦਸਤਕਾਰ ਵਜੋਂ ਰਜਿਸਟਰ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ' },
        { label: '🔑 ਲੌਗਇਨ ਮਦਦ', command: 'ਲੌਗਇਨ ਕਿਵੇਂ ਕਰੀਏ' },
        { label: '🛍️ ਮਾਰਕੀਟਪਲੇਸ', command: 'ਉਤਪਾਦ ਦਿਖਾਓ' },
        { label: '❓ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?', command: 'ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?' },
      ],
      hi: [
        { label: '🎙️ बोलकर रजिस्टर करें', command: 'कारीगर के रूप में रजिस्टर करना है' },
        { label: '🔑 लॉगिन सहायता', command: 'लॉगिन कैसे करें' },
        { label: '🛍️ मार्केटप्लेस', command: 'उत्पाद दिखाओ' },
        { label: '❓ स्किलब्रिज क्या है?', command: 'स्किलब्रिज क्या है?' },
      ],
      en: [
        { label: '🎙️ Voice Registration', command: 'I want to register as an artisan' },
        { label: '🔑 Login Assistance', command: 'How do I log in' },
        { label: '🛍️ Marketplace', command: 'Show me products' },
        { label: '❓ What is SkillBridge?', command: 'What is SkillBridge?' },
      ],
    },
  },
}

/**
 * Format progress string: "Question 2 of 6"
 */
export function formatProgress(current, total, lang = 'pa') {
  if (lang === 'pa') return `ਸਵਾਲ ${current} ਵਿੱਚੋਂ ${total}`
  if (lang === 'hi') return `प्रश्न ${current} में से ${total}`
  return `Question ${current} of ${total}`
}

/**
 * Validate price input
 */
export function validatePriceInput(val) {
  if (typeof val === 'number') return val > 0 ? val : null
  if (!val || typeof val !== 'string') return null
  if (/-\s*\d/.test(val)) return null
  const cleaned = val.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return !isNaN(num) && num > 0 ? Math.round(num) : null
}

/**
 * Validate stock/units input
 */
export function validateStockInput(val) {
  if (typeof val === 'number') return val >= 1 ? Math.floor(val) : null
  if (!val || typeof val !== 'string') return null
  if (/-\s*\d/.test(val)) return null
  const cleaned = val.replace(/[^0-9]/g, '')
  const num = parseInt(cleaned, 10)
  return !isNaN(num) && num >= 1 ? num : null
}
