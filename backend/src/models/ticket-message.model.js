import mongoose from "mongoose";

const messageAttachmentSchema = new mongoose.Schema(
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
  },
  { _id: true }
);

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "artisan", "industry", "expert", "admin", "support", "system"],
      required: true,
    },
    senderAvatar: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
    attachments: [messageAttachmentSchema],
    isInternalNote: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ticketMessageSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    ticket: this.ticket ? this.ticket.toString() : null,
    sender: this.sender ? this.sender.toString() : null,
    senderName: this.senderName,
    senderRole: this.senderRole,
    senderAvatar: this.senderAvatar || "",
    message: this.message,
    attachments: this.attachments || [],
    isInternalNote: Boolean(this.isInternalNote),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const TicketMessage = mongoose.model(
  "TicketMessage",
  ticketMessageSchema
);
