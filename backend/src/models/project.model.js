import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    industry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Project / product title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Craft category is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, "Offer per unit / price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalBudget: {
      type: Number,
      default: 0,
    },
    duration: {
      type: String,
      trim: true,
      default: "30 days",
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    deadline: {
      type: Date,
    },
    specifications: {
      type: String,
      trim: true,
      default: "",
    },
    requiredQualityLevel: {
      type: String,
      enum: ["Any", "Standard", "High", "Master / Heritage"],
      default: "Any",
    },
    preferredLocation: {
      type: String,
      trim: true,
      default: "",
    },
    materials: [
      {
        type: String,
        trim: true,
      },
    ],
    dimensions: {
      type: String,
      trim: true,
      default: "",
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    assignedArtisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "Open",
        "Assigned",
        "Accepted",
        "In Production",
        "Completed",
        "Rejected",
        "Cancelled",
      ],
      default: "Open",
      index: true,
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    responsibleAnalysis: {
      feasibilityScore: { type: Number, default: 85 },
      feasibilityStatus: { type: String, default: "High Feasibility" },
      fairWageRating: { type: String, default: "Fair Wage Verified" },
      fairWageScore: { type: Number, default: 90 },
      estimatedLaborHours: { type: Number, default: 0 },
      estimatedMaterialCost: { type: Number, default: 0 },
      suggestedPricePerUnit: { type: Number, default: 0 },
      suggestedDurationDays: { type: Number, default: 30 },
      sustainabilityIndex: {
        score: { type: Number, default: 88 },
        ecoFriendlyMaterials: { type: Boolean, default: true },
        traditionalTechniquePreservation: { type: Boolean, default: true },
        lowCarbonFootprint: { type: Boolean, default: true },
        badge: { type: String, default: "Fair Craft Certified" },
      },
      analysisSummary: { type: String, default: "" },
      recommendedArtisans: [
        {
          artisanId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          name: String,
          email: String,
          artCategory: String,
          experience: String,
          city: String,
          matchScore: Number,
          matchReasons: [String],
        },
      ],
    },
    acceptanceDetails: {
      acceptedAt: { type: Date, default: null },
      acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      agreedPrice: { type: Number, default: null },
      agreedDuration: { type: String, default: "" },
      artisanNote: { type: String, default: "" },
    },
    matchedArtisans: [
      {
        artisanId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, default: "" },
        avatar: { type: String, default: "" },
        specialization: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        quotedPrice: { type: Number, default: 0 },
        estimatedDeliveryDays: { type: Number, default: 0 },
        estimatedDeliveryDate: { type: Date, default: null },
        qualityScore: { type: Number, default: null },
        customerRating: { type: Number, default: null },
        reviewCount: { type: Number, default: 0 },
        experience: { type: String, default: "" },
        experienceYears: { type: Number, default: 0 },
        completedProjects: { type: Number, default: 0 },
        isVerified: { type: Boolean, default: false },
        overallMatchPercentage: { type: Number, default: 0 },
        scores: {
          priceScore: { type: Number, default: 0 },
          deliveryScore: { type: Number, default: 0 },
          qualityScore: { type: Number, default: 0 },
          ratingScore: { type: Number, default: 0 },
          experienceScore: { type: Number, default: 0 },
        },
        isEssentialMatch: { type: Boolean, default: false },
        matchType: {
          type: String,
          enum: ["essential", "partial", "unmatched"],
          default: "partial",
        },
        recommendationReason: { type: String, default: "" },
        isBestMatch: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.pre("save", function () {
  if (this.isModified("unitPrice") || this.isModified("quantity")) {
    this.totalBudget = (this.unitPrice || 0) * (this.quantity || 1);
  }
  if (!this.assignedArtisan && this.status === "Assigned") {
    this.status = "Open";
  } else if (this.assignedArtisan && this.status === "Open") {
    this.status = "Assigned";
  }
});

projectSchema.methods.toSafeObject = function (industryObj = null, artisanObj = null) {
  const ind = industryObj || this.industry;
  const art = artisanObj || this.assignedArtisan;
  const order = this.orderRef && typeof this.orderRef === "object" ? this.orderRef : null;

  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    title: this.title,
    category: this.category,
    description: this.description || "",
    quantity: this.quantity,
    unitPrice: this.unitPrice,
    totalBudget: this.totalBudget || this.unitPrice * this.quantity,
    duration: this.duration,
    durationDays: this.durationDays,
    deadline: this.deadline,
    specifications: this.specifications || "",
    requiredQualityLevel: this.requiredQualityLevel || "Any",
    preferredLocation: this.preferredLocation || "",
    materials: this.materials || [],
    dimensions: this.dimensions || "",
    images: this.images || [],
    status: this.status,
    orderRef: order ? order._id.toString() : (this.orderRef ? this.orderRef.toString() : null),
    paymentStatus: this.paymentStatus || (order ? order.paymentStatus : "pending"),
    paidAt: this.paidAt || (order ? order.paidAt : null),
    razorpayOrderId: this.razorpayOrderId || (order ? order.razorpayOrderId : ""),
    razorpayPaymentId: this.razorpayPaymentId || (order ? order.razorpayPaymentId : ""),
    industry: ind
      ? typeof ind === "object" && ind.name
        ? {
            id: ind._id.toString(),
            name: ind.name,
            contactName: ind.contactName || ind.name,
            email: ind.email,
            phone: ind.phone,
            industry: ind.industry,
            companyAddress: ind.companyAddress,
          }
        : ind.toString()
      : null,
    assignedArtisan: art
      ? typeof art === "object" && art.name
        ? {
            id: art._id.toString(),
            name: art.name,
            email: art.email,
            phone: art.phone,
            artCategory: art.artCategory,
            experience: art.experience,
            city: art.city,
            state: art.state,
          }
        : art.toString()
      : null,
    responsibleAnalysis: this.responsibleAnalysis || {},
    acceptanceDetails: this.acceptanceDetails || {},
    matchedArtisans: Array.isArray(this.matchedArtisans)
      ? this.matchedArtisans.map((m) => ({
          artisanId: m.artisanId?._id ? m.artisanId._id.toString() : m.artisanId?.toString() || "",
          name: m.name || "",
          avatar: m.avatar || "",
          specialization: m.specialization || "",
          city: m.city || "",
          state: m.state || "",
          quotedPrice: m.quotedPrice || 0,
          estimatedDeliveryDays: m.estimatedDeliveryDays || 0,
          estimatedDeliveryDate: m.estimatedDeliveryDate || null,
          qualityScore: m.qualityScore != null ? m.qualityScore : null,
          customerRating: m.customerRating != null ? m.customerRating : null,
          reviewCount: m.reviewCount || 0,
          experience: m.experience || "",
          experienceYears: m.experienceYears || 0,
          completedProjects: m.completedProjects || 0,
          isVerified: Boolean(m.isVerified),
          overallMatchPercentage: m.overallMatchPercentage || 0,
          scores: m.scores || {},
          isEssentialMatch: Boolean(m.isEssentialMatch),
          matchType: m.matchType || "partial",
          recommendationReason: m.recommendationReason || "",
          isBestMatch: Boolean(m.isBestMatch),
        }))
      : [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Project = mongoose.model("Project", projectSchema);
