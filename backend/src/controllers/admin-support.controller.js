import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model.js";
import { TicketMessage } from "../models/ticket-message.model.js";
import { Dispute } from "../models/dispute.model.js";
import { Report } from "../models/report.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";

/**
 * @desc    Get Support Dashboard overview stats
 * @route   GET /api/admin/support/stats
 * @access  Admin / Support Staff
 */
export const getSupportStats = async (req, res) => {
  try {
    const [
      openTicketsCount,
      underReviewTicketsCount,
      escalatedTicketsCount,
      resolvedTicketsCount,
      activeDisputesCount,
      pendingReportsCount,
      totalArtisansCount,
      verifiedArtisansCount,
    ] = await Promise.all([
      Ticket.countDocuments({ status: "Open" }),
      Ticket.countDocuments({ status: "Under Review" }),
      Ticket.countDocuments({ status: "Escalated" }),
      Ticket.countDocuments({ status: "Resolved" }),
      Dispute.countDocuments({ status: { $nin: ["Resolved", "Closed"] } }),
      Report.countDocuments({ status: "Pending" }),
      User.countDocuments({ accountType: "artisan" }),
      User.countDocuments({
        accountType: "artisan",
        $or: [{ isVerified: true }, { verificationStatus: "Verified" }],
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        openTickets: openTicketsCount,
        underReviewTickets: underReviewTicketsCount,
        escalatedTickets: escalatedTicketsCount,
        resolvedTickets: resolvedTicketsCount,
        activeDisputes: activeDisputesCount,
        pendingReports: pendingReportsCount,
        totalArtisans: totalArtisansCount,
        verifiedArtisans: verifiedArtisansCount,
      },
    });
  } catch (error) {
    console.error("Get support stats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support statistics.",
    });
  }
};

/**
 * @desc    Get all tickets with comprehensive admin filters
 * @route   GET /api/admin/support/tickets
 * @access  Admin / Support Staff
 */
export const getAllTickets = async (req, res) => {
  try {
    const {
      status,
      role,
      category,
      priority,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (role && role !== "all") filter.userRole = role;
    if (category && category !== "all") filter.category = category;
    if (priority && priority !== "all") filter.priority = priority;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { ticketId: regex },
        { subject: regex },
        { userName: regex },
        { userEmail: regex },
        { relatedOrderNumber: regex },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      tickets: tickets.map((t) => t.toSafeObject()),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get all tickets error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tickets.",
    });
  }
};

/**
 * @desc    Assign ticket to support handler
 * @route   PATCH /api/admin/support/tickets/:id/assign
 * @access  Admin / Support Staff
 */
export const assignTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { handlerId, handlerName } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { ticketId: id };
    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    ticket.assignedTo = handlerId || user._id;
    ticket.assignedHandlerName = handlerName || user.name;
    ticket.assignedAt = new Date();
    ticket.status = ticket.status === "Open" ? "Under Review" : ticket.status;

    ticket.history.push({
      status: ticket.status,
      changedBy: user._id,
      actorName: user.name,
      actorRole: user.accountType,
      note: `Ticket assigned to ${ticket.assignedHandlerName}.`,
      timestamp: new Date(),
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: `Ticket assigned to ${ticket.assignedHandlerName}.`,
      ticket: ticket.toSafeObject(),
    });
  } catch (error) {
    console.error("Assign ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign ticket.",
    });
  }
};

/**
 * @desc    Update ticket status (Admin override / escalation)
 * @route   PATCH /api/admin/support/tickets/:id/status
 * @access  Admin / Support Staff
 */
export const updateTicketStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, note = "" } = req.body;

    const validStatuses = [
      "Open",
      "Under Review",
      "Waiting for User",
      "Escalated",
      "Resolved",
      "Closed",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose from: ${validStatuses.join(", ")}`,
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { ticketId: id };
    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    ticket.status = status;
    if (status === "Resolved") ticket.resolvedAt = new Date();
    if (status === "Closed") ticket.closedAt = new Date();

    ticket.history.push({
      status,
      changedBy: user._id,
      actorName: user.name,
      actorRole: user.accountType,
      note: note || `Status updated to ${status} by support staff.`,
      timestamp: new Date(),
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      ticket: ticket.toSafeObject(),
    });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update ticket status.",
    });
  }
};

/**
 * @desc    Get all disputes with admin filters
 * @route   GET /api/admin/support/disputes
 * @access  Admin / Support Staff
 */
export const getAllDisputes = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 25));
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
    console.error("Get all disputes error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch disputes.",
    });
  }
};

/**
 * @desc    Get all reports with status filters
 * @route   GET /api/admin/support/reports
 * @access  Admin / Support Staff
 */
export const getAllReports = async (req, res) => {
  try {
    const { status, targetType, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (targetType && targetType !== "all") filter.targetType = targetType;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports: reports.map((r) => r.toSafeObject()),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reports.",
    });
  }
};

/**
 * @desc    Action or dismiss a user/listing report
 * @route   PATCH /api/admin/support/reports/:id
 * @access  Admin / Support Staff
 */
export const updateReportStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, moderatorNotes = "", actionTaken = "" } = req.body;

    const validStatuses = ["Pending", "Investigating", "Action Taken", "Dismissed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose from: ${validStatuses.join(", ")}`,
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { reportId: id };
    const report = await Report.findOne(query);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    report.status = status;
    report.moderatorNotes = moderatorNotes.trim();
    report.actionTaken = actionTaken.trim();
    report.resolvedBy = user._id;
    report.resolvedAt = new Date();

    await report.save();

    // If report action is "Action Taken" on a Product, optionally unpublish or flag
    if (status === "Action Taken" && report.targetType === "Product" && mongoose.Types.ObjectId.isValid(report.targetId)) {
      await Product.findByIdAndUpdate(report.targetId, {
        status: "Draft",
        isPublished: false,
      }).catch((e) => console.warn("Auto-unpublish on report action note:", e.message));
    }

    return res.status(200).json({
      success: true,
      message: `Report marked as "${status}".`,
      report: report.toSafeObject(),
    });
  } catch (error) {
    console.error("Update report status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update report.",
    });
  }
};

/**
 * @desc    Toggle artisan profile verification badge
 * @route   POST /api/admin/support/artisan-verify/:id
 * @access  Admin / Support Staff
 */
export const toggleArtisanVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({
        success: false,
        message: "Artisan account not found.",
      });
    }

    artisan.isVerified = typeof isVerified === "boolean" ? isVerified : !artisan.isVerified;
    await artisan.save();

    return res.status(200).json({
      success: true,
      message: `Artisan verification status set to ${artisan.isVerified ? "VERIFIED" : "UNVERIFIED"}.`,
      artisan: artisan.toSafeObject(),
    });
  } catch (error) {
    console.error("Toggle artisan verification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update verification status.",
    });
  }
};
