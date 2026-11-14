import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productTitle: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      default: "",
    },
    orderItemId: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerAvatar: {
      type: String,
      default: "",
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
      index: true,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    packagingRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: 5,
      maxlength: 2000,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["Published", "Flagged", "Hidden"],
      default: "Published",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate review for the same order item
reviewSchema.index({ order: 1, orderItemId: 1 }, { unique: true });

reviewSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    product: this.product ? this.product.toString() : null,
    productTitle: this.productTitle,
    order: this.order ? this.order.toString() : null,
    orderNumber: this.orderNumber,
    orderItemId: this.orderItemId,
    customer: this.customer ? this.customer.toString() : null,
    customerName: this.customerName,
    customerAvatar: this.customerAvatar,
    artisan: this.artisan ? this.artisan.toString() : null,
    isVerifiedPurchase: Boolean(this.isVerifiedPurchase),
    overallRating: this.overallRating,
    qualityRating: this.qualityRating,
    packagingRating: this.packagingRating,
    deliveryRating: this.deliveryRating,
    title: this.title,
    comment: this.comment,
    images: this.images || [],
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Review = mongoose.model("Review", reviewSchema);
