import { Report } from "../models/report.model.js";

/**
 * @desc    Submit a report against a user, listing, or order
 * @route   POST /api/reports
 * @access  Authenticated
 */
export const createReport = async (req, res) => {
  try {
    const user = req.user;
    const {
      targetType,
      targetId,
      targetTitle = "",
      reason,
      description,
      evidence = [],
    } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: "Target type, target ID, reason, and description are required.",
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least 10 characters explaining your concern.",
      });
    }

    const formattedEvidence = Array.isArray(evidence)
      ? evidence.filter((e) => typeof e === "string" && e.trim() !== "").slice(0, 5)
      : [];

    const report = new Report({
      reporter: user._id,
      reporterRole: user.accountType || "customer",
      reporterName: user.name || "User",
      targetType,
      targetId: String(targetId),
      targetTitle: targetTitle.trim(),
      reason,
      description: description.trim(),
      evidence: formattedEvidence,
      status: "Pending",
    });

    await report.save();

    return res.status(201).json({
      success: true,
      message: "Thank you for helping keep SkillBridge safe. Your report has been submitted for moderation review.",
      report: report.toSafeObject(),
    });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit report.",
    });
  }
};

/**
 * @desc    Get reports submitted by current user
 * @route   GET /api/reports/my-reports
 * @access  Authenticated
 */
export const getMyReports = async (req, res) => {
  try {
    const user = req.user;
    const reports = await Report.find({ reporter: user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      reports: reports.map((r) => r.toSafeObject()),
    });
  } catch (error) {
    console.error("Get my reports error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve reports.",
    });
  }
};
