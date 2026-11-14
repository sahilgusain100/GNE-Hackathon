import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Notification } from "../models/notification.model.js";

/**
 * Robust helper to locate Aadhaar photograph across potential project working directories
 */
export function resolveExistingAadhaarPath(rawPath, side, userId) {
  if (!rawPath && !userId) return null;

  // 1. Direct check
  if (rawPath && fs.existsSync(rawPath)) {
    return rawPath;
  }

  // 2. Resolve relative to cwd
  if (rawPath) {
    try {
      const resolved = path.resolve(rawPath);
      if (fs.existsSync(resolved)) return resolved;
    } catch (_) {}
  }

  // 3. Search common candidate directory roots
  const candidateDirs = [
    path.resolve("private_uploads/aadhaar"),
    path.resolve("backend/private_uploads/aadhaar"),
    path.resolve("../private_uploads/aadhaar"),
    path.resolve("../backend/private_uploads/aadhaar"),
    path.join(process.cwd(), "private_uploads/aadhaar"),
    path.join(process.cwd(), "backend/private_uploads/aadhaar"),
    "C:\\GNE-Hackathon\\private_uploads\\aadhaar",
    "C:\\GNE-Hackathon\\backend\\private_uploads\\aadhaar",
  ];

  // Check filename in candidates
  if (rawPath) {
    const filename = path.basename(rawPath);
    for (const dir of candidateDirs) {
      const full = path.join(dir, filename);
      if (fs.existsSync(full)) return full;
    }
  }

  // 4. Fallback search by userId and side pattern: aadhaar_<userId>_<side>_*
  if (userId) {
    const uid = userId.toString();
    const prefix = `aadhaar_${uid}_${side}_`;
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          const matches = files
            .filter((f) => f.startsWith(prefix) || (f.includes(uid) && f.includes(`_${side}_`)))
            .sort()
            .reverse();
          if (matches.length > 0) {
            return path.join(dir, matches[0]);
          }
        } catch (_) {}
      }
    }
  }

  return null;
}

/**
 * @desc    Get artisan verification queue with filters, search, and metrics
 * @route   GET /api/admin/support/artisan-verification/queue
 * @access  Admin / Support Staff
 */
export const getArtisansVerificationQueue = async (req, res) => {
  try {
    const {
      status = "all",
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const baseFilter = { accountType: "artisan" };

    if (status && status !== "all") {
      if (status === "Suspended") {
        baseFilter.accountStatus = "Suspended";
      } else if (status === "Appeals") {
        baseFilter["appeal.status"] = "Submitted";
      } else {
        baseFilter.verificationStatus = status;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      const isObjectId = mongoose.Types.ObjectId.isValid(search.trim());
      baseFilter.$or = [
        { name: regex },
        { email: regex },
        { city: regex },
        { phone: regex },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(search.trim()) }] : []),
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [
      artisans,
      total,
      totalArtisansCount,
      pendingCount,
      verifiedCount,
      rejectedCount,
      underReviewCount,
      suspendedCount,
      activeAppealsCount,
    ] = await Promise.all([
      User.find(baseFilter)
        .sort({ "aadhaarVerification.submittedAt": -1, updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(baseFilter),
      User.countDocuments({ accountType: "artisan" }),
      User.countDocuments({ accountType: "artisan", verificationStatus: "Pending" }),
      User.countDocuments({ accountType: "artisan", verificationStatus: "Verified" }),
      User.countDocuments({ accountType: "artisan", verificationStatus: "Rejected" }),
      User.countDocuments({ accountType: "artisan", verificationStatus: "Under Review" }),
      User.countDocuments({ accountType: "artisan", accountStatus: "Suspended" }),
      User.countDocuments({ accountType: "artisan", "appeal.status": "Submitted" }),
    ]);

    return res.status(200).json({
      success: true,
      artisans: artisans.map((u) => {
        const safe = u.toSafeObject(true);
        if (safe.aadhaarVerification) {
          const front = resolveExistingAadhaarPath(u.aadhaarVerification?.frontImage, "front", u._id);
          const back = resolveExistingAadhaarPath(u.aadhaarVerification?.backImage, "back", u._id);
          safe.aadhaarVerification.hasFrontImage = Boolean(front);
          safe.aadhaarVerification.hasBackImage = Boolean(back);
          safe.aadhaarVerification.frontImage = Boolean(front);
          safe.aadhaarVerification.backImage = Boolean(back);
        }
        return safe;
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
      counts: {
        total: totalArtisansCount,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        underReview: underReviewCount,
        suspended: suspendedCount,
        activeAppeals: activeAppealsCount,
        appeals: activeAppealsCount,
      },
    });
  } catch (error) {
    console.error("Get verification queue error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load verification queue.",
    });
  }
};

/**
 * @desc    Get detailed verification profile for an artisan
 * @route   GET /api/admin/support/artisan-verification/:id
 * @access  Admin / Support Staff
 */
export const getArtisanVerificationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const artisan = await User.findById(id);

    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan not found." });
    }

    const safeArtisan = artisan.toSafeObject(true);

    // Verify physical file resolution across environments
    const frontPath = resolveExistingAadhaarPath(artisan.aadhaarVerification?.frontImage, "front", artisan._id);
    const backPath = resolveExistingAadhaarPath(artisan.aadhaarVerification?.backImage, "back", artisan._id);

    if (safeArtisan.aadhaarVerification) {
      safeArtisan.aadhaarVerification.hasFrontImage = Boolean(frontPath);
      safeArtisan.aadhaarVerification.hasBackImage = Boolean(backPath);
      safeArtisan.aadhaarVerification.frontImage = Boolean(frontPath);
      safeArtisan.aadhaarVerification.backImage = Boolean(backPath);
    }

    return res.status(200).json({
      success: true,
      artisan: safeArtisan,
    });
  } catch (error) {
    console.error("Get artisan verification detail error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Securely stream Aadhaar document for Admin review
 * @route   GET /api/admin/support/artisan-verification/:id/document/:side
 * @access  Admin / Support Staff
 */
export const getAdminAadhaarDocument = async (req, res) => {
  try {
    const { id, side } = req.params;
    if (side !== "front" && side !== "back") {
      return res.status(400).json({ success: false, message: "Invalid side. Must be 'front' or 'back'." });
    }

    const artisan = await User.findById(id);
    if (!artisan) {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const rawPath = side === "front"
      ? artisan.aadhaarVerification?.frontImage
      : artisan.aadhaarVerification?.backImage;

    const resolvedPath = resolveExistingAadhaarPath(rawPath, side, artisan._id);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: `No ${side} document photograph available on server for this artisan.`,
      });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    return fs.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    console.error("Admin stream Aadhaar document error:", error);
    return res.status(500).json({ success: false, message: "Failed to load document." });
  }
};

/**
 * @desc    Approve artisan verification
 * @route   POST /api/admin/support/artisan-verification/:id/approve
 * @access  Admin / Support Staff
 */
export const approveArtisanVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { internalNotes = "" } = req.body;

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const prevVerif = artisan.verificationStatus;
    const prevAcct = artisan.accountStatus;

    artisan.verificationStatus = "Verified";
    artisan.isVerified = true;
    artisan.accountStatus = "Active";
    artisan.isActive = true;

    artisan.aadhaarVerification = {
      ...(artisan.aadhaarVerification || {}),
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedByName: req.user.name,
      rejectionReason: "",
      suspensionReason: "",
      internalNotes: internalNotes.trim(),
    };

    // If an appeal was active, mark approved
    if (artisan.appeal?.status === "Submitted" || artisan.appeal?.status === "Under Review") {
      artisan.appeal.status = "Approved";
      artisan.appeal.reviewedAt = new Date();
      artisan.appeal.reviewedBy = req.user._id;
      artisan.appeal.reviewedByName = req.user.name;
      artisan.appeal.adminResponse = "Verification approved by administration.";
    }

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "VERIFICATION_APPROVED",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: "Artisan Aadhaar documents inspected and approved by administrator.",
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: prevVerif,
      newVerificationStatus: "Verified",
      previousAccountStatus: prevAcct,
      newAccountStatus: "Active",
      timestamp: new Date(),
    });

    await artisan.save();

    // Notify artisan
    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "VERIFICATION_APPROVED",
      title: "Aadhaar Identity Verified! 🌟",
      message: "Congratulations! Your Aadhaar identity verification has been approved. You now display the Verified Artisan trust badge across SkillBridge.",
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Artisan ${artisan.name} has been verified and set to Active status.`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Approve artisan verification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Reject artisan verification with mandatory reason
 * @route   POST /api/admin/support/artisan-verification/:id/reject
 * @access  Admin / Support Staff
 */
export const rejectArtisanVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, internalNotes = "" } = req.body;

    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "A clear rejection reason of at least 5 characters is mandatory.",
      });
    }

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const prevVerif = artisan.verificationStatus;

    artisan.verificationStatus = "Rejected";
    artisan.isVerified = false;

    artisan.aadhaarVerification = {
      ...(artisan.aadhaarVerification || {}),
      rejectionReason: reason.trim(),
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedByName: req.user.name,
      internalNotes: internalNotes.trim(),
    };

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "VERIFICATION_REJECTED",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: prevVerif,
      newVerificationStatus: "Rejected",
      previousAccountStatus: artisan.accountStatus || "Active",
      newAccountStatus: artisan.accountStatus || "Active",
      timestamp: new Date(),
    });

    await artisan.save();

    // Notify artisan with rejection reason
    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "VERIFICATION_REJECTED",
      title: "Aadhaar Verification Requires Correction",
      message: `Your document verification could not be approved. Reason: "${reason.trim()}". Please upload clear, readable photographs in your profile to resubmit.`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Verification rejected for ${artisan.name}. Reason: ${reason.trim()}`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Reject artisan verification error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark artisan as suspicious and temporarily freeze account
 * @route   POST /api/admin/support/artisan-verification/:id/mark-suspicious
 * @access  Admin / Support Staff
 */
export const markArtisanSuspicious = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, internalNotes = "" } = req.body;

    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "A detailed suspension reason of at least 5 characters is mandatory.",
      });
    }

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const prevVerif = artisan.verificationStatus;
    const prevAcct = artisan.accountStatus;

    artisan.verificationStatus = "Under Review";
    artisan.accountStatus = "Suspended";
    artisan.isVerified = false;

    artisan.aadhaarVerification = {
      ...(artisan.aadhaarVerification || {}),
      suspensionReason: reason.trim(),
      suspendedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedByName: req.user.name,
      internalNotes: internalNotes.trim(),
    };

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "MARKED_SUSPICIOUS",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: prevVerif,
      newVerificationStatus: "Under Review",
      previousAccountStatus: prevAcct,
      newAccountStatus: "Suspended",
      timestamp: new Date(),
    });

    await artisan.save();

    // Immediately remove and unpublish all products from the marketplace
    await Product.updateMany(
      { artisan: artisan._id },
      { $set: { status: "Draft", isPublished: false, moderationPaused: true } }
    );

    // Notify artisan of temporary suspension
    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "ACCOUNT_SUSPENDED",
      title: "Account Temporarily Suspended",
      message: `Your SkillBridge account has temporarily been restricted and is currently under review. Reason: "${reason.trim()}". You can request an appeal review from your dashboard or contact our support team.`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Artisan ${artisan.name} marked as suspicious. Account is now Suspended and Under Review.`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Mark suspicious error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Restore suspended artisan account to Active status
 * @route   POST /api/admin/support/artisan-verification/:id/restore
 * @access  Admin / Support Staff
 */
export const restoreArtisanAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      verificationStatus = "Verified",
      internalNotes = "",
      adminResponse = "Account restored after administrative investigation.",
    } = req.body;

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const prevVerif = artisan.verificationStatus;
    const prevAcct = artisan.accountStatus;

    artisan.accountStatus = "Active";
    artisan.isActive = true;
    artisan.verificationStatus = verificationStatus;
    artisan.isVerified = verificationStatus === "Verified";

    artisan.aadhaarVerification = {
      ...(artisan.aadhaarVerification || {}),
      suspensionReason: "",
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedByName: req.user.name,
      internalNotes: internalNotes.trim(),
    };

    if (artisan.appeal?.status === "Submitted" || artisan.appeal?.status === "Under Review") {
      artisan.appeal.status = "Approved";
      artisan.appeal.reviewedAt = new Date();
      artisan.appeal.reviewedBy = req.user._id;
      artisan.appeal.reviewedByName = req.user.name;
      artisan.appeal.adminResponse = adminResponse.trim();
    }

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "ACCOUNT_RESTORED",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: adminResponse.trim(),
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: prevVerif,
      newVerificationStatus: artisan.verificationStatus,
      previousAccountStatus: prevAcct,
      newAccountStatus: "Active",
      timestamp: new Date(),
    });

    await artisan.save();

    // Clear moderation paused flag on artisan's products
    await Product.updateMany(
      { artisan: artisan._id },
      { $unset: { moderationPaused: "" } }
    );

    // Notify artisan of restoration
    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "ACCOUNT_RESTORED",
      title: "Account Restored! ✨",
      message: "Your SkillBridge artisan account has been cleared and restored to Active status. All marketplace and order capabilities are once again available.",
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Artisan ${artisan.name} account successfully restored to Active status.`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Restore artisan error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Review and decide on an artisan appeal
 * @route   POST /api/admin/support/artisan-verification/:id/appeal-review
 * @access  Admin / Support Staff
 */
export const reviewArtisanAppeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, adminResponse, response, internalNotes = "" } = req.body;
    const finalResponse = adminResponse || response || "";

    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'approve' or 'reject'." });
    }

    if (!finalResponse || String(finalResponse).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "An explanation of at least 5 characters is mandatory for the appeal decision.",
      });
    }

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    if (decision === "approve") {
      req.body.adminResponse = finalResponse.trim();
      return await restoreArtisanAccount(req, res);
    }

    // Decision === "reject"
    artisan.appeal = {
      ...(artisan.appeal || {}),
      status: "Rejected",
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      reviewedByName: req.user.name,
      adminResponse: finalResponse.trim(),
    };

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "APPEAL_REJECTED",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: finalResponse.trim(),
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: artisan.verificationStatus,
      newVerificationStatus: artisan.verificationStatus,
      previousAccountStatus: artisan.accountStatus,
      newAccountStatus: artisan.accountStatus,
      timestamp: new Date(),
    });

    await artisan.save();

    // Notify artisan of rejected appeal
    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "APPEAL_DECISION",
      title: "Appeal Decision: Request Declined",
      message: `Your account appeal was reviewed by administration and could not be approved at this time. Explanation: "${adminResponse.trim()}".`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Appeal for ${artisan.name} rejected.`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Review appeal error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Permanently deactivate an artisan account
 * @route   POST /api/admin/support/artisan-verification/:id/deactivate
 * @access  Admin Only
 */
export const deactivateArtisanAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, internalNotes = "" } = req.body;

    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "A deactivation reason of at least 5 characters is mandatory.",
      });
    }

    const artisan = await User.findById(id);
    if (!artisan || artisan.accountType !== "artisan") {
      return res.status(404).json({ success: false, message: "Artisan account not found." });
    }

    const prevVerif = artisan.verificationStatus;
    const prevAcct = artisan.accountStatus;

    artisan.accountStatus = "Deactivated";
    artisan.isActive = false;
    artisan.isVerified = false;

    artisan.moderationAuditLogs = artisan.moderationAuditLogs || [];
    artisan.moderationAuditLogs.push({
      action: "ACCOUNT_DEACTIVATED",
      performedBy: req.user._id,
      performedByName: req.user.name,
      performedByRole: req.user.accountType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim(),
      previousVerificationStatus: prevVerif,
      newVerificationStatus: artisan.verificationStatus,
      previousAccountStatus: prevAcct,
      newAccountStatus: "Deactivated",
      timestamp: new Date(),
    });

    await artisan.save();

    // Immediately remove and permanently unpublish all products from marketplace
    await Product.updateMany(
      { artisan: artisan._id },
      { $set: { status: "Draft", isPublished: false, moderationPaused: true } }
    );

    await Notification.create({
      recipient: artisan._id,
      sender: req.user._id,
      type: "ACCOUNT_DEACTIVATED",
      title: "Account Deactivated",
      message: `Your SkillBridge account has been deactivated. Reason: "${reason.trim()}".`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Artisan ${artisan.name} has been permanently deactivated.`,
      artisan: artisan.toSafeObject(true),
    });
  } catch (error) {
    console.error("Deactivate artisan error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
