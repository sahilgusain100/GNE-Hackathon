import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model.js";
import { TicketMessage } from "../models/ticket-message.model.js";
import { Order } from "../models/order.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

/**
 * Helper to check if caller is admin or support staff
 */
function isStaff(user) {
  return user && ["admin", "support"].includes(user.accountType);
}

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Authenticated (Customer, Artisan, Industry, Expert)
 */
export const createTicket = async (req, res) => {
  try {
    const user = req.user;
    const {
      category,
      subCategory,
      subject,
      description,
      priority = "Medium",
      relatedOrder,
      relatedOrderId,
      relatedProject,
      relatedProduct,
      attachments = [],
    } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: "Category, subject, and description are required.",
      });
    }

    if (subject.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Subject must be at least 5 characters long.",
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters long.",
      });
    }

    let verifiedOrderId = null;
    let verifiedOrderNumber = "";

    const orderQueryParam = relatedOrder || relatedOrderId;
    if (orderQueryParam) {
      const isObjectId = mongoose.Types.ObjectId.isValid(orderQueryParam);
      const query = isObjectId
        ? { _id: orderQueryParam }
        : { orderNumber: orderQueryParam };

      const orderDoc = await Order.findOne(query);
      if (orderDoc) {
        // Verify ownership based on role
        if (user.accountType === "customer" && orderDoc.customer.toString() !== user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "You can only open a complaint against orders placed by your account.",
          });
        }
        if (user.accountType === "artisan") {
          const hasArtisanItem = orderDoc.items?.some(
            (item) => item.artisanId && item.artisanId.toString() === user._id.toString()
          );
          if (!hasArtisanItem) {
            return res.status(403).json({
              success: false,
              message: "You can only open support requests for orders containing your crafts.",
            });
          }
        }
        if (user.accountType === "industry" && orderDoc.customer.toString() !== user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "You can only open support tickets for orders assigned by your company.",
          });
        }
        verifiedOrderId = orderDoc._id;
        verifiedOrderNumber = orderDoc.orderNumber;
      }
    }

    // Format attachments safely
    const formattedAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
          url: typeof att === "string" ? att : att.url || "",
          name: att.name || "Attachment",
          fileType: att.fileType || "image/jpeg",
          size: att.size || 0,
          uploadedAt: new Date(),
        })).filter((att) => Boolean(att.url))
      : [];

    const ticket = new Ticket({
      user: user._id,
      userRole: user.accountType || "customer",
      userName: user.name || "User",
      userEmail: user.email || "",
      relatedOrder: verifiedOrderId,
      relatedOrderNumber: verifiedOrderNumber,
      relatedProject: relatedProject && mongoose.Types.ObjectId.isValid(relatedProject) ? relatedProject : null,
      relatedProduct: relatedProduct && mongoose.Types.ObjectId.isValid(relatedProduct) ? relatedProduct : null,
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      subject: subject.trim(),
      description: description.trim(),
      priority: ["Low", "Medium", "High", "Urgent"].includes(priority) ? priority : "Medium",
      status: "Open",
      attachments: formattedAttachments,
      history: [
        {
          status: "Open",
          changedBy: user._id,
          actorName: user.name,
          actorRole: user.accountType,
          note: "Ticket created by user.",
          timestamp: new Date(),
        },
      ],
    });

    await ticket.save();

    // Create initial message in TicketMessage
    await TicketMessage.create({
      ticket: ticket._id,
      sender: user._id,
      senderName: user.name,
      senderRole: user.accountType,
      senderAvatar: user.avatar || "",
      message: description.trim(),
      attachments: formattedAttachments,
    });

    // Notify user of ticket creation
    try {
      await Notification.create({
        recipient: user._id,
        type: "TICKET_CREATED",
        title: `Support Ticket Received: #${ticket.ticketId}`,
        message: `Your support request regarding "${ticket.subject}" has been received. Our team will review it shortly.`,
        orderId: verifiedOrderId || null,
        metadata: {
          ticketId: ticket.ticketId,
          category: ticket.category,
          status: ticket.status,
        },
      });
    } catch (notifErr) {
      console.warn("Ticket creation notification warning:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket: ticket.toSafeObject(),
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create support ticket.",
    });
  }
};

/**
 * @desc    Get tickets for logged-in user with filters
 * @route   GET /api/support/tickets
 * @access  Authenticated
 */
export const getMyTickets = async (req, res) => {
  try {
    const user = req.user;
    const { status, category, priority, page = 1, limit = 20 } = req.query;

    const filter = {};

    // Regular users see only their tickets; staff can view all if requested
    if (!isStaff(user) || req.query.selfOnly === "true") {
      filter.user = user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
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
    console.error("Get my tickets error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve support tickets.",
    });
  }
};

/**
 * @desc    Get single ticket with full message history
 * @route   GET /api/support/tickets/:id
 * @access  Ticket Owner OR Support/Admin Staff
 */
export const getTicketById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketId: id };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // Strict ownership verification
    const isOwner = ticket.user.toString() === user._id.toString();
    if (!isOwner && !isStaff(user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view another user's support ticket.",
      });
    }

    // Message query: omit internal notes for regular users
    const messageFilter = { ticket: ticket._id };
    if (!isStaff(user)) {
      messageFilter.isInternalNote = { $ne: true };
    }

    const messages = await TicketMessage.find(messageFilter).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      ticket: ticket.toSafeObject(),
      messages: messages.map((m) => m.toSafeObject()),
    });
  } catch (error) {
    console.error("Get ticket by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve ticket details.",
    });
  }
};

/**
 * @desc    Reply to a support ticket
 * @route   POST /api/support/tickets/:id/messages
 * @access  Ticket Owner OR Support Staff
 */
export const replyToTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { message, attachments = [], isInternalNote = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty.",
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketId: id };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    const isOwner = ticket.user.toString() === user._id.toString();
    const callerIsStaff = isStaff(user);

    if (!isOwner && !callerIsStaff) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You cannot reply to another user's ticket.",
      });
    }

    if (ticket.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "This ticket is closed. Please reopen it or create a new ticket to continue.",
      });
    }

    const formattedAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
          url: typeof att === "string" ? att : att.url || "",
          name: att.name || "Attachment",
          fileType: att.fileType || "image/jpeg",
          size: att.size || 0,
        })).filter((att) => Boolean(att.url))
      : [];

    const newMsg = await TicketMessage.create({
      ticket: ticket._id,
      sender: user._id,
      senderName: user.name,
      senderRole: user.accountType,
      senderAvatar: user.avatar || "",
      message: message.trim(),
      attachments: formattedAttachments,
      isInternalNote: callerIsStaff && Boolean(isInternalNote),
    });

    // Update ticket status
    if (!isInternalNote) {
      let statusChanged = false;
      let newStatus = ticket.status;

      if (callerIsStaff) {
        if (ticket.status === "Open" || ticket.status === "Under Review") {
          newStatus = "Waiting for User";
          statusChanged = true;
        }
      } else {
        if (ticket.status === "Waiting for User" || ticket.status === "Resolved") {
          newStatus = "Under Review";
          statusChanged = true;
        }
      }

      if (statusChanged) {
        ticket.status = newStatus;
        ticket.history.push({
          status: newStatus,
          changedBy: user._id,
          actorName: user.name,
          actorRole: user.accountType,
          note: callerIsStaff ? "Support replied." : "User replied.",
          timestamp: new Date(),
        });
      }

      ticket.updatedAt = new Date();
      await ticket.save();

      // Notifications
      if (callerIsStaff && !isOwner) {
        // Support replied -> notify ticket owner
        try {
          await Notification.create({
            recipient: ticket.user,
            sender: user._id,
            type: "TICKET_REPLIED",
            title: `Support Team Replied: #${ticket.ticketId}`,
            message: `A support agent replied to your request: "${message.slice(0, 100)}..."`,
            metadata: {
              ticketId: ticket.ticketId,
              senderName: user.name,
            },
          });
        } catch (e) {
          console.warn("Support reply notification warning:", e.message);
        }
      } else if (!callerIsStaff && ticket.assignedTo) {
        // User replied -> notify assigned handler
        try {
          await Notification.create({
            recipient: ticket.assignedTo,
            sender: user._id,
            type: "TICKET_REPLIED",
            title: `User Response: #${ticket.ticketId}`,
            message: `${user.name} submitted a response on ticket #${ticket.ticketId}.`,
            metadata: {
              ticketId: ticket.ticketId,
              senderName: user.name,
            },
          });
        } catch (e) {
          console.warn("User reply notification warning:", e.message);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      reply: newMsg.toSafeObject(),
      ticketStatus: ticket.status,
    });
  } catch (error) {
    console.error("Reply to ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to post reply.",
    });
  }
};

/**
 * @desc    Close a resolved ticket
 * @route   PATCH /api/support/tickets/:id/close
 * @access  Ticket Owner OR Staff
 */
export const closeTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { note = "Ticket closed by user." } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketId: id };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const isOwner = ticket.user.toString() === user._id.toString();
    if (!isOwner && !isStaff(user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    ticket.status = "Closed";
    ticket.closedAt = new Date();
    ticket.history.push({
      status: "Closed",
      changedBy: user._id,
      actorName: user.name,
      actorRole: user.accountType,
      note,
      timestamp: new Date(),
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket closed successfully.",
      ticket: ticket.toSafeObject(),
    });
  } catch (error) {
    console.error("Close ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to close ticket.",
    });
  }
};

/**
 * @desc    Reopen a resolved or closed ticket
 * @route   PATCH /api/support/tickets/:id/reopen
 * @access  Ticket Owner
 */
export const reopenTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please state why the problem remains unresolved.",
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketId: id };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const isOwner = ticket.user.toString() === user._id.toString();
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the ticket creator can reopen this ticket.",
      });
    }

    if (!["Resolved", "Closed"].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `Ticket is already "${ticket.status}". Only Resolved or Closed tickets can be reopened.`,
      });
    }

    // Limit check: maximum 3 reopens
    if ((ticket.reopenCount || 0) >= 3) {
      return res.status(400).json({
        success: false,
        message:
          "This ticket has reached the maximum reopen limit (3). Please open a new ticket with your updated issue details.",
      });
    }

    // Reasonable time limit: within 14 days of resolution/closing
    const closedDate = ticket.closedAt || ticket.resolvedAt || ticket.updatedAt;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    if (closedDate && Date.now() - new Date(closedDate).getTime() > fourteenDaysMs) {
      return res.status(400).json({
        success: false,
        message:
          "This ticket was closed over 14 days ago and cannot be reopened. Please submit a new support request.",
      });
    }

    ticket.reopenCount = (ticket.reopenCount || 0) + 1;
    ticket.status = "Under Review";
    ticket.closedAt = null;
    ticket.resolvedAt = null;

    ticket.history.push({
      status: "Under Review",
      changedBy: user._id,
      actorName: user.name,
      actorRole: user.accountType,
      note: `Ticket reopened (Attempt ${ticket.reopenCount}): ${reason.trim()}`,
      timestamp: new Date(),
    });

    await ticket.save();

    // Create message for reopen reason
    await TicketMessage.create({
      ticket: ticket._id,
      sender: user._id,
      senderName: user.name,
      senderRole: user.accountType,
      senderAvatar: user.avatar || "",
      message: `[Ticket Reopened]: ${reason.trim()}`,
      attachments: [],
    });

    return res.status(200).json({
      success: true,
      message: "Ticket has been successfully reopened for review.",
      ticket: ticket.toSafeObject(),
    });
  } catch (error) {
    console.error("Reopen ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reopen ticket.",
    });
  }
};

/**
 * @desc    Rate support experience after resolution
 * @route   POST /api/support/tickets/:id/rate
 * @access  Ticket Owner
 */
export const rateTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { score, feedback = "" } = req.body;

    const numericScore = Number(score);
    if (!numericScore || numericScore < 1 || numericScore > 5) {
      return res.status(400).json({
        success: false,
        message: "Please choose a satisfaction rating from 1 to 5 stars.",
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { ticketId: id };

    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const isOwner = ticket.user.toString() === user._id.toString();
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "Only the ticket creator can rate this support experience.",
      });
    }

    ticket.rating = {
      score: numericScore,
      feedback: feedback ? feedback.trim() : "",
      ratedAt: new Date(),
    };

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Thank you for rating your support experience!",
      rating: ticket.rating,
    });
  } catch (error) {
    console.error("Rate ticket error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record rating.",
    });
  }
};

/**
 * @desc    Upload attachments/evidence files for support tickets, disputes, or reviews
 * @route   POST /api/support/upload
 * @access  Authenticated
 */
export const uploadSupportAttachments = async (req, res) => {
  try {
    const rawFiles = req.files || (req.file ? [req.file] : []);

    const base64List = Array.isArray(req.body?.images)
      ? req.body.images
      : req.body?.imageBase64
      ? [req.body.imageBase64]
      : [];

    if (rawFiles.length === 0 && base64List.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded.",
      });
    }

    const uploadedList = [];
    const destDir = "./public/uploads/support";
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Process multipart files
    for (const file of rawFiles) {
      let finalUrl = "";

      // Try Cloudinary if configured
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const cloudRes = await uploadOnCloudinary(file.path, {
            folder: "skillbridge/support",
          });
          if (cloudRes?.secure_url) {
            finalUrl = cloudRes.secure_url;
          }
        } catch (cloudErr) {
          console.warn("Cloudinary upload failed, fallback to local:", cloudErr.message);
        }
      }

      // If Cloudinary failed or not configured, store in public/uploads/support
      if (!finalUrl) {
        const ext = path.extname(file.originalname) || ".jpg";
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const targetPath = path.join(destDir, filename);
        if (file.path && fs.existsSync(file.path)) {
          fs.copyFileSync(file.path, targetPath);
          try {
            fs.unlinkSync(file.path);
          } catch (_) {}
        }
        finalUrl = `/uploads/support/${filename}`;
      }

      uploadedList.push({
        url: finalUrl,
        name: file.originalname || "Attachment",
        fileType: file.mimetype || "image/jpeg",
        size: file.size || 0,
      });
    }

    // Process base64 files if sent
    for (let i = 0; i < base64List.length; i++) {
      const item = base64List[i];
      if (!item || typeof item !== "string") continue;

      let finalUrl = "";
      if (item.startsWith("http://") || item.startsWith("https://") || item.startsWith("/uploads/")) {
        finalUrl = item;
      } else if (item.startsWith("data:")) {
        const extMatch = item.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
        const ext = extMatch ? `.${extMatch[1]}` : ".jpg";
        const filename = `b64-${Date.now()}-${i}${ext}`;
        const targetPath = path.join(destDir, filename);
        const dataPart = item.replace(/^data:([A-Za-z-+/]+);base64,/, "");
        fs.writeFileSync(targetPath, Buffer.from(dataPart, "base64"));
        finalUrl = `/uploads/support/${filename}`;
      }

      if (finalUrl) {
        uploadedList.push({
          url: finalUrl,
          name: `Image_${i + 1}`,
          fileType: "image/jpeg",
          size: item.length,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${uploadedList.length} file(s) processed successfully.`,
      files: uploadedList,
    });
  } catch (error) {
    console.error("Support file upload error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process uploaded files.",
    });
  }
};
