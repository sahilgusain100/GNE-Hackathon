import mongoose from "mongoose";
import { Dispute } from "../models/dispute.model.js";
import { Order } from "../models/order.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";

function isStaff(user) {
  return user && ["admin", "support"].includes(user.accountType);
}

// Configurable Policy Windows (in days)
export const DISPUTE_CONFIG = {
  RETURN_WINDOW_DAYS: 7,
  COMPLAINT_WINDOW_DAYS: 14,
  MAX_EVIDENCE_ITEMS: 10,
};

/**
 * @desc    Raise a new order dispute (Customer or Industry)
 * @route   POST /api/disputes
 * @access  Customer or Industry
 */
export const raiseDispute = async (req, res) => {
  try {
    const user = req.user;
    const {
      orderId,
      orderItemId,
      category,
      customerExplanation,
      requestedResolution = "Return and refund",
      evidence = [],
    } = req.body;

    if (!orderId || !category || !customerExplanation) {
      return res.status(400).json({
        success: false,
        message: "Order ID, category, and explanation are required.",
      });
    }

    if (customerExplanation.trim().length < 15) {
      return res.status(400).json({
        success: false,
        message: "Please explain the issue with at least 15 characters of detail.",
      });
    }

    // Find the order
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = isObjectId
      ? { _id: orderId }
      : { orderNumber: orderId };

    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Ownership check: must be customer or industry who placed the order
    if (order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only raise disputes on orders placed by your account.",
      });
    }

    // Order cannot be disputed if already rejected or cancelled
    if (order.orderStatus === "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot raise a dispute on a cancelled or rejected order.",
      });
    }

    // Check policy window (14 days from order creation or delivery)
    const baseDate = order.paidAt || order.createdAt;
    const daysSinceBase = (Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBase > DISPUTE_CONFIG.COMPLAINT_WINDOW_DAYS) {
      return res.status(400).json({
        success: false,
        message: `The post-delivery dispute window is ${DISPUTE_CONFIG.COMPLAINT_WINDOW_DAYS} days. This order exceeds the permitted window. Please contact support via a general ticket.`,
      });
    }

    // Determine target item & artisan
    let targetItem = null;
    if (orderItemId) {
      targetItem = order.items.find(
        (it) => it._id?.toString() === orderItemId || it.id === orderItemId
      );
    }
    if (!targetItem && order.items.length > 0) {
      targetItem = order.items[0];
    }

    if (!targetItem || !targetItem.artisanId) {
      return res.status(400).json({
        success: false,
        message: "Could not identify the assigned artisan for this order item.",
      });
    }

    // Check for existing active dispute on this order item
    const existingActiveDispute = await Dispute.findOne({
      order: order._id,
      orderItemId: targetItem._id ? targetItem._id.toString() : "",
      status: { $nin: ["Closed", "Resolved"] },
    });

    if (existingActiveDispute) {
      return res.status(400).json({
        success: false,
        message: `An active dispute (#${existingActiveDispute.disputeId}) already exists for this order item.`,
      });
    }

    // Prepare evidence
    const formattedEvidence = Array.isArray(evidence)
      ? evidence.slice(0, DISPUTE_CONFIG.MAX_EVIDENCE_ITEMS).map((ev) => ({
          url: typeof ev === "string" ? ev : ev.url || "",
          caption: ev.caption || "Proof photograph",
          fileType: ev.fileType || "image/jpeg",
          uploadedAt: new Date(),
        })).filter((ev) => Boolean(ev.url))
      : [];

    const dispute = new Dispute({
      order: order._id,
      orderNumber: order.orderNumber,
      orderItemId: targetItem._id ? targetItem._id.toString() : "",
      productTitle: targetItem.title || targetItem.name || "Handcrafted Product",
      productImage: targetItem.image || "",
      itemPrice: targetItem.price || 0,
      itemQuantity: targetItem.quantity || 1,
      initiator: user._id,
      initiatorRole: user.accountType === "industry" ? "industry" : "customer",
      initiatorName: user.name,
      initiatorEmail: user.email,
      respondent: targetItem.artisanId,
      respondentName: targetItem.artisanName || "SkillBridge Artisan",
      category: category.trim(),
      requestedResolution,
      status: "Waiting for Artisan Response",
      customerExplanation: customerExplanation.trim(),
      customerEvidence: formattedEvidence,
      auditTrail: [
        {
          action: "DISPUTE_RAISED",
          performedBy: user._id,
          actorName: user.name,
          role: user.accountType,
          details: `Dispute opened by ${user.name} (${user.accountType}). Requested resolution: ${requestedResolution}.`,
          timestamp: new Date(),
        },
      ],
    });

    await dispute.save();

    // Update item and order status to "Disputed"
    targetItem.itemStatus = "Disputed";
    order.orderStatus = "Disputed";
    await order.save();

    // Notify artisan immediately with transparent notice (NOT a penalty!)
    try {
      await Notification.create({
        recipient: targetItem.artisanId,
        sender: user._id,
        type: "DISPUTE_RAISED",
        title: `Order Inquiry/Dispute Raised: #${order.orderNumber}`,
        message: `A dispute has been initiated for "${targetItem.title || targetItem.name}" regarding: "${category}". Please review the customer's claims and submit your explanation with photo proof. You are protected against unfair claims.`,
        orderId: order._id,
        metadata: {
          disputeId: dispute.disputeId,
          orderNumber: order.orderNumber,
          category,
        },
      });
    } catch (notifErr) {
      console.warn("Artisan dispute notification error:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Dispute raised successfully. The artisan has been notified to provide their perspective and evidence.",
      dispute: dispute.toSafeObject(),
    });
  } catch (error) {
    console.error("Raise dispute error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to raise dispute.",
    });
  }
};

/**
 * @desc    Get user's disputes (Artisan, Customer, or Industry)
 * @route   GET /api/disputes
 * @access  Authenticated
 */
export const getMyDisputes = async (req, res) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (user.accountType === "artisan") {
      filter.respondent = user._id;
    } else if (user.accountType === "customer" || user.accountType === "industry") {
      filter.initiator = user._id;
    } else if (isStaff(user)) {
      // staff can see all
    } else {
      filter.initiator = user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Dispute.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      disputes: disputes.map((d) => d.toSafeObject()),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get disputes error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch disputes.",
    });
  }
};

/**
 * @desc    Get dispute by ID
 * @route   GET /api/disputes/:id
 * @access  Initiator, Respondent, or Staff
 */
export const getDisputeById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { disputeId: id };

    const dispute = await Dispute.findOne(query);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute record not found.",
      });
    }

    // Strict access control: caller must be initiator, respondent, or staff
    const isInitiator = dispute.initiator.toString() === user._id.toString();
    const isRespondent = dispute.respondent.toString() === user._id.toString();
    if (!isInitiator && !isRespondent && !isStaff(user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this dispute.",
      });
    }

    return res.status(200).json({
      success: true,
      dispute: dispute.toSafeObject(),
    });
  } catch (error) {
    console.error("Get dispute by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve dispute details.",
    });
  }
};

/**
 * @desc    Artisan responds to dispute with explanation and counter-evidence
 * @route   POST /api/disputes/:id/respond
 * @access  Artisan (Respondent)
 */
export const respondToDispute = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { artisanExplanation, evidence = [] } = req.body;

    if (!artisanExplanation || !artisanExplanation.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide your explanation and response.",
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { disputeId: id };

    const dispute = await Dispute.findOne(query);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found.",
      });
    }

    // Only the assigned artisan (respondent) can submit this response
    if (dispute.respondent.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only the assigned artisan can respond to this dispute.",
      });
    }

    if (dispute.status === "Resolved" || dispute.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: `This dispute has already been ${dispute.status.toLowerCase()}.`,
      });
    }

    const formattedEvidence = Array.isArray(evidence)
      ? evidence.slice(0, DISPUTE_CONFIG.MAX_EVIDENCE_ITEMS).map((ev) => ({
          url: typeof ev === "string" ? ev : ev.url || "",
          caption: ev.caption || "Artisan proof / dispatch image",
          fileType: ev.fileType || "image/jpeg",
          uploadedAt: new Date(),
        })).filter((ev) => Boolean(ev.url))
      : [];

    dispute.artisanExplanation = artisanExplanation.trim();
    dispute.artisanEvidence = formattedEvidence;
    dispute.artisanRespondedAt = new Date();
    dispute.status = "Under Review";

    dispute.auditTrail.push({
      action: "ARTISAN_RESPONDED",
      performedBy: user._id,
      actorName: user.name,
      role: user.accountType,
      details: `Artisan ${user.name} submitted response explanation with ${formattedEvidence.length} evidence attachments.`,
      timestamp: new Date(),
    });

    await dispute.save();

    // Notify initiator (customer or industry) that artisan responded
    try {
      await Notification.create({
        recipient: dispute.initiator,
        sender: user._id,
        type: "DISPUTE_RESPONSE_SUBMITTED",
        title: `Artisan Responded: Dispute #${dispute.disputeId}`,
        message: `The artisan "${user.name}" has submitted their response and evidence. SkillBridge Support will now review both perspectives.`,
        orderId: dispute.order,
        metadata: {
          disputeId: dispute.disputeId,
          orderNumber: dispute.orderNumber,
        },
      });
    } catch (notifErr) {
      console.warn("Dispute response notification error:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Your explanation and counter-evidence have been recorded securely. Our support mediator will review both sides fairly.",
      dispute: dispute.toSafeObject(),
    });
  } catch (error) {
    console.error("Respond to dispute error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit dispute response.",
    });
  }
};

/**
 * @desc    Escalate a dispute to senior mediation
 * @route   POST /api/disputes/:id/escalate
 * @access  Initiator, Respondent, or Staff
 */
export const escalateDispute = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { disputeId: id };

    const dispute = await Dispute.findOne(query);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found.",
      });
    }

    const isParty =
      dispute.initiator.toString() === user._id.toString() ||
      dispute.respondent.toString() === user._id.toString() ||
      isStaff(user);

    if (!isParty) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    dispute.status = "Escalated";
    dispute.auditTrail.push({
      action: "DISPUTE_ESCALATED",
      performedBy: user._id,
      actorName: user.name,
      role: user.accountType,
      details: `Dispute escalated by ${user.name}: ${reason || "User requested senior mediation."}`,
      timestamp: new Date(),
    });

    await dispute.save();

    return res.status(200).json({
      success: true,
      message: "Dispute has been escalated to senior SkillBridge support mediation.",
      dispute: dispute.toSafeObject(),
    });
  } catch (error) {
    console.error("Escalate dispute error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to escalate dispute.",
    });
  }
};

/**
 * @desc    Admin / Support records resolution decision on a dispute
 * @route   PATCH /api/disputes/:id/resolve
 * @access  Admin / Support Staff Only
 */
export const resolveDispute = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      resolutionType,
      amount = 0,
      reason,
      refundStatus = "Simulated",
    } = req.body;

    const validResolutions = [
      "No action required",
      "Partial refund",
      "Full refund",
      "Replacement",
      "Return and refund",
      "Rework or correction",
      "Mutual agreement between parties",
    ];

    if (!validResolutions.includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resolution type. Choose from: ${validResolutions.join(", ")}`,
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please state the official reason for this resolution decision.",
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { disputeId: id };

    const dispute = await Dispute.findOne(query);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Dispute not found.",
      });
    }

    const refundAmount = Number(amount) || 0;
    const refundRef =
      ["Partial refund", "Full refund", "Return and refund"].includes(resolutionType)
        ? `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        : "";

    dispute.status = "Resolved";
    dispute.resolution = {
      type: resolutionType,
      amount: refundAmount,
      reason: reason.trim(),
      decidedBy: user._id,
      decidedByName: user.name,
      decidedAt: new Date(),
      refundStatus: refundRef ? refundStatus : "None",
      refundReference: refundRef,
    };

    dispute.auditTrail.push({
      action: "DISPUTE_RESOLVED",
      performedBy: user._id,
      actorName: user.name,
      role: user.accountType,
      details: `Resolution determined: "${resolutionType}". Amount: ₹${refundAmount}. Reason: ${reason.trim()}`,
      timestamp: new Date(),
    });

    await dispute.save();

    // Update Order payment status if full or partial refund
    try {
      const order = await Order.findById(dispute.order);
      if (order) {
        if (resolutionType === "Full refund" || resolutionType === "Return and refund") {
          order.paymentStatus = "refunded";
        }
        order.orderStatus = "Completed";
        await order.save();
      }
    } catch (orderErr) {
      console.warn("Order update on dispute resolve warning:", orderErr.message);
    }

    // Notify both parties
    const resolutionMessage = `Dispute #${dispute.disputeId} has been resolved: "${resolutionType}". Official decision note: "${reason.trim()}".`;

    try {
      await Promise.all([
        Notification.create({
          recipient: dispute.initiator,
          sender: user._id,
          type: "DISPUTE_RESOLVED",
          title: `Dispute Resolved: #${dispute.disputeId}`,
          message: resolutionMessage,
          orderId: dispute.order,
          metadata: {
            disputeId: dispute.disputeId,
            resolutionType,
            amount: refundAmount,
            refundReference: refundRef,
          },
        }),
        Notification.create({
          recipient: dispute.respondent,
          sender: user._id,
          type: "DISPUTE_RESOLVED",
          title: `Dispute Case Resolved: #${dispute.disputeId}`,
          message: resolutionMessage,
          orderId: dispute.order,
          metadata: {
            disputeId: dispute.disputeId,
            resolutionType,
            amount: refundAmount,
          },
        }),
      ]);
    } catch (notifErr) {
      console.warn("Dispute resolution notification warning:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Dispute has been resolved and recorded with complete audit log.",
      dispute: dispute.toSafeObject(),
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record resolution.",
    });
  }
};
