import path from "path";
import fs from "fs";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { resolveExistingAadhaarPath } from "./admin-verification.controller.js";

const PRIVATE_AADHAAR_DIR = path.resolve("private_uploads/aadhaar");

// Ensure secure private directory exists
if (!fs.existsSync(PRIVATE_AADHAAR_DIR)) {
  fs.mkdirSync(PRIVATE_AADHAAR_DIR, { recursive: true });
}

/**
 * Validate Aadhaar image file
 */
function validateImageFile(file) {
  if (!file) return "File is required.";
  const allowedMime = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowedMime.includes(file.mimetype.toLowerCase())) {
    return "Invalid file format. Only JPG, JPEG, and PNG images are supported.";
  }
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return "File size exceeds 5MB limit. Please upload a smaller image.";
  }
  return null;
}

/**
 * Move uploaded file from temp storage to private Aadhaar directory
 */
function storePrivateAadhaarImage(file, side, userId) {
  const ext = path.extname(file.originalname) || ".jpg";
  const safeFilename = `aadhaar_${userId}_${side}_${Date.now()}${ext}`;
  const targetPath = path.join(PRIVATE_AADHAAR_DIR, safeFilename);

  fs.copyFileSync(file.path, targetPath);
  try {
    fs.unlinkSync(file.path);
  } catch (_) {}

  return {
    storedPath: targetPath,
    filename: safeFilename,
    originalName: file.originalname || `Aadhaar_${side}`,
  };
}

/**
 * @desc    Upload Aadhaar Front & Back documents with explicit consent
 * @route   POST /api/artisan/verification/upload
 * @access  Private (Artisan)
 */
export const uploadAadhaarDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.accountType !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only artisan accounts can submit verification documents.",
      });
    }

    if (!req.files || !req.files.front || !req.files.back) {
      return res.status(400).json({
        success: false,
        message: "Both Aadhaar front-side and back-side photographs are mandatory.",
      });
    }

    const frontFile = req.files.front[0];
    const backFile = req.files.back[0];

    const frontErr = validateImageFile(frontFile);
    if (frontErr) {
      return res.status(400).json({ success: false, message: `Front image: ${frontErr}` });
    }

    const backErr = validateImageFile(backFile);
    if (backErr) {
      return res.status(400).json({ success: false, message: `Back image: ${backErr}` });
    }

    const consentGiven =
      req.body.consentGiven === "true" ||
      req.body.consentGiven === true ||
      req.body.consent === "true" ||
      req.body.consent === true;
    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        message: "Explicit consent is required to submit your Aadhaar document for identity verification.",
      });
    }

    // Clean up previous private document files if present
    if (user.aadhaarVerification?.frontImage && fs.existsSync(user.aadhaarVerification.frontImage)) {
      try {
        fs.unlinkSync(user.aadhaarVerification.frontImage);
      } catch (_) {}
    }
    if (user.aadhaarVerification?.backImage && fs.existsSync(user.aadhaarVerification.backImage)) {
      try {
        fs.unlinkSync(user.aadhaarVerification.backImage);
      } catch (_) {}
    }

    // Store new files in private directory
    const storedFront = storePrivateAadhaarImage(frontFile, "front", user._id);
    const storedBack = storePrivateAadhaarImage(backFile, "back", user._id);

    const prevVerificationStatus = user.verificationStatus || "Not Submitted";

    user.verificationStatus = "Pending";
    user.aadhaarVerification = {
      ...(user.aadhaarVerification || {}),
      isSubmitted: true,
      frontImage: storedFront.storedPath,
      backImage: storedBack.storedPath,
      frontOriginalName: storedFront.originalName,
      backOriginalName: storedBack.originalName,
      submittedAt: new Date(),
      rejectionReason: "", // Clear previous rejection reason upon resubmission
      consentGiven: true,
      consentTimestamp: new Date(),
    };

    // Append to audit logs
    user.moderationAuditLogs = user.moderationAuditLogs || [];
    user.moderationAuditLogs.push({
      action: "DOCUMENTS_SUBMITTED",
      performedBy: user._id,
      performedByName: user.name,
      performedByRole: "artisan",
      reason: "Artisan submitted Aadhaar front and back documents for identity verification.",
      previousVerificationStatus: prevVerificationStatus,
      newVerificationStatus: "Pending",
      previousAccountStatus: user.accountStatus || "Active",
      newAccountStatus: user.accountStatus || "Active",
      timestamp: new Date(),
    });

    await user.save();

    // Create in-app notification for the artisan
    await Notification.create({
      recipient: user._id,
      sender: user._id,
      type: "VERIFICATION_SUBMITTED",
      title: "Aadhaar Documents Submitted 📄",
      message: "Your Aadhaar front and back documents have been securely received. Our administration team will review your verification request shortly.",
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Aadhaar documents submitted successfully. Verification status is now Pending.",
      user: user.toSafeObject(false),
    });
  } catch (error) {
    console.error("Upload Aadhaar error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit Aadhaar documents.",
    });
  }
};

/**
 * @desc    Get current verification & account moderation status
 * @route   GET /api/artisan/verification/status
 * @access  Private (Artisan)
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      verificationStatus: user.verificationStatus || (user.isVerified ? "Verified" : "Not Submitted"),
      accountStatus: user.accountStatus || (user.isActive === false ? "Deactivated" : "Active"),
      aadhaarVerification: user.toSafeObject(false).aadhaarVerification,
      appeal: user.appeal || { status: "None" },
      isVerified: user.verificationStatus === "Verified",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Securely stream artisan's own uploaded Aadhaar document image
 * @route   GET /api/artisan/verification/document/:side
 * @access  Private (Artisan)
 */
export const getArtisanAadhaarDocument = async (req, res) => {
  try {
    const { side } = req.params;
    if (side !== "front" && side !== "back") {
      return res.status(400).json({ success: false, message: "Invalid document side. Must be 'front' or 'back'." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const rawPath = side === "front"
      ? user.aadhaarVerification?.frontImage
      : user.aadhaarVerification?.backImage;

    const resolvedPath = resolveExistingAadhaarPath(rawPath, side, user._id);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: `No ${side} Aadhaar document found on server.`,
      });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    return fs.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    console.error("Stream artisan Aadhaar document error:", error);
    return res.status(500).json({ success: false, message: "Failed to load document." });
  }
};

/**
 * @desc    Submit appeal for a suspended artisan account
 * @route   POST /api/artisan/appeal
 * @access  Private (Suspended Artisan)
 */
export const submitArtisanAppeal = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.accountType !== "artisan") {
      return res.status(403).json({ success: false, message: "Only artisan accounts can submit appeals." });
    }

    if (user.accountStatus !== "Suspended") {
      return res.status(400).json({
        success: false,
        message: "Appeals can only be submitted for suspended accounts.",
      });
    }

    const { explanation = "" } = req.body;
    const cleanExplanation = String(explanation).trim().slice(0, 1500);

    if (!cleanExplanation || cleanExplanation.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed explanation of at least 20 characters for your appeal.",
      });
    }

    // Prevent duplicate active appeals while under review
    if (user.appeal?.status === "Submitted" || user.appeal?.status === "Under Review") {
      return res.status(400).json({
        success: false,
        message: "You already have an active appeal currently under review by our administration.",
      });
    }

    user.appeal = {
      status: "Submitted",
      explanation: cleanExplanation,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewedByName: "",
      adminResponse: "",
    };

    user.moderationAuditLogs = user.moderationAuditLogs || [];
    user.moderationAuditLogs.push({
      action: "APPEAL_SUBMITTED",
      performedBy: user._id,
      performedByName: user.name,
      performedByRole: "artisan",
      reason: cleanExplanation || "Artisan submitted request for account review and restoration.",
      previousVerificationStatus: user.verificationStatus,
      newVerificationStatus: user.verificationStatus,
      previousAccountStatus: user.accountStatus,
      newAccountStatus: user.accountStatus,
      timestamp: new Date(),
    });

    await user.save();

    // Create confirmation notification
    await Notification.create({
      recipient: user._id,
      sender: user._id,
      type: "APPEAL_SUBMITTED",
      title: "Appeal Received ⚖️",
      message: "Your appeal for account review has been submitted to the SkillBridge Admin Team. We will review your request thoroughly.",
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Your review request has been submitted to SkillBridge administration.",
      appeal: user.appeal,
      user: user.toSafeObject(false),
    });
  } catch (error) {
    console.error("Submit appeal error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to submit appeal." });
  }
};

/**
 * @desc    Get appeal status
 * @route   GET /api/artisan/appeal/status
 * @access  Private (Artisan)
 */
export const getArtisanAppealStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      appeal: user.appeal || { status: "None" },
      accountStatus: user.accountStatus || "Active",
      suspensionReason: user.aadhaarVerification?.suspensionReason || "",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
