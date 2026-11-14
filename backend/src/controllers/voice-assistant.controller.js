import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Shop } from "../models/shop.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Project } from "../models/project.model.js";
import { Notification } from "../models/notification.model.js";
import { parseArtisanIntent } from "../services/voice-assistant.service.js";

/**
 * Clean spoken text for speech synthesis (numbers to plain words, no markdown)
 */
function cleanForSpeech(text = "") {
  return text
    .replace(/[*_#`~[\]]/g, "")
    .replace(/₹\s*/g, "Rupees ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Handle incoming voice assistant conversation messages
 * @route POST /api/voice/assistant
 * @access Private (Artisan)
 */
export const handleVoiceAssistantMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [], pendingAction = null, language = "pa" } = req.body || {};
    const activeUser = req.user || null;
    const isArtisan = activeUser && activeUser.accountType === "artisan";
    const isCustomer = activeUser && activeUser.accountType === "customer";
    const isIndustry = activeUser && activeUser.accountType === "industry";
    const artisanUser = isArtisan ? activeUser : null;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    const trimmedMsg = message.trim();

    // Fetch current artisan shop for context if logged in as artisan
    let shop = null;
    try {
      if (artisanUser) {
        shop = await Shop.findOne({ artisan: artisanUser._id });
      }
    } catch (_) {}

    // Step 1: Check if there is an active pendingAction awaiting confirmation or cancellation
    if (pendingAction && pendingAction.type) {
      const intentCheck = await parseArtisanIntent(trimmedMsg, {
        name: activeUser?.name || "Guest",
        id: activeUser?._id ? activeUser._id.toString() : "",
        shopName: shop?.name || "",
      });

      // Handle Cancel / Negation
      if (intentCheck.intent === "NEGATION") {
        const reply =
          language === "pa"
            ? "ਠੀਕ ਹੈ ਜੀ, ਇਹ ਕਾਰਵਾਈ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਹੋਰ ਕੀ ਮਦਦ ਕਰਾਂ?"
            : language === "hi"
            ? "ठीक है जी, यह कार्रवाई रद्द कर दी गई है। मैं आपकी और क्या मदद कर सकता हूँ?"
            : "Action cancelled. What else would you like to do?";

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          pendingAction: null,
          actionData: null,
        });
      }

      // Handle Affirmation / Confirmation
      if (intentCheck.intent === "AFFIRMATION") {
        return await executeConfirmedAction(pendingAction, artisanUser, shop, language, res);
      }

      // If user provided a correction to the pending action (e.g. "change price to 2000" or "stock 15")
      if (pendingAction.type === "CONFIRM_ADD_PRODUCT" || pendingAction.type === "SLOT_FILLING_PRODUCT") {
        const numMatch = trimmedMsg.match(/\d+/);
        if (numMatch && (trimmedMsg.toLowerCase().includes("price") || trimmedMsg.toLowerCase().includes("rupee"))) {
          pendingAction.data.price = Number(numMatch[0]);
        } else if (numMatch && trimmedMsg.toLowerCase().includes("stock")) {
          pendingAction.data.stock = Number(numMatch[0]);
        } else if (!pendingAction.data.title && trimmedMsg.length > 2) {
          pendingAction.data.title = trimmedMsg;
        }

        // Re-evaluate if all fields are ready
        return await handleProductSlotFilling(pendingAction.data, artisanUser, shop, language, res);
      }
    }

    // Step 2: Parse Intent & Entities from message
    const parsed = await parseArtisanIntent(trimmedMsg, {
      name: activeUser?.name || "Guest",
      id: activeUser?._id ? activeUser._id.toString() : "",
      shopName: shop?.name || "",
    });

    const lang = parsed.detectedLanguage || language || "pa";
    const entities = parsed.entities || {};

    // Step 3: Route to specific Intent Handlers
    switch (parsed.intent) {
      // --- GENERAL MASCOT INTENTS ---
      case "GREETING": {
        const userName = activeUser?.name ? ` ${activeUser.name} ji` : "";
        const greetingReply =
          lang === "pa"
            ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ${userName}! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਾ AI ਮੈਸਕੌਟ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ - ਉਤਪਾਦ ਖੋਜਣ, ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ, ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰਨ, ਜਾਂ ਦੁਕਾਨ ਸੰਭਾਲਣ ਲਈ। ਤੁਸੀਂ ਕੀ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
            : lang === "hi"
            ? `नमस्ते${userName}! मैं स्किलब्रिज का AI मैस्कॉट और सहायक हूँ। मैं उत्पाद ढूँढने, ऑर्डर ट्रैक करने, बोलकर रजिस्ट्रेशन करने, या दुकान संभालने में आपकी मदद करूँगा। आप क्या करना चाहते हैं?`
            : `Hello${userName}! I am your SkillBridge AI Mascot. I can help you discover authentic handmade crafts, track your orders, register as an artisan with voice, or manage your shop. How can I help you today?`;

        return res.status(200).json({
          success: true,
          reply: greetingReply,
          speechText: cleanForSpeech(greetingReply),
          pendingAction: null,
          actionData: {
            navigation: isArtisan
              ? { label: "Artisan Profile & Shop", path: "/artisan/profile" }
              : isCustomer
              ? { label: "Explore Marketplace", path: "/marketplace" }
              : { label: "Voice Register as Artisan", path: "/artisan/auth?mode=signup&method=voice", triggerVoiceSignup: true },
          },
        });
      }

      case "ABOUT_PLATFORM":
      case "BOT_CAPABILITIES": {
        const aboutReply =
          lang === "pa"
            ? "ਸਕਿੱਲਬ੍ਰਿਜ ਭਾਰਤ ਦਾ ਪ੍ਰਮੁੱਖ ਡਿਜੀਟਲ ਪਲੇਟਫਾਰਮ ਹੈ ਜੋ ਪੇਂਡੂ ਮਹਿਲਾ ਦਸਤਕਾਰਾਂ ਨੂੰ ਸਿੱਧਾ ਗਾਹਕਾਂ ਅਤੇ ਉਦਯੋਗਾਂ ਨਾਲ ਜੋੜਦਾ ਹੈ। ਇੱਥੇ 0% ਵਿਚੋਲਾ ਕਮਿਸ਼ਨ, ਨਿਰਪੱਖ ਕਮਾਈ, ਬਹੁਭਾਸ਼ਾਈ ਵਾਇਸ ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਅਤੇ 7 ਦਿਨਾਂ ਦੀ ਵਾਪਸੀ ਤੇ 14 ਦਿਨਾਂ ਦੀ ਗੁਣਵੱਤਾ ਸੁਰੱਖਿਆ ਹੈ। ਮੈਂ ਤੁਹਾਡਾ 24/7 AI ਮੈਸਕੌਟ ਹਾਂ!"
            : lang === "hi"
            ? "स्किलब्रिज भारत का भरोसेमंद मंच है जो ग्रामीण महिला कारीगरों को सीधे ग्राहकों और उद्योगों से जोड़ता है। यहाँ 0% बिचौलिया फीस, उचित पारिश्रमिक, बहुभाषी वॉइस रजिस्ट्रेशन और डिलीवरी के बाद पूरी सुरक्षा मिलती है।"
            : "SkillBridge is India's ethical platform empowering rural women artisans by connecting them directly to buyers and industries. We feature 0% middleman fees, fair living wages, hands-free voice onboarding, and post-delivery dispute protection.";

        return res.status(200).json({
          success: true,
          reply: aboutReply,
          speechText: cleanForSpeech(aboutReply),
          pendingAction: null,
          actionData: {
            navigation: { label: "Explore Handmade Marketplace", path: "/marketplace" },
          },
        });
      }

      case "SUPPORT_HELP": {
        const supportReply =
          lang === "pa"
            ? "ਸਕਿੱਲਬ੍ਰਿਜ ਸਹਾਇਤਾ ਕੇਂਦਰ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ! ਸਾਡੇ ਕੋਲ 7 ਦਿਨਾਂ ਦੀ ਵਾਪਸੀ ਅਤੇ 14 ਦਿਨਾਂ ਦੀ ਗੁਣਵੱਤਾ ਵਿਵਾਦ ਨੀਤੀ ਹੈ। ਜੇ ਤੁਹਾਡੇ ਉਤਪਾਦ ਵਿੱਚ ਕੋਈ ਖਰਾਬੀ ਹੈ ਜਾਂ ਭੁਗਤਾਨ ਅਸਫਲ ਹੋਇਆ ਹੈ, ਤਾਂ ਤੁਸੀਂ ਫੋਟੋ ਸਬੂਤ ਦੇ ਨਾਲ ਸਹਾਇਤਾ ਟਿਕਟ ਜਾਂ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰ ਸਕਦੇ ਹੋ।"
            : lang === "hi"
            ? "स्किलब्रिज सहायता केंद्र में आपका स्वागत है! हमारे पास 7 दिन की वापसी और 14 दिन की निष्पक्ष विवाद समाधान नीति है। क्षतिग्रस्त सामान, गलत उत्पाद, या भुगतान समस्या के लिए आप फोटो के साथ सपोर्ट टिकट खोल सकते हैं।"
            : "Welcome to SkillBridge Support! All orders are protected under our 7-day return policy and 14-day quality dispute window. If you received a damaged item, incorrect specifications, or had payment issues, you can open an official support ticket or order dispute.";

        return res.status(200).json({
          success: true,
          reply: supportReply,
          speechText: cleanForSpeech(supportReply),
          pendingAction: null,
          actionData: {
            navigation: { label: "Open Support Centre (ਸਹਾਇਤਾ ਕੇਂਦਰ)", path: "/support" },
          },
        });
      }

      case "ORDER_TRACK": {
        let activeOrders = [];
        try {
          if (activeUser) {
            const query = isArtisan
              ? { "items.artisanId": activeUser._id }
              : { customer: activeUser._id };
            activeOrders = await Order.find(query).sort({ createdAt: -1 }).limit(3);
          }
        } catch (_) {}

        if (activeOrders.length > 0) {
          const firstOrder = activeOrders[0];
          const trackReply =
            lang === "pa"
              ? `ਤੁਹਾਡਾ ਤਾਜ਼ਾ ਆਰਡਰ #${firstOrder.orderNumber || firstOrder._id.toString().slice(-6)} ਇਸ ਵੇਲੇ '${firstOrder.orderStatus || "Processing"}' ਸਥਿਤੀ ਵਿੱਚ ਹੈ। ਕੁੱਲ ਰਕਮ ₹${firstOrder.totalAmount || firstOrder.subtotal || 0} ਹੈ।`
              : lang === "hi"
              ? `आपका नवीनतम ऑर्डर #${firstOrder.orderNumber || firstOrder._id.toString().slice(-6)} वर्तमान में '${firstOrder.orderStatus || "Processing"}' स्थिति में है। कुल राशि ₹${firstOrder.totalAmount || firstOrder.subtotal || 0} है।`
              : `Your latest order #${firstOrder.orderNumber || firstOrder._id.toString().slice(-6)} is currently '${firstOrder.orderStatus || "Processing"}'. Total amount is ₹${firstOrder.totalAmount || firstOrder.subtotal || 0}.`;

          return res.status(200).json({
            success: true,
            reply: trackReply,
            speechText: cleanForSpeech(trackReply),
            actionData: {
              orders: activeOrders.map((o) => (o.toSafeObject ? o.toSafeObject() : o)),
              navigation: {
                label: isArtisan ? "Artisan Orders" : "Track Orders in Profile",
                path: isArtisan ? "/artisan/profile?tab=orders" : "/profile?tab=orders",
              },
            },
          });
        }

        const noOrderReply =
          lang === "pa"
            ? "ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰੋ ਜਾਂ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਆਰਡਰ ਇਤਿਹਾਸ ਦੇਖੋ।"
            : lang === "hi"
            ? "ऑर्डर ट्रैक करने के लिए कृपया अपने खाते में लॉगिन करें या प्रोफाइल में ऑर्डर हिस्ट्री देखें।"
            : "To track an order, please log in or check your order history. Every order shows live status: Placed, Accepted, In Preparation, Shipped, or Delivered.";

        return res.status(200).json({
          success: true,
          reply: noOrderReply,
          speechText: cleanForSpeech(noOrderReply),
          actionData: {
            navigation: activeUser
              ? { label: "View Order History", path: "/profile?tab=orders" }
              : { label: "Login to Track", openAuth: "login" },
          },
        });
      }

      // --- A. PROFILE MANAGEMENT ---
      case "PROFILE_GET": {
        if (!artisanUser) {
          const reqLogin =
            lang === "pa"
              ? "ਇਹ ਜਾਣਕਾਰੀ ਦੇਖਣ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰਨਾ ਪਵੇਗਾ। ਕੀ ਮੈਂ ਤੁਹਾਨੂੰ ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਲੈ ਜਾਵਾਂ?"
              : lang === "hi"
              ? "यह जानकारी देखने के लिए कृपया पहले कारीगर खाते में लॉगिन करें। क्या आप लॉगिन पेज पर जाना चाहते हैं?"
              : "To view your profile and manage products, please log in to your artisan account first.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            actionData: {
              navigation: {
                label: "Go to Artisan Login (ਲੌਗਇਨ ਕਰੋ)",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }
        const profileReply =
          lang === "pa"
            ? `ਤੁਹਾਡਾ ਨਾਂ ${artisanUser.name} ਹੈ। ਫੋਨ ਨੰਬਰ: ${artisanUser.phone || "ਨਹੀਂ ਦੱਸਿਆ"}। ਸ਼ਹਿਰ: ${artisanUser.city || "ਪੰਜਾਬ"}। ਹੁਨਰ: ${artisanUser.artCategory || "ਦਸਤਕਾਰੀ"}। ਦੁਕਾਨ ਦਾ ਨਾਂ: ${shop?.name || "ਮੇਰੀ ਦੁਕਾਨ"}।`
            : lang === "hi"
            ? `आपका नाम ${artisanUser.name} है। फ़ोन: ${artisanUser.phone || "नहीं दिया"}। शहर: ${artisanUser.city || "भारत"}। हुनर: ${artisanUser.artCategory || "हस्तशिल्प"}। दुकान: ${shop?.name || "मेरी दुकान"}।`
            : `Your name is ${artisanUser.name}. Phone: ${artisanUser.phone || "Not set"}. Location: ${artisanUser.city || "India"}. Skills: ${artisanUser.artCategory || "Handicrafts"}. Shop: ${shop?.name || "My Shop"}.`;

        return res.status(200).json({
          success: true,
          reply: profileReply,
          speechText: cleanForSpeech(profileReply),
          pendingAction: null,
          actionData: { profile: artisanUser.toSafeObject(), shop: shop ? shop.toSafeObject() : null },
        });
      }

      case "PROFILE_UPDATE": {
        const updates = {};
        if (entities.phone) {
          const cleanP = String(entities.phone).replace(/\D/g, "");
          if (cleanP.length >= 10) updates.phone = cleanP.slice(-10);
        }
        if (entities.name) updates.name = entities.name.trim();
        if (entities.skills) updates.artCategory = entities.skills.trim();
        if (entities.city) updates.city = entities.city.trim();
        if (entities.shopName && shop) updates.shopName = entities.shopName.trim();

        if (Object.keys(updates).length === 0) {
          const promptMsg =
            lang === "pa"
              ? "ਤੁਸੀਂ ਆਪਣੇ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਕੀ ਬਦਲਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਜਿਵੇਂ: ਫੋਨ ਨੰਬਰ, ਨਾਂ ਜਾਂ ਹੁਨਰ।"
              : lang === "hi"
              ? "आप अपनी प्रोफाइल में क्या बदलना चाहते हैं? जैसे: फ़ोन नंबर, नाम या हुनर।"
              : "What would you like to update in your profile? E.g. phone number, name, or skills.";

          return res.status(200).json({
            success: true,
            reply: promptMsg,
            speechText: cleanForSpeech(promptMsg),
            pendingAction: null,
          });
        }

        // Set pending confirmation for profile changes
        const changeDesc = Object.entries(updates)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");

        const confirmPrompt =
          lang === "pa"
            ? `ਕੀ ਤੁਸੀਂ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਇਹ ਬਦਲਾਅ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ: ${changeDesc}? 'ਹਾਂ' ਕਹੋ ਪੁਸ਼ਟੀ ਕਰਨ ਲਈ।`
            : lang === "hi"
            ? `क्या आप अपनी प्रोफाइल में यह बदलाव करना चाहते हैं: ${changeDesc}? पुष्टि के लिए 'हाँ' बोलें।`
            : `Would you like to save these profile changes: ${changeDesc}? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmPrompt,
          speechText: cleanForSpeech(confirmPrompt),
          pendingAction: {
            type: "CONFIRM_UPDATE_PROFILE",
            data: updates,
          },
        });
      }

      // --- B. PRODUCT MANAGEMENT ---
      case "PRODUCT_ADD": {
        if (!artisanUser) {
          const addLogin =
            lang === "pa"
              ? "ਉਤਪਾਦ ਜੋੜਨ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਜਾਂ ਰਜਿਸਟਰ ਕਰਨਾ ਪਵੇਗਾ। ਕੀ ਤੁਸੀਂ ਰਜਿਸਟਰ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?"
              : lang === "hi"
              ? "उत्पाद लिस्ट करने के लिए कृपया पहले कारीगर के रूप में लॉगिन या रजिस्टर करें।"
              : "To add products, please log in or register as an artisan first.";

          return res.status(200).json({
            success: true,
            reply: addLogin,
            speechText: cleanForSpeech(addLogin),
            actionData: {
              navigation: {
                label: "Voice Register as Artisan (ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ)",
                path: "/artisan/auth?mode=signup&method=voice",
                triggerVoiceSignup: true,
              },
            },
          });
        }
        const initialData = {
          title: entities.title || "",
          price: entities.price,
          stock: entities.stock,
          category: entities.category || artisanUser.artCategory || "Handicrafts",
          description: entities.description || "",
        };

        return await handleProductSlotFilling(initialData, artisanUser, shop, lang, res);
      }

      case "PRODUCT_LIST": {
        if (!artisanUser) {
          const allProds = await Product.find({ isPublished: true }).limit(6);
          const listReply =
            lang === "pa"
              ? `ਸਕਿੱਲਬ੍ਰਿਜ 'ਤੇ ਉਪਲਬਧ ਉਤਪਾਦ: ${allProds.slice(0, 3).map((p) => p.title).join(", ")}। ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਹੋਰ ਦੇਖੋ।`
              : `Here are featured crafts on SkillBridge: ${allProds.slice(0, 3).map((p) => p.title).join(", ")}. Explore marketplace for more.`;

          return res.status(200).json({
            success: true,
            reply: listReply,
            speechText: cleanForSpeech(listReply),
            actionData: {
              products: allProds.map((p) => p.toSafeObject()),
              navigation: { label: "Explore Marketplace", path: "/marketplace" },
            },
          });
        }
        const products = await Product.find({ artisan: artisanUser._id }).sort({ createdAt: -1 });

        if (products.length === 0) {
          const noProdMsg =
            lang === "pa"
              ? "ਤੁਹਾਡੇ ਕੋਲ ਅਜੇ ਕੋਈ ਉਤਪਾਦ ਦਰਜ ਨਹੀਂ ਹੈ। ਕੀ ਤੁਸੀਂ ਨਵਾਂ ਉਤਪਾਦ ਜੋੜਨਾ ਚਾਹੁੰਦੇ ਹੋ?"
              : lang === "hi"
              ? "आपके पास अभी कोई उत्पाद लिस्ट नहीं है। क्या आप नया उत्पाद जोड़ना चाहते हैं?"
              : "You have not listed any products yet. Would you like to add one?";

          return res.status(200).json({
            success: true,
            reply: noProdMsg,
            speechText: cleanForSpeech(noProdMsg),
            pendingAction: null,
            actionData: { products: [] },
          });
        }

        const top3 = products.slice(0, 3).map((p) => `${p.title} (₹${p.price}, ਸਟਾਕ: ${p.stock})`).join(", ");
        const listReply =
          lang === "pa"
            ? `ਤੁਹਾਡੇ ਕੁੱਲ ${products.length} ਉਤਪਾਦ ਹਨ। ਜਿਵੇਂ: ${top3}।`
            : lang === "hi"
            ? `आपके कुल ${products.length} उत्पाद लिस्ट हैं। जैसे: ${top3}।`
            : `You have listed ${products.length} products. Recent items: ${top3}.`;

        return res.status(200).json({
          success: true,
          reply: listReply,
          speechText: cleanForSpeech(listReply),
          pendingAction: null,
          actionData: {
            products: products.map((p) => p.toSafeObject(artisanUser.name, shop?.location)),
          },
        });
      }

      case "PRODUCT_SEARCH": {
        const query = (entities.query || "").trim();
        let matched = [];
        try {
          if (artisanUser) {
            matched = await Product.find({
              artisan: artisanUser._id,
              title: new RegExp(query, "i"),
            });
          } else {
            const cleanQuery = query.replace(/(show|me|products|find|search|buy|crafts|handmade)/gi, "").trim();
            const regex = new RegExp(cleanQuery || query, "i");
            matched = await Product.find({
              isPublished: true,
              $or: [{ title: regex }, { category: regex }, { description: regex }],
            }).limit(6);
          }
        } catch (_) {}

        if (matched.length === 0) {
          const notFoundMsg =
            lang === "pa"
              ? `'${query}' ਨਾਲ ਸੰਬੰਧਿਤ ਉਤਪਾਦ ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਦੇਖੋ ਜੀ। ਸਾਡੇ ਕੋਲ ਫੁਲਕਾਰੀ, ਜੁੱਤੀਆਂ, ਅਤੇ ਲੱਕੜੀ ਦੀ ਦਸਤਕਾਰੀ ਉਪਲਬਧ ਹੈ।`
              : lang === "hi"
              ? `'${query}' से मिलते-जुलते हस्तशिल्प आप मार्केटप्लेस में देख सकते हैं। हमारे पास फुलकारी, जूतियाँ और लकड़ी के उत्पाद उपलब्ध हैं।`
              : `Explore crafts matching '${query}' in our marketplace! We have authentic Phulkari, Punjabi juttis, and wooden handicrafts.`;

          return res.status(200).json({
            success: true,
            reply: notFoundMsg,
            speechText: cleanForSpeech(notFoundMsg),
            pendingAction: null,
            actionData: {
              navigation: { label: "Explore Marketplace (ਮਾਰਕੀਟਪਲੇਸ)", path: "/marketplace" },
            },
          });
        }

        const itemsDesc = matched.slice(0, 3).map((p) => `${p.title} (₹${p.price})`).join(", ");
        const searchReply =
          lang === "pa"
            ? `ਮੈਨੂੰ ਇਹ ਉਤਪਾਦ ਮਿਲੇ ਹਨ: ${itemsDesc}।`
            : lang === "hi"
            ? `मुझे ये उत्पाद मिले हैं: ${itemsDesc}।`
            : `I found the following crafts: ${itemsDesc}.`;

        return res.status(200).json({
          success: true,
          reply: searchReply,
          speechText: cleanForSpeech(searchReply),
          pendingAction: null,
          actionData: {
            products: matched.map((p) => (p.toSafeObject ? p.toSafeObject(artisanUser?.name, shop?.location) : p)),
            navigation: { label: "View in Marketplace", path: "/marketplace" },
          },
        });
      }

      case "PRODUCT_UPDATE": {
        const { title, price, stock } = entities;
        let product = null;

        if (title) {
          product = await Product.findOne({
            artisan: artisanUser._id,
            title: new RegExp(title.trim(), "i"),
          });
        }
        if (!product) {
          // Default to latest product
          product = await Product.findOne({ artisan: artisanUser._id }).sort({ createdAt: -1 });
        }

        if (!product) {
          const noProd = lang === "pa" ? "ਕੋਈ ਉਤਪਾਦ ਨਹੀਂ ਮਿਲਿਆ ਜਿਸਨੂੰ ਅਪਡੇਟ ਕੀਤਾ ਜਾ ਸਕੇ।" : "No product found to update.";
          return res.status(200).json({ success: true, reply: noProd, speechText: cleanForSpeech(noProd) });
        }

        if (price === undefined && stock === undefined) {
          const askUpdate =
            lang === "pa"
              ? `ਤੁਸੀਂ '${product.title}' ਦਾ ਕੀ ਬਦਲਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਕੀਮਤ ਜਾਂ ਸਟਾਕ?`
              : `What would you like to update for '${product.title}'? Price or stock?`;

          return res.status(200).json({ success: true, reply: askUpdate, speechText: cleanForSpeech(askUpdate) });
        }

        const confirmUpdate =
          lang === "pa"
            ? `ਕੀ ਤੁਸੀਂ '${product.title}' ਦਾ ${price !== undefined ? `ਰੇਟ ₹${price}` : ""} ${stock !== undefined ? `ਸਟਾਕ ${stock}` : ""} ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਪੁਸ਼ਟੀ ਲਈ 'ਹਾਂ' ਕਹੋ।`
            : `Should I update '${product.title}' to ${price !== undefined ? `Price: ₹${price}` : ""} ${stock !== undefined ? `Stock: ${stock}` : ""}? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmUpdate,
          speechText: cleanForSpeech(confirmUpdate),
          pendingAction: {
            type: "CONFIRM_UPDATE_PRODUCT",
            data: { productId: product._id.toString(), title: product.title, price, stock },
          },
        });
      }

      case "PRODUCT_DELETE": {
        const titleQuery = entities.title || "";
        let product = null;

        if (titleQuery) {
          product = await Product.findOne({
            artisan: artisanUser._id,
            title: new RegExp(titleQuery.trim(), "i"),
          });
        }
        if (!product) {
          product = await Product.findOne({ artisan: artisanUser._id }).sort({ createdAt: -1 });
        }

        if (!product) {
          const msg = lang === "pa" ? "ਮਿਟਾਉਣ ਲਈ ਕੋਈ ਉਤਪਾਦ ਨਹੀਂ ਮਿਲਿਆ।" : "No product found to delete.";
          return res.status(200).json({ success: true, reply: msg, speechText: cleanForSpeech(msg) });
        }

        const confirmDel =
          lang === "pa"
            ? `ਕੀ ਤੁਸੀਂ ਪੱਕਾ '${product.title}' ਉਤਪਾਦ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਜੇ ਹਾਂ, ਤਾਂ 'ਹਾਂ' ਕਹੋ।`
            : lang === "hi"
            ? `क्या आप वाकई '${product.title}' को हटाना चाहते हैं? यदि हाँ, तो 'हाँ' बोलें।`
            : `Are you sure you want to delete '${product.title}'? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmDel,
          speechText: cleanForSpeech(confirmDel),
          pendingAction: {
            type: "CONFIRM_DELETE_PRODUCT",
            data: { productId: product._id.toString(), title: product.title },
          },
        });
      }

      // --- C. ORDER MANAGEMENT ---
      case "ORDER_LIST": {
        if (isCustomer) {
          let customerOrders = [];
          try {
            customerOrders = await Order.find({ customer: activeUser._id }).sort({ createdAt: -1 });
          } catch (_) {}

          if (customerOrders.length === 0) {
            const noOrd =
              lang === "pa"
                ? "ਤੁਹਾਡੇ ਕੋਲ ਅਜੇ ਕੋਈ ਆਰਡਰ ਨਹੀਂ ਹੈ। ਕੀ ਤੁਸੀਂ ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਦਸਤਕਾਰੀ ਦੇਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?"
                : "You have not placed any orders yet. Would you like to explore handmade crafts?";

            return res.status(200).json({
              success: true,
              reply: noOrd,
              speechText: cleanForSpeech(noOrd),
              actionData: { navigation: { label: "Explore Marketplace", path: "/marketplace" } },
            });
          }

          const firstOrder = customerOrders[0];
          const listReply =
            lang === "pa"
              ? `ਤੁਹਾਡੇ ਕੁੱਲ ${customerOrders.length} ਆਰਡਰ ਹਨ। ਤਾਜ਼ਾ ਆਰਡਰ #${firstOrder.orderNumber || firstOrder._id.toString().slice(-6)} ਦੀ ਸਥਿਤੀ '${firstOrder.orderStatus || "Processing"}' ਹੈ।`
              : `You have placed ${customerOrders.length} order(s). Your latest order #${firstOrder.orderNumber || firstOrder._id.toString().slice(-6)} is currently '${firstOrder.orderStatus || "Processing"}'.`;

          return res.status(200).json({
            success: true,
            reply: listReply,
            speechText: cleanForSpeech(listReply),
            actionData: {
              orders: customerOrders.slice(0, 4).map((o) => ({
                id: o._id.toString(),
                orderNumber: o.orderNumber,
                subtotal: o.totalAmount || o.subtotal,
                status: o.orderStatus,
                items: o.items || [],
              })),
              navigation: { label: "View Order History in Profile", path: "/profile?tab=orders" },
            },
          });
        }

        if (!artisanUser) {
          const reqLogin =
            lang === "pa"
              ? "ਆਰਡਰ ਦੇਖਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰੋ ਜੀ।"
              : lang === "hi"
              ? "ऑर्डर देखने के लिए कृपया पहले लॉगिन करें।"
              : "To view your orders or manage crafts, please log in to your account first.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            actionData: {
              navigation: {
                label: "Go to Login (ਲੌਗਇਨ ਕਰੋ)",
                openAuth: "login",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }
        const filter = { "items.artisanId": artisanUser._id };
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        const formatted = orders.map((o) => o.toArtisanOrder(artisanUser._id));

        const pendingOrders = formatted.filter((o) =>
          ["Awaiting response", "Processing", "Ready to ship"].includes(o.status)
        );
        const completedOrders = formatted.filter((o) => o.status === "Completed");

        if (entities.status === "Pending") {
          if (pendingOrders.length === 0) {
            const noPending =
              lang === "pa"
                ? "ਤੁਹਾਡੇ ਕੋਲ ਕੋਈ ਨਵਾਂ ਜਾਂ ਪੈਂਡਿੰਗ ਆਰਡਰ ਨਹੀਂ ਹੈ।"
                : lang === "hi"
                ? "आपके पास कोई नया या पेंडिंग ऑर्डर नहीं है।"
                : "You have no pending orders.";
            return res.status(200).json({
              success: true,
              reply: noPending,
              speechText: cleanForSpeech(noPending),
              actionData: { orders: [] },
            });
          }

          const topPending = pendingOrders
            .slice(0, 3)
            .map((o) => `#${o.orderNumber || o.id.slice(-6)}: ${o.items[0]?.title} (₹${o.subtotal}) from ${o.customer?.fullName || "Customer"}`)
            .join("; ");

          const replyMsg =
            lang === "pa"
              ? `ਤੁਹਾਡੇ ਕੋਲ ${pendingOrders.length} ਪੈਂਡਿੰਗ ਆਰਡਰ ਹਨ: ${topPending}।`
              : lang === "hi"
              ? `आपके पास ${pendingOrders.length} पेंडिंग ऑर्डर हैं: ${topPending}।`
              : `You have ${pendingOrders.length} pending orders: ${topPending}.`;

          return res.status(200).json({
            success: true,
            reply: replyMsg,
            speechText: cleanForSpeech(replyMsg),
            actionData: { orders: pendingOrders },
          });
        }

        const replyAll =
          lang === "pa"
            ? `ਤੁਹਾਡੇ ਕੁੱਲ ${formatted.length} ਆਰਡਰ ਹਨ। ${pendingOrders.length} ਪੈਂਡਿੰਗ ਹਨ ਅਤੇ ${completedOrders.length} ਪੂਰੇ ਹੋ ਚੁੱਕੇ ਹਨ।`
            : lang === "hi"
            ? `आपके कुल ${formatted.length} ऑर्डर हैं। ${pendingOrders.length} पेंडिंग हैं और ${completedOrders.length} पूरे हो चुके हैं।`
            : `You have ${formatted.length} total orders. ${pendingOrders.length} are pending, and ${completedOrders.length} are completed.`;

        return res.status(200).json({
          success: true,
          reply: replyAll,
          speechText: cleanForSpeech(replyAll),
          actionData: { orders: formatted },
        });
      }

      case "ORDER_ACCEPT": {
        const orderNumberQuery = entities.orderNumber || "";
        let order = null;

        if (orderNumberQuery) {
          order = await Order.findOne({
            $or: [{ orderNumber: new RegExp(orderNumberQuery, "i") }, { _id: orderNumberQuery.match(/^[0-9a-fA-F]{24}$/) ? orderNumberQuery : null }],
            "items.artisanId": artisanUser._id,
          });
        }
        if (!order) {
          // Look for latest awaiting order
          order = await Order.findOne({
            "items.artisanId": artisanUser._id,
            orderStatus: "Awaiting response",
          }).sort({ createdAt: -1 });
        }

        if (!order) {
          const noOrder = lang === "pa" ? "ਸਵੀਕਾਰ ਕਰਨ ਲਈ ਕੋਈ ਪੈਂਡਿੰਗ ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ।" : "No pending order found to accept.";
          return res.status(200).json({ success: true, reply: noOrder, speechText: cleanForSpeech(noOrder) });
        }

        const formatted = order.toArtisanOrder(artisanUser._id);
        const confirmAccept =
          lang === "pa"
            ? `ਕੀ ਤੁਸੀਂ ਆਰਡਰ #${order.orderNumber || order._id.toString().slice(-6)} (${formatted.items[0]?.title}, ₹${formatted.subtotal}) ਸਵੀਕਾਰ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? 'ਹਾਂ' ਕਹੋ।`
            : `Do you want to accept order #${order.orderNumber || order._id.toString().slice(-6)} for ${formatted.items[0]?.title} totaling ₹${formatted.subtotal}? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmAccept,
          speechText: cleanForSpeech(confirmAccept),
          pendingAction: {
            type: "CONFIRM_ACCEPT_ORDER",
            data: { orderId: order._id.toString(), orderNumber: order.orderNumber },
          },
        });
      }

      case "ORDER_COMPLETE": {
        const orderNumberQuery = entities.orderNumber || "";
        let order = null;

        if (orderNumberQuery) {
          order = await Order.findOne({
            $or: [{ orderNumber: new RegExp(orderNumberQuery, "i") }, { _id: orderNumberQuery.match(/^[0-9a-fA-F]{24}$/) ? orderNumberQuery : null }],
            "items.artisanId": artisanUser._id,
          });
        }
        if (!order) {
          order = await Order.findOne({
            "items.artisanId": artisanUser._id,
            orderStatus: { $in: ["Processing", "Ready to ship", "Shipped"] },
          }).sort({ createdAt: -1 });
        }

        if (!order) {
          const noOrder = lang === "pa" ? "ਪੂਰਾ ਕਰਨ ਲਈ ਕੋਈ ਚੱਲਦਾ ਹੋਇਆ ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ।" : "No active order found to mark completed.";
          return res.status(200).json({ success: true, reply: noOrder, speechText: cleanForSpeech(noOrder) });
        }

        const confirmDone =
          lang === "pa"
            ? `ਕੀ ਆਰਡਰ #${order.orderNumber || order._id.toString().slice(-6)} ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ? ਪੁਸ਼ਟੀ ਲਈ 'ਹਾਂ' ਕਹੋ।`
            : `Mark order #${order.orderNumber || order._id.toString().slice(-6)} as completed? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmDone,
          speechText: cleanForSpeech(confirmDone),
          pendingAction: {
            type: "CONFIRM_COMPLETE_ORDER",
            data: { orderId: order._id.toString(), orderNumber: order.orderNumber },
          },
        });
      }

      // --- D. PAYMENTS & EARNINGS ---
      case "PAYMENT_SUMMARY":
      case "PAYMENT_PENDING":
      case "PAYMENT_HISTORY": {
        if (!artisanUser) {
          const reqLogin =
            lang === "pa"
              ? "ਇਹ ਜਾਣਕਾਰੀ ਦੇਖਣ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰਨਾ ਪਵੇਗਾ। ਕੀ ਮੈਂ ਤੁਹਾਨੂੰ ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਲੈ ਜਾਵਾਂ?"
              : lang === "hi"
              ? "यह जानकारी देखने के लिए कृपया पहले कारीगर खाते में लॉगिन करें। क्या आप लॉगिन पेज पर जाना चाहते हैं?"
              : "To view your profile and manage products, please log in to your artisan account first.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            actionData: {
              navigation: {
                label: "Go to Artisan Login (ਲੌਗਇਨ ਕਰੋ)",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }
        const orders = await Order.find({ "items.artisanId": artisanUser._id });
        const formattedOrders = orders.map((o) => o.toArtisanOrder(artisanUser._id));

        const completedOrders = formattedOrders.filter((o) => o.status === "Completed");
        const paidOrders = completedOrders.filter((o) => o.paymentStatus === "paid");
        const awaitingPayment = completedOrders.filter((o) => o.paymentStatus !== "paid");
        const inProgress = formattedOrders.filter((o) => ["Processing", "Ready to ship", "Shipped"].includes(o.status));

        const totalEarned = paidOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
        const pendingPayout =
          awaitingPayment.reduce((sum, o) => sum + (o.subtotal || 0), 0) +
          inProgress.reduce((sum, o) => sum + (o.subtotal || 0), 0);

        if (parsed.intent === "PAYMENT_PENDING") {
          const pendingMsg =
            lang === "pa"
              ? `ਤੁਹਾਡੀ ਬਾਕੀ ਰਕਮ ₹${pendingPayout.toLocaleString("en-IN")} ਹੈ, ਜੋ ਚੱਲ ਰਹੇ ਅਤੇ ਪੂਰੇ ਹੋਏ ਆਰਡਰਾਂ ਤੋਂ ਆਉਣੀ ਹੈ।`
              : lang === "hi"
              ? `आपकी पेंडिंग राशि ₹${pendingPayout.toLocaleString("en-IN")} है।`
              : `Your pending payout is ₹${pendingPayout.toLocaleString("en-IN")}.`;

          return res.status(200).json({
            success: true,
            reply: pendingMsg,
            speechText: cleanForSpeech(pendingMsg),
            pendingAction: null,
            actionData: { pendingPayout, totalEarned },
          });
        }

        const earnMsg =
          lang === "pa"
            ? `ਤੁਹਾਡੀ ਕੁੱਲ ਪੁਸ਼ਟੀ ਕੀਤੀ ਕਮਾਈ ₹${totalEarned.toLocaleString("en-IN")} ਹੈ। ਅਤੇ ₹${pendingPayout.toLocaleString("en-IN")} ਆਉਣਾ ਬਾਕੀ ਹੈ।`
            : lang === "hi"
            ? `आपकी कुल कमाई ₹${totalEarned.toLocaleString("en-IN")} है, और ₹${pendingPayout.toLocaleString("en-IN")} पेंडिंग है।`
            : `Your total verified earnings are ₹${totalEarned.toLocaleString("en-IN")}, with ₹${pendingPayout.toLocaleString("en-IN")} pending.`;

        return res.status(200).json({
          success: true,
          reply: earnMsg,
          speechText: cleanForSpeech(earnMsg),
          pendingAction: null,
          actionData: {
            totalEarned,
            pendingPayout,
            completedOrdersCount: completedOrders.length,
          },
        });
      }

      // --- E. DASHBOARD & BUSINESS SUMMARY ---
      case "DASHBOARD_SUMMARY": {
        if (!artisanUser) {
          const reqLogin =
            lang === "pa"
              ? "ਇਹ ਜਾਣਕਾਰੀ ਦੇਖਣ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰਨਾ ਪਵੇਗਾ। ਕੀ ਮੈਂ ਤੁਹਾਨੂੰ ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਲੈ ਜਾਵਾਂ?"
              : lang === "hi"
              ? "यह जानकारी देखने के लिए कृपया पहले कारीगर खाते में लॉगिन करें। क्या आप लॉगिन पेज पर जाना चाहते हैं?"
              : "To view your profile and manage products, please log in to your artisan account first.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            actionData: {
              navigation: {
                label: "Go to Artisan Login (ਲੌਗਇਨ ਕਰੋ)",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }
        const [totalProducts, orders, projects] = await Promise.all([
          Product.countDocuments({ artisan: artisanUser._id }),
          Order.find({ "items.artisanId": artisanUser._id }),
          Project.countDocuments({ assignedArtisan: artisanUser._id }),
        ]);

        const formatted = orders.map((o) => o.toArtisanOrder(artisanUser._id));
        const pendingOrdersCount = formatted.filter((o) => ["Awaiting response", "Processing"].includes(o.status)).length;
        const totalEarnings = formatted.filter((o) => o.status === "Completed" && o.paymentStatus === "paid").reduce((s, o) => s + (o.subtotal || 0), 0);

        const summaryMsg =
          lang === "pa"
            ? `ਤੁਹਾਡੇ ਕਾਰੋਬਾਰ ਦਾ ਸੰਖੇਪ: ${totalProducts} ਉਤਪਾਦ ਦਰਜ ਹਨ। ${pendingOrdersCount} ਆਰਡਰ ਪੈਂਡਿੰਗ ਹਨ। ਕੁੱਲ ਕਮਾਈ ₹${totalEarnings.toLocaleString("en-IN")} ਹੈ। ਅਤੇ ${projects} ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ ਜੁੜੇ ਹਨ।`
            : lang === "hi"
            ? `आपके कारोबार का सारांश: ${totalProducts} उत्पाद लिस्ट हैं। ${pendingOrdersCount} ऑर्डर पेंडिंग हैं। कुल कमाई ₹${totalEarnings.toLocaleString("en-IN")} है।`
            : `Your business summary: ${totalProducts} products listed. ${pendingOrdersCount} pending orders. Total earnings: ₹${totalEarnings.toLocaleString("en-IN")}.`;

        return res.status(200).json({
          success: true,
          reply: summaryMsg,
          speechText: cleanForSpeech(summaryMsg),
          pendingAction: null,
          actionData: {
            totalProducts,
            pendingOrdersCount,
            totalEarnings,
            projectsCount: projects,
          },
        });
      }

      // --- F. INDUSTRIALISTS & COLLABORATIONS ---
      case "FIND_INDUSTRIALISTS":
      case "COLLABORATION_REQUESTS": {
        const openProjects = await Project.find({ status: "Open" })
          .populate("industry", "name industry contactName companyAddress")
          .limit(5);

        if (openProjects.length === 0) {
          const noProj =
            lang === "pa"
              ? "ਇਸ ਸਮੇਂ ਕੋਈ ਨਵਾਂ ਖੁੱਲ੍ਹਾ ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।"
              : "Currently no open industry collaboration projects found.";
          return res.status(200).json({ success: true, reply: noProj, speechText: cleanForSpeech(noProj) });
        }

        const projectListText = openProjects
          .slice(0, 3)
          .map((p) => `${p.title} (ਕੰਪਨੀ: ${p.industry?.name || "Industry"}, ਬਜਟ: ₹${p.unitPrice})`)
          .join("; ");

        const replyProj =
          lang === "pa"
            ? `ਮੈਨੂੰ ${openProjects.length} ਉਦਯੋਗਿਕ ਪ੍ਰੋਜੈਕਟ ਮਿਲੇ ਹਨ: ${projectListText}।`
            : `Found ${openProjects.length} industry opportunities: ${projectListText}.`;

        return res.status(200).json({
          success: true,
          reply: replyProj,
          speechText: cleanForSpeech(replyProj),
          actionData: {
            projects: openProjects.map((p) => p.toSafeObject(p.industry, null)),
          },
        });
      }

      case "COLLABORATION_ACCEPT": {
        const openProject = await Project.findOne({ status: "Open" });
        if (!openProject) {
          const noProj = lang === "pa" ? "ਸਵੀਕਾਰ ਕਰਨ ਲਈ ਕੋਈ ਪ੍ਰੋਜੈਕਟ ਨਹੀਂ ਮਿਲਿਆ।" : "No open project to accept.";
          return res.status(200).json({ success: true, reply: noProj, speechText: cleanForSpeech(noProj) });
        }

        const confirmProject =
          lang === "pa"
            ? `ਕੀ ਤੁਸੀਂ '${openProject.title}' ਪ੍ਰੋਜੈਕਟ (₹${openProject.unitPrice} ਪ੍ਰਤੀ ਨਗ) ਸਵੀਕਾਰ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? 'ਹਾਂ' ਕਹੋ।`
            : `Do you want to accept project '${openProject.title}' at ₹${openProject.unitPrice} per unit? Say 'yes' to confirm.`;

        return res.status(200).json({
          success: true,
          reply: confirmProject,
          speechText: cleanForSpeech(confirmProject),
          pendingAction: {
            type: "CONFIRM_ACCEPT_PROJECT",
            data: { projectId: openProject._id.toString(), title: openProject.title },
          },
        });
      }

      // --- G. NOTIFICATIONS ---
      case "NOTIFICATIONS_GET": {
        const notifs = await Notification.find({ recipient: artisanUser._id }).sort({ createdAt: -1 }).limit(5);

        if (notifs.length === 0) {
          const noNotif = lang === "pa" ? "ਤੁਹਾਡੇ ਕੋਲ ਕੋਈ ਨਵੀਂ ਸੂਚਨਾ ਨਹੀਂ ਹੈ।" : "You have no new notifications.";
          return res.status(200).json({ success: true, reply: noNotif, speechText: cleanForSpeech(noNotif) });
        }

        const notifSummary = notifs.map((n) => n.title).join("; ");
        const replyN =
          lang === "pa"
            ? `ਤੁਹਾਡੀਆਂ ਤਾਜ਼ਾ ਸੂਚਨਾਵਾਂ: ${notifSummary}।`
            : `Your recent notifications: ${notifSummary}.`;

        return res.status(200).json({
          success: true,
          reply: replyN,
          speechText: cleanForSpeech(replyN),
          actionData: { notifications: notifs },
        });
      }      // --- LOGIN, SIGNUP & NAVIGATION ---
      case "LOGIN_HELP": {
        const role = entities.role || "artisan";
        let targetUrl = "/artisan/auth?mode=login";
        let roleLabel = "Artisan (ਦਸਤਕਾਰ)";
        if (role === "industry") {
          targetUrl = "/industry/auth?mode=login";
          roleLabel = "Industry Partner (ਉਦਯੋਗ)";
        } else if (role === "expert") {
          targetUrl = "/expert/auth?mode=login";
          roleLabel = "Expert (ਮਾਹਿਰ)";
        } else if (role === "customer") {
          targetUrl = "/marketplace";
          roleLabel = "Customer";
        }

        const reply =
          lang === "pa"
            ? `${roleLabel} ਲੌਗਇਨ ਲਈ ਮੈਂ ਤੁਹਾਨੂੰ ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਲੈ ਜਾਂਦਾ ਹਾਂ। ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।`
            : lang === "hi"
            ? `${roleLabel} लॉगिन के लिए मैं आपको लॉगिन पेज पर ले चलता हूँ।`
            : `To log in as ${roleLabel}, click the button below.`;

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          pendingAction: null,
          actionData: {
            navigation: {
              label: `${roleLabel} Login`,
              path: targetUrl,
              openAuth: role === "customer" ? "login" : undefined,
            },
          },
        });
      }

      case "SIGNUP_HELP": {
        const role = entities.role || "artisan";

        if (role === "artisan") {
          const reply =
            lang === "pa"
              ? "ਦਸਤਕਾਰ ਵਜੋਂ ਤੁਸੀਂ ਸਿਰਫ਼ ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰ ਸਕਦੇ ਹੋ! ਮੈਂ ਵਾਇਸ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਹਾਇਕ ਖੋਲ੍ਹ ਰਿਹਾ ਹਾਂ।"
              : lang === "hi"
              ? "कारीगर के रूप में आप सीधे बोलकर रजिस्ट्रेशन कर सकते हैं! मैं वॉइस रजिस्ट्रेशन शुरू कर रहा हूँ।"
              : "As an artisan, you can register simply by speaking! Launching voice registration assistant.";

          return res.status(200).json({
            success: true,
            reply,
            speechText: cleanForSpeech(reply),
            pendingAction: null,
            actionData: {
              navigation: {
                label: "Voice Registration (ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ)",
                path: "/artisan/auth?mode=signup&method=voice",
                triggerVoiceSignup: true,
              },
            },
          });
        }

        const targetUrl = role === "industry" ? "/industry/auth?mode=signup" : role === "expert" ? "/expert/auth?mode=signup" : "/marketplace";
        const roleLabel = role === "industry" ? "Industry" : role === "expert" ? "Expert" : "Customer";
        const reply = `Navigating to ${roleLabel} registration.`;

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          actionData: {
            navigation: {
              label: `${roleLabel} Signup`,
              path: targetUrl,
              openAuth: role === "customer" ? "signup" : undefined,
            },
          },
        });
      }

      case "NAVIGATE": {
        const dest = entities.destination || "marketplace";
        let targetUrl = "/marketplace";
        let label = "Explore Marketplace (ਮਾਰਕੀਟਪਲੇਸ)";
        if (dest === "courses") {
          targetUrl = "/artisan/courses/all";
          label = "Craft Courses (ਕੋਰਸ)";
        } else if (dest === "about") {
          targetUrl = "/about-us";
          label = "About SkillBridge (ਸਾਡੇ ਬਾਰੇ)";
        } else if (dest === "artisans") {
          targetUrl = "/artisans";
          label = "Meet Artisans (ਦਸਤਕਾਰਾਂ ਨੂੰ ਮਿਲੋ)";
        }

        const reply = lang === "pa" ? `ਮੈਂ ਤੁਹਾਨੂੰ ${label} ਪੇਜ 'ਤੇ ਲੈ ਚੱਲਦਾ ਹਾਂ।` : `Navigating to ${label}.`;
        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          actionData: {
            navigation: { label, path: targetUrl },
          },
        });
      }

      // --- H. HELP & ASSISTANCE ---
      case "HELP": {
        let helpReply = "";
        let nav = null;

        if (isArtisan) {
          helpReply =
            lang === "pa"
              ? "ਦਸਤਕਾਰ ਸਹਾਇਤਾ: ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਜੋੜਨ ('ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ'), ਪੈਂਡਿੰਗ ਆਰਡਰ ਦੇਖਣ ('ਪੈਂਡਿੰਗ ਆਰਡਰ'), ਕੁੱਲ ਕਮਾਈ ਚੈੱਕ ਕਰਨ ('ਮੇਰੀ ਕਮਾਈ'), ਜਾਂ ਫੈਕਟਰੀ ਪ੍ਰੋਜੈਕਟ ਲੱਭਣ ('ਉਦਯੋਗ ਲੱਭੋ') ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।"
              : lang === "hi"
              ? "कारीगर सहायता: आप उत्पाद जोड़ने ('नया उत्पाद जोड़ो'), पेंडिंग ऑर्डर देखने ('पेंडिंग ऑर्डर'), कमाई चेक करने ('मेरी कमाई'), या फैक्ट्री प्रोजेक्ट ढूँढने के लिए बोल सकते हैं।"
              : "Artisan Help: You can speak commands to add a product ('Add new product'), view pending orders ('Pending orders'), check earnings ('My earnings'), or find industry projects ('Find industrialists').";
          nav = { label: "Artisan Profile & Shop", path: "/artisan/profile" };
        } else if (isCustomer) {
          helpReply =
            lang === "pa"
              ? "ਗਾਹਕ ਸਹਾਇਤਾ: ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਖੋਜਣ ('ਫੁਲਕਾਰੀ ਦਿਖਾਓ'), ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ ('ਮੇਰਾ ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ'), ਜਾਂ ਕਿਸੇ ਵੀ ਸਮੱਸਿਆ ਲਈ ਸਹਾਇਤਾ ਕੇਂਦਰ ('ਸਹਾਇਤਾ ਕੇਂਦਰ') ਖੋਲ੍ਹਣ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।"
              : lang === "hi"
              ? "ग्राहक सहायता: आप उत्पाद खोजने ('फुलकारी दिखाओ'), ऑर्डर ट्रैक करने ('मेरा ऑर्डर ट्रैक करो'), या सहायता केंद्र ('सपोर्ट सेंटर') खोलने के लिए बोल सकते हैं।"
              : "Customer Help: You can ask to find crafts ('Show me phulkari'), track delivery ('Track my order'), or open our Trust & Support Centre for return/refund requests.";
          nav = { label: "Explore Marketplace", path: "/marketplace" };
        } else {
          helpReply =
            lang === "pa"
              ? "ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ ਸਹਾਇਕ ਹਾਂ! ਤੁਸੀਂ ਮੈਨੂੰ ਲੌਗਇਨ ਕਰਨ, ਬੋਲ ਕੇ ਦਸਤਕਾਰ ਵਜੋਂ ਰਜਿਸਟਰ ਕਰਨ, ਹੱਥੀਂ ਬਣੇ ਉਤਪਾਦ ਖੋਜਣ, ਜਾਂ ਗਾਹਕ ਸਹਾਇਤਾ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।"
              : lang === "hi"
              ? "मैं आपका स्किलब्रिज सहायक हूँ! आप मुझसे लॉगिन करने, बोलकर कारीगर रजिस्ट्रेशन करने, हस्तशिल्प उत्पाद खोजने, या सहायता केंद्र के लिए कह सकते हैं।"
              : "I am your SkillBridge Mascot & Assistant! You can ask how to log in, register hands-free as an artisan, explore authentic handmade crafts, or contact customer support.";
          nav = { label: "Explore Marketplace", path: "/marketplace" };
        }

        return res.status(200).json({
          success: true,
          reply: helpReply,
          speechText: cleanForSpeech(helpReply),
          pendingAction: null,
          actionData: nav ? { navigation: nav } : null,
        });
      }

      default: {
        const defaultReply =
          lang === "pa"
            ? "ਮੈਂ ਤੁਹਾਡੀ ਪੂਰੀ ਮਦਦ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਕਹਿ ਸਕਦੇ ਹੋ: 'ਮਾਰਕੀਟਪਲੇਸ ਦਿਖਾਓ', 'ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ', 'ਸਹਾਇਤਾ ਕੇਂਦਰ ਖੋਲ੍ਹੋ', ਜਾਂ 'ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ'।"
            : lang === "hi"
            ? "मैं आपकी पूरी मदद करना चाहता हूँ। आप बोल सकते हैं: 'मार्केटप्लेस दिखाओ', 'ऑर्डर ट्रैक करो', 'सपोर्ट सेंटर', या 'कारीगर रजिस्ट्रेशन'।"
            : "I'm here to help! You can ask: 'Show products', 'Track my order', 'Open support', or 'Register as an artisan'.";

        return res.status(200).json({
          success: true,
          reply: defaultReply,
          speechText: cleanForSpeech(defaultReply),
          pendingAction: null,
          actionData: {
            navigation: { label: "Explore Marketplace", path: "/marketplace" },
          },
        });
      }
    }
  } catch (error) {
    console.error("Voice assistant message error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process assistant command.",
    });
  }
};

/**
 * Handle multi-turn slot filling for adding a product
 */
async function handleProductSlotFilling(data, artisanUser, shop, language, res) {
  // If shop doesn't exist, create default shop for artisan
  if (!shop) {
    shop = await Shop.create({
      artisan: artisanUser._id,
      name: `${artisanUser.name}'s Shop`,
      category: artisanUser.artCategory || "Handicrafts",
      location: artisanUser.city || "Punjab",
      description: artisanUser.bio || "Authentic handmade craft shop.",
    });
  }

  // Check required slots: title, price, stock
  if (!data.title) {
    const askTitle =
      language === "pa"
        ? "ਤੁਸੀਂ ਕਿਹੜਾ ਉਤਪਾਦ ਵੇਚਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਕਿਰਪਾ ਕਰਕੇ ਉਤਪਾਦ ਦਾ ਨਾਂ ਦੱਸੋ।"
        : language === "hi"
        ? "आप कौन सा उत्पाद बेचना चाहते हैं? कृपया उत्पाद का नाम बताएं।"
        : "What product would you like to sell? Please specify the name.";

    return res.status(200).json({
      success: true,
      reply: askTitle,
      speechText: cleanForSpeech(askTitle),
      pendingAction: { type: "SLOT_FILLING_PRODUCT", data },
    });
  }

  if (data.price === undefined || isNaN(data.price)) {
    const askPrice =
      language === "pa"
        ? `'${data.title}' ਦੀ ਕੀਮਤ ਕਿੰਨੀ ਰੱਖਣੀ ਹੈ? (ਜਿਵੇਂ ₹2500)`
        : language === "hi"
        ? `'${data.title}' की क्या कीमत रखनी है?`
        : `What is the price for '${data.title}'?`;

    return res.status(200).json({
      success: true,
      reply: askPrice,
      speechText: cleanForSpeech(askPrice),
      pendingAction: { type: "SLOT_FILLING_PRODUCT", data },
    });
  }

  if (data.stock === undefined || isNaN(data.stock)) {
    const askStock =
      language === "pa"
        ? `'${data.title}' ਦੇ ਕਿੰਨੇ ਨਗ (ਸਟਾਕ) ਉਪਲਬਧ ਹਨ?`
        : language === "hi"
        ? `'${data.title}' के कितने पीस (स्टॉक) उपलब्ध हैं?`
        : `How many units of '${data.title}' are available in stock?`;

    return res.status(200).json({
      success: true,
      reply: askStock,
      speechText: cleanForSpeech(askStock),
      pendingAction: { type: "SLOT_FILLING_PRODUCT", data },
    });
  }

  // All required fields present -> Ask Confirmation before saving to MongoDB
  const confirmMsg =
    language === "pa"
      ? `ਮੇਰੇ ਕੋਲ ਉਤਪਾਦ ਦਾ ਵੇਰਵਾ ਹੈ: '${data.title}', ਕੀਮਤ ₹${data.price}, ਸਟਾਕ ${data.stock} ਨਗ। ਕੀ ਮੈਂ ਇਸਨੂੰ ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਜੋੜ ਦੇਵਾਂ? ਪੁਸ਼ਟੀ ਲਈ 'ਹਾਂ' ਕਹੋ।`
      : language === "hi"
      ? `मेरे पास उत्पाद विवरण है: '${data.title}', कीमत ₹${data.price}, स्टॉक ${data.stock} पीस। क्या मैं इसे जोड़ दूँ? पुष्टि के लिए 'हाँ' बोलें।`
      : `I have the product details: '${data.title}', price ₹${data.price}, stock ${data.stock} units. Should I list this product? Say 'yes' to confirm.`;

  return res.status(200).json({
    success: true,
    reply: confirmMsg,
    speechText: cleanForSpeech(confirmMsg),
    pendingAction: {
      type: "CONFIRM_ADD_PRODUCT",
      data,
    },
  });
}

/**
 * Execute actual validated database mutation upon user affirmation
 */
async function executeConfirmedAction(pendingAction, artisanUser, shop, language, res) {
  const { type, data } = pendingAction;

  switch (type) {
    case "CONFIRM_ADD_PRODUCT": {
      if (!shop) {
        shop = await Shop.findOne({ artisan: artisanUser._id });
      }

      const product = await Product.create({
        artisan: artisanUser._id,
        shop: shop?._id,
        title: data.title.trim(),
        price: Number(data.price),
        stock: Number(data.stock),
        category: data.category || artisanUser.artCategory || "Handicrafts",
        description: data.description || `Handcrafted ${data.title} by ${artisanUser.name}.`,
        status: "Published",
        isPublished: true,
      });

      const successMsg =
        language === "pa"
          ? `ਮੁਬਾਰਕਾਂ! ਤੁਹਾਡਾ ਉਤਪਾਦ '${product.title}' ਸਫਲਤਾਪੂਰਵਕ ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਜੋੜ ਦਿੱਤਾ ਗਿਆ ਹੈ!`
          : language === "hi"
          ? `बधाई हो! आपका उत्पाद '${product.title}' सफलतापूर्वक लिस्ट हो गया है!`
          : `Your product '${product.title}' has been added and published successfully!`;

      return res.status(200).json({
        success: true,
        reply: successMsg,
        speechText: cleanForSpeech(successMsg),
        pendingAction: null,
        actionData: {
          product: product.toSafeObject(artisanUser.name, shop?.location),
        },
      });
    }

    case "CONFIRM_DELETE_PRODUCT": {
      await Product.findOneAndDelete({
        _id: data.productId,
        artisan: artisanUser._id,
      });

      const delMsg =
        language === "pa"
          ? `'${data.title}' ਉਤਪਾਦ ਸਫਲਤਾਪੂਰਵਕ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
          : `'${data.title}' has been deleted successfully.`;

      return res.status(200).json({
        success: true,
        reply: delMsg,
        speechText: cleanForSpeech(delMsg),
        pendingAction: null,
      });
    }

    case "CONFIRM_UPDATE_PRODUCT": {
      const updates = {};
      if (data.price !== undefined) updates.price = Number(data.price);
      if (data.stock !== undefined) updates.stock = Number(data.stock);

      const updated = await Product.findOneAndUpdate(
        { _id: data.productId, artisan: artisanUser._id },
        { $set: updates },
        { new: true }
      );

      const updMsg =
        language === "pa"
          ? `'${data.title}' ਦਾ ਵੇਰਵਾ ਅਪਡੇਟ ਹੋ ਗਿਆ ਹੈ!`
          : `'${data.title}' details updated successfully!`;

      return res.status(200).json({
        success: true,
        reply: updMsg,
        speechText: cleanForSpeech(updMsg),
        pendingAction: null,
        actionData: { product: updated ? updated.toSafeObject(artisanUser.name, shop?.location) : null },
      });
    }

    case "CONFIRM_UPDATE_PROFILE": {
      const user = await User.findById(artisanUser._id);
      if (data.name) user.name = data.name;
      if (data.phone) user.phone = data.phone;
      if (data.city) user.city = data.city;
      if (data.artCategory) user.artCategory = data.artCategory;
      await user.save();

      if (data.shopName && shop) {
        shop.name = data.shopName;
        await shop.save();
      }

      const profMsg =
        language === "pa"
          ? "ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਈ ਹੈ।"
          : "Your profile has been updated successfully.";

      return res.status(200).json({
        success: true,
        reply: profMsg,
        speechText: cleanForSpeech(profMsg),
        pendingAction: null,
        actionData: { user: user.toSafeObject() },
      });
    }

    case "CONFIRM_ACCEPT_ORDER": {
      const order = await Order.findOne({
        _id: data.orderId,
        "items.artisanId": artisanUser._id,
      });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      order.orderStatus = "Processing";
      order.items.forEach((item) => {
        if (item.artisanId.toString() === artisanUser._id.toString()) {
          item.itemStatus = "Processing";
        }
      });
      await order.save();

      // Create notification for customer
      await Notification.create({
        recipient: order.customer,
        sender: artisanUser._id,
        type: "ORDER_ACCEPTED",
        title: `Order Accepted by ${artisanUser.name}!`,
        message: `Artisan ${artisanUser.name} has accepted your order request.`,
        orderId: order._id,
      }).catch(() => {});

      const accMsg =
        language === "pa"
          ? `ਆਰਡਰ #${order.orderNumber || order._id.toString().slice(-6)} ਸਵੀਕਾਰ ਕਰ ਲਿਆ ਗਿਆ ਹੈ! ਪ੍ਰੋਸੈਸਿੰਗ ਸ਼ੁਰੂ ਹੋ ਗਈ ਹੈ।`
          : `Order #${order.orderNumber || order._id.toString().slice(-6)} accepted! Production has started.`;

      return res.status(200).json({
        success: true,
        reply: accMsg,
        speechText: cleanForSpeech(accMsg),
        pendingAction: null,
      });
    }

    case "CONFIRM_COMPLETE_ORDER": {
      const order = await Order.findOne({
        _id: data.orderId,
        "items.artisanId": artisanUser._id,
      });

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found." });
      }

      order.orderStatus = "Completed";
      order.items.forEach((item) => {
        if (item.artisanId.toString() === artisanUser._id.toString()) {
          item.itemStatus = "Completed";
        }
      });
      await order.save();

      const compMsg =
        language === "pa"
          ? `ਆਰਡਰ #${order.orderNumber || order._id.toString().slice(-6)} ਪੂਰਾ ਮਾਰਕ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ!`
          : `Order #${order.orderNumber || order._id.toString().slice(-6)} marked as completed!`;

      return res.status(200).json({
        success: true,
        reply: compMsg,
        speechText: cleanForSpeech(compMsg),
        pendingAction: null,
      });
    }

    case "CONFIRM_ACCEPT_PROJECT": {
      const project = await Project.findById(data.projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found." });
      }

      project.assignedArtisan = artisanUser._id;
      project.status = "Accepted";
      project.acceptanceDetails = {
        acceptedAt: new Date(),
        acceptedBy: artisanUser._id,
        agreedPrice: project.unitPrice,
        agreedDuration: project.duration,
      };
      await project.save();

      const projMsg =
        language === "pa"
          ? `ਪ੍ਰੋਜੈਕਟ '${project.title}' ਸਫਲਤਾਪੂਰਵਕ ਸਵੀਕਾਰ ਕਰ ਲਿਆ ਗਿਆ ਹੈ!`
          : `Project '${project.title}' has been accepted successfully!`;

      return res.status(200).json({
        success: true,
        reply: projMsg,
        speechText: cleanForSpeech(projMsg),
        pendingAction: null,
      });
    }

    default:
      return res.status(200).json({
        success: true,
        reply: "Action completed.",
        speechText: "Action completed.",
        pendingAction: null,
      });
  }
}
