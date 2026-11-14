import mongoose from "mongoose";
import fs from "fs";
import { User } from "../models/user.model.js";
import { Shop } from "../models/shop.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Project } from "../models/project.model.js";
import { Notification } from "../models/notification.model.js";
import {
  parseArtisanIntent,
  detectSpokenLanguage,
  extractSkills,
  extractExperience,
  extractLocation,
  extractName,
} from "../services/voice-assistant.service.js";
import {
  getArtisanProfile,
  createArtisanProfile,
  updateArtisanProfile,
  addArtisanSkill,
  removeArtisanSkill,
  getMissingProfileFields,
  updateProductDetails,
} from "../services/voice-tools.service.js";
import { synthesizeVoiceAudio } from "../services/voice-tts.service.js";
import { transcribeAudioFile } from "../services/voice-stt.service.js";

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
 * @access Public / Authenticated
 */
export const handleVoiceAssistantMessage = async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      pendingAction = null,
      language: reqLanguage = "pa",
    } = req.body || {};

    const activeUser = req.user || null;
    const isArtisan = activeUser && activeUser.accountType === "artisan";
    const isCustomer = activeUser && activeUser.accountType === "customer";
    const isIndustry = activeUser && activeUser.accountType === "industry";

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    const trimmedMsg = message.trim();
    const detectedLang = detectSpokenLanguage(trimmedMsg);
    // Prefer detected language over requested language if user spoke in a specific script/pattern
    const lang = detectedLang || reqLanguage || "pa";

    // Fetch current artisan shop for context if logged in as artisan
    const shop = isArtisan ? await Shop.findOne({ artisan: activeUser._id }) : null;

    // ========================================================
    // Step 1: Active pendingAction Handling
    // ========================================================
    if (pendingAction && pendingAction.type) {
      const intentCheck = await parseArtisanIntent(trimmedMsg, {
        name: activeUser?.name || "Guest",
        id: activeUser?._id ? activeUser._id.toString() : "",
        shopName: shop?.name || "",
      });

      // Handle Cancel / Negation
      if (intentCheck.intent === "NEGATION") {
        const reply =
          lang === "pa"
            ? "ਠੀਕ ਹੈ ਜੀ, ਇਹ ਕਾਰਵਾਈ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਹੋਰ ਕੀ ਮਦਦ ਕਰਾਂ?"
            : lang === "hi"
            ? "ठीक है जी, यह कार्रवाई रद्द कर दी गई है। मैं आपकी और क्या मदद करूँ?"
            : "Action cancelled. What else would you like to do?";

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: null,
        });
      }

      // Handle Affirmation / Confirmation
      if (intentCheck.intent === "AFFIRMATION") {
        return await executeConfirmedAction(pendingAction, activeUser, shop, lang, res);
      }

      // Handle Slot-Filling for Profile Completion
      if (pendingAction.type === "SLOT_FILLING_PROFILE" && isArtisan) {
        const targetField = pendingAction.targetField || "city";
        const updates = {};

        if (targetField === "name") {
          updates.name = extractName(trimmedMsg) || trimmedMsg;
        } else if (targetField === "city") {
          updates.city = extractLocation(trimmedMsg) || trimmedMsg;
        } else if (targetField === "experience") {
          updates.experience = extractExperience(trimmedMsg) || trimmedMsg;
        } else if (targetField === "skills") {
          const s = extractSkills(trimmedMsg);
          updates.skills = s.length > 0 ? s : [trimmedMsg];
        } else if (targetField === "phone") {
          const digits = trimmedMsg.replace(/\D/g, "");
          if (digits.length >= 10) updates.phone = digits.slice(-10);
        } else if (targetField === "bio") {
          updates.bio = trimmedMsg;
        }

        const updatedResult = await updateArtisanProfile(activeUser._id, updates);
        const completion = updatedResult.completion;

        let reply = "";
        if (completion.isComplete) {
          reply =
            lang === "pa"
              ? `ਬਹੁਤ ਵਧੀਆ! ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਹੁਣ 100% ਮੁਕੰਮਲ ਹੋ ਗਈ ਹੈ। ਸਾਰੀ ਜਾਣਕਾਰੀ ਸੁਰੱਖਿਅਤ ਹੈ।`
              : lang === "hi"
              ? `बहुत बढ़िया! आपकी प्रोफाइल अब 100% पूरी हो चुकी है। सभी जानकारी सुरक्षित है।`
              : `Great job! Your artisan profile is now 100% complete and saved.`;
        } else {
          const nextPrompt = completion.nextMissingField?.prompt[lang] || completion.nextMissingField?.prompt.en;
          reply =
            lang === "pa"
              ? `ਜਾਣਕਾਰੀ ਦਰਜ ਹੋ ਗਈ ਹੈ! ਪ੍ਰੋਫਾਈਲ ${completion.completionPercentage}% ਪੂਰੀ ਹੈ। ${nextPrompt}`
              : lang === "hi"
              ? `जानकारी सेव हो गई है! प्रोफाइल ${completion.completionPercentage}% पूरी है। ${nextPrompt}`
              : `Saved! Profile is now ${completion.completionPercentage}% complete. ${nextPrompt}`;
        }

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          detectedLanguage: lang,
          pendingAction: completion.isComplete
            ? null
            : { type: "SLOT_FILLING_PROFILE", targetField: completion.nextMissingField?.field },
          actionData: {
            user: updatedResult.user,
            completion,
            profileCard: true,
          },
        });
      }

      // Handle Profile Creation Onboarding Session (Multi-turn conversational flow)
      if (pendingAction.type === "PROFILE_CREATION_SESSION") {
        const collected = pendingAction.collected || {};

        // Extract answers from current turn
        const s = extractSkills(trimmedMsg);
        if (s.length > 0) collected.skills = Array.from(new Set([...(collected.skills || []), ...s]));

        const exp = extractExperience(trimmedMsg);
        if (exp) collected.experience = exp;

        const loc = extractLocation(trimmedMsg);
        if (loc) collected.city = loc;

        const nm = extractName(trimmedMsg);
        if (nm) collected.name = nm;

        const phoneDigits = trimmedMsg.replace(/\D/g, "");
        if (phoneDigits.length >= 10) collected.phone = phoneDigits.slice(-10);

        // Check if we still lack essential fields
        if (!collected.name) {
          const askName =
            lang === "pa"
              ? "ਤੁਹਾਡਾ ਸ਼ੁਭ ਨਾਮ ਕੀ ਹੈ ਜੀ?"
              : lang === "hi"
              ? "आपका शुभ नाम क्या है?"
              : "What is your full name?";

          return res.status(200).json({
            success: true,
            reply: askName,
            speechText: cleanForSpeech(askName),
            detectedLanguage: lang,
            pendingAction: { type: "PROFILE_CREATION_SESSION", collected, currentField: "name" },
          });
        }

        if (!collected.city) {
          const askCity =
            lang === "pa"
              ? `ਜੀ ਆਇਆਂ ਨੂੰ ${collected.name} ਜੀ! ਤੁਹਾਡਾ ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ ਕਿਹੜਾ ਹੈ?`
              : lang === "hi"
              ? `स्वागत है ${collected.name} जी! आपका गाँव या शहर कौन सा है?`
              : `Welcome ${collected.name}! Which city or village are you from?`;

          return res.status(200).json({
            success: true,
            reply: askCity,
            speechText: cleanForSpeech(askCity),
            detectedLanguage: lang,
            pendingAction: { type: "PROFILE_CREATION_SESSION", collected, currentField: "city" },
          });
        }

        if (!collected.skills || collected.skills.length === 0) {
          const askSkill =
            lang === "pa"
              ? `ਤੁਸੀਂ ਕਿਹੜਾ ਕੰਮ ਜਾਂ ਦਸਤਕਾਰੀ ਕਰਦੇ ਹੋ? (ਜਿਵੇਂ ਸਿਲਾਈ, ਫੁਲਕਾਰੀ, ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ, ਬੁਣਤੀ)`
              : lang === "hi"
              ? `आप कौन सा शिल्प या हस्तकला करते हैं? (जैसे सिलाई, कढ़ाई, मिट्टी के बर्तन, बुनाई)`
              : `What crafts or skills do you specialize in? (e.g. tailoring, embroidery, pottery, weaving)`;

          return res.status(200).json({
            success: true,
            reply: askSkill,
            speechText: cleanForSpeech(askSkill),
            detectedLanguage: lang,
            pendingAction: { type: "PROFILE_CREATION_SESSION", collected, currentField: "skills" },
          });
        }

        // We have minimum required data -> Create Profile in Database
        const createResult = await createArtisanProfile(collected, activeUser);

        const successMsg =
          lang === "pa"
            ? `ਮੁਬਾਰਕਾਂ ${createResult.user.name} ਜੀ! ਤੁਹਾਡੀ ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਈ ਹੈ। ਤੁਹਾਡਾ ਹੁਨਰ: ${createResult.user.artCategory}, ਸ਼ਹਿਰ: ${createResult.user.city}।`
            : lang === "hi"
            ? `बधाई हो ${createResult.user.name} जी! आपकी कारीगर प्रोफाइल सफलतापूर्वक बन गई है। हुनर: ${createResult.user.artCategory}, शहर: ${createResult.user.city}।`
            : `Congratulations ${createResult.user.name}! Your artisan profile has been successfully created. Craft: ${createResult.user.artCategory}, Location: ${createResult.user.city}.`;

        return res.status(200).json({
          success: true,
          reply: successMsg,
          speechText: cleanForSpeech(successMsg),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: {
            user: createResult.user,
            token: createResult.token || null,
            completion: createResult.completion,
            profileCard: true,
          },
        });
      }

      // Handle Product Slot Filling
      if (pendingAction.type === "CONFIRM_ADD_PRODUCT" || pendingAction.type === "SLOT_FILLING_PRODUCT") {
        const numMatch = trimmedMsg.match(/\d+/);
        if (numMatch && (trimmedMsg.toLowerCase().includes("price") || trimmedMsg.toLowerCase().includes("rupee") || trimmedMsg.includes("ਕੀਮਤ") || trimmedMsg.includes("रुपये"))) {
          pendingAction.data.price = Number(numMatch[0]);
        } else if (numMatch && (trimmedMsg.toLowerCase().includes("stock") || trimmedMsg.includes("ਸਟਾਕ") || trimmedMsg.includes("पीस"))) {
          pendingAction.data.stock = Number(numMatch[0]);
        } else if (!pendingAction.data.title && trimmedMsg.length > 2) {
          pendingAction.data.title = trimmedMsg;
        }

        return await handleProductSlotFilling(pendingAction.data, activeUser, shop, lang, res);
      }
    }

    // ========================================================
    // Step 2: Parse Intent & Entities from message
    // ========================================================
    const parsed = await parseArtisanIntent(trimmedMsg, {
      name: activeUser?.name || "Guest",
      id: activeUser?._id ? activeUser._id.toString() : "",
      shopName: shop?.name || "",
    });

    const entities = parsed.entities || {};

    // ========================================================
    // Step 3: Route to Structured Function Calling Handlers
    // ========================================================
    switch (parsed.intent) {
      // ----------------------------------------------------
      // A. ARTISAN PROFILE OPERATIONS
      // ----------------------------------------------------
      case "PROFILE_UPDATE": {
        const updates = {};

        if (entities.skills && entities.skills.length > 0) {
          updates.skills = entities.skills;
          updates.artCategory = entities.skills[0];
        } else if (entities.artCategory) {
          updates.artCategory = entities.artCategory;
          updates.skills = [entities.artCategory];
        }

        if (entities.experience) updates.experience = entities.experience;
        if (entities.city) updates.city = entities.city;
        if (entities.name) updates.name = entities.name;
        if (entities.phone) updates.phone = entities.phone;
        if (entities.bio) updates.bio = entities.bio;

        // If authenticated artisan -> Execute updateArtisanProfile tool directly
        if (isArtisan) {
          if (Object.keys(updates).length === 0) {
            const promptMsg =
              lang === "pa"
                ? "ਤੁਸੀਂ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਕੀ ਬਦਲਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਜਿਵੇਂ: ਹੁਨਰ, ਤਜਰਬਾ, ਪਿੰਡ ਜਾਂ ਫੋਨ ਨੰਬਰ।"
                : lang === "hi"
                ? "आप अपनी प्रोफाइल में क्या बदलना चाहते हैं? जैसे: हुनर, अनुभव, गाँव या फ़ोन नंबर।"
                : "What would you like to update in your profile? E.g., craft, experience, location, or phone.";

            return res.status(200).json({
              success: true,
              reply: promptMsg,
              speechText: cleanForSpeech(promptMsg),
              detectedLanguage: lang,
              pendingAction: null,
            });
          }

          // Tool Call: updateArtisanProfile
          const result = await updateArtisanProfile(activeUser._id, updates);
          const completion = result.completion;

          // Build summary of updated attributes
          const parts = [];
          if (updates.skills?.length) {
            const sName = updates.skills.join(", ");
            parts.push(lang === "pa" ? `ਹੁਨਰ: ${sName}` : lang === "hi" ? `हुनर: ${sName}` : `Skills: ${sName}`);
          }
          if (updates.experience) {
            parts.push(lang === "pa" ? `ਤਜਰਬਾ: ${updates.experience}` : lang === "hi" ? `अनुभव: ${updates.experience}` : `Experience: ${updates.experience}`);
          }
          if (updates.city) {
            parts.push(lang === "pa" ? `ਸ਼ਹਿਰ: ${updates.city}` : lang === "hi" ? `शहर: ${updates.city}` : `Location: ${updates.city}`);
          }
          if (updates.name) {
            parts.push(lang === "pa" ? `ਨਾਂ: ${updates.name}` : lang === "hi" ? `नाम: ${updates.name}` : `Name: ${updates.name}`);
          }
          if (updates.phone) {
            parts.push(lang === "pa" ? `ਫੋਨ: ${updates.phone}` : lang === "hi" ? `फ़ोन: ${updates.phone}` : `Phone: ${updates.phone}`);
          }

          const detailsStr = parts.join(", ");
          const nextPrompt = completion.nextMissingField
            ? completion.nextMissingField.prompt[lang] || completion.nextMissingField.prompt.en
            : "";

          const reply =
            lang === "pa"
              ? `ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ${detailsStr} ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਕਰ ਲਿਆ ਗਿਆ ਹੈ! ਪ੍ਰੋਫਾਈਲ ${completion.completionPercentage}% ਪੂਰੀ ਹੈ। ${nextPrompt}`
              : lang === "hi"
              ? `आपकी प्रोफाइल में ${detailsStr} सफलतापूर्वक सेव कर लिया गया है! प्रोफाइल ${completion.completionPercentage}% पूरी है। ${nextPrompt}`
              : `Your profile details (${detailsStr}) have been successfully updated! Profile is ${completion.completionPercentage}% complete. ${nextPrompt}`;

          return res.status(200).json({
            success: true,
            reply: reply.trim(),
            speechText: cleanForSpeech(reply),
            detectedLanguage: lang,
            pendingAction: completion.isComplete
              ? null
              : { type: "SLOT_FILLING_PROFILE", targetField: completion.nextMissingField?.field },
            actionData: {
              user: result.user,
              completion,
              profileCard: true,
            },
          });
        }

        // If NOT logged in -> Start profile creation session
        return res.status(200).json({
          success: true,
          reply:
            lang === "pa"
              ? "ਮੈਂ ਤੁਹਾਡਾ ਦਸਤਕਾਰ ਵੇਰਵਾ ਨੋਟ ਕਰ ਲਿਆ ਹੈ। ਤੁਹਾਡਾ ਸ਼ੁਭ ਨਾਮ ਕੀ ਹੈ ਜੀ?"
              : lang === "hi"
              ? "मैंने आपका कारीगर विवरण नोट कर लिया है। आपका शुभ नाम क्या है?"
              : "I have noted your craft details. What is your full name?",
          speechText:
            lang === "pa"
              ? "ਮੈਂ ਤੁਹਾਡਾ ਦਸਤਕਾਰ ਵੇਰਵਾ ਨੋਟ ਕਰ ਲਿਆ ਹੈ। ਤੁਹਾਡਾ ਸ਼ੁਭ ਨਾਮ ਕੀ ਹੈ ਜੀ?"
              : "Noted your craft details. What is your full name?",
          detectedLanguage: lang,
          pendingAction: {
            type: "PROFILE_CREATION_SESSION",
            collected: updates,
            currentField: "name",
          },
        });
      }

      case "PROFILE_GET": {
        if (!isArtisan) {
          const reqLogin =
            lang === "pa"
              ? "ਇਹ ਜਾਣਕਾਰੀ ਦੇਖਣ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰਨਾ ਪਵੇਗਾ। ਕੀ ਮੈਂ ਤੁਹਾਨੂੰ ਲੌਗਇਨ ਪੇਜ 'ਤੇ ਲੈ ਜਾਵਾਂ?"
              : lang === "hi"
              ? "यह जानकारी देखने के लिए कृपया पहले कारीगर खाते में लॉगिन करें। क्या आप लॉगिन पेज पर जाना चाहते हैं?"
              : "To view your artisan profile, please log in to your artisan account first.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            detectedLanguage: lang,
            actionData: {
              navigation: {
                label: "Go to Artisan Login (ਲੌਗਇਨ ਕਰੋ)",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }

        // Tool Call: getArtisanProfile
        const profileData = await getArtisanProfile(activeUser._id);
        const { user: profUser, completion } = profileData;

        const skillsStr = profUser.skills?.length
          ? profUser.skills.join(", ")
          : profUser.artCategory || (lang === "pa" ? "ਦਸਤਕਾਰੀ" : "Handicrafts");

        const profileReply =
          lang === "pa"
            ? `ਤੁਹਾਡਾ ਨਾਂ ${profUser.name} ਹੈ। ਹੁਨਰ: ${skillsStr}। ਤਜਰਬਾ: ${profUser.experience || "ਨਹੀਂ ਦੱਸਿਆ"}। ਸ਼ਹਿਰ: ${profUser.city || "ਪੰਜਾਬ"}। ਫੋਨ: ${profUser.phone || "ਦਰਜ ਨਹੀਂ"}। ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ${completion.completionPercentage}% ਪੂਰੀ ਹੈ।`
            : lang === "hi"
            ? `आपका नाम ${profUser.name} है। हुनर: ${skillsStr}। अनुभव: ${profUser.experience || "दर्ज नहीं"}। शहर: ${profUser.city || "भारत"}। फ़ोन: ${profUser.phone || "दर्ज नहीं"}। आपकी प्रोफाइल ${completion.completionPercentage}% पूरी है।`
            : `Your name is ${profUser.name}. Craft/Skills: ${skillsStr}. Experience: ${profUser.experience || "Not set"}. Location: ${profUser.city || "Not set"}. Phone: ${profUser.phone || "Not set"}. Profile is ${completion.completionPercentage}% complete.`;

        return res.status(200).json({
          success: true,
          reply: profileReply,
          speechText: cleanForSpeech(profileReply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: {
            profile: profUser,
            shop: profileData.shop,
            completion,
            profileCard: true,
          },
        });
      }

      case "PROFILE_COMPLETION_CHECK": {
        if (!isArtisan) {
          const reqLogin =
            lang === "pa"
              ? "ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।"
              : lang === "hi"
              ? "प्रोफाइल पूरी करने के लिए कृपया पहले लॉगिन करें।"
              : "Please log in to complete your artisan profile.";

          return res.status(200).json({
            success: true,
            reply: reqLogin,
            speechText: cleanForSpeech(reqLogin),
            detectedLanguage: lang,
            actionData: { navigation: { label: "Artisan Login", path: "/artisan/auth?mode=login" } },
          });
        }

        // Tool Call: getMissingProfileFields
        const completion = getMissingProfileFields(activeUser);

        if (completion.isComplete) {
          const completeMsg =
            lang === "pa"
              ? "ਵਧਾਈਆਂ! ਤੁਹਾਡੀ ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ 100% ਮੁਕੰਮਲ ਹੈ ਅਤੇ ਪੂਰੀ ਤਰ੍ਹਾਂ ਪ੍ਰਮਾਣਿਤ ਹੈ।"
              : lang === "hi"
              ? "बधाई हो! आपकी कारीगर प्रोफाइल 100% पूरी है और प्रमाणित है।"
              : "Congratulations! Your artisan profile is 100% complete and fully verified.";

          return res.status(200).json({
            success: true,
            reply: completeMsg,
            speechText: cleanForSpeech(completeMsg),
            detectedLanguage: lang,
            pendingAction: null,
            actionData: { completion, user: activeUser.toSafeObject(), profileCard: true },
          });
        }

        const missingLabels = completion.missingFields
          .map((m) => m.label[lang] || m.label.en)
          .join(", ");

        const nextPrompt = completion.nextMissingField.prompt[lang] || completion.nextMissingField.prompt.en;

        const checkReply =
          lang === "pa"
            ? `ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ${completion.completionPercentage}% ਪੂਰੀ ਹੈ। ਬਾਕੀ ਵੇਰਵੇ: ${missingLabels}। ${nextPrompt}`
            : lang === "hi"
            ? `आपकी प्रोफाइल ${completion.completionPercentage}% पूरी है। बाकी जानकारी: ${missingLabels}। ${nextPrompt}`
            : `Your profile is ${completion.completionPercentage}% complete. Missing fields: ${missingLabels}. ${nextPrompt}`;

        return res.status(200).json({
          success: true,
          reply: checkReply,
          speechText: cleanForSpeech(checkReply),
          detectedLanguage: lang,
          pendingAction: {
            type: "SLOT_FILLING_PROFILE",
            targetField: completion.nextMissingField.field,
          },
          actionData: { completion, profileCard: true },
        });
      }

      case "SKILL_ADD": {
        const skillToAdd = entities.skill || (entities.skills && entities.skills[0]);
        if (!skillToAdd) {
          const ask =
            lang === "pa"
              ? "ਤੁਸੀਂ ਕਿਹੜਾ ਹੁਨਰ ਜੋੜਨਾ ਚਾਹੁੰਦੇ ਹੋ? (ਜਿਵੇਂ ਕਢਾਈ, ਸਿਲਾਈ, ਬੁਣਤੀ)"
              : lang === "hi"
              ? "आप कौन सा हुनर जोड़ना चाहते हैं? (जैसे कढ़ाई, सिलाई, बुनाई)"
              : "Which skill would you like to add? (e.g. Embroidery, Tailoring, Weaving)";

          return res.status(200).json({
            success: true,
            reply: ask,
            speechText: cleanForSpeech(ask),
            detectedLanguage: lang,
          });
        }

        if (!isArtisan) {
          const reqLogin =
            lang === "pa"
              ? "ਹੁਨਰ ਜੋੜਨ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰੋ।"
              : "Please log in to your artisan account to add skills.";
          return res.status(200).json({ success: true, reply: reqLogin, speechText: cleanForSpeech(reqLogin), detectedLanguage: lang });
        }

        // Tool Call: addArtisanSkill
        const result = await addArtisanSkill(activeUser._id, skillToAdd);

        const reply =
          lang === "pa"
            ? `'${skillToAdd}' ਹੁਨਰ ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਜੋੜ ਦਿੱਤਾ ਗਿਆ ਹੈ! ਕੁੱਲ ਹੁਨਰ: ${result.skills.join(", ")}।`
            : lang === "hi"
            ? `'${skillToAdd}' हुनर आपकी प्रोफाइल में सफलतापूर्वक जोड़ दिया गया है! कुल हुनर: ${result.skills.join(", ")}।`
            : `'${skillToAdd}' has been added to your profile! Total skills: ${result.skills.join(", ")}.`;

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: {
            user: result.user,
            skills: result.skills,
            completion: result.completion,
            profileCard: true,
          },
        });
      }

      case "SKILL_REMOVE": {
        const skillToRemove = entities.skill || (entities.skills && entities.skills[0]);
        if (!skillToRemove || !isArtisan) {
          return res.status(200).json({
            success: true,
            reply: lang === "pa" ? "ਹੁਨਰ ਹਟਾਉਣ ਲਈ ਖਾਸ ਹੁਨਰ ਦਾ ਨਾਂ ਦੱਸੋ।" : "Please specify which skill to remove.",
            speechText: "Please specify which skill to remove.",
            detectedLanguage: lang,
          });
        }

        // Tool Call: removeArtisanSkill
        const result = await removeArtisanSkill(activeUser._id, skillToRemove);

        const reply =
          lang === "pa"
            ? `'${skillToRemove}' ਹੁਨਰ ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚੋਂ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
            : lang === "hi"
            ? `'${skillToRemove}' हुनर आपकी प्रोफाइल से हटा दिया गया है।`
            : `'${skillToRemove}' has been removed from your profile.`;

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: { user: result.user, skills: result.skills },
        });
      }

      case "PROFILE_CREATE": {
        const initialAnswers = {
          name: entities.name || activeUser?.name || "",
          city: entities.city || activeUser?.city || "",
          skills: entities.skills || [],
          experience: entities.experience || "",
        };

        if (!initialAnswers.name) {
          const askName =
            lang === "pa"
              ? "ਆਓ ਨਵੀਂ ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਈਏ! ਤੁਹਾਡਾ ਸ਼ੁਭ ਨਾਮ ਕੀ ਹੈ ਜੀ?"
              : lang === "hi"
              ? "आइए नई कारीगर प्रोफाइल बनाते हैं! आपका शुभ नाम क्या है?"
              : "Let's create your artisan profile! What is your full name?";

          return res.status(200).json({
            success: true,
            reply: askName,
            speechText: cleanForSpeech(askName),
            detectedLanguage: lang,
            pendingAction: {
              type: "PROFILE_CREATION_SESSION",
              collected: initialAnswers,
              currentField: "name",
            },
          });
        }

        return res.status(200).json({
          success: true,
          reply:
            lang === "pa"
              ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${initialAnswers.name} ਜੀ! ਤੁਹਾਡਾ ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ ਕਿਹੜਾ ਹੈ?`
              : `Welcome ${initialAnswers.name}! Which city or village are you from?`,
          speechText: cleanForSpeech(`Welcome ${initialAnswers.name}! Which city or village are you from?`),
          detectedLanguage: lang,
          pendingAction: {
            type: "PROFILE_CREATION_SESSION",
            collected: initialAnswers,
            currentField: "city",
          },
        });
      }

      // ----------------------------------------------------
      // B. PRODUCT MANAGEMENT
      // ----------------------------------------------------
      case "PRODUCT_ADD": {
        if (!isArtisan) {
          const addLogin =
            lang === "pa"
              ? "ਉਤਪਾਦ ਜੋੜਨ ਲਈ ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਦਸਤਕਾਰ ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ ਕਰਨਾ ਪਵੇਗਾ।"
              : "To add products, please log in to your artisan account first.";

          return res.status(200).json({
            success: true,
            reply: addLogin,
            speechText: cleanForSpeech(addLogin),
            detectedLanguage: lang,
            actionData: {
              navigation: {
                label: "Artisan Login",
                path: "/artisan/auth?mode=login",
              },
            },
          });
        }

        const initialData = {
          title: entities.title || "",
          price: entities.price,
          stock: entities.stock,
          category: entities.category || activeUser.artCategory || "Handicrafts",
          description: entities.description || "",
        };

        return await handleProductSlotFilling(initialData, activeUser, shop, lang, res);
      }

      case "PRODUCT_UPDATE": {
        if (!isArtisan) {
          return res.status(200).json({
            success: true,
            reply: "Please log in to your artisan account to update products.",
            speechText: "Please log in to update products.",
            detectedLanguage: lang,
          });
        }

        // Tool Call: updateProductDetails
        const result = await updateProductDetails(activeUser._id, entities);

        const reply =
          lang === "pa"
            ? `'${result.product.title}' ਦਾ ਵੇਰਵਾ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਿਆ ਹੈ! ਨਵੀਂ ਕੀਮਤ: ₹${result.product.price}, ਸਟਾਕ: ${result.product.stock}।`
            : lang === "hi"
            ? `'${result.product.title}' का विवरण सफलतापूर्वक अपडेट हो गया है! कीमत: ₹${result.product.price}, स्टॉक: ${result.product.stock}।`
            : `'${result.product.title}' details updated! Price: ₹${result.product.price}, Stock: ${result.product.stock}.`;

        return res.status(200).json({
          success: true,
          reply,
          speechText: cleanForSpeech(reply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: { product: result.product },
        });
      }

      case "PRODUCT_LIST": {
        if (!isArtisan) {
          const allProds = await Product.find({ isPublished: true }).limit(6);
          const listReply =
            lang === "pa"
              ? `ਸਕਿੱਲਬ੍ਰਿਜ 'ਤੇ ਉਪਲਬਧ ਉਤਪਾਦ: ${allProds.slice(0, 3).map((p) => p.title).join(", ")}। ਮਾਰਕੀਟਪਲੇਸ ਵਿੱਚ ਹੋਰ ਦੇਖੋ।`
              : `Here are featured crafts on SkillBridge: ${allProds.slice(0, 3).map((p) => p.title).join(", ")}. Explore marketplace for more.`;

          return res.status(200).json({
            success: true,
            reply: listReply,
            speechText: cleanForSpeech(listReply),
            detectedLanguage: lang,
            actionData: {
              products: allProds.map((p) => p.toSafeObject()),
              navigation: { label: "Explore Marketplace", path: "/marketplace" },
            },
          });
        }

        const products = await Product.find({ artisan: activeUser._id }).sort({ createdAt: -1 });

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
            detectedLanguage: lang,
            pendingAction: null,
          });
        }

        const productNames = products.slice(0, 4).map((p) => `'${p.title}' (₹${p.price})`).join(", ");
        const listReply =
          lang === "pa"
            ? `ਤੁਹਾਡੇ ਕੋਲ ${products.length} ਉਤਪਾਦ ਦਰਜ ਹਨ: ${productNames}।`
            : lang === "hi"
            ? `आपके पास ${products.length} उत्पाद लिस्ट हैं: ${productNames}।`
            : `You have ${products.length} products listed: ${productNames}.`;

        return res.status(200).json({
          success: true,
          reply: listReply,
          speechText: cleanForSpeech(listReply),
          detectedLanguage: lang,
          pendingAction: null,
          actionData: {
            products: products.map((p) => p.toSafeObject(activeUser.name, shop?.location)),
          },
        });
      }

      // ----------------------------------------------------
      // C. ORDERS & TRACKING
      // ----------------------------------------------------
      case "ORDER_LIST": {
        if (isCustomer) {
          const custOrders = await Order.find({ customer: activeUser._id }).sort({ createdAt: -1 }).limit(5);
          if (custOrders.length === 0) {
            const noOrd = lang === "pa" ? "ਤੁਹਾਡਾ ਕੋਈ ਪੁਰਾਣਾ ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ।" : "You have no active orders yet.";
            return res.status(200).json({ success: true, reply: noOrd, speechText: cleanForSpeech(noOrd), detectedLanguage: lang });
          }
          const latest = custOrders[0];
          const ordMsg =
            lang === "pa"
              ? `ਤੁਹਾਡਾ ਤਾਜ਼ਾ ਆਰਡਰ #${latest.orderNumber || latest._id.toString().slice(-6)} ਸਥਿਤੀ: ${latest.orderStatus} ਵਿੱਚ ਹੈ।`
              : `Your latest order #${latest.orderNumber || latest._id.toString().slice(-6)} is currently ${latest.orderStatus}.`;

          return res.status(200).json({
            success: true,
            reply: ordMsg,
            speechText: cleanForSpeech(ordMsg),
            detectedLanguage: lang,
            actionData: { orders: custOrders.map((o) => o.toSafeObject()) },
          });
        }

        if (!isArtisan) {
          const reqLogin = "Please log in to view your orders.";
          return res.status(200).json({ success: true, reply: reqLogin, speechText: reqLogin, detectedLanguage: lang });
        }

        const artisanOrders = await Order.find({ "items.artisanId": activeUser._id }).sort({ createdAt: -1 });
        const formatted = artisanOrders.map((o) => o.toArtisanOrder(activeUser._id));

        const pending = formatted.filter((o) => ["Awaiting response", "Pending"].includes(o.status));
        const ordMsg =
          lang === "pa"
            ? `ਤੁਹਾਡੇ ਕੋਲ ਕੁੱਲ ${formatted.length} ਆਰਡਰ ਹਨ, ਜਿਨ੍ਹਾਂ ਵਿੱਚੋਂ ${pending.length} ਪੈਂਡਿੰਗ ਹਨ।`
            : `You have ${formatted.length} orders total, with ${pending.length} awaiting response.`;

        return res.status(200).json({
          success: true,
          reply: ordMsg,
          speechText: cleanForSpeech(ordMsg),
          detectedLanguage: lang,
          actionData: { orders: formatted.slice(0, 5) },
        });
      }

      // ----------------------------------------------------
      // D. EARNINGS & PAYMENTS
      // ----------------------------------------------------
      case "PAYMENT_SUMMARY":
      case "PAYMENT_PENDING": {
        if (!isArtisan) {
          const msg = "Please log in to your artisan account to view earnings.";
          return res.status(200).json({ success: true, reply: msg, speechText: msg, detectedLanguage: lang });
        }

        const orders = await Order.find({ "items.artisanId": activeUser._id });
        const formatted = orders.map((o) => o.toArtisanOrder(activeUser._id));
        const paidOrders = formatted.filter((o) => o.status === "Completed" && o.paymentStatus === "paid");
        const totalEarned = paidOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

        const pendingOrders = formatted.filter((o) => ["Processing", "Ready to ship", "Shipped"].includes(o.status));
        const pendingPayout = pendingOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

        const earnMsg =
          lang === "pa"
            ? `ਤੁਹਾਡੀ ਕੁੱਲ ਕਮਾਈ ₹${totalEarned.toLocaleString("en-IN")} ਹੈ, ਅਤੇ ₹${pendingPayout.toLocaleString("en-IN")} ਬਕਾਇਆ ਹੈ।`
            : lang === "hi"
            ? `आपकी कुल कमाई ₹${totalEarned.toLocaleString("en-IN")} है, और ₹${pendingPayout.toLocaleString("en-IN")} बकाया है।`
            : `Your total completed earnings are ₹${totalEarned.toLocaleString("en-IN")}, with ₹${pendingPayout.toLocaleString("en-IN")} in pending orders.`;

        return res.status(200).json({
          success: true,
          reply: earnMsg,
          speechText: cleanForSpeech(earnMsg),
          detectedLanguage: lang,
          actionData: {
            stats: { totalEarnings: totalEarned, pendingPayout },
          },
        });
      }

      // ----------------------------------------------------
      // E. GENERAL GREETINGS & PLATFORM HELP
      // ----------------------------------------------------
      case "GREETING": {
        const greetReply =
          lang === "pa"
            ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser?.name || ""} ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ ਸਹਾਇਕ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਕਹਿ ਸਕਦੇ ਹੋ: 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ', 'ਸਿਲਾਈ ਦਾ ਹੁਨਰ ਜੋੜੋ', 'ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ', ਜਾਂ 'ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ'!`
            : lang === "hi"
            ? `नमस्ते ${activeUser?.name || ""} जी! मैं आपका सहायक हूँ। आप बोल सकते हैं: 'मेरी प्रोफाइल दिखाओ', 'सिलाई का हुनर जोड़ो', 'प्रोफाइल पूरी करो', या 'नया उत्पाद जोड़ो'!`
            : `Hello ${activeUser?.name || ""}! I am your SkillBridge assistant. You can speak commands like 'Show my profile', 'I am a tailor with five years of experience', 'Complete my profile', or 'Add a product'!`;

        return res.status(200).json({
          success: true,
          reply: greetReply,
          speechText: cleanForSpeech(greetReply),
          detectedLanguage: lang,
          pendingAction: null,
        });
      }

      case "ABOUT_PLATFORM": {
        const aboutReply =
          lang === "pa"
            ? "ਸਕਿੱਲਬ੍ਰਿਜ ਭਾਰਤੀ ਦਸਤਕਾਰਾਂ ਅਤੇ ਪੇਂਡੂ ਮਹਿਲਾ ਕਾਰੀਗਰਾਂ ਲਈ ਇੱਕ ਵਿਸ਼ੇਸ਼ ਪਲੇਟਫਾਰਮ ਹੈ ਜਿੱਥੇ ਕੋਈ ਵਿਚੋਲਾ ਨਹੀਂ ਹੈ। ਤੁਸੀਂ ਇੱਥੇ ਹੱਥੀਂ ਬਣੇ ਉਤਪਾਦ ਵੇਚ ਸਕਦੇ ਹੋ, ਆਰਡਰ ਲੈ ਸਕਦੇ ਹੋ ਅਤੇ ਸਿੱਧਾ ਉਦਯੋਗਾਂ ਨਾਲ ਜੁੜ ਸਕਦੇ ਹੋ।"
            : lang === "hi"
            ? "स्किलब्रिज भारतीय कारीगरों और ग्रामीण महिला शिल्पकारों का प्लेटफॉर्म है। यहाँ बिना किसी बिचौलिए के आप सीधे उत्पाद बेच सकते हैं और बड़े ब्रांड्स से काम पा सकते हैं।"
            : "SkillBridge connects authentic rural Indian artisans directly with customers and ethical industries, ensuring zero middleman deductions and direct bank payments.";

        return res.status(200).json({
          success: true,
          reply: aboutReply,
          speechText: cleanForSpeech(aboutReply),
          detectedLanguage: lang,
        });
      }

      case "SUPPORT_HELP": {
        const supMsg =
          lang === "pa"
            ? "ਸਕਿੱਲਬ੍ਰਿਜ 'ਤੇ ਗਾਹਕਾਂ ਨੂੰ ਡਿਲਿਵਰੀ ਤੋਂ 7 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਵਾਪਸੀ ਅਤੇ 14 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਝਗੜਾ ਦਰਜ ਕਰਨ ਦੀ ਸਹੂਲਤ ਹੈ। ਕਿਸੇ ਵੀ ਮਦਦ ਲਈ ਸਹਾਇਤਾ ਕੇਂਦਰ ਵਿੱਚ ਟਿਕਟ ਖੋਲ੍ਹੋ।"
            : "SkillBridge provides customer protection with a 7-day return policy and a 14-day dispute resolution window. Visit the Support Center anytime.";

        return res.status(200).json({
          success: true,
          reply: supMsg,
          speechText: cleanForSpeech(supMsg),
          detectedLanguage: lang,
          actionData: { navigation: { label: "Support Center", path: "/support" } },
        });
      }

      case "HELP":
      default: {
        const defReply =
          lang === "pa"
            ? "ਤੁਸੀਂ ਮੈਨੂੰ ਕਹਿ ਸਕਦੇ ਹੋ: 'ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ', 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ', 'ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ', 'ਕਢਾਈ ਦਾ ਹੁਨਰ ਜੋੜੋ', ਜਾਂ 'ਮੇਰੀ ਕਮਾਈ ਦੱਸੋ'।"
            : lang === "hi"
            ? "आप बोल सकते हैं: 'मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है', 'मेरी प्रोफाइल दिखाओ', 'प्रोफाइल पूरी करो', 'कढ़ाई का हुनर जोड़ो', या 'मेरी कमाई बताओ'।"
            : "You can speak: 'I am a tailor with five years of experience', 'Show my profile', 'Complete my profile', 'Add embroidery to my skills', or 'Check my earnings'.";

        return res.status(200).json({
          success: true,
          reply: defReply,
          speechText: cleanForSpeech(defReply),
          detectedLanguage: lang,
          pendingAction: null,
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
  if (!shop) {
    shop = await Shop.create({
      artisan: artisanUser._id,
      name: `${artisanUser.name}'s Shop`,
      category: artisanUser.artCategory || "Handicrafts",
      location: artisanUser.city || "Punjab",
      description: artisanUser.bio || "Authentic handmade craft shop.",
    });
  }

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
      detectedLanguage: language,
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
      detectedLanguage: language,
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
      detectedLanguage: language,
      pendingAction: { type: "SLOT_FILLING_PRODUCT", data },
    });
  }

  // All fields ready -> Confirmation
  const confirmMsg =
    language === "pa"
      ? `ਮੇਰੇ ਕੋਲ ਉਤਪਾਦ ਦਾ ਵੇਰਵਾ ਹੈ: '${data.title}', ਕੀਮਤ ₹${data.price}, ਸਟਾਕ ${data.stock} ਨਗ। ਕੀ ਮੈਂ ਇਸਨੂੰ ਜੋੜ ਦੇਵਾਂ? 'ਹਾਂ' ਕਹੋ ਪੁਸ਼ਟੀ ਲਈ।`
      : language === "hi"
      ? `मेरे पास उत्पाद विवरण है: '${data.title}', कीमत ₹${data.price}, स्टॉक ${data.stock} पीस। क्या मैं इसे जोड़ दूँ? 'हाँ' बोलें।`
      : `I have details: '${data.title}', price ₹${data.price}, stock ${data.stock} units. Should I list this product? Say 'yes' to confirm.`;

  return res.status(200).json({
    success: true,
    reply: confirmMsg,
    speechText: cleanForSpeech(confirmMsg),
    detectedLanguage: language,
    pendingAction: {
      type: "CONFIRM_ADD_PRODUCT",
      data,
    },
  });
}

/**
 * Execute confirmed mutations
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
        detectedLanguage: language,
        pendingAction: null,
        actionData: {
          product: product.toSafeObject(artisanUser.name, shop?.location),
        },
      });
    }

    default:
      return res.status(200).json({
        success: true,
        reply: "Action completed.",
        speechText: "Action completed.",
        detectedLanguage: language,
        pendingAction: null,
      });
  }
}

/**
 * Controller to get artisan profile and completion diagnostics
 * @route GET /api/voice/artisan-profile
 */
export const getVoiceArtisanProfileController = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to view profile.",
      });
    }

    const result = await getArtisanProfile(userId);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Get voice artisan profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve artisan profile.",
    });
  }
};

/**
 * Controller to update artisan profile
 * @route POST /api/voice/artisan-profile/update
 */
export const updateVoiceArtisanProfileController = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to update profile.",
      });
    }

    const result = await updateArtisanProfile(userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Update voice artisan profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update artisan profile.",
    });
  }
};

/**
 * Controller to add or remove an artisan skill
 * @route POST /api/voice/artisan-profile/skill
 */
export const manageVoiceArtisanSkillController = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to manage skills.",
      });
    }

    const { action = "add", skill } = req.body || {};
    if (!skill || !String(skill).trim()) {
      return res.status(400).json({
        success: false,
        message: "Skill is required.",
      });
    }

    const result =
      action === "remove"
        ? await removeArtisanSkill(userId, skill)
        : await addArtisanSkill(userId, skill);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Manage voice artisan skill error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to manage artisan skill.",
    });
  }
};

/**
 * Controller to synthesize speech audio
 * @route POST /api/voice/tts
 */
export const synthesizeVoiceAudioController = async (req, res) => {
  try {
    const { text, language = "pa" } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for TTS synthesis.",
      });
    }

    const audioBuffer = await synthesizeVoiceAudio(text, language);
    res.set("Content-Type", "audio/wav");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: error.message || "TTS audio synthesis unavailable.",
    });
  }
};

/**
 * Controller to transcribe spoken audio file via Groq Whisper
 * @route POST /api/voice/stt
 */
export const transcribeVoiceAudioController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required for transcription.",
      });
    }

    const { language = "" } = req.body || {};
    const result = await transcribeAudioFile(req.file.path, language);

    // Clean up temporary audio file
    fs.unlink(req.file.path, () => {});

    return res.status(200).json(result);
  } catch (error) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({
      success: false,
      message: error.message || "STT transcription failed.",
    });
  }
};

