import assert from "node:assert/strict";
import mongoose from "mongoose";
import { User } from "./src/models/user.model.js";
import { Shop } from "./src/models/shop.model.js";
import { Product } from "./src/models/product.model.js";
import { Notification } from "./src/models/notification.model.js";
import {
  parseArtisanIntent,
  detectSpokenLanguage,
  extractSkills,
  extractExperience,
  extractLocation,
  extractName,
} from "./src/services/voice-assistant.service.js";
import {
  getArtisanProfile,
  createArtisanProfile,
  updateArtisanProfile,
  addArtisanSkill,
  removeArtisanSkill,
  getMissingProfileFields,
  updateProductDetails,
} from "./src/services/voice-tools.service.js";
import { handleVoiceAssistantMessage } from "./src/controllers/voice-assistant.controller.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runVoiceOperatorVerification() {
  console.log("==========================================================");
  console.log("Starting SkillBridge Voice Operator Verification Suite");
  console.log("==========================================================\n");

  let passedCount = 0;

  // In-memory store for test users and shops
  const usersDb = new Map();
  const shopsDb = new Map();
  const productsDb = new Map();

  // Mock User methods
  User.findById = async (id) => {
    const u = usersDb.get(id.toString());
    if (!u) return null;
    return {
      ...u,
      _id: u._id,
      save: async function () {
        usersDb.set(this._id.toString(), { ...this });
        return this;
      },
      toSafeObject: function () {
        return {
          id: this._id.toString(),
          _id: this._id.toString(),
          name: this.name,
          email: this.email,
          accountType: this.accountType,
          phone: this.phone || "",
          city: this.city || "",
          artCategory: this.artCategory || "",
          skills: this.skills || [],
          experience: this.experience || "",
          hourlyRate: this.hourlyRate || 0,
          bio: this.bio || "",
          isVerified: this.isVerified,
        };
      },
    };
  };

  User.findOne = async (query) => {
    for (const u of usersDb.values()) {
      if (query.email && u.email === query.email) {
        return {
          ...u,
          save: async function () {
            usersDb.set(this._id.toString(), { ...this });
            return this;
          },
          toSafeObject: function () {
            return {
              id: this._id.toString(),
              _id: this._id.toString(),
              name: this.name,
              email: this.email,
              accountType: this.accountType,
              phone: this.phone || "",
              city: this.city || "",
              artCategory: this.artCategory || "",
              skills: this.skills || [],
              experience: this.experience || "",
              hourlyRate: this.hourlyRate || 0,
              bio: this.bio || "",
              isVerified: this.isVerified,
            };
          },
        };
      }
    }
    return null;
  };

  User.create = async (data) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      id: id.toString(),
      ...data,
      generateAccessToken: () => "mock_token_" + id.toString(),
      toSafeObject: function () {
        return {
          id: this._id.toString(),
          _id: this._id.toString(),
          name: this.name,
          email: this.email,
          accountType: this.accountType,
          phone: this.phone || "",
          city: this.city || "",
          artCategory: this.artCategory || "",
          skills: this.skills || [],
          experience: this.experience || "",
          hourlyRate: this.hourlyRate || 0,
          bio: this.bio || "",
          isVerified: this.isVerified,
        };
      },
    };
    usersDb.set(id.toString(), doc);
    return doc;
  };

  // Mock Shop methods
  Shop.findOne = async (query) => {
    for (const s of shopsDb.values()) {
      if (query.artisan && s.artisan.toString() === query.artisan.toString()) {
        return {
          ...s,
          save: async function () {
            shopsDb.set(this._id.toString(), { ...this });
            return this;
          },
          toSafeObject: function () {
            return {
              id: this._id.toString(),
              name: this.name,
              category: this.category,
              location: this.location,
              description: this.description,
            };
          },
        };
      }
    }
    return null;
  };

  Shop.create = async (data) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      ...data,
      toSafeObject: function () {
        return {
          id: this._id.toString(),
          name: this.name,
          category: this.category,
          location: this.location,
          description: this.description,
        };
      },
    };
    shopsDb.set(id.toString(), doc);
    return doc;
  };

  // Mock Product methods
  Product.findOne = async (query) => {
    for (const p of productsDb.values()) {
      if (query.artisan && p.artisan.toString() === query.artisan.toString()) {
        return {
          ...p,
          save: async function () {
            productsDb.set(this._id.toString(), { ...this });
            return this;
          },
          toSafeObject: function () {
            return {
              id: this._id.toString(),
              title: this.title,
              price: this.price,
              stock: this.stock,
              category: this.category,
            };
          },
        };
      }
    }
    return null;
  };

  Product.create = async (data) => {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      ...data,
      toSafeObject: function () {
        return {
          id: this._id.toString(),
          title: this.title,
          price: this.price,
          stock: this.stock,
          category: this.category,
        };
      },
    };
    productsDb.set(id.toString(), doc);
    return doc;
  };

  // Setup test artisan
  const testArtisanId = new mongoose.Types.ObjectId();
  const testArtisanUser = {
    _id: testArtisanId,
    id: testArtisanId.toString(),
    name: "Gurpreet Kaur",
    email: "gurpreet@example.com",
    accountType: "artisan",
    phone: "",
    city: "",
    artCategory: "",
    skills: [],
    experience: "",
    bio: "",
    isVerified: true,
  };
  usersDb.set(testArtisanId.toString(), { ...testArtisanUser });

  // ----------------------------------------------------
  // Test 1: English Voice Interaction & Profile Update
  // ----------------------------------------------------
  console.log('Test 1: English - "I am a tailor with five years of experience."');
  const enReq = {
    user: { ...testArtisanUser },
    body: {
      message: "I am a tailor with five years of experience.",
      language: "en",
    },
  };
  const enRes = createMockRes();
  await handleVoiceAssistantMessage(enReq, enRes);

  assert.equal(enRes.statusCode, 200, "Should return HTTP 200");
  assert.equal(enRes.body.detectedLanguage, "en", "Language should be identified as English (en)");
  assert.ok(
    enRes.body.actionData?.user?.skills.includes("Tailoring"),
    "Skill Tailoring should be extracted and saved"
  );
  assert.equal(
    enRes.body.actionData?.user?.experience,
    "5 years",
    "Experience '5 years' should be extracted and saved"
  );
  assert.ok(
    enRes.body.reply.toLowerCase().includes("tailoring") || enRes.body.reply.toLowerCase().includes("updated"),
    "Assistant should confirm operation accurately in English"
  );

  // Verify DB Persistence
  const savedEnUser = usersDb.get(testArtisanId.toString());
  assert.ok(savedEnUser.skills.includes("Tailoring"), "Database must have Tailoring skill saved");
  assert.equal(savedEnUser.experience, "5 years", "Database must have 5 years experience saved");
  console.log("✔ Test 1 PASSED: English recognition, extraction, DB save & confirmation verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 2: Hindi Voice Interaction & Profile Update
  // ----------------------------------------------------
  console.log('Test 2: Hindi - "मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है।"');
  // Reset artisan for Hindi test
  const hiArtisanId = new mongoose.Types.ObjectId();
  const hiArtisanUser = {
    _id: hiArtisanId,
    id: hiArtisanId.toString(),
    name: "सुनीता शर्मा",
    email: "sunita.hi@example.com",
    accountType: "artisan",
    skills: [],
    experience: "",
  };
  usersDb.set(hiArtisanId.toString(), { ...hiArtisanUser });

  const hiReq = {
    user: { ...hiArtisanUser },
    body: {
      message: "मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है।",
      language: "hi",
    },
  };
  const hiRes = createMockRes();
  await handleVoiceAssistantMessage(hiReq, hiRes);

  assert.equal(hiRes.statusCode, 200, "Should return HTTP 200");
  assert.equal(hiRes.body.detectedLanguage, "hi", "Language should be identified as Hindi (hi)");
  assert.ok(
    hiRes.body.actionData?.user?.skills.includes("Tailoring"),
    "Skill Tailoring should be extracted and saved"
  );
  assert.equal(
    hiRes.body.actionData?.user?.experience,
    "5 years",
    "Experience '5 years' should be extracted and saved"
  );
  assert.ok(
    hiRes.body.reply.includes("सफलतापूर्वक") || hiRes.body.reply.includes("सेव"),
    "Assistant should confirm operation accurately in Hindi Devanagari script"
  );

  // Verify DB Persistence
  const savedHiUser = usersDb.get(hiArtisanId.toString());
  assert.ok(savedHiUser.skills.includes("Tailoring"), "Database must have Tailoring skill saved in Hindi flow");
  console.log("✔ Test 2 PASSED: Hindi recognition, extraction, DB save & confirmation verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 3: Punjabi Voice Interaction & Profile Update
  // ----------------------------------------------------
  console.log('Test 3: Punjabi - "ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ।"');
  // Reset artisan for Punjabi test
  const paArtisanId = new mongoose.Types.ObjectId();
  const paArtisanUser = {
    _id: paArtisanId,
    id: paArtisanId.toString(),
    name: "ਸਿਮਰਨ ਕੌਰ",
    email: "simran.pa@example.com",
    accountType: "artisan",
    skills: [],
    experience: "",
  };
  usersDb.set(paArtisanId.toString(), { ...paArtisanUser });

  const paReq = {
    user: { ...paArtisanUser },
    body: {
      message: "ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ।",
      language: "pa",
    },
  };
  const paRes = createMockRes();
  await handleVoiceAssistantMessage(paReq, paRes);

  assert.equal(paRes.statusCode, 200, "Should return HTTP 200");
  assert.equal(paRes.body.detectedLanguage, "pa", "Language should be identified as Punjabi (pa)");
  assert.ok(
    paRes.body.actionData?.user?.skills.includes("Tailoring"),
    "Skill Tailoring should be extracted and saved"
  );
  assert.equal(
    paRes.body.actionData?.user?.experience,
    "5 years",
    "Experience '5 years' should be extracted and saved"
  );
  assert.ok(
    paRes.body.reply.includes("ਸਫਲਤਾਪੂਰਵਕ") || paRes.body.reply.includes("ਪ੍ਰੋਫਾਈਲ"),
    "Assistant should confirm operation accurately in Punjabi Gurmukhi script"
  );

  // Verify DB Persistence
  const savedPaUser = usersDb.get(paArtisanId.toString());
  assert.ok(savedPaUser.skills.includes("Tailoring"), "Database must have Tailoring skill saved in Punjabi flow");
  console.log("✔ Test 3 PASSED: Punjabi recognition, extraction, DB save & confirmation verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 4: Dynamic Language Switching in Ongoing Conversation
  // ----------------------------------------------------
  console.log("Test 4: Dynamic Language Switching (EN -> PA -> HI)");
  const switchArtisanId = new mongoose.Types.ObjectId();
  const switchUser = {
    _id: switchArtisanId,
    id: switchArtisanId.toString(),
    name: "Manpreet",
    email: "manpreet@example.com",
    accountType: "artisan",
    skills: [],
    experience: "",
    city: "",
  };
  usersDb.set(switchArtisanId.toString(), { ...switchUser });

  // Turn 1: Speaks English
  const turn1Req = {
    user: { ...switchUser },
    body: { message: "I am a tailor with five years of experience.", language: "en" },
  };
  const turn1Res = createMockRes();
  await handleVoiceAssistantMessage(turn1Req, turn1Res);
  assert.equal(turn1Res.body.detectedLanguage, "en", "Turn 1 must detect English");

  // Turn 2: Switches to Punjabi (Says "ਮੈਂ ਪਟਿਆਲੇ ਤੋਂ ਹਾਂ")
  const turn2User = usersDb.get(switchArtisanId.toString());
  const turn2Req = {
    user: { ...turn2User },
    body: {
      message: "ਮੈਂ ਪਟਿਆਲੇ ਤੋਂ ਹਾਂ",
      language: "en", // Client state was previously English!
      pendingAction: turn1Res.body.pendingAction,
    },
  };
  const turn2Res = createMockRes();
  await handleVoiceAssistantMessage(turn2Req, turn2Res);
  assert.equal(turn2Res.body.detectedLanguage, "pa", "Turn 2 must automatically switch to Punjabi");
  assert.equal(usersDb.get(switchArtisanId.toString()).city, "Patiala", "Patiala location must be saved to DB");

  // Turn 3: Switches to Hindi (Says "मेरी प्रोफाइल दिखाओ")
  const turn3User = usersDb.get(switchArtisanId.toString());
  const turn3Req = {
    user: { ...turn3User },
    body: {
      message: "मेरी प्रोफाइल दिखाओ",
      language: "pa", // Client state was previously Punjabi!
    },
  };
  const turn3Res = createMockRes();
  await handleVoiceAssistantMessage(turn3Req, turn3Res);
  assert.equal(turn3Res.body.detectedLanguage, "hi", "Turn 3 must automatically switch to Hindi");
  assert.ok(turn3Res.body.reply.includes("आपका नाम") || turn3Res.body.reply.includes("हुनर"), "Must reply in Hindi");

  const preservedPaRes = createMockRes();
  await handleVoiceAssistantMessage(
    {
      user: { ...usersDb.get(switchArtisanId.toString()) },
      body: {
        message: "मेरी प्रोफाइल दिखाओ",
        language: "pa",
        preserveLanguage: true,
      },
    },
    preservedPaRes
  );
  assert.equal(
    preservedPaRes.body.detectedLanguage,
    "pa",
    "Punjabi speech mode must stay Punjabi when recognition returns Devanagari text"
  );
  assert.match(preservedPaRes.body.reply, /[\u0A00-\u0A7F]/, "Punjabi speech mode must reply in Gurmukhi");
  console.log("✔ Test 4 PASSED: Language switching and Punjabi speech mode verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 5: Profile Retrieval via Database Record
  // ----------------------------------------------------
  console.log("Test 5: Profile Retrieval (getArtisanProfile)");
  const profileResult = await getArtisanProfile(testArtisanId);
  assert.equal(profileResult.success, true, "Profile retrieval must succeed");
  assert.equal(profileResult.user.name, "Gurpreet Kaur", "User name must match DB");
  assert.ok(profileResult.user.skills.includes("Tailoring"), "Retrieved skills must include Tailoring");
  assert.equal(profileResult.user.experience, "5 years", "Retrieved experience must match DB");
  console.log("✔ Test 5 PASSED: Profile retrieval accurately queries MongoDB.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 6: Profile Completion Diagnostics & Missing Fields
  // ----------------------------------------------------
  console.log("Test 6: Profile Completion Diagnostics (getMissingProfileFields)");
  const partialUser = {
    name: "Aman",
    skills: ["Tailoring"],
    experience: "3 years",
    city: "",
    phone: "",
    bio: "",
  };
  const comp1 = getMissingProfileFields(partialUser);
  assert.equal(comp1.isComplete, false, "Partial user must not be marked complete");
  assert.ok(comp1.completionPercentage > 0 && comp1.completionPercentage < 100, "Percentage must be partial");
  assert.ok(comp1.missingFields.some((m) => m.field === "city"), "City should be flagged as missing");

  // Fill in all fields
  const completeUser = {
    name: "Aman",
    skills: ["Tailoring"],
    experience: "3 years",
    city: "Amritsar",
    phone: "9876543210",
    bio: "Traditional handmade tailoring and salwar suits.",
  };
  const comp2 = getMissingProfileFields(completeUser);
  assert.equal(comp2.isComplete, true, "Fully populated user must be 100% complete");
  assert.equal(comp2.completionPercentage, 100, "Percentage must be 100%");
  console.log("✔ Test 6 PASSED: Profile completion calculation verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 7: Add & Remove Artisan Skill Tools
  // ----------------------------------------------------
  console.log("Test 7: Add and Remove Artisan Skill Tools");
  const addResult = await addArtisanSkill(testArtisanId, "Embroidery & Phulkari");
  assert.ok(addResult.skills.includes("Embroidery & Phulkari"), "Skill must be added to skills list");

  const removeResult = await removeArtisanSkill(testArtisanId, "Embroidery & Phulkari");
  assert.ok(!removeResult.skills.includes("Embroidery & Phulkari"), "Skill must be removed from skills list");
  console.log("✔ Test 7 PASSED: addArtisanSkill and removeArtisanSkill verified.\n");
  passedCount++;

  // ----------------------------------------------------
  // Test 8: Product Details Voice Tool (updateProductDetails)
  // ----------------------------------------------------
  console.log("Test 8: Product Details Voice Tool (updateProductDetails)");
  const prodDoc = await Product.create({
    artisan: testArtisanId,
    title: "Handmade Phulkari Dupatta",
    price: 1800,
    stock: 5,
    category: "Embroidery",
  });

  const updProdRes = await updateProductDetails(testArtisanId, {
    productId: prodDoc._id,
    price: 2200,
    stock: 12,
  });

  assert.equal(updProdRes.product.price, 2200, "Product price must be updated to 2200");
  assert.equal(updProdRes.product.stock, 12, "Product stock must be updated to 12");
  console.log("✔ Test 8 PASSED: Product details updated directly in database.\n");
  passedCount++;

  console.log("==========================================================");
  console.log(`ALL ${passedCount} VOICE OPERATOR VERIFICATION TESTS PASSED (${passedCount}/${passedCount})!`);
  console.log("==========================================================");
}

runVoiceOperatorVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
