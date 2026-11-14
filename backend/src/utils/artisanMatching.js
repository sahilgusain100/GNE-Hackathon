import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { Evaluation } from "../models/evaluation.model.js";
import { Order } from "../models/order.model.js";
import { Shop } from "../models/shop.model.js";

// ============================================================================
// 1. CONFIGURABLE MATCHING WEIGHTS (Internal Configuration)
// ============================================================================
export const DEFAULT_MATCHING_WEIGHTS = Object.freeze({
  price: 0.25,        // 25% - Price fit against budget
  deliveryTime: 0.20, // 20% - Delivery timeline and production capacity
  quality: 0.25,      // 25% - Verified quality score and expert appraisal
  rating: 0.15,       // 15% - Customer satisfaction and review history
  experience: 0.15,   // 15% - Years in craft and completed projects
});

// Craft Category Benchmarks for realistic labor, material, and lead time estimation
export const CRAFT_BENCHMARKS = Object.freeze({
  textiles: {
    categoryKeywords: ["textile", "handloom", "fabric", "cotton", "silk", "khadi", "weaving", "print", "embroidery", "phulkari", "chanderi", "zari"],
    avgLaborHoursPerUnit: 10,
    minHourlyRate: 180,
    recommendedHourlyRate: 260,
    materialCostRatio: 0.30,
    dailyWorkingHours: 6.5,
  },
  pottery: {
    categoryKeywords: ["pottery", "ceramic", "clay", "terracotta", "earthenware", "blue pottery", "sculpture", "glaze"],
    avgLaborHoursPerUnit: 6,
    minHourlyRate: 150,
    recommendedHourlyRate: 220,
    materialCostRatio: 0.25,
    dailyWorkingHours: 6.0,
  },
  woodcraft: {
    categoryKeywords: ["wood", "woodcraft", "carving", "timber", "sheesham", "teak", "furniture", "rosewood", "inlay"],
    avgLaborHoursPerUnit: 14,
    minHourlyRate: 200,
    recommendedHourlyRate: 300,
    materialCostRatio: 0.40,
    dailyWorkingHours: 7.0,
  },
  jewelry: {
    categoryKeywords: ["jewelry", "jewellery", "metal", "brass", "silver", "dhokra", "filigree", "copper", "bronze", "metalcraft"],
    avgLaborHoursPerUnit: 8,
    minHourlyRate: 220,
    recommendedHourlyRate: 340,
    materialCostRatio: 0.45,
    dailyWorkingHours: 6.5,
  },
  leathercraft: {
    categoryKeywords: ["leather", "footwear", "mojari", "shoe", "bag", "leathercraft", "tanning"],
    avgLaborHoursPerUnit: 8,
    minHourlyRate: 180,
    recommendedHourlyRate: 270,
    materialCostRatio: 0.38,
    dailyWorkingHours: 6.5,
  },
  default: {
    categoryKeywords: ["handmade", "craft", "artisan", "traditional", "stone", "bamboo", "painting", "glass"],
    avgLaborHoursPerUnit: 8,
    minHourlyRate: 160,
    recommendedHourlyRate: 240,
    materialCostRatio: 0.32,
    dailyWorkingHours: 6.5,
  },
});

/**
 * Resolve craft benchmark configuration from category or title
 */
export function getCraftBenchmark(category = "") {
  const cat = String(category || "").toLowerCase();
  for (const [key, benchmark] of Object.entries(CRAFT_BENCHMARKS)) {
    if (key === "default") continue;
    if (benchmark.categoryKeywords.some((kw) => cat.includes(kw))) {
      return benchmark;
    }
  }
  return CRAFT_BENCHMARKS.default;
}

/**
 * Extract numerical years of experience from textual string
 * e.g. "12 years", "Master Artisan (15 yrs)", "4.5 years", "2"
 */
export function parseExperienceYears(expStr = "") {
  if (!expStr) return 0;
  if (typeof expStr === "number") return Math.max(0, expStr);

  const str = String(expStr).toLowerCase().trim();
  const match = str.match(/(\d+(\.\d+)?)\s*(year|yr)?/);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // Qualitative keywords if no exact number
  if (str.includes("master") || str.includes("veteran")) return 15;
  if (str.includes("senior") || str.includes("expert")) return 8;
  if (str.includes("intermediate") || str.includes("experienced")) return 4;
  if (str.includes("beginner") || str.includes("junior")) return 1;

  return 0;
}

/**
 * Check if artisan specialization matches the requirement category
 */
export function matchesSpecialization(artisan, requirementCategory = "") {
  if (!requirementCategory) return true;

  const reqCat = String(requirementCategory).toLowerCase().trim();
  const artCat = String(artisan.artCategory || "").toLowerCase().trim();
  const shopCat = String(artisan.shop?.category || "").toLowerCase().trim();

  if (artCat && (reqCat.includes(artCat) || artCat.includes(reqCat))) return true;
  if (shopCat && (reqCat.includes(shopCat) || shopCat.includes(reqCat))) return true;

  // Keyword overlap
  const benchmark = getCraftBenchmark(reqCat);
  const artisanText = `${artCat} ${shopCat} ${artisan.bio || ""}`.toLowerCase();
  const hasKeyword = benchmark.categoryKeywords.some((kw) => artisanText.includes(kw));
  if (hasKeyword) return true;

  // Check product categories
  if (Array.isArray(artisan.products)) {
    const hasProductInCat = artisan.products.some((p) => {
      const pCat = String(p.category || "").toLowerCase();
      return reqCat.includes(pCat) || pCat.includes(reqCat) || benchmark.categoryKeywords.some((kw) => pCat.includes(kw));
    });
    if (hasProductInCat) return true;
  }

  return false;
}

/**
 * Check location compatibility (proximity match)
 */
export function matchesLocation(artisan, preferredLocation = "") {
  if (!preferredLocation || !preferredLocation.trim()) return true;

  const pref = preferredLocation.toLowerCase().trim();
  const artisanLoc = `${artisan.city || ""} ${artisan.state || ""} ${artisan.shop?.location || ""}`.toLowerCase();
  return artisanLoc.includes(pref) || pref.includes((artisan.city || "").toLowerCase());
}

// ============================================================================
// 2. SCORING FUNCTIONS FOR THE 5 PARAMETERS (0 TO 100 NORMALIZED)
// ============================================================================

/**
 * Parameter 1: Price Score (Normalized 0 to 100)
 * Evaluates how closely the artisan's quote fits the industrialist's budget.
 * RULE: Do not rank an artisan highly simply because they offer the lowest price.
 */
export function calculatePriceScore(quotedPrice, budgetPrice) {
  const budget = Math.max(1, Number(budgetPrice) || 1);
  const quote = Math.max(1, Number(quotedPrice) || 1);
  const ratio = quote / budget;

  // If quote exactly matches budget: 100 (Optimal fit)
  if (Math.abs(ratio - 1.0) <= 0.02) {
    return 100;
  }

  // Quote is within budget (ratio < 1.0)
  if (ratio < 1.0) {
    // 85% to 98% of budget: ideal sustainable pricing
    if (ratio >= 0.85) {
      return Math.round(95 + (ratio - 0.85) * 33.3); // 95 - 100
    }
    // 70% to 84% of budget: good competitive pricing
    if (ratio >= 0.70) {
      return Math.round(86 + (ratio - 0.70) * 60); // 86 - 95
    }
    // 50% to 69% of budget: moderate discount, but wage sustainability caution applies
    if (ratio >= 0.50) {
      return Math.round(72 + (ratio - 0.50) * 70); // 72 - 86
    }
    // < 50% of budget: heavily penalized!
    // Excessively cheap quotes risk substandard craftsmanship or exploitative wage cuts.
    return Math.max(30, Math.round(35 + ratio * 74)); // 35 - 72
  }

  // Quote is higher than budget (ratio > 1.0)
  // Slightly above budget (up to 15% over): still acceptable
  if (ratio <= 1.15) {
    return Math.round(92 - (ratio - 1.0) * 100); // 77 - 92
  }
  // 15% to 30% over budget: notable premium
  if (ratio <= 1.30) {
    return Math.round(77 - (ratio - 1.15) * 140); // 56 - 77
  }
  // 30% to 60% over budget: significant over-budget
  if (ratio <= 1.60) {
    return Math.round(56 - (ratio - 1.30) * 100); // 26 - 56
  }
  // > 60% over budget
  return Math.max(5, Math.round(26 - (ratio - 1.60) * 30));
}

/**
 * Parameter 2: Delivery Time Score (Normalized 0 to 100)
 * Evaluates whether the artisan can complete the required quantity within the deadline.
 */
export function calculateDeliveryScore(estimatedDays, targetDays) {
  const target = Math.max(1, Number(targetDays) || 30);
  const estimated = Math.max(1, Number(estimatedDays) || 1);
  const ratio = estimated / target;

  // Can finish well ahead of deadline (with comfortable safety margin)
  if (ratio <= 0.70) {
    return 100;
  }
  // Comfortable completion before deadline
  if (ratio <= 0.90) {
    return Math.round(94 + (0.90 - ratio) * 30); // 94 - 100
  }
  // On time / near deadline
  if (ratio <= 1.0) {
    return Math.round(86 + (1.0 - ratio) * 80); // 86 - 94
  }
  // Slightly over deadline (up to 15% over)
  if (ratio <= 1.15) {
    return Math.round(68 - (ratio - 1.0) * 100); // 53 - 68
  }
  // 15% to 35% over deadline
  if (ratio <= 1.35) {
    return Math.round(53 - (ratio - 1.15) * 115); // 30 - 53
  }
  // Severe deadline overrun (> 35%)
  return Math.max(5, Math.round(30 - (ratio - 1.35) * 40));
}

/**
 * Parameter 3: Quality Score (Normalized 0 to 100)
 * Evaluates verified quality score and previous work.
 * RULE: Missing information must not be treated as a perfect score. Do not invent scores.
 */
export function calculateQualityScore({
  expertEvaluationAvg = null,
  expertEvalCount = 0,
  customerQualityAvg = null,
  customerReviewCount = 0,
  isVerified = false,
  requiredQualityLevel = "Any",
}) {
  let score = 0;
  let hasVerifiedData = false;

  // Expert evaluations (scale 1 - 10)
  const hasExpert = expertEvalCount > 0 && expertEvaluationAvg != null && expertEvaluationAvg > 0;
  // Customer verified reviews (scale 1 - 5)
  const hasCustomer = customerReviewCount > 0 && customerQualityAvg != null && customerQualityAvg > 0;

  if (hasExpert && hasCustomer) {
    const expertPart = (expertEvaluationAvg / 10) * 100; // 0 - 100
    const customerPart = (customerQualityAvg / 5) * 100; // 0 - 100
    // 60% expert appraisal + 40% customer verified quality
    score = expertPart * 0.60 + customerPart * 0.40;
    hasVerifiedData = true;
  } else if (hasExpert) {
    score = (expertEvaluationAvg / 10) * 100;
    hasVerifiedData = true;
  } else if (hasCustomer) {
    score = (customerQualityAvg / 5) * 100;
    hasVerifiedData = true;
  } else {
    // Missing verified quality data:
    // Missing information MUST NOT be treated as a perfect score!
    // Baseline unverified score reflects pending audit
    score = 48;
    hasVerifiedData = false;
  }

  // Account verification boost (KYC / admin identity verification)
  if (isVerified) {
    score = Math.min(100, score + 4);
  }

  // Required quality level adjustments
  const reqLevel = String(requiredQualityLevel || "").toLowerCase();
  if (reqLevel.includes("master") || reqLevel.includes("heritage")) {
    // Needs high verified craftsmanship
    if (score >= 88) score = Math.min(100, score + 4);
    else if (score < 75) score = Math.max(10, score - 15);
  } else if (reqLevel.includes("high")) {
    if (score >= 78) score = Math.min(100, score + 3);
    else if (score < 65) score = Math.max(15, score - 10);
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    hasVerifiedData,
    displayScore: hasVerifiedData
      ? (score / 10).toFixed(1)
      : null, // Display e.g. "9.2/10" or null if unverified
  };
}

/**
 * Parameter 4: Rating Score (Normalized 0 to 100)
 * Evaluates average rating from previous customers.
 * RULE: Missing information must not be treated as a perfect score. Do not invent ratings.
 */
export function calculateRatingScore({ averageRating = 0, reviewCount = 0 }) {
  if (!reviewCount || reviewCount === 0 || !averageRating || averageRating <= 0) {
    // Missing review track record:
    // Missing information must NOT be treated as a perfect score!
    return {
      score: 50, // Neutral baseline for new artisans
      displayRating: null, // Displays "No reviews yet"
      reviewCount: 0,
      hasReviews: false,
    };
  }

  const rawPercentage = (Math.min(5, Math.max(1, averageRating)) / 5) * 100;

  // Bayesian sample weighting: higher review volume increases confidence
  let confidenceWeight = 0.70;
  if (reviewCount >= 10) confidenceWeight = 1.0;
  else if (reviewCount >= 5) confidenceWeight = 0.90;
  else if (reviewCount >= 3) confidenceWeight = 0.80;

  // Prior is platform average of ~4.0 (80%)
  const weightedScore = rawPercentage * confidenceWeight + 80 * (1 - confidenceWeight);

  return {
    score: Math.round(Math.min(100, Math.max(0, weightedScore))),
    displayRating: Number(averageRating.toFixed(1)),
    reviewCount,
    hasReviews: true,
  };
}

/**
 * Parameter 5: Experience Score (Normalized 0 to 100)
 * Evaluates relevant experience and completed projects.
 */
export function calculateExperienceScore({ experienceYears = 0, completedProjects = 0 }) {
  const years = Math.max(0, Number(experienceYears) || 0);
  const projects = Math.max(0, Number(completedProjects) || 0);

  // Years scoring
  let yearsBase = 40;
  if (years >= 15) yearsBase = 96;
  else if (years >= 10) yearsBase = 90;
  else if (years >= 7) yearsBase = 82;
  else if (years >= 4) yearsBase = 72;
  else if (years >= 2) yearsBase = 60;
  else if (years >= 1) yearsBase = 50;

  // Completed projects bonus (+3 per completed project up to +20)
  const projectsBonus = Math.min(20, projects * 3);

  const total = Math.min(100, yearsBase + projectsBonus);

  return {
    score: Math.round(total),
    experienceYears: years,
    completedProjects: projects,
  };
}

// ============================================================================
// 3. RECOMMENDATION REASON GENERATOR
// ============================================================================
export function generateRecommendationReason({
  isEssentialMatch,
  priceScore,
  deliveryScore,
  qualityScore,
  ratingScore,
  experienceScore,
  quotedPrice,
  budgetPrice,
  estimatedDays,
  targetDays,
  qualityDisplay,
  hasVerifiedQuality,
  ratingDisplay,
  hasReviews,
  experienceYears,
  completedProjects,
}) {
  const quoteVsBudget = quotedPrice / budgetPrice;
  const daysVsDeadline = estimatedDays / targetDays;

  // 1. Excellent match
  if (isEssentialMatch && priceScore >= 88 && deliveryScore >= 85 && qualityScore >= 78) {
    if (daysVsDeadline <= 0.80) {
      return `Fastest match: Can complete ${estimatedDays} days ahead of deadline while staying comfortably within your budget with verified craft quality.`;
    }
    return `Excellent match: Fits your budget (₹${quotedPrice.toLocaleString("en-IN")}/unit) and delivery deadline with a high quality score.`;
  }

  // 2. High Quality / Master Artisan
  if (qualityScore >= 88 && hasVerifiedQuality) {
    if (quoteVsBudget > 1.05) {
      return `Good match: Exceptional verified quality (${qualityDisplay}/10), but slightly above your target budget.`;
    }
    if (daysVsDeadline > 1.0) {
      return `Master craftsman match: Superior verified quality (${qualityDisplay}/10), but requires ${estimatedDays} days due to detailed handcrafting.`;
    }
    return `High quality match: Master craftsman with verified ${qualityDisplay}/10 quality score and proven heritage expertise.`;
  }

  // 3. Fastest turnaround
  if (daysVsDeadline <= 0.75 && deliveryScore >= 92) {
    return `Fastest match: High production capacity can complete the order in ${estimatedDays} days, well before your requested deadline.`;
  }

  // 4. Budget fit
  if (quoteVsBudget <= 0.95 && priceScore >= 90) {
    if (daysVsDeadline <= 1.0) {
      return `Budget-friendly match: Perfectly fits your budget at ₹${quotedPrice.toLocaleString("en-IN")}/unit with dependable delivery on schedule.`;
    }
    return `Affordable match: Highly compatible pricing within budget, though turnaround time requires ${estimatedDays} days.`;
  }

  // 5. High customer rating & experience
  if (hasReviews && ratingDisplay >= 4.5 && experienceYears >= 5) {
    return `Trusted artisan: ${experienceYears}+ years experience with a stellar ${ratingDisplay}★ customer satisfaction track record.`;
  }

  // 6. Partial match explanations
  if (!isEssentialMatch) {
    if (daysVsDeadline > 1.15) {
      return `Partial match: Meets craft specifications, but estimated production (${estimatedDays} days) exceeds requested deadline.`;
    }
    if (quoteVsBudget > 1.20) {
      return `Partial match: Skilled artisan with strong capabilities, but estimated quote (₹${quotedPrice.toLocaleString("en-IN")}) exceeds target budget.`;
    }
    if (!hasVerifiedQuality) {
      return `Promising match: Fits timeline and pricing parameters, with quality assessment currently in progress.`;
    }
    return `Partial match: Compatible on key parameters with slight adjustments needed for deadline or budget.`;
  }

  return `Recommended match: Well-aligned with your craft specifications, delivery timeline, and budget.`;
}

// ============================================================================
// 4. COMPREHENSIVE MATCH EVALUATOR FOR A SINGLE ARTISAN
// ============================================================================
export function evaluateArtisanCompatibility(requirement, artisanData, customWeights = null) {
  const weights = { ...DEFAULT_MATCHING_WEIGHTS, ...(customWeights || {}) };

  const {
    unitPrice: budgetPrice = 500,
    quantity = 1,
    durationDays: reqDurationDays = 30,
    deadline = null,
    category = "",
    requiredQualityLevel = "Any",
    preferredLocation = "",
  } = requirement;

  const targetDays = reqDurationDays || (deadline ? Math.max(1, Math.ceil((new Date(deadline) - Date.now()) / 86400000)) : 30);
  const benchmark = getCraftBenchmark(category);

  // ----------------------------------------------------
  // A. Determine Artisan's Quoted Price
  // ----------------------------------------------------
  let quotedPrice = 0;
  const artisanProducts = artisanData.products || [];
  const matchingProducts = artisanProducts.filter((p) => {
    const pCat = String(p.category || "").toLowerCase();
    const rCat = String(category || "").toLowerCase();
    return pCat.includes(rCat) || rCat.includes(pCat) || benchmark.categoryKeywords.some((kw) => pCat.includes(kw));
  });

  if (matchingProducts.length > 0) {
    const sum = matchingProducts.reduce((s, p) => s + (Number(p.price) || 0), 0);
    quotedPrice = Math.round(sum / matchingProducts.length);
  } else if (artisanData.hourlyRate && artisanData.hourlyRate > 0) {
    const labor = artisanData.hourlyRate * benchmark.avgLaborHoursPerUnit;
    const material = Math.round(labor * benchmark.materialCostRatio);
    quotedPrice = Math.round(labor + material);
  } else if (artisanProducts.length > 0) {
    const sum = artisanProducts.reduce((s, p) => s + (Number(p.price) || 0), 0);
    quotedPrice = Math.round(sum / artisanProducts.length);
  } else {
    // Benchmark recommended fair rate
    const labor = benchmark.recommendedHourlyRate * benchmark.avgLaborHoursPerUnit;
    const material = Math.round(labor * benchmark.materialCostRatio);
    quotedPrice = Math.round(labor + material);
  }
  quotedPrice = Math.max(50, quotedPrice);

  // ----------------------------------------------------
  // B. Determine Estimated Delivery Time & Capacity
  // ----------------------------------------------------
  const totalLaborHours = benchmark.avgLaborHoursPerUnit * Math.max(1, Number(quantity) || 1);
  const dailyHours = benchmark.dailyWorkingHours || 6.5;
  const baseProductionDays = Math.ceil(totalLaborHours / dailyHours);
  const bufferDays = Math.max(2, Math.ceil(baseProductionDays * 0.15)); // Quality and packaging buffer
  const activeBacklogOrders = Math.max(0, Number(artisanData.activeOrdersCount) || 0);
  const backlogDays = activeBacklogOrders * 2; // Each active order delays start slightly

  const estimatedDeliveryDays = Math.max(3, baseProductionDays + bufferDays + backlogDays);
  const estimatedDeliveryDate = new Date(Date.now() + estimatedDeliveryDays * 86400000);

  // ----------------------------------------------------
  // C. Compute 5 Parameter Scores (Normalized 0 to 100)
  // ----------------------------------------------------
  const priceScore = calculatePriceScore(quotedPrice, budgetPrice);
  const deliveryScore = calculateDeliveryScore(estimatedDeliveryDays, targetDays);

  const qualityRes = calculateQualityScore({
    expertEvaluationAvg: artisanData.expertEvaluationAvg,
    expertEvalCount: artisanData.expertEvalCount,
    customerQualityAvg: artisanData.customerQualityAvg,
    customerReviewCount: artisanData.customerReviewCount,
    isVerified: Boolean(artisanData.isVerified),
    requiredQualityLevel,
  });

  const ratingRes = calculateRatingScore({
    averageRating: artisanData.averageRating,
    reviewCount: artisanData.reviewCount,
  });

  const experienceYears = parseExperienceYears(artisanData.experience);
  const expRes = calculateExperienceScore({
    experienceYears,
    completedProjects: artisanData.completedProjects || 0,
  });

  // ----------------------------------------------------
  // D. Weighted Overall Compatibility Score (0 to 100%)
  // ----------------------------------------------------
  let overallScore =
    priceScore * weights.price +
    deliveryScore * weights.deliveryTime +
    qualityRes.score * weights.quality +
    ratingRes.score * weights.rating +
    expRes.score * weights.experience;

  // Optional Location proximity bonus (+3 to overall if preferred location matches)
  if (preferredLocation && matchesLocation(artisanData, preferredLocation)) {
    overallScore = Math.min(100, overallScore + 3);
  }

  const overallMatchPercentage = Math.round(Math.min(100, Math.max(0, overallScore)));

  // ----------------------------------------------------
  // E. Determine Essential Match vs Partial Match
  // ----------------------------------------------------
  // Essential requirements:
  // 1. Specialization matches requirement category
  // 2. Quoted price is within budget (or within 10% tolerance)
  // 3. Estimated delivery completes within deadline (or within 2-day buffer)
  // 4. Meets required quality level if specified
  const specMatch = matchesSpecialization(artisanData, category);
  const priceMeetsEssential = quotedPrice <= budgetPrice * 1.10;
  const deliveryMeetsEssential = estimatedDeliveryDays <= targetDays + 2;

  let qualityMeetsEssential = true;
  const reqLvl = String(requiredQualityLevel || "").toLowerCase();
  if (reqLvl.includes("master") || reqLvl.includes("heritage")) {
    qualityMeetsEssential = qualityRes.score >= 75;
  } else if (reqLvl.includes("high")) {
    qualityMeetsEssential = qualityRes.score >= 60;
  }

  const isEssentialMatch = Boolean(
    specMatch &&
    priceMeetsEssential &&
    deliveryMeetsEssential &&
    qualityMeetsEssential
  );

  const matchType = isEssentialMatch
    ? "essential"
    : specMatch
    ? "partial"
    : "unmatched";

  // ----------------------------------------------------
  // F. Generate Recommendation Reason
  // ----------------------------------------------------
  const recommendationReason = generateRecommendationReason({
    isEssentialMatch,
    priceScore,
    deliveryScore,
    qualityScore: qualityRes.score,
    ratingScore: ratingRes.score,
    experienceScore: expRes.score,
    quotedPrice,
    budgetPrice,
    estimatedDays: estimatedDeliveryDays,
    targetDays,
    qualityDisplay: qualityRes.displayScore,
    hasVerifiedQuality: qualityRes.hasVerifiedData,
    ratingDisplay: ratingRes.displayRating,
    hasReviews: ratingRes.hasReviews,
    experienceYears,
    completedProjects: artisanData.completedProjects || 0,
  });

  return {
    artisanId: artisanData._id || artisanData.id,
    name: artisanData.name || "Artisan",
    avatar: artisanData.avatar || "",
    specialization: artisanData.artCategory || benchmark.label || "Traditional Craft",
    city: artisanData.city || "",
    state: artisanData.state || "",
    quotedPrice,
    estimatedDeliveryDays,
    estimatedDeliveryDate,
    qualityScore: qualityRes.displayScore ? Number(qualityRes.displayScore) : null,
    qualityScoreNormalized: qualityRes.score,
    hasVerifiedQuality: qualityRes.hasVerifiedData,
    customerRating: ratingRes.displayRating,
    reviewCount: ratingRes.reviewCount,
    experience: artisanData.experience || `${experienceYears} years`,
    experienceYears,
    completedProjects: artisanData.completedProjects || 0,
    isVerified: Boolean(artisanData.isVerified),
    overallMatchPercentage,
    scores: {
      priceScore,
      deliveryScore,
      qualityScore: qualityRes.score,
      ratingScore: ratingRes.score,
      experienceScore: expRes.score,
    },
    isEssentialMatch,
    matchType,
    recommendationReason,
    isBestMatch: false, // will be assigned after ranking
  };
}

// ============================================================================
// 5. RETRIEVE ALL ELIGIBLE ARTISANS & PERFORM AUTOMATIC INTELLIGENT MATCHING
// ============================================================================
export async function findAndRankArtisansForRequirement(requirement, options = {}) {
  const { limit = 20, customWeights = null } = options;

  // 1. Retrieve all active artisans from MongoDB
  const artisans = await User.find({
    accountType: "artisan",
    isActive: { $ne: false },
  })
    .select("-password")
    .lean();

  if (!artisans || artisans.length === 0) {
    return [];
  }

  const artisanIds = artisans.map((a) => a._id);

  // 2. High-performance batch data aggregation in parallel (Zero N+1 queries)
  const [shops, products, reviewAgg, evalAgg, orderAgg] = await Promise.all([
    // Artisan shops
    Shop.find({ artisan: { $in: artisanIds } }).lean().catch(() => []),
    // Artisan products
    Product.find({ artisan: { $in: artisanIds } })
      .select("artisan category price laborHours stock isPublished averageEvaluationRating")
      .lean()
      .catch(() => []),
    // Customer reviews aggregate
    Review.aggregate([
      { $match: { artisan: { $in: artisanIds } } },
      {
        $group: {
          _id: "$artisan",
          avgRating: { $avg: "$overallRating" },
          avgQuality: { $avg: "$qualityRating" },
          avgDelivery: { $avg: "$deliveryRating" },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []),
    // Expert evaluations aggregate
    Evaluation.aggregate([
      { $match: { artisan: { $in: artisanIds }, status: "Evaluated" } },
      {
        $group: {
          _id: "$artisan",
          avgOverall: { $avg: "$overallScore" },
          avgQuality: { $avg: "$productQuality" },
          avgCraft: { $avg: "$craftsmanship" },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []),
    // Orders / completed projects aggregate
    Order.aggregate([
      { $match: { "items.artisanId": { $in: artisanIds } } },
      { $unwind: "$items" },
      { $match: { "items.artisanId": { $in: artisanIds } } },
      {
        $group: {
          _id: "$items.artisanId",
          completedCount: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "Completed"] }, 1, 0] },
          },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$orderStatus",
                    ["Processing", "In Production", "Awaiting response", "Ready to ship"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]).catch(() => []),
  ]);

  // Index batch lookup maps for O(1) retrieval
  const shopMap = new Map();
  shops.forEach((s) => shopMap.set(s.artisan.toString(), s));

  const productMap = new Map();
  products.forEach((p) => {
    const artId = p.artisan.toString();
    if (!productMap.has(artId)) productMap.set(artId, []);
    productMap.get(artId).push(p);
  });

  const reviewMap = new Map();
  reviewAgg.forEach((r) => reviewMap.set(r._id.toString(), r));

  const evalMap = new Map();
  evalAgg.forEach((e) => evalMap.set(e._id.toString(), e));

  const orderMap = new Map();
  orderAgg.forEach((o) => orderMap.set(o._id.toString(), o));

  // 3. Assemble enriched artisan profiles and evaluate compatibility
  const scoredMatches = [];

  for (const artisan of artisans) {
    const artIdStr = artisan._id.toString();
    const shop = shopMap.get(artIdStr) || null;
    const artisanProducts = productMap.get(artIdStr) || [];
    const reviews = reviewMap.get(artIdStr) || null;
    const evaluations = evalMap.get(artIdStr) || null;
    const orders = orderMap.get(artIdStr) || null;

    const enrichedArtisan = {
      ...artisan,
      shop,
      products: artisanProducts,
      averageRating: reviews ? reviews.avgRating : 0,
      customerQualityAvg: reviews ? reviews.avgQuality : 0,
      reviewCount: reviews ? reviews.count : 0,
      customerReviewCount: reviews ? reviews.count : 0,
      expertEvaluationAvg: evaluations ? evaluations.avgOverall : 0,
      expertEvalCount: evaluations ? evaluations.count : 0,
      completedProjects: orders ? orders.completedCount : 0,
      activeOrdersCount: orders ? orders.activeCount : 0,
    };

    const matchResult = evaluateArtisanCompatibility(requirement, enrichedArtisan, customWeights);

    // Filter out completely unmatched artisans (e.g. completely irrelevant craft discipline)
    if (matchResult.matchType !== "unmatched") {
      scoredMatches.push(matchResult);
    }
  }

  // 4. Rank artisans from highest to lowest compatibility
  // Priority: Essential matches first, then highest overall score, then highest quality score
  scoredMatches.sort((a, b) => {
    if (a.isEssentialMatch !== b.isEssentialMatch) {
      return a.isEssentialMatch ? -1 : 1;
    }
    if (b.overallMatchPercentage !== a.overallMatchPercentage) {
      return b.overallMatchPercentage - a.overallMatchPercentage;
    }
    return (b.qualityScoreNormalized || 0) - (a.qualityScoreNormalized || 0);
  });

  // 5. Highlight the best overall match naturally
  if (scoredMatches.length > 0) {
    scoredMatches[0].isBestMatch = true;
  }

  return scoredMatches.slice(0, limit);
}
