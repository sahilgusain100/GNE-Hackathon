import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reporterRole: {
      type: String,
      enum: ["customer", "artisan", "industry", "expert", "admin"],
      required: true,
    },
    reporterName: {
      type: String,
      default: "",
    },
    targetType: {
      type: String,
      enum: ["Product", "User", "Order", "Listing"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    targetTitle: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      enum: [
        "Fake product listing",
        "Fraudulent behaviour",
        "Harassment",
        "Misleading information",
        "Suspicious account",
        "Repeated policy violations",
        "Other",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Report description is required"],
      trim: true,
    },
    evidence: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Investigating", "Action Taken", "Dismissed"],
      default: "Pending",
      index: true,
    },
    moderatorNotes: {
      type: String,
      default: "",
      trim: true,
    },
    actionTaken: {
      type: String,
      default: "",
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.pre("save", function () {
  if (!this.reportId) {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    this.reportId = `RPT-${year}-${randomHex}`;
  }
});

reportSchema.methods.toSafeObject = function () {
  return {
    id: this.reportId || this._id.toString(),
    _id: this._id.toString(),
    reportId: this.reportId,
    reporter: this.reporter ? this.reporter.toString() : null,
    reporterRole: this.reporterRole,
    reporterName: this.reporterName,
    targetType: this.targetType,
    targetId: this.targetId,
    targetTitle: this.targetTitle,
    reason: this.reason,
    description: this.description,
    evidence: this.evidence || [],
    status: this.status,
    moderatorNotes: this.moderatorNotes,
    actionTaken: this.actionTaken,
    resolvedBy: this.resolvedBy ? this.resolvedBy.toString() : null,
    resolvedAt: this.resolvedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Report = mongoose.model("Report", reportSchema);
