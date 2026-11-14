import { apiRequest } from "./auth-api";

export async function raiseDisputeApi(disputeData) {
  return await apiRequest("/disputes", {
    method: "POST",
    body: JSON.stringify(disputeData),
  });
}

export async function getMyDisputesApi(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest(`/disputes${query ? `?${query}` : ""}`);
}

export async function getDisputeByIdApi(disputeId) {
  return await apiRequest(`/disputes/${disputeId}`);
}

export async function respondToDisputeApi(disputeId, responseData) {
  return await apiRequest(`/disputes/${disputeId}/respond`, {
    method: "POST",
    body: JSON.stringify(responseData),
  });
}

export async function escalateDisputeApi(disputeId, reason) {
  return await apiRequest(`/disputes/${disputeId}/escalate`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function resolveDisputeApi(disputeId, resolutionData) {
  return await apiRequest(`/disputes/${disputeId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(resolutionData),
  });
}
