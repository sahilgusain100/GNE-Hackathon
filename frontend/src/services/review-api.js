import { apiRequest } from "./auth-api";

export async function createReviewApi(reviewData) {
  return await apiRequest("/reviews", {
    method: "POST",
    body: JSON.stringify(reviewData),
  });
}

export async function getProductReviewsApi(productId) {
  return await apiRequest(`/reviews/product/${productId}`);
}

export async function checkReviewEligibilityApi(orderId, orderItemId) {
  return await apiRequest(`/reviews/check/${orderId}/${orderItemId}`);
}
