import mongoose from "mongoose";

const disputeEvidenceSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    fileType: {
      type: String,
      default: "image/jpeg",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const disputeAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      default: "System",
    },
    role: {
      type: String,
      default: "system",
    },
    details: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema(
  {
    disputeId: {
      type: String,
      unique: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orderItemId: {
      type: String,
      default: "",
    },
    productTitle: {
      type: String,
      default: "",
      trim: true,
    },
    productImage: {
      type: String,
      default: "",
    },
    itemPrice: {
      type: Number,
      default: 0,
    },
    itemQuantity: {
      type: Number,
      default: 1,
    },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    initiatorRole: {
      type: String,
      enum: ["customer", "industry"],
      required: true,
    },
    initiatorName: {
      type: String,
      default: "",
      trim: true,
    },
    initiatorEmail: {
      type: String,
      default: "",
      trim: true,
    },
    respondent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    respondentName: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Dispute category is required"],
      trim: true,
      index: true,
    },
    requestedResolution: {
      type: String,
      enum: [
        "Return and refund",
        "Full refund",
        "Partial refund",
        "Replacement",
        "Rework or correction",
        "Mutual agreement between parties",
      ],
      default: "Return and refund",
    },
    status: {
      type: String,
      enum: [
        "Open",
        "Waiting for Artisan Response",
        "Artisan Responded",
        "Under Review",
        "Escalated",
        "Resolved",
        "Closed",
      ],
      default: "Waiting for Artisan Response",
      index: true,
    },
    customerExplanation: {
      type: String,
      required: [true, "Complaint explanation is required"],
      trim: true,
    },
    customerEvidence: [disputeEvidenceSchema],
    artisanExplanation: {
      type: String,
      trim: true,
      default: "",
    },
    artisanEvidence: [disputeEvidenceSchema],
    artisanRespondedAt: {
      type: Date,
      default: null,
    },
    resolution: {
      type: {
        type: String,
        enum: [
          "None",
          "No action required",
          "Partial refund",
          "Full refund",
          "Replacement",
          "Return and refund",
          "Rework or correction",
          "Mutual agreement between parties",
        ],
        default: "None",
      },
      amount: {
        type: Number,
        default: 0,
      },
      reason: {
        type: String,
        trim: true,
        default: "",
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      decidedByName: {
        type: String,
        default: "",
      },
      decidedAt: {
        type: Date,
        default: null,
      },
      refundStatus: {
        type: String,
        enum: ["None", "Initiated", "Completed", "Simulated"],
        default: "None",
      },
      refundReference: {
        type: String,
        default: "",
      },
    },
    assignedHandler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedHandlerName: {
      type: String,
      default: "Unassigned",
    },
    auditTrail: [disputeAuditSchema],
  },
  {
    timestamps: true,
  }
);

disputeSchema.pre("save", function () {
  if (!this.disputeId) {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    this.disputeId = `DSP-${year}-${randomHex}`;
  }
});

disputeSchema.methods.toSafeObject = function () {
  return {
    id: this.disputeId || this._id.toString(),
    _id: this._id.toString(),
    disputeId: this.disputeId,
    order: this.order ? this.order.toString() : null,
    orderNumber: this.orderNumber,
    orderItemId: this.orderItemId,
    productTitle: this.productTitle,
    productImage: this.productImage,
    itemPrice: this.itemPrice,
    itemQuantity: this.itemQuantity,
    initiator: this.initiator ? this.initiator.toString() : null,
    initiatorRole: this.initiatorRole,
    initiatorName: this.initiatorName,
    initiatorEmail: this.initiatorEmail,
    respondent: this.respondent ? this.respondent.toString() : null,
    respondentName: this.respondentName,
    category: this.category,
    requestedResolution: this.requestedResolution,
    status: this.status,
    customerExplanation: this.customerExplanation,
    customerEvidence: this.customerEvidence || [],
    artisanExplanation: this.artisanExplanation,
    artisanEvidence: this.artisanEvidence || [],
    artisanRespondedAt: this.artisanRespondedAt,
    resolution: this.resolution || {},
    assignedHandler: this.assignedHandler ? this.assignedHandler.toString() : null,
    assignedHandlerName: this.assignedHandlerName,
    auditTrail: this.auditTrail || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Dispute = mongoose.model("Dispute", disputeSchema);
