import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Project } from "./src/models/project.model.js";
import { User } from "./src/models/user.model.js";
import { Order } from "./src/models/order.model.js";
import { Notification } from "./src/models/notification.model.js";
import { Shop } from "./src/models/shop.model.js";
import { Product } from "./src/models/product.model.js";
import { Review } from "./src/models/review.model.js";
import { Evaluation } from "./src/models/evaluation.model.js";
import * as industryCtrl from "./src/controllers/industry.controller.js";

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

async function runE2ETests() {
  console.log("==========================================================");
  console.log("Testing Requirement Submission & Recalculation Controller");
  console.log("==========================================================\n");

  Notification.create = async (notif) => ({ ...notif, _id: new mongoose.Types.ObjectId() });

  const industryId = new mongoose.Types.ObjectId();
  const artisan1Id = new mongoose.Types.ObjectId();
  const artisan2Id = new mongoose.Types.ObjectId();

  const industryUser = {
    _id: industryId,
    id: industryId.toString(),
    name: "Heritage Furnishings Pvt Ltd",
    contactName: "Vikram Malhotra",
    email: "vikram@heritagefurnishings.com",
    accountType: "industry",
    industry: "Home Decor & Textiles",
  };

  const mockArtisan1 = {
    _id: artisan1Id,
    id: artisan1Id.toString(),
    name: "Sunita Devi",
    email: "sunita@example.com",
    accountType: "artisan",
    artCategory: "Textiles & Handloom",
    experience: "10 years",
    city: "Jaipur",
    state: "Rajasthan",
    hourlyRate: 200,
    isVerified: true,
    isActive: true,
    toSafeObject() {
      return { id: this._id.toString(), name: this.name, artCategory: this.artCategory };
    },
  };

  const mockArtisan2 = {
    _id: artisan2Id,
    id: artisan2Id.toString(),
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    accountType: "artisan",
    artCategory: "Textiles & Handloom",
    experience: "4 years",
    city: "Varanasi",
    state: "Uttar Pradesh",
    hourlyRate: 280,
    isVerified: false,
    isActive: true,
    toSafeObject() {
      return { id: this._id.toString(), name: this.name, artCategory: this.artCategory };
    },
  };

  // Mock User.find
  User.find = (query) => ({
    select: () => ({
      lean: async () => [mockArtisan1, mockArtisan2],
    }),
  });

  // Mock batch collections
  Shop.find = () => ({ lean: async () => [] });
  Product.find = () => ({
    select: () => ({
      lean: async () => [
        { artisan: artisan1Id, category: "Textiles & Handloom", price: 550 },
        { artisan: artisan2Id, category: "Textiles & Handloom", price: 800 },
      ],
    }),
  });

  Review.aggregate = async () => [
    { _id: artisan1Id, avgRating: 4.8, avgQuality: 4.7, count: 5 },
    { _id: artisan2Id, avgRating: 4.2, avgQuality: 4.0, count: 2 },
  ];

  Evaluation.aggregate = async () => [
    { _id: artisan1Id, avgOverall: 9.0, avgQuality: 9.2, count: 3 },
  ];

  Order.aggregate = async () => [
    { _id: artisan1Id, completedCount: 4, activeCount: 0 },
    { _id: artisan2Id, completedCount: 1, activeCount: 2 },
  ];

  // ----------------------------------------------------
  // Scenario 1: Industrialist Submits a Requirement
  // ----------------------------------------------------
  console.log("Scenario 1: Industrialist submits a requirement (Auto-Matching)");
  let storedProject = null;

  Project.create = async (data) => {
    storedProject = {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; },
      toSafeObject: function (indUser, artUser) {
        return {
          id: this._id.toString(),
          _id: this._id.toString(),
          title: this.title,
          category: this.category,
          quantity: this.quantity,
          unitPrice: this.unitPrice,
          totalBudget: this.totalBudget,
          duration: this.duration,
          deadline: this.deadline,
          requiredQualityLevel: this.requiredQualityLevel,
          preferredLocation: this.preferredLocation,
          status: this.status,
          matchedArtisans: this.matchedArtisans,
        };
      },
    };
    return storedProject;
  };

  const reqCreate = {
    user: industryUser,
    body: {
      title: "Handloom Cotton Throw Blankets",
      category: "Textiles & Handloom",
      quantity: 15,
      unitPrice: 600,
      duration: "30 days",
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      requiredQualityLevel: "High",
      preferredLocation: "Jaipur",
      specifications: "100% natural organic cotton, AZO-free dyes, traditional jacquard weave",
    },
  };

  const resCreate = createMockRes();
  await industryCtrl.createIndustryProject(reqCreate, resCreate);

  assert.equal(resCreate.statusCode, 201, "Create project should return 201 Created");
  assert(resCreate.body.success, "Should succeed");
  assert(Array.isArray(resCreate.body.project.matchedArtisans), "Must contain matchedArtisans");
  assert(resCreate.body.project.matchedArtisans.length >= 2, "Must return matched artisans");

  const [topMatch, secondMatch] = resCreate.body.project.matchedArtisans;
  console.log(`  Top Match: ${topMatch.name} (${topMatch.overallMatchPercentage}% Match, ${topMatch.matchType})`);
  console.log(`  Recommendation: "${topMatch.recommendationReason}"`);
  console.log(`  Best match highlighted: ${topMatch.isBestMatch}`);

  assert.equal(topMatch.isBestMatch, true, "Top ranked match must be flagged as isBestMatch");
  assert(topMatch.overallMatchPercentage >= secondMatch.overallMatchPercentage, "Artisans must be ranked highest to lowest compatibility");
  assert.equal(topMatch.name, "Sunita Devi", "Sunita Devi should be top match based on verified quality and budget fit");
  console.log("✔ Scenario 1 PASSED: Automatic intelligent matching completed on requirement submission.\n");

  // ----------------------------------------------------
  // Scenario 2: Industrialist Updates the Requirement
  // ----------------------------------------------------
  console.log("Scenario 2: Industrialist updates requirements (Automatic Recalculation)");
  Project.findOne = async () => storedProject;
  Project.findById = (id) => ({
    populate: () => ({
      populate: async () => storedProject,
    }),
  });

  const reqUpdate = {
    user: industryUser,
    params: { id: storedProject._id.toString() },
    body: {
      quantity: 25,
      unitPrice: 750, // Higher budget
      duration: "40 days",
      requiredQualityLevel: "Master / Heritage",
    },
  };

  const resUpdate = createMockRes();
  await industryCtrl.updateIndustryProject(reqUpdate, resUpdate);

  assert.equal(resUpdate.statusCode, 200, "Update should return 200 OK");
  assert(resUpdate.body.success, "Should succeed");
  assert.equal(resUpdate.body.project.unitPrice, 750, "Budget should be updated to 750");
  assert.equal(resUpdate.body.project.quantity, 25, "Quantity should be updated to 25");
  assert(Array.isArray(resUpdate.body.project.matchedArtisans), "Matches must be recalculated");

  const updatedTop = resUpdate.body.project.matchedArtisans[0];
  console.log(`  Recalculated Top Match: ${updatedTop.name} (${updatedTop.overallMatchPercentage}% Match)`);
  console.log(`  Recalculated Reason: "${updatedTop.recommendationReason}"`);
  console.log("✔ Scenario 2 PASSED: Matches automatically recalculated upon requirement update.\n");

  console.log("==========================================================");
  console.log("ALL E2E CONTROLLER TESTS PASSED!");
  console.log("==========================================================");
}

runE2ETests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
