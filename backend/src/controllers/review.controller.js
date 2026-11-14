import mongoose from "mongoose";
import { Review } from "../models/review.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

/**
 * @desc    Submit a verified-purchase review for a product
 * @route   POST /api/reviews
 * @access  Customer Only
 */
export const createReview = async (req, res) => {
  try {
    const user = req.user;
    const {
      orderId,
      orderItemId,
      productId,
      overallRating,
      qualityRating,
      packagingRating,
      deliveryRating,
      title = "",
      comment,
      images = [],
    } = req.body;

    if (!orderId || !orderItemId || !productId || !overallRating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Order ID, order item, product, rating, and comment are required.",
      });
    }

    const ratingNum = Number(overallRating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Overall rating must be between 1 and 5 stars.",
      });
    }

    if (comment.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please write at least 5 characters in your review comment.",
      });
    }

    // Verify order exists and belongs to this customer
    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const orderQuery = isObjectId ? { _id: orderId } : { orderNumber: orderId };
    const order = await Order.findOne(orderQuery);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.customer.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the verified customer who purchased this item can submit a verified-purchase review.",
      });
    }

    // Find the specific item in the order
    const orderItem = order.items.find(
      (it) => it._id?.toString() === orderItemId || it.id === orderItemId
    );

    if (!orderItem) {
      return res.status(400).json({
        success: false,
        message: "The specified item was not found in this order.",
      });
    }

    // Prevent duplicate review for the same order item
    const existingReview = await Review.findOne({
      order: order._id,
      orderItemId: orderItem._id ? orderItem._id.toString() : orderItemId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a verified review for this purchase item.",
      });
    }

    // Prepare images
    const formattedImages = Array.isArray(images)
      ? images.filter((img) => typeof img === "string" && img.trim() !== "").slice(0, 5)
      : [];

    const review = new Review({
      product: productId,
      productTitle: orderItem.title || orderItem.name || "Handmade Product",
      order: order._id,
      orderNumber: order.orderNumber,
      orderItemId: orderItem._id ? orderItem._id.toString() : orderItemId,
      customer: user._id,
      customerName: user.name,
      customerAvatar: user.avatar || "",
      artisan: orderItem.artisanId,
      isVerifiedPurchase: true,
      overallRating: ratingNum,
      qualityRating: Number(qualityRating) || ratingNum,
      packagingRating: Number(packagingRating) || ratingNum,
      deliveryRating: Number(deliveryRating) || ratingNum,
      title: title.trim(),
      comment: comment.trim(),
      images: formattedImages,
      status: "Published",
    });

    await review.save();

    return res.status(201).json({
      success: true,
      message: "Your verified review has been published successfully!",
      review: review.toSafeObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A review has already been submitted for this order item.",
      });
    }
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review.",
    });
  }
};

/**
 * @desc    Get verified customer reviews for a product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const filter = {
      product: productId,
      status: "Published",
    };

    const reviews = await Review.find(filter).sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    let avgOverall = 0;
    let avgQuality = 0;
    let avgPackaging = 0;
    let avgDelivery = 0;

    if (totalReviews > 0) {
      const sums = reviews.reduce(
        (acc, r) => ({
          overall: acc.overall + r.overallRating,
          quality: acc.quality + (r.qualityRating || r.overallRating),
          packaging: acc.packaging + (r.packagingRating || r.overallRating),
          delivery: acc.delivery + (r.deliveryRating || r.overallRating),
        }),
        { overall: 0, quality: 0, packaging: 0, delivery: 0 }
      );

      avgOverall = Number((sums.overall / totalReviews).toFixed(1));
      avgQuality = Number((sums.quality / totalReviews).toFixed(1));
      avgPackaging = Number((sums.packaging / totalReviews).toFixed(1));
      avgDelivery = Number((sums.delivery / totalReviews).toFixed(1));
    }

    return res.status(200).json({
      success: true,
      reviews: reviews.map((r) => r.toSafeObject()),
      stats: {
        totalReviews,
        avgOverall,
        avgQuality,
        avgPackaging,
        avgDelivery,
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews.",
    });
  }
};

/**
 * @desc    Check if customer can review a specific order item
 * @route   GET /api/reviews/check/:orderId/:orderItemId
 * @access  Customer
 */
export const checkReviewEligibility = async (req, res) => {
  try {
    const user = req.user;
    const { orderId, orderItemId } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const orderQuery = isObjectId ? { _id: orderId } : { orderNumber: orderId };
    const order = await Order.findOne(orderQuery);

    if (!order || order.customer.toString() !== user._id.toString()) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "You have not purchased this item.",
      });
    }

    const targetItem = order.items.find(
      (it) => it._id?.toString() === orderItemId || it.id === orderItemId
    );

    if (!targetItem) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "Item not in order.",
      });
    }

    const existingReview = await Review.findOne({
      order: order._id,
      orderItemId: targetItem._id ? targetItem._id.toString() : orderItemId,
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        eligible: false,
        alreadyReviewed: true,
        review: existingReview.toSafeObject(),
      });
    }

    return res.status(200).json({
      success: true,
      eligible: true,
      item: {
        id: targetItem._id?.toString() || orderItemId,
        productId: targetItem.product ? targetItem.product.toString() : "",
        title: targetItem.title || targetItem.name,
        image: targetItem.image || "",
        artisanName: targetItem.artisanName || "",
      },
    });
  } catch (error) {
    console.error("Check review eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check review eligibility.",
    });
  }
};
