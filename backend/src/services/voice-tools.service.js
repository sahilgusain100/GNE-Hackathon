import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Shop } from "../models/shop.model.js";
import { Product } from "../models/product.model.js";

/**
 * Identify missing mandatory/recommended profile fields and calculate completion percentage
 */
export function getMissingProfileFields(user) {
  if (!user) {
    return {
      completionPercentage: 0,
      missingFields: [],
      nextMissingField: null,
      isComplete: false,
    };
  }

  const checks = [
    {
      field: "name",
      weight: 20,
      isMissing: !user.name || user.name.trim().length < 2,
      label: { en: "Full Name", hi: "पूरा नाम", pa: "ਪੂਰਾ ਨਾਮ" },
      prompt: {
        en: "What is your full name?",
        hi: "आपका पूरा नाम क्या है?",
        pa: "ਤੁਹਾਡਾ ਪੂਰਾ ਨਾਂ ਕੀ ਹੈ ਜੀ?",
      },
    },
    {
      field: "city",
      weight: 15,
      isMissing: !user.city || user.city.trim().length < 2,
      label: { en: "Village or City", hi: "गाँव या शहर", pa: "ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ" },
      prompt: {
        en: "Which city or village are you from?",
        hi: "आप किस गाँव या शहर से हैं?",
        pa: "ਤੁਹਾਡਾ ਪਿੰਡ ਜਾਂ ਸ਼ਹਿਰ ਕਿਹੜਾ ਹੈ ਜੀ?",
      },
    },
    {
      field: "skills",
      weight: 20,
      isMissing: (!user.skills || user.skills.length === 0) && (!user.artCategory || user.artCategory.trim().length < 2),
      label: { en: "Skills & Crafts", hi: "हुनर और शिल्प", pa: "ਹੁਨਰ ਅਤੇ ਦਸਤਕਾਰੀ" },
      prompt: {
        en: "What crafts or skills do you make? (e.g. tailoring, embroidery, pottery, weaving)",
        hi: "आप कौन सा काम या शिल्प करते हैं? (जैसे सिलाई, कढ़ाई, मिट्टी के बर्तन, बुनाई)",
        pa: "ਤੁਸੀਂ ਕਿਹੜਾ ਕੰਮ ਜਾਂ ਦਸਤਕਾਰੀ ਕਰਦੇ ਹੋ? (ਜਿਵੇਂ ਸਿਲਾਈ, ਕਢਾਈ, ਫੁਲਕਾਰੀ, ਮਿੱਟੀ ਦੇ ਭਾਂਡੇ, ਬੁਣਤੀ)",
      },
    },
    {
      field: "experience",
      weight: 15,
      isMissing: !user.experience || user.experience.trim().length < 1,
      label: { en: "Experience", hi: "अनुभव", pa: "ਤਜਰਬਾ" },
      prompt: {
        en: "How many years of experience do you have in this craft?",
        hi: "आपको इस काम में कितने साल का अनुभव है?",
        pa: "ਤੁਹਾਨੂੰ ਇਸ ਕੰਮ ਵਿੱਚ ਕਿੰਨੇ ਸਾਲਾਂ ਦਾ ਤਜਰਬਾ ਹੈ ਜੀ?",
      },
    },
    {
      field: "phone",
      weight: 15,
      isMissing: !user.phone || user.phone.replace(/\D/g, "").length < 10,
      label: { en: "Phone Number", hi: "फ़ोन नंबर", pa: "ਫੋਨ ਨੰਬਰ" },
      prompt: {
        en: "What is your 10-digit mobile number for order notifications?",
        hi: "ऑर्डर सूचनाओं के लिए आपका 10 अंकों का मोबाइल नंबर क्या है?",
        pa: "ਆਰਡਰਾਂ ਦੀ ਸੂਚਨਾ ਲਈ ਤੁਹਾਡਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਕੀ ਹੈ ਜੀ?",
      },
    },
    {
      field: "bio",
      weight: 15,
      isMissing: !user.bio || user.bio.trim().length < 5,
      label: { en: "About Your Craft", hi: "अपने काम के बारे में", pa: "ਆਪਣੇ ਕੰਮ ਬਾਰੇ ਸੰਖੇਪ" },
      prompt: {
        en: "Tell us a little about your handmade products or workshop.",
        hi: "अपने हस्तशिल्प या काम के बारे में थोड़ा बताएं।",
        pa: "ਆਪਣੇ ਹੱਥੀਂ ਬਣੇ ਉਤਪਾਦਾਂ ਜਾਂ ਦੁਕਾਨ ਬਾਰੇ ਕੁਝ ਦੱਸੋ ਜੀ।",
      },
    },
  ];

  let completedWeight = 0;
  const missing = [];

  for (const item of checks) {
    if (item.isMissing) {
      missing.push({
        field: item.field,
        label: item.label,
        prompt: item.prompt,
      });
    } else {
      completedWeight += item.weight;
    }
  }

  const completionPercentage = Math.min(100, Math.round(completedWeight));

  return {
    completionPercentage,
    missingFields: missing,
    nextMissingField: missing.length > 0 ? missing[0] : null,
    isComplete: missing.length === 0,
  };
}

/**
 * Retrieve artisan profile with shop and completion diagnostics
 */
export async function getArtisanProfile(userId) {
  if (!userId) {
    throw new Error("User ID is required to retrieve artisan profile.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Artisan user not found.");
  }

  const shop = await Shop.findOne({ artisan: user._id });
  const completion = getMissingProfileFields(user);

  return {
    success: true,
    user: user.toSafeObject(),
    shop: shop ? shop.toSafeObject() : null,
    completion,
  };
}

/**
 * Create or upgrade an artisan profile
 */
export async function createArtisanProfile(data = {}, existingUser = null) {
  const name = (data.name || existingUser?.name || "").trim();
  if (!name) {
    throw new Error("Artisan name is required to create a profile.");
  }

  const city = (data.city || data.location || existingUser?.city || "").trim();
  const phone = (data.phone || existingUser?.phone || "").replace(/\D/g, "");
  const experience = (data.experience || existingUser?.experience || "").trim();
  const bio = (data.bio || existingUser?.bio || "").trim();

  // Skills normalization
  let skills = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof data.skills === "string" && data.skills.trim()) {
    skills = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (existingUser?.skills?.length) {
    skills = [...existingUser.skills];
  }

  let artCategory = (data.artCategory || existingUser?.artCategory || "").trim();
  if (!artCategory && skills.length > 0) {
    artCategory = skills[0];
  }
  if (artCategory && !skills.includes(artCategory)) {
    skills.unshift(artCategory);
  }

  const languages = Array.isArray(data.languages) && data.languages.length > 0
    ? data.languages
    : ["English", "Hindi", "Punjabi"];

  // 1. If user already authenticated: update to artisan
  if (existingUser) {
    const user = await User.findById(existingUser._id || existingUser.id);
    if (!user) throw new Error("Authenticated user not found.");

    user.accountType = "artisan";
    if (name) user.name = name;
    if (city) user.city = city;
    if (phone && phone.length >= 10) user.phone = phone;
    if (skills.length > 0) user.skills = skills;
    if (artCategory) user.artCategory = artCategory;
    if (experience) user.experience = experience;
    if (bio) user.bio = bio;
    if (languages.length > 0) user.languages = languages;

    await user.save();

    let shop = await Shop.findOne({ artisan: user._id });
    if (!shop) {
      shop = await Shop.create({
        artisan: user._id,
        name: `${user.name}'s Shop`,
        category: artCategory || "Handicrafts",
        location: city || "Punjab",
        description: bio || `Handcrafted goods by ${user.name}.`,
      });
    }

    const completion = getMissingProfileFields(user);

    return {
      success: true,
      user: user.toSafeObject(),
      shop: shop.toSafeObject(),
      completion,
      isNew: false,
    };
  }

  // 2. New artisan registration
  const uniqueSuffix = Date.now();
  const email = phone && phone.length >= 10
    ? `artisan_${phone}@skillbridge.local`
    : `artisan_${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}_${uniqueSuffix}@skillbridge.local`;

  let user = await User.findOne({ email });
  if (user) {
    // If user already exists with this phone, update their existing profile instead of failing
    user.name = name || user.name;
    if (city) user.city = city;
    if (skills.length) user.skills = skills;
    if (artCategory) user.artCategory = artCategory;
    if (experience) user.experience = experience;
    if (bio) user.bio = bio;
    await user.save();
  } else {
    const autoPassword = `Artisan@${Math.floor(100000 + Math.random() * 900000)}`;
    user = await User.create({
      name,
      email,
      password: autoPassword,
      accountType: "artisan",
      phone: phone || "",
      city,
      skills,
      artCategory: artCategory || "Handicrafts",
      experience: experience || "1 year",
      bio: bio || `Handmade crafts by ${name}.`,
      languages,
      isVerified: true,
    });
  }

  let shop = await Shop.findOne({ artisan: user._id });
  if (!shop) {
    shop = await Shop.create({
      artisan: user._id,
      name: `${user.name}'s Shop`,
      category: user.artCategory || "Handicrafts",
      location: user.city || "Punjab",
      description: user.bio || `Handmade crafts by ${user.name}.`,
    });
  }

  const token = user.generateAccessToken();
  const completion = getMissingProfileFields(user);

  return {
    success: true,
    user: user.toSafeObject(),
    token,
    shop: shop.toSafeObject(),
    completion,
    isNew: true,
  };
}

/**
 * Update artisan profile fields directly in DB
 */
export async function updateArtisanProfile(userId, updates = {}) {
  if (!userId) {
    throw new Error("User ID is required to update artisan profile.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Artisan user not found.");
  }

  const modified = [];

  if (updates.name && updates.name.trim()) {
    user.name = updates.name.trim();
    modified.push("name");
  }

  if (updates.phone !== undefined) {
    const cleanPhone = String(updates.phone).replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      user.phone = cleanPhone.slice(-10);
      modified.push("phone");
    }
  }

  if (updates.city !== undefined && updates.city.trim()) {
    user.city = updates.city.trim();
    modified.push("city");
  }

  if (updates.state !== undefined && updates.state.trim()) {
    user.state = updates.state.trim();
    modified.push("state");
  }

  if (updates.bio !== undefined && updates.bio.trim()) {
    user.bio = updates.bio.trim();
    modified.push("bio");
  }

  if (updates.experience !== undefined && updates.experience.trim()) {
    user.experience = updates.experience.trim();
    modified.push("experience");
  }

  if (updates.hourlyRate !== undefined && !isNaN(updates.hourlyRate)) {
    user.hourlyRate = Number(updates.hourlyRate);
    modified.push("hourlyRate");
  }

  // Handle skills & artCategory
  if (updates.skills !== undefined) {
    let parsed = [];
    if (Array.isArray(updates.skills)) {
      parsed = updates.skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof updates.skills === "string") {
      parsed = updates.skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (parsed.length > 0) {
      user.skills = Array.from(new Set([...(user.skills || []), ...parsed]));
      if (!user.artCategory) user.artCategory = parsed[0];
      modified.push("skills");
    }
  }

  if (updates.artCategory !== undefined && updates.artCategory.trim()) {
    user.artCategory = updates.artCategory.trim();
    if (!user.skills) user.skills = [];
    if (!user.skills.includes(user.artCategory)) {
      user.skills.unshift(user.artCategory);
    }
    modified.push("artCategory");
  }

  if (updates.languages !== undefined) {
    const langs = Array.isArray(updates.languages)
      ? updates.languages
      : String(updates.languages).split(",").map((l) => l.trim()).filter(Boolean);
    if (langs.length > 0) {
      user.languages = langs;
      modified.push("languages");
    }
  }

  await user.save();

  // Keep Shop synchronized
  const shop = await Shop.findOne({ artisan: user._id });
  if (shop) {
    let shopChanged = false;
    if (updates.city && updates.city.trim()) {
      shop.location = user.city;
      shopChanged = true;
    }
    if (updates.bio && updates.bio.trim()) {
      shop.description = user.bio;
      shopChanged = true;
    }
    if (updates.shopName && updates.shopName.trim()) {
      shop.name = updates.shopName.trim();
      shopChanged = true;
    }
    if (shopChanged) await shop.save();
  }

  const completion = getMissingProfileFields(user);

  return {
    success: true,
    user: user.toSafeObject(),
    shop: shop ? shop.toSafeObject() : null,
    modifiedFields: modified,
    completion,
  };
}

/**
 * Add a skill to an artisan's profile
 */
export async function addArtisanSkill(userId, skill) {
  if (!userId || !skill || !skill.trim()) {
    throw new Error("User ID and skill name are required.");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("Artisan user not found.");

  const cleanSkill = skill.trim();
  const currentSkills = user.skills || [];

  if (!currentSkills.some((s) => s.toLowerCase() === cleanSkill.toLowerCase())) {
    user.skills.push(cleanSkill);
    if (!user.artCategory) {
      user.artCategory = cleanSkill;
    }
    await user.save();
  }

  const completion = getMissingProfileFields(user);

  return {
    success: true,
    skills: user.skills,
    artCategory: user.artCategory,
    user: user.toSafeObject(),
    completion,
  };
}

/**
 * Remove a skill from an artisan's profile
 */
export async function removeArtisanSkill(userId, skill) {
  if (!userId || !skill || !skill.trim()) {
    throw new Error("User ID and skill name are required.");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("Artisan user not found.");

  const cleanSkill = skill.trim().toLowerCase();
  user.skills = (user.skills || []).filter((s) => s.toLowerCase() !== cleanSkill);

  if (user.artCategory && user.artCategory.toLowerCase() === cleanSkill) {
    user.artCategory = user.skills[0] || "";
  }

  await user.save();
  const completion = getMissingProfileFields(user);

  return {
    success: true,
    skills: user.skills,
    artCategory: user.artCategory,
    user: user.toSafeObject(),
    completion,
  };
}

/**
 * Update product details via voice operator
 */
export async function updateProductDetails(artisanId, { productId, title, price, stock, category, description }) {
  if (!artisanId) throw new Error("Artisan ID is required.");

  let product = null;

  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findOne({ _id: productId, artisan: artisanId });
  }

  if (!product && title) {
    product = await Product.findOne({
      artisan: artisanId,
      title: new RegExp(title.trim(), "i"),
    });
  }

  if (!product) {
    // Find latest product by artisan if no title or ID matched
    product = await Product.findOne({ artisan: artisanId }).sort({ createdAt: -1 });
  }

  if (!product) {
    throw new Error("Product not found to update.");
  }

  const modified = [];

  if (price !== undefined && !isNaN(price)) {
    product.price = Number(price);
    modified.push("price");
  }

  if (stock !== undefined && !isNaN(stock)) {
    product.stock = Number(stock);
    modified.push("stock");
  }

  if (category && category.trim()) {
    product.category = category.trim();
    modified.push("category");
  }

  if (description && description.trim()) {
    product.description = description.trim();
    modified.push("description");
  }

  await product.save();

  return {
    success: true,
    product: product.toSafeObject(),
    modifiedFields: modified,
  };
}
