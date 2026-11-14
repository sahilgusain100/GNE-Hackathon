import { Router } from "express";
import { verifyJWT, requireCustomer, optionalJWT } from "../middlewares/auth.middleware.js";
import {
  createReview,
  getProductReviews,
  checkReviewEligibility,
} from "../controllers/review.controller.js";

const router = Router();

// Public: view reviews for a product
router.get("/product/:productId", getProductReviews);

// Customer protected: check eligibility & submit review
router.get("/check/:orderId/:orderItemId", verifyJWT, requireCustomer, checkReviewEligibility);
router.post("/", verifyJWT, requireCustomer, createReview);

export default router;
