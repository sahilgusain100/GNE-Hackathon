import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Ticket } from "./src/models/ticket.model.js";
import { TicketMessage } from "./src/models/ticket-message.model.js";
import { Dispute } from "./src/models/dispute.model.js";
import { Review } from "./src/models/review.model.js";
import { Report } from "./src/models/report.model.js";
import { Order } from "./src/models/order.model.js";
import { User } from "./src/models/user.model.js";
import { Notification } from "./src/models/notification.model.js";
import * as supportCtrl from "./src/controllers/support.controller.js";
import * as disputeCtrl from "./src/controllers/dispute.controller.js";
import * as reviewCtrl from "./src/controllers/review.controller.js";
import * as reportCtrl from "./src/controllers/report.controller.js";

// Helper mock response object
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

async function runTests() {
  Notification.create = async (notif) => ({ ...notif, _id: new mongoose.Types.ObjectId() });
  console.log("==========================================================");
  console.log("Starting SkillBridge Trust & Dispute System Verification Suite");
  console.log("==========================================================\n");

  let passedCount = 0;

  // Mock Users
  const customerId = new mongoose.Types.ObjectId();
  const artisanId = new mongoose.Types.ObjectId();
  const industryId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const intruderId = new mongoose.Types.ObjectId();

  const customerUser = {
    _id: customerId,
    id: customerId.toString(),
    name: "Aanya Sharma",
    email: "aanya@example.com",
    accountType: "customer",
  };

  const artisanUser = {
    _id: artisanId,
    id: artisanId.toString(),
    name: "Sunita Devi",
    email: "sunita.artisan@example.com",
    accountType: "artisan",
    isVerified: true,
  };

  const industryUser = {
    _id: industryId,
    id: industryId.toString(),
    name: "Fabrics Ltd",
    email: "procurement@fabricsltd.com",
    accountType: "industry",
  };

  const staffUser = {
    _id: staffId,
    id: staffId.toString(),
    name: "Mediation Specialist",
    email: "support@skillbridge.org",
    accountType: "support",
  };

  const intruderUser = {
    _id: intruderId,
    id: intruderId.toString(),
    name: "Unknown Intruder",
    email: "intruder@example.com",
    accountType: "customer",
  };

  // ----------------------------------------------------
  // Scenario 1: Customer reports damaged product after delivery
  // ----------------------------------------------------
  console.log("Scenario 1: Customer reports damaged product after delivery");
  const testOrderId = new mongoose.Types.ObjectId();
  const testOrderItemId = new mongoose.Types.ObjectId();

  // Mock Order findOne
  const originalOrderFindOne = Order.findOne;
  const mockOrder = {
    _id: testOrderId,
    orderNumber: "ORD-2026-9901",
    customer: customerId,
    orderStatus: "Completed",
    paidAt: new Date(),
    createdAt: new Date(),
    items: [
      {
        _id: testOrderItemId,
        id: testOrderItemId.toString(),
        title: "Hand-Carved Walnut Bowl",
        price: 2400,
        quantity: 1,
        artisanId: artisanId,
        artisanName: "Sunita Devi",
        itemStatus: "Completed",
      },
    ],
    save: async function () { return this; },
  };

  Order.findOne = async () => mockOrder;

  const originalDisputeFindOne = Dispute.findOne;
  Dispute.findOne = async () => null;

  const req1 = {
    user: customerUser,
    body: {
      orderId: "ORD-2026-9901",
      orderItemId: testOrderItemId.toString(),
      category: "Product damaged in transit",
      requestedResolution: "Return and refund",
      customerExplanation: "The walnut bowl has a large crack along the rim that occurred during transit.",
      evidence: [{ url: "https://example.com/cracked-bowl.jpg", caption: "Rim crack photo" }],
    },
  };
  const res1 = createMockRes();

  let createdDispute = null;
  const originalDisputeSave = Dispute.prototype.save;
  Dispute.prototype.save = async function () {
    this.disputeId = "DSP-2026-10001";
    createdDispute = this;
    return this;
  };

  await disputeCtrl.raiseDispute(req1, res1);
  assert.equal(res1.statusCode, 201, "Customer should raise dispute successfully");
  assert.equal(res1.body.success, true);
  assert.equal(res1.body.dispute.status, "Waiting for Artisan Response");
  assert.equal(mockOrder.orderStatus, "Disputed");
  console.log("✔ Scenario 1 PASSED: Order status marked Disputed and dispute created with proof evidence.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 2: Artisan responds with supporting evidence
  // ----------------------------------------------------
  console.log("Scenario 2: Artisan responds with supporting evidence");
  Dispute.findOne = async () => createdDispute;

  const req2 = {
    user: artisanUser,
    params: { id: "DSP-2026-10001" },
    body: {
      artisanExplanation: "Item was inspected, bubble-wrapped in double ply, and intact at dispatch. Here is the pre-shipment photo.",
      evidence: [{ url: "https://example.com/pre-shipment-bowl.jpg", caption: "Pre-pack inspection photo" }],
    },
  };
  const res2 = createMockRes();

  await disputeCtrl.respondToDispute(req2, res2);
  assert.equal(res2.statusCode, 200, "Artisan should respond successfully");
  assert.equal(res2.body.success, true);
  assert.equal(res2.body.dispute.status, "Under Review");
  assert.equal(createdDispute.artisanEvidence.length, 1);
  assert.equal(createdDispute.auditTrail.length, 2);
  console.log("✔ Scenario 2 PASSED: Artisan explanation & counter-evidence recorded; status transitioned to Under Review.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 3: Support reviews both sides and resolves dispute
  // ----------------------------------------------------
  console.log("Scenario 3: Support reviews both sides and resolves the dispute");
  const req3 = {
    user: staffUser,
    params: { id: "DSP-2026-10001" },
    body: {
      resolutionType: "Return and refund",
      amount: 2400,
      reason: "Carrier packaging flaw verified from crack pattern. Full refund issued upon parcel return; artisan covered by damage insurance.",
    },
  };
  const res3 = createMockRes();

  await disputeCtrl.resolveDispute(req3, res3);
  assert.equal(res3.statusCode, 200, "Support staff should resolve dispute");
  assert.equal(res3.body.success, true);
  assert.equal(res3.body.dispute.status, "Resolved");
  assert.equal(createdDispute.resolution.type, "Return and refund");
  assert.equal(createdDispute.resolution.amount, 2400);
  assert(createdDispute.resolution.refundReference.startsWith("REF-"));
  console.log("✔ Scenario 3 PASSED: Dispute resolved with refund reference, audit trail, and customer/artisan updates.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 4: Customer requests refund for a failed payment
  // ----------------------------------------------------
  console.log("Scenario 4: Customer requests a refund for a failed payment");
  let createdTicket = null;
  const originalTicketSave = Ticket.prototype.save;
  Ticket.prototype.save = async function () {
    this.ticketId = "TKT-2026-88001";
    createdTicket = this;
    return this;
  };

  const originalMessageCreate = TicketMessage.create;
  TicketMessage.create = async (msg) => ({ ...msg, _id: new mongoose.Types.ObjectId(), toSafeObject: () => msg });

  const req4 = {
    user: customerUser,
    body: {
      category: "Payment Issues",
      subCategory: "Payment deducted but order not confirmed",
      subject: "Amount ₹1,800 deducted via UPI but order shows failed",
      description: "My bank account was debited with UTR #982348234 but the checkout screen timed out.",
      priority: "Urgent",
      relatedOrderId: "ORD-2026-9901",
    },
  };
  const res4 = createMockRes();

  await supportCtrl.createTicket(req4, res4);
  assert.equal(res4.statusCode, 201, "Payment ticket should be created");
  assert.equal(res4.body.ticket.priority, "Urgent");
  assert.equal(res4.body.ticket.category, "Payment Issues");
  console.log("✔ Scenario 4 PASSED: Payment failure ticket logged with Urgent priority and bank UTR details.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 5: Artisan reports an unfair customer complaint
  // ----------------------------------------------------
  console.log("Scenario 5: Artisan reports an unfair customer complaint");
  const req5 = {
    user: artisanUser,
    body: {
      category: "Customer Disputes",
      subCategory: "Customer making false quality claims",
      subject: "Unfair quality complaint on customized saree",
      description: "Customer accepted color variations in advance via chat and is now requesting a full refund unfairly.",
      priority: "High",
    },
  };
  const res5 = createMockRes();

  await supportCtrl.createTicket(req5, res5);
  assert.equal(res5.statusCode, 201, "Artisan protection ticket should be created");
  assert.equal(res5.body.ticket.category, "Customer Disputes");
  assert.equal(res5.body.ticket.userRole, "artisan");
  console.log("✔ Scenario 5 PASSED: Artisan dispute ticket registered; protection policy upholds evidence review.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 6: Industry reports an incomplete bulk order
  // ----------------------------------------------------
  console.log("Scenario 6: Industry reports an incomplete bulk order");
  Dispute.findOne = async () => null;
  const industryOrderId = new mongoose.Types.ObjectId();
  const mockIndustryOrder = {
    _id: industryOrderId,
    orderNumber: "ORD-IND-2026-05",
    customer: industryId,
    orderStatus: "Shipped",
    paidAt: new Date(),
    createdAt: new Date(),
    items: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "100 Hand-woven Khadi Uniform Shirts",
        price: 850,
        quantity: 100,
        artisanId: artisanId,
        artisanName: "Sunita Devi",
        itemStatus: "Shipped",
      },
    ],
    save: async function () { return this; },
  };

  Order.findOne = async () => mockIndustryOrder;

  const req6 = {
    user: industryUser,
    body: {
      orderId: "ORD-IND-2026-05",
      category: "Bulk order quantity shortage",
      requestedResolution: "Rework or correction",
      customerExplanation: "Shipment delivered only 85 shirts out of the contracted 100. Shortage of 15 pieces confirmed by warehouse receiving report.",
      evidence: [{ url: "https://example.com/warehouse-shortage-report.pdf", caption: "Warehouse receipt showing 85 units" }],
    },
  };
  const res6 = createMockRes();

  await disputeCtrl.raiseDispute(req6, res6);
  assert.equal(res6.statusCode, 201, "Industry dispute should be raised");
  assert.equal(res6.body.dispute.initiatorRole, "industry");
  assert.equal(res6.body.dispute.requestedResolution, "Rework or correction");
  console.log("✔ Scenario 6 PASSED: Industry bulk order shortage logged with inspection evidence and rework request.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 7: Customer reports a suspicious product listing
  // ----------------------------------------------------
  console.log("Scenario 7: Customer reports a suspicious product listing");
  let createdReport = null;
  const originalReportSave = Report.prototype.save;
  Report.prototype.save = async function () {
    this.reportId = "RPT-2026-4401";
    createdReport = this;
    return this;
  };

  const req7 = {
    user: customerUser,
    body: {
      targetType: "Product",
      targetId: "PROD-998822",
      targetTitle: "Factory Printed Imitation Madhubani",
      reason: "Misleading information",
      description: "Listing claims to be 100% handmade authentic craft, but reverse image search proves it is machine printed polyester.",
      evidence: ["https://example.com/factory-comparison.png"],
    },
  };
  const res7 = createMockRes();

  await reportCtrl.createReport(req7, res7);
  assert.equal(res7.statusCode, 201, "Report should be created");
  assert.equal(res7.body.report.reason, "Misleading information");
  assert.equal(res7.body.report.status, "Pending");
  console.log("✔ Scenario 7 PASSED: Fraudulent / misleading listing reported to trust & safety queue.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 8: Unauthorized user attempts to access another user's ticket
  // ----------------------------------------------------
  console.log("Scenario 8: Unauthorized user attempts to access another user's ticket");
  Ticket.findOne = async () => createdTicket; // Owned by customerUser
  TicketMessage.find = () => ({ sort: async () => [] });

  const req8Unauthorized = {
    user: intruderUser, // Intruder attempting to read customerUser's ticket
    params: { id: "TKT-2026-88001" },
  };
  const res8Unauthorized = createMockRes();

  await supportCtrl.getTicketById(req8Unauthorized, res8Unauthorized);
  assert.equal(res8Unauthorized.statusCode, 403, "Intruder must be denied access with HTTP 403");
  assert.equal(res8Unauthorized.body.success, false);

  // But staff user should have authorized access
  const req8Staff = {
    user: staffUser,
    params: { id: "TKT-2026-88001" },
  };
  const res8Staff = createMockRes();
  await supportCtrl.getTicketById(req8Staff, res8Staff);
  assert.equal(res8Staff.statusCode, 200, "Support staff should be authorized");
  console.log("✔ Scenario 8 PASSED: Unauthorized access strictly blocked (403); staff mediation permitted.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 9: A resolved ticket is reopened when permitted
  // ----------------------------------------------------
  console.log("Scenario 9: A resolved ticket is reopened when permitted");
  createdTicket.status = "Resolved";
  createdTicket.resolvedAt = new Date();
  createdTicket.user = customerId;
  createdTicket.reopenCount = 0;

  const req9 = {
    user: customerUser,
    params: { id: "TKT-2026-88001" },
    body: {
      reason: "Bank statement confirms the refund has still not appeared after 5 business days.",
    },
  };
  const res9 = createMockRes();

  await supportCtrl.reopenTicket(req9, res9);
  assert.equal(res9.statusCode, 200, "Resolved ticket should be reopened");
  assert.equal(res9.body.ticket.status, "Under Review");
  assert.equal(res9.body.ticket.reopenCount, 1);

  // Test maximum reopen limit (max 3 times)
  createdTicket.status = "Resolved";
  createdTicket.reopenCount = 3; // Already reached limit
  const res9Limit = createMockRes();
  await supportCtrl.reopenTicket(req9, res9Limit);
  assert.equal(res9Limit.statusCode, 400, "Reopen beyond limit of 3 should be blocked");
  console.log("✔ Scenario 9 PASSED: Resolved ticket reopened under limits; abusive repeated reopens (>3) blocked.\n");
  passedCount++;

  // ----------------------------------------------------
  // Scenario 10: Customer submits a verified-purchase review
  // ----------------------------------------------------
  console.log("Scenario 10: Customer submits a verified-purchase review");
  Order.findOne = async () => mockOrder;
  const originalReviewFindOne = Review.findOne;
  Review.findOne = async () => null; // No previous review for this item

  let createdReview = null;
  Review.prototype.save = async function () {
    this._id = new mongoose.Types.ObjectId();
    createdReview = this;
    return this;
  };

  const req10 = {
    user: customerUser,
    body: {
      orderId: "ORD-2026-9901",
      orderItemId: testOrderItemId.toString(),
      productId: new mongoose.Types.ObjectId().toString(),
      overallRating: 5,
      qualityRating: 5,
      packagingRating: 4,
      deliveryRating: 5,
      title: "Masterful carving and silky smooth beeswax finish!",
      comment: "Arrived in great packaging once replaced. The natural walnut grain is stunning.",
      images: ["https://example.com/happy-customer-bowl.jpg"],
    },
  };
  const res10 = createMockRes();

  await reviewCtrl.createReview(req10, res10);
  assert.equal(res10.statusCode, 201, "Verified review should be created");
  assert.equal(res10.body.review.isVerifiedPurchase, true);
  assert.equal(res10.body.review.qualityRating, 5);
  assert.equal(res10.body.review.deliveryRating, 5);

  // Test duplicate review prevention
  Review.findOne = async () => createdReview; // Now exists
  const res10Duplicate = createMockRes();
  await reviewCtrl.createReview(req10, res10Duplicate);
  assert.equal(res10Duplicate.statusCode, 400, "Duplicate review for same order item must be rejected");

  // Test unverified user submission prevention
  const req10Unverified = {
    user: intruderUser, // Intruder who never purchased this order
    body: req10.body,
  };
  const res10Unverified = createMockRes();
  await reviewCtrl.createReview(req10Unverified, res10Unverified);
  assert.equal(res10Unverified.statusCode, 403, "Unverified user without purchase must be rejected");
  console.log("✔ Scenario 10 PASSED: Verified-purchase review published; duplicates and non-purchasers blocked.\n");
  passedCount++;

  // Cleanup mocks
  Order.findOne = originalOrderFindOne;
  Dispute.findOne = originalDisputeFindOne;
  Dispute.prototype.save = originalDisputeSave;
  Ticket.prototype.save = originalTicketSave;
  TicketMessage.create = originalMessageCreate;
  Report.prototype.save = originalReportSave;
  Review.findOne = originalReviewFindOne;

  console.log("==========================================================");
  console.log(`ALL 10 VERIFICATION SCENARIOS PASSED (${passedCount}/10)!`);
  console.log("==========================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
