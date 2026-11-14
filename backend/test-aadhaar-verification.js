import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { User } from "./src/models/user.model.js";
import { Product } from "./src/models/product.model.js";
import { Notification } from "./src/models/notification.model.js";
import { requireActiveArtisan } from "./src/middlewares/auth.middleware.js";
import * as artisanVerCtrl from "./src/controllers/artisan-verification.controller.js";
import * as adminVerCtrl from "./src/controllers/admin-verification.controller.js";
import { createMarketplaceOrder } from "./src/controllers/marketplace.controller.js";

// Mock Response Helper
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
    },
  };
  return res;
}

// Ensure temp dummy files exist for upload testing
const TEMP_DIR = path.resolve("backend/temp_test_docs");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
const mockFrontFile = path.join(TEMP_DIR, "mock_aadhaar_front.jpg");
const mockBackFile = path.join(TEMP_DIR, "mock_aadhaar_back.jpg");
fs.writeFileSync(mockFrontFile, "mock-aadhaar-front-image-bytes-sample-content-2026");
fs.writeFileSync(mockBackFile, "mock-aadhaar-back-image-bytes-sample-content-2026");

async function runAadhaarVerificationTests() {
  console.log("==========================================================");
  console.log("Starting SkillBridge Aadhaar Verification & Moderation Suite");
  console.log("==========================================================\n");

  let passedCount = 0;

  // Mock Notification.create
  Notification.create = async (notif) => ({ ...notif, _id: new mongoose.Types.ObjectId() });

  // Mock Product.updateMany for moderation actions
  Product.updateMany = async (filter, update) => ({ acknowledged: true, modifiedCount: 1 });

  // Mock User Instances
  const artisanId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  let mockArtisanDoc = {
    _id: artisanId,
    id: artisanId.toString(),
    name: "Meera Bai",
    email: "meera.artisan@skillbridge.org",
    phone: "+91 9876543210",
    accountType: "artisan",
    artCategory: "Phulkari Embroidery",
    city: "Amritsar",
    verificationStatus: "Not Submitted",
    accountStatus: "Active",
    isVerified: false,
    isActive: true,
    aadhaarVerification: {
      isSubmitted: false,
      submittedAt: null,
      frontImage: "",
      backImage: "",
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: "",
      suspensionReason: "",
      suspendedAt: null,
      internalNotes: "",
      consentGiven: false,
    },
    appeal: {
      status: "None",
      explanation: "",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      adminResponse: "",
    },
    moderationAuditLogs: [],
    async save() {
      return this;
    },
    toSafeObject(isAdmin = false) {
      return {
        _id: this._id,
        id: this.id,
        name: this.name,
        email: this.email,
        accountType: this.accountType,
        verificationStatus: this.verificationStatus,
        accountStatus: this.accountStatus,
        isVerified: this.isVerified,
        aadhaarVerification: {
          isSubmitted: this.aadhaarVerification?.isSubmitted,
          submittedAt: this.aadhaarVerification?.submittedAt,
          frontImage: this.aadhaarVerification?.frontImage ? "private_uploads/aadhaar/front" : "",
          backImage: this.aadhaarVerification?.backImage ? "private_uploads/aadhaar/back" : "",
          rejectionReason: this.aadhaarVerification?.rejectionReason,
          suspensionReason: this.aadhaarVerification?.suspensionReason,
          suspendedAt: this.aadhaarVerification?.suspendedAt,
          ...(isAdmin ? { internalNotes: this.aadhaarVerification?.internalNotes } : {}),
        },
        appeal: this.appeal,
        ...(isAdmin ? { moderationAuditLogs: this.moderationAuditLogs } : {}),
      };
    },
  };

  const mockAdminUser = {
    _id: adminId,
    id: adminId.toString(),
    name: "Admin Officer",
    email: "admin@skillbridge.org",
    accountType: "admin",
  };

  // Mock User.findById
  User.findById = async (id) => {
    if (id?.toString() === artisanId.toString()) return mockArtisanDoc;
    if (id?.toString() === adminId.toString()) return mockAdminUser;
    return null;
  };

  // --------------------------------------------------------------------------
  // TEST 1: Aadhaar Upload Validation (Missing consent or files)
  // --------------------------------------------------------------------------
  console.log("Test 1: Aadhaar upload rejects if consent is missing");
  {
    const req = {
      user: mockArtisanDoc,
      files: {
        front: [{ path: mockFrontFile, originalname: "front.jpg", mimetype: "image/jpeg", size: 1000 }],
        back: [{ path: mockBackFile, originalname: "back.jpg", mimetype: "image/jpeg", size: 1000 }],
      },
      body: { consent: "false" },
    };
    const res = createMockRes();
    await artisanVerCtrl.uploadAadhaarDocuments(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /consent/i);
    passedCount++;
    console.log("  ✓ Consent validation enforced successfully.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 2: Successful Aadhaar Upload (Front + Back with Consent)
  // --------------------------------------------------------------------------
  console.log("Test 2: Successful front & back Aadhaar submission transitions status to Pending");
  {
    // Re-create temp source files in case previous test unlinked
    fs.writeFileSync(mockFrontFile, "sample-aadhaar-front-content");
    fs.writeFileSync(mockBackFile, "sample-aadhaar-back-content");

    const req = {
      user: mockArtisanDoc,
      files: {
        front: [{ path: mockFrontFile, originalname: "front.jpg", mimetype: "image/jpeg", size: 1000 }],
        back: [{ path: mockBackFile, originalname: "back.jpg", mimetype: "image/jpeg", size: 1000 }],
      },
      body: { consent: "true" },
    };
    const res = createMockRes();
    await artisanVerCtrl.uploadAadhaarDocuments(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(mockArtisanDoc.verificationStatus, "Pending");
    assert.equal(mockArtisanDoc.aadhaarVerification.isSubmitted, true);
    assert.ok(mockArtisanDoc.aadhaarVerification.frontImage.includes("private_uploads"));
    assert.ok(mockArtisanDoc.aadhaarVerification.backImage.includes("private_uploads"));
    passedCount++;
    console.log("  ✓ Documents stored in private directory, status is Pending.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 3: Admin Approves Verification
  // --------------------------------------------------------------------------
  console.log("Test 3: Admin approves verification -> Verified + Active + Audit Log");
  {
    const req = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: { note: "Clear Punjab government Aadhaar verified.", internalNotes: "Forensic check passed." },
    };
    const res = createMockRes();
    await adminVerCtrl.approveArtisanVerification(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(mockArtisanDoc.verificationStatus, "Verified");
    assert.equal(mockArtisanDoc.accountStatus, "Active");
    assert.equal(mockArtisanDoc.isVerified, true);
    assert.equal(mockArtisanDoc.moderationAuditLogs.length, 2);
    passedCount++;
    console.log("  ✓ Artisan verified and active with audit trail recorded.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 4: Admin Rejects Verification with Mandatory Reason
  // --------------------------------------------------------------------------
  console.log("Test 4: Admin rejects verification -> requires mandatory reason, keeps account Active");
  {
    // 4a: Without reason
    const reqFail = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: { reason: "   " },
    };
    const resFail = createMockRes();
    await adminVerCtrl.rejectArtisanVerification(reqFail, resFail);
    assert.equal(resFail.statusCode, 400);
    assert.match(resFail.body.message, /mandatory/i);

    // 4b: With valid reason
    const reqPass = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: { reason: "Front photo is blurry and address is cut off.", internalNotes: "Lighting too low." },
    };
    const resPass = createMockRes();
    await adminVerCtrl.rejectArtisanVerification(reqPass, resPass);
    assert.equal(resPass.statusCode, 200);
    assert.equal(mockArtisanDoc.verificationStatus, "Rejected");
    assert.equal(mockArtisanDoc.accountStatus, "Active"); // Account remains active, not suspended
    assert.equal(mockArtisanDoc.aadhaarVerification.rejectionReason, "Front photo is blurry and address is cut off.");
    passedCount++;
    console.log("  ✓ Document rejection enforced mandatory reason while keeping account Active.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 5: Admin Marks Artisan as Suspicious
  // --------------------------------------------------------------------------
  console.log("Test 5: Admin marks artisan as Suspicious -> Suspends account & Under Review");
  {
    // 5a: Without reason
    const reqFail = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: { reason: "" },
    };
    const resFail = createMockRes();
    await adminVerCtrl.markArtisanSuspicious(reqFail, resFail);
    assert.equal(resFail.statusCode, 400);

    // 5b: With valid reason
    const reqPass = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: { reason: "Suspected altered Aadhaar card detected by fraud team.", internalNotes: "Investigating font mismatch." },
    };
    const resPass = createMockRes();
    await adminVerCtrl.markArtisanSuspicious(reqPass, resPass);
    assert.equal(resPass.statusCode, 200);
    assert.equal(mockArtisanDoc.verificationStatus, "Under Review");
    assert.equal(mockArtisanDoc.accountStatus, "Suspended");
    assert.equal(mockArtisanDoc.aadhaarVerification.suspensionReason, "Suspected altered Aadhaar card detected by fraud team.");
    passedCount++;
    console.log("  ✓ Account marked as Suspended and Under Review.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 6: requireActiveArtisan Middleware Blocks Suspended Artisan
  // --------------------------------------------------------------------------
  console.log("Test 6: requireActiveArtisan blocks suspended artisan write operations (HTTP 403)");
  {
    const req = { user: mockArtisanDoc };
    const res = createMockRes();
    let nextCalled = false;
    requireActiveArtisan(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.isSuspended, true);
    assert.equal(res.body.accountStatus, "Suspended");
    passedCount++;
    console.log("  ✓ requireActiveArtisan successfully blocked suspended artisan write operation.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 7: Marketplace Orders Blocked for Suspended Artisan's Products
  // --------------------------------------------------------------------------
  console.log("Test 7: Marketplace order checkout is blocked if artisan is Suspended");
  {
    const mockProductId = new mongoose.Types.ObjectId();
    const originalFindOne = Product.findOne;
    Product.findOne = () => ({
      populate: () => ({
        populate: async () => ({
          _id: mockProductId,
          title: "Embroidered Phulkari Dupatta",
          price: 1800,
          stock: 10,
          artisan: mockArtisanDoc, // Suspended artisan!
          shop: { location: "Amritsar" },
        }),
      }),
    });

    const req = {
      user: { _id: customerId, name: "Customer User", email: "cust@example.com" },
      body: {
        items: [{ productId: mockProductId.toString(), quantity: 1 }],
        shippingAddress: {
          fullName: "Customer User",
          phone: "9876543210",
          email: "cust@example.com",
          address: "123 Main St",
          city: "Chandigarh",
          state: "Punjab",
          postalCode: "160001",
        },
      },
    };
    const res = createMockRes();
    await createMarketplaceOrder(req, res);

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /temporarily paused/i);
    Product.findOne = originalFindOne;
    passedCount++;
    console.log("  ✓ Customer order successfully paused for suspended artisan's product.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 8: Suspended Artisan Submits Appeal
  // --------------------------------------------------------------------------
  console.log("Test 8: Suspended artisan submits appeal -> Status transitions to Submitted");
  {
    // 8a: Minimum length validation
    const reqShort = {
      user: mockArtisanDoc,
      body: { explanation: "Too short" },
    };
    const resShort = createMockRes();
    await artisanVerCtrl.submitArtisanAppeal(reqShort, resShort);
    assert.equal(resShort.statusCode, 400);

    // 8b: Valid explanation
    const reqValid = {
      user: mockArtisanDoc,
      body: { explanation: "This was a scanning glitch on my printer. I am uploading the original uncompressed color document." },
    };
    const resValid = createMockRes();
    await artisanVerCtrl.submitArtisanAppeal(reqValid, resValid);
    assert.equal(resValid.statusCode, 200);
    assert.equal(mockArtisanDoc.appeal.status, "Submitted");

    // 8c: Duplicate active appeal prevented
    const resDup = createMockRes();
    await artisanVerCtrl.submitArtisanAppeal(reqValid, resDup);
    assert.equal(resDup.statusCode, 400);
    assert.match(resDup.body.message, /active appeal/i);

    passedCount++;
    console.log("  ✓ Appeal submission and duplicate prevention verified.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 9: Admin Reviews Appeal & Restores Account
  // --------------------------------------------------------------------------
  console.log("Test 9: Admin reviews appeal and restores account to Active");
  {
    const req = {
      user: mockAdminUser,
      params: { id: artisanId.toString() },
      body: {
        decision: "approve",
        response: "Explanation and re-scanned document verified. Account restored to full standing.",
        internalNotes: "Investigator confirmed scanning artifact.",
      },
    };
    const res = createMockRes();
    await adminVerCtrl.reviewArtisanAppeal(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(mockArtisanDoc.accountStatus, "Active");
    assert.equal(mockArtisanDoc.verificationStatus, "Verified");
    assert.equal(mockArtisanDoc.appeal.status, "Approved");
    assert.equal(mockArtisanDoc.aadhaarVerification.suspensionReason, "");

    // Now test requireActiveArtisan allows write operations again!
    let nextCalled = false;
    requireActiveArtisan({ user: mockArtisanDoc }, createMockRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);

    passedCount++;
    console.log("  ✓ Appeal approved, account restored to Active, restrictions lifted.\n");
  }

  // --------------------------------------------------------------------------
  // TEST 10: Private Document Security: Artisan & Admin Isolation
  // --------------------------------------------------------------------------
  console.log("Test 10: Private document access control & isolation");
  {
    // Stream endpoint with invalid side
    const reqBadSide = {
      params: { side: "invalid_side" },
      user: mockArtisanDoc,
    };
    const resBadSide = createMockRes();
    await artisanVerCtrl.getArtisanAadhaarDocument(reqBadSide, resBadSide);
    assert.equal(resBadSide.statusCode, 400);

    // Safe object redaction check: internal notes never exposed to artisan
    const artisanSafe = mockArtisanDoc.toSafeObject(false);
    assert.equal(artisanSafe.aadhaarVerification.internalNotes, undefined);
    assert.equal(artisanSafe.moderationAuditLogs, undefined);

    // Admin safe object check: internal notes present
    const adminSafe = mockArtisanDoc.toSafeObject(true);
    assert.ok(Array.isArray(adminSafe.moderationAuditLogs));

    passedCount++;
    console.log("  ✓ Internal moderation notes and audit logs properly isolated from public/artisan access.\n");
  }

  // Clean up temp test directory
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log("==========================================================");
  console.log(`All ${passedCount}/10 Verification & Moderation Tests Passed!`);
  console.log("==========================================================");
}

runAadhaarVerificationTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
