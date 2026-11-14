import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    accountType: {
      type: String,
      enum: ["customer", "artisan", "expert", "industry", "admin", "support"],
      default: "customer",
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    // Artisan specific fields
    artCategory: {
      type: String,
      trim: true,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: String,
      trim: true,
      default: "",
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    languages: {
      type: [String],
      default: ["English", "Hindi", "Punjabi"],
    },
    // Expert specific fields
    expertise: {
      type: String,
      trim: true,
      default: "",
    },
    // Industry specific fields
    contactName: {
      type: String,
      trim: true,
      default: "",
    },
    industry: {
      type: String,
      trim: true,
      default: "",
    },
    companyAddress: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["Not Submitted", "Pending", "Verified", "Rejected", "Under Review"],
      default: "Not Submitted",
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ["Active", "Suspended", "Deactivated"],
      default: "Active",
      index: true,
    },
    aadhaarVerification: {
      frontImage: { type: String, default: "" },
      backImage: { type: String, default: "" },
      frontOriginalName: { type: String, default: "" },
      backOriginalName: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedByName: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      suspensionReason: { type: String, default: "" },
      suspendedAt: { type: Date, default: null },
      internalNotes: { type: String, default: "" },
      consentGiven: { type: Boolean, default: false },
      consentTimestamp: { type: Date, default: null },
    },
    appeal: {
      status: {
        type: String,
        enum: ["None", "Submitted", "Under Review", "Approved", "Rejected"],
        default: "None",
        index: true,
      },
      explanation: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedByName: { type: String, default: "" },
      adminResponse: { type: String, default: "" },
    },
    moderationAuditLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        performedByName: { type: String, default: "System" },
        performedByRole: { type: String, default: "system" },
        reason: { type: String, default: "" },
        internalNotes: { type: String, default: "" },
        previousVerificationStatus: { type: String },
        newVerificationStatus: { type: String },
        previousAccountStatus: { type: String },
        newAccountStatus: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT access token
userSchema.methods.generateAccessToken = function () {
  const secret = process.env.JWT_SECRET || "byteforce_super_secret_jwt_key_2026";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    {
      _id: this._id,
      id: this._id,
      email: this.email,
      name: this.name,
      accountType: this.accountType,
    },
    secret,
    { expiresIn }
  );
};

// Transform to safe user object for responses
userSchema.methods.toSafeObject = function (isAdmin = false) {
  const vStatus = this.verificationStatus || (this.isVerified ? "Verified" : "Not Submitted");
  const aStatus = this.accountStatus || (this.isActive === false ? "Deactivated" : "Active");

  const safeAadhaar = this.aadhaarVerification
    ? {
        hasFrontImage: Boolean(this.aadhaarVerification.frontImage),
        hasBackImage: Boolean(this.aadhaarVerification.backImage),
        frontImage: Boolean(this.aadhaarVerification.frontImage),
        backImage: Boolean(this.aadhaarVerification.backImage),
        isSubmitted:
          Boolean(this.aadhaarVerification.frontImage && this.aadhaarVerification.backImage) ||
          Boolean(this.aadhaarVerification.isSubmitted) ||
          Boolean(this.aadhaarVerification.submittedAt),
        submittedAt: this.aadhaarVerification.submittedAt || null,
        reviewedAt: this.aadhaarVerification.reviewedAt || null,
        reviewedByName: this.aadhaarVerification.reviewedByName || "",
        rejectionReason: this.aadhaarVerification.rejectionReason || "",
        suspensionReason: this.aadhaarVerification.suspensionReason || "",
        suspendedAt: this.aadhaarVerification.suspendedAt || null,
        consentGiven: Boolean(this.aadhaarVerification.consentGiven),
        consentTimestamp: this.aadhaarVerification.consentTimestamp || null,
        ...(isAdmin
          ? {
              internalNotes: this.aadhaarVerification.internalNotes || "",
              frontOriginalName: this.aadhaarVerification.frontOriginalName || "",
              backOriginalName: this.aadhaarVerification.backOriginalName || "",
            }
          : {}),
      }
    : null;

  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    accountType: this.accountType,
    phone: this.phone || "",
    city: this.city || "",
    state: this.state || "",
    bio: this.bio || "",
    artCategory: this.artCategory || "",
    skills: this.skills || (this.artCategory ? [this.artCategory] : []),
    experience: this.experience || "",
    hourlyRate: this.hourlyRate || 0,
    languages: this.languages || ["English", "Hindi", "Punjabi"],
    expertise: this.expertise || "",
    contactName: this.contactName || "",
    industry: this.industry || "",
    companyAddress: this.companyAddress || "",
    avatar: this.avatar || "",
    isVerified: vStatus === "Verified",
    verificationStatus: vStatus,
    accountStatus: aStatus,
    aadhaarVerification: safeAadhaar,
    appeal: this.appeal || { status: "None" },
    ...(isAdmin ? { moderationAuditLogs: this.moderationAuditLogs || [] } : {}),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model("User", userSchema);
