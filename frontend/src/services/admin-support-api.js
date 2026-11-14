import { apiRequest } from "./auth-api";

export async function getSupportStaffApi() {
  return await apiRequest("/admin/support/staff");
}

export async function createSupportStaffApi(staff) {
  return await apiRequest("/admin/support/staff", {
    method: "POST",
    body: JSON.stringify(staff),
  });
}

export async function updateSupportStaffApi(staffId, updates) {
  return await apiRequest(`/admin/support/staff/${staffId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function getSupportStatsApi() {
  return await apiRequest("/admin/support/stats");
}

export async function getAllTicketsAdminApi(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest(`/admin/support/tickets${query ? `?${query}` : ""}`);
}

export async function assignTicketAdminApi(ticketId, data) {
  return await apiRequest(`/admin/support/tickets/${ticketId}/assign`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateTicketStatusAdminApi(ticketId, data) {
  return await apiRequest(`/admin/support/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAllDisputesAdminApi(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest(`/admin/support/disputes${query ? `?${query}` : ""}`);
}

export async function getAllReportsAdminApi(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest(`/admin/support/reports${query ? `?${query}` : ""}`);
}

export async function updateReportStatusAdminApi(reportId, data) {
  return await apiRequest(`/admin/support/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function toggleArtisanVerificationApi(artisanId, data) {
  return await apiRequest(`/admin/support/artisan-verify/${artisanId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
