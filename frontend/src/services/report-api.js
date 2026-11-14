import { apiRequest } from "./auth-api";

export async function createReportApi(reportData) {
  return await apiRequest("/reports", {
    method: "POST",
    body: JSON.stringify(reportData),
  });
}

export async function getMyReportsApi() {
  return await apiRequest("/reports/my-reports");
}
