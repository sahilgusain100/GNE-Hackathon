import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const staffFields = (user) => ({
  ...user.toSafeObject(),
  isActive: user.isActive !== false,
});

export const listStaff = async (req, res) => {
  try {
    const staff = await User.find({ accountType: "support" })
      .sort({ createdAt: -1 })
      .select("-password -verificationToken");

    return res.status(200).json({
      success: true,
      staff: staff.map(staffFields),
    });
  } catch (error) {
    console.error("List support staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load support staff.",
    });
  }
};

export const createStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "A staff name and valid email address are required.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Staff passwords must be at least 8 characters long.",
      });
    }

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({
        success: false,
        message: "An account already uses this email address.",
      });
    }

    const staffUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      accountType: "support",
      isVerified: true,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Support staff account created.",
      staff: staffFields(staffUser),
    });
  } catch (error) {
    console.error("Create support staff error:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account already uses this email address.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Unable to create support staff account.",
    });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, isActive } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid staff account ID." });
    }

    const staffUser = await User.findOne({ _id: id, accountType: "support" });
    if (!staffUser) {
      return res.status(404).json({ success: false, message: "Support staff account not found." });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Staff name cannot be empty." });
      }
      staffUser.name = name.trim();
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Staff passwords must be at least 8 characters long.",
        });
      }
      staffUser.password = password;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, message: "isActive must be a boolean." });
      }
      staffUser.isActive = isActive;
    }

    await staffUser.save();
    return res.status(200).json({
      success: true,
      message: "Support staff account updated.",
      staff: staffFields(staffUser),
    });
  } catch (error) {
    console.error("Update support staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update support staff account.",
    });
  }
};
