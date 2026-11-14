import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: "Attachment",
      trim: true,
    },
    fileType: {
      type: String,
      default: "image/jpeg",
    },
    size: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const historyEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      default: "System",
    },
    actorRole: {
      type: String,
      default: "system",
    },
    note: {
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

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Ticket user is required"],
      index: true,
    },
    userRole: {
      type: String,
      enum: ["customer", "artisan", "industry", "expert", "admin", "support"],
      required: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    userEmail: {
      type: String,
      trim: true,
      default: "",
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
      default: null,
    },
    relatedOrderNumber: {
      type: String,
      trim: true,
      default: "",
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    category: {
      type: String,
      required: [true, "Issue category is required"],
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Open",
        "Under Review",
        "Waiting for User",
        "Escalated",
        "Resolved",
        "Closed",
      ],
      default: "Open",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedHandlerName: {
      type: String,
      default: "Unassigned",
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    attachments: [attachmentSchema],
    reopenCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      feedback: {
        type: String,
        trim: true,
        default: "",
      },
      ratedAt: {
        type: Date,
        default: null,
      },
    },
    history: [historyEntrySchema],
  },
  {
    timestamps: true,
  }
);

ticketSchema.pre("save", function () {
  if (!this.ticketId) {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    this.ticketId = `TKT-${year}-${randomHex}`;
  }
});

ticketSchema.methods.toSafeObject = function () {
  return {
    id: this.ticketId || this._id.toString(),
    _id: this._id.toString(),
    ticketId: this.ticketId,
    user: this.user ? this.user.toString() : null,
    userRole: this.userRole,
    userName: this.userName,
    userEmail: this.userEmail,
    relatedOrder: this.relatedOrder ? this.relatedOrder.toString() : null,
    relatedOrderNumber: this.relatedOrderNumber,
    relatedProject: this.relatedProject ? this.relatedProject.toString() : null,
    relatedProduct: this.relatedProduct ? this.relatedProduct.toString() : null,
    category: this.category,
    subCategory: this.subCategory,
    subject: this.subject,
    description: this.description,
    priority: this.priority,
    status: this.status,
    assignedTo: this.assignedTo ? this.assignedTo.toString() : null,
    assignedHandlerName: this.assignedHandlerName,
    assignedAt: this.assignedAt,
    attachments: this.attachments || [],
    reopenCount: this.reopenCount,
    resolvedAt: this.resolvedAt,
    closedAt: this.closedAt,
    rating: this.rating,
    history: this.history || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Ticket = mongoose.model("Ticket", ticketSchema);
