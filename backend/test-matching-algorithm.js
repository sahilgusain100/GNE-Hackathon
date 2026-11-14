import assert from "node:assert/strict";
import {
  DEFAULT_MATCHING_WEIGHTS,
  calculatePriceScore,
  calculateDeliveryScore,
  calculateQualityScore,
  calculateRatingScore,
  calculateExperienceScore,
  evaluateArtisanCompatibility,
  matchesSpecialization,
} from "./src/utils/artisanMatching.js";

console.log("==========================================================");
console.log("Running SkillBridge Intelligent Artisan Matching Algorithm Tests");
console.log("==========================================================\n");

// ----------------------------------------------------
// Test 1: Weights Configuration
// ----------------------------------------------------
console.log("Test 1: Default matching weights configuration");
const sumWeights =
  DEFAULT_MATCHING_WEIGHTS.price +
  DEFAULT_MATCHING_WEIGHTS.deliveryTime +
  DEFAULT_MATCHING_WEIGHTS.quality +
  DEFAULT_MATCHING_WEIGHTS.rating +
  DEFAULT_MATCHING_WEIGHTS.experience;

assert.equal(Math.round(sumWeights * 100), 100, "Weights must sum to 1.0 (100%)");
assert.equal(DEFAULT_MATCHING_WEIGHTS.price, 0.25, "Price weight is 25%");
assert.equal(DEFAULT_MATCHING_WEIGHTS.deliveryTime, 0.20, "Delivery weight is 20%");
assert.equal(DEFAULT_MATCHING_WEIGHTS.quality, 0.25, "Quality weight is 25%");
assert.equal(DEFAULT_MATCHING_WEIGHTS.rating, 0.15, "Rating weight is 15%");
assert.equal(DEFAULT_MATCHING_WEIGHTS.experience, 0.15, "Experience weight is 15%");
console.log("✔ Test 1 PASSED: Configurable weights conform to specifications.\n");

// ----------------------------------------------------
// Test 2: Price Scoring Rule: Do not rank highly simply because price is lowest
// ----------------------------------------------------
console.log("Test 2: Price scoring fairness (Anti-cheapness bias)");
const budget = 1000;
const fairQuoteScore = calculatePriceScore(900, budget); // 90% of budget
const exactQuoteScore = calculatePriceScore(1000, budget); // 100% of budget
const excessivelyLowScore = calculatePriceScore(200, budget); // 20% of budget (dangerously low)
const overBudgetScore = calculatePriceScore(1250, budget); // 25% over budget

assert(fairQuoteScore >= 95, `Fair quote should score high (got ${fairQuoteScore})`);
assert.equal(exactQuoteScore, 100, `Exact quote should score 100 (got ${exactQuoteScore})`);
assert(
  excessivelyLowScore < fairQuoteScore,
  `Excessively low quote (${excessivelyLowScore}) must NOT score higher than fair quote (${fairQuoteScore})`
);
assert(overBudgetScore < fairQuoteScore, `Over-budget quote should score lower (${overBudgetScore})`);
console.log(`  Fair quote (₹900): Score ${fairQuoteScore}`);
console.log(`  Exact quote (₹1000): Score ${exactQuoteScore}`);
console.log(`  Excessively cheap quote (₹200): Score ${excessivelyLowScore}`);
console.log(`  Over-budget quote (₹1250): Score ${overBudgetScore}`);
console.log("✔ Test 2 PASSED: Price normalization avoids rewarding unsustainably low pricing.\n");

// ----------------------------------------------------
// Test 3: Delivery Time & Capacity Scoring
// ----------------------------------------------------
console.log("Test 3: Delivery time and capacity scoring");
const deadlineDays = 30;
const fastDeliveryScore = calculateDeliveryScore(18, deadlineDays); // 60% of deadline
const onTimeDeliveryScore = calculateDeliveryScore(30, deadlineDays); // 100% of deadline
const slightlyLateScore = calculateDeliveryScore(34, deadlineDays); // 13% over deadline
const severelyLateScore = calculateDeliveryScore(50, deadlineDays); // 66% over deadline

assert(fastDeliveryScore >= 95, `Fast delivery should score high (got ${fastDeliveryScore})`);
assert(onTimeDeliveryScore >= 85, `On time delivery should score well (got ${onTimeDeliveryScore})`);
assert(slightlyLateScore < onTimeDeliveryScore, "Late delivery must be penalized");
assert(severelyLateScore <= 35, `Severely late delivery must have very low score (got ${severelyLateScore})`);
console.log(`  Fast delivery (18 days): Score ${fastDeliveryScore}`);
console.log(`  On-time delivery (30 days): Score ${onTimeDeliveryScore}`);
console.log(`  Slightly late (34 days): Score ${slightlyLateScore}`);
console.log(`  Severely late (50 days): Score ${severelyLateScore}`);
console.log("✔ Test 3 PASSED: Delivery time properly evaluates capacity vs deadline.\n");

// ----------------------------------------------------
// Test 4: Missing Information Must NOT Be Treated as Perfect Score
// ----------------------------------------------------
console.log("Test 4: Missing information handling (Quality and Rating)");
const verifiedQuality = calculateQualityScore({
  expertEvaluationAvg: 9.2,
  expertEvalCount: 3,
  isVerified: true,
});
const missingQuality = calculateQualityScore({
  expertEvaluationAvg: null,
  expertEvalCount: 0,
  isVerified: false,
});

assert(verifiedQuality.score >= 90, `Verified quality should score high (got ${verifiedQuality.score})`);
assert(missingQuality.score <= 55, `Missing quality must NOT be treated as a perfect score (got ${missingQuality.score})`);
assert.equal(missingQuality.displayScore, null, "Missing quality should display null / unverified");

const verifiedRating = calculateRatingScore({ averageRating: 4.8, reviewCount: 8 });
const missingRating = calculateRatingScore({ averageRating: 0, reviewCount: 0 });

assert(verifiedRating.score >= 90, `Verified rating should score high (got ${verifiedRating.score})`);
assert(missingRating.score <= 55, `Missing rating must NOT be treated as a perfect score (got ${missingRating.score})`);
assert.equal(missingRating.displayRating, null, "Missing rating should display null / no reviews");
console.log(`  Verified quality (9.2/10): Score ${verifiedQuality.score}, Display: ${verifiedQuality.displayScore}`);
console.log(`  Missing quality: Score ${missingQuality.score}, Display: ${missingQuality.displayScore}`);
console.log(`  Verified rating (4.8★): Score ${verifiedRating.score}, Display: ${verifiedRating.displayRating}`);
console.log(`  Missing rating: Score ${missingRating.score}, Display: ${missingRating.displayRating}`);
console.log("✔ Test 4 PASSED: Missing data is scored neutrally and never receives false perfect scores.\n");

// ----------------------------------------------------
// Test 5: Experience and Completed Projects Scoring
// ----------------------------------------------------
console.log("Test 5: Experience & completed projects evaluation");
const veteranArtisan = calculateExperienceScore({ experienceYears: 12, completedProjects: 6 });
const intermediateArtisan = calculateExperienceScore({ experienceYears: 5, completedProjects: 2 });
const noviceArtisan = calculateExperienceScore({ experienceYears: 1, completedProjects: 0 });

assert(veteranArtisan.score >= 90, `Veteran artisan score: ${veteranArtisan.score}`);
assert(intermediateArtisan.score >= 70 && intermediateArtisan.score < veteranArtisan.score);
assert(noviceArtisan.score <= 55 && noviceArtisan.score < intermediateArtisan.score);
console.log(`  Veteran (12 yrs, 6 projects): Score ${veteranArtisan.score}`);
console.log(`  Intermediate (5 yrs, 2 projects): Score ${intermediateArtisan.score}`);
console.log(`  Novice (1 yr, 0 projects): Score ${noviceArtisan.score}`);
console.log("✔ Test 5 PASSED: Experience scoring rewards proven track record.\n");

// ----------------------------------------------------
// Test 6: Specialization Matching Rule
// ----------------------------------------------------
console.log("Test 6: Specialization matching rule");
const textileArtisan = {
  artCategory: "Textiles & Handloom",
  shop: { category: "Textiles" },
  products: [{ category: "Cotton Handloom" }],
};
const potteryArtisan = {
  artCategory: "Pottery & Ceramics",
  shop: { category: "Pottery" },
  products: [{ category: "Terracotta" }],
};

assert(matchesSpecialization(textileArtisan, "Textiles & Handloom"), "Textile artisan should match textiles");
assert(!matchesSpecialization(potteryArtisan, "Textiles & Handloom"), "Pottery artisan should NOT match textiles");
assert(matchesSpecialization(potteryArtisan, "Ceramics"), "Pottery artisan should match ceramics");
console.log("✔ Test 6 PASSED: Category and specialization filtering works accurately.\n");

// ----------------------------------------------------
// Test 7: Full Compatibility Evaluation & Essential vs Partial Match
// ----------------------------------------------------
console.log("Test 7: Full artisan compatibility evaluation (Essential vs Partial)");
const requirement = {
  category: "Textiles & Handloom",
  unitPrice: 600,
  quantity: 10,
  durationDays: 35,
  requiredQualityLevel: "High",
};

// Artisan A: Meets all requirements comfortably
const artisanA = {
  id: "artisan_a",
  name: "Sunita Devi",
  artCategory: "Textiles & Handloom",
  hourlyRate: 200,
  experience: "10 years",
  isVerified: true,
  expertEvaluationAvg: 9.0,
  expertEvalCount: 4,
  averageRating: 4.8,
  reviewCount: 6,
  completedProjects: 5,
  products: [{ category: "Textiles & Handloom", price: 580 }],
};

// Artisan B: Great quality, but slightly over budget and past deadline
const artisanB = {
  id: "artisan_b",
  name: "Kavita Sharma",
  artCategory: "Textiles & Handloom",
  hourlyRate: 350,
  experience: "14 years",
  isVerified: true,
  expertEvaluationAvg: 9.6,
  expertEvalCount: 5,
  averageRating: 4.9,
  reviewCount: 12,
  completedProjects: 8,
  activeOrdersCount: 6, // Backlog causes delivery overrun
  products: [{ category: "Textiles & Handloom", price: 850 }], // Over budget
};

const matchA = evaluateArtisanCompatibility(requirement, artisanA);
const matchB = evaluateArtisanCompatibility(requirement, artisanB);

assert.equal(matchA.isEssentialMatch, true, "Artisan A should be an Essential Match");
assert.equal(matchA.matchType, "essential", "Artisan A matchType should be essential");
assert(matchA.overallMatchPercentage >= 85, `Artisan A score should be >= 85 (got ${matchA.overallMatchPercentage})`);

assert.equal(matchB.isEssentialMatch, false, "Artisan B should be a Partial Match (over budget & delayed)");
assert.equal(matchB.matchType, "partial", "Artisan B matchType should be partial");

console.log("  Artisan A (Essential Match):", {
  matchPercentage: `${matchA.overallMatchPercentage}%`,
  matchType: matchA.matchType,
  priceScore: matchA.scores.priceScore,
  deliveryScore: matchA.scores.deliveryScore,
  quotedPrice: `₹${matchA.quotedPrice}`,
  estimatedDays: `${matchA.estimatedDeliveryDays} days`,
  reason: matchA.recommendationReason,
});

console.log("  Artisan B (Partial Match):", {
  matchPercentage: `${matchB.overallMatchPercentage}%`,
  matchType: matchB.matchType,
  priceScore: matchB.scores.priceScore,
  deliveryScore: matchB.scores.deliveryScore,
  quotedPrice: `₹${matchB.quotedPrice}`,
  estimatedDays: `${matchB.estimatedDeliveryDays} days`,
  reason: matchB.recommendationReason,
});

assert(matchA.overallMatchPercentage > matchB.overallMatchPercentage, "Artisan A must rank higher than Artisan B");
console.log("✔ Test 7 PASSED: Full evaluation clearly identifies essential vs partial matches and ranks properly.\n");

console.log("==========================================================");
console.log("ALL 7 ALGORITHM VERIFICATION TESTS PASSED!");
console.log("==========================================================");
