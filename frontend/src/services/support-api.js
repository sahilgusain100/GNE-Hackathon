import { apiRequest } from "./auth-api";

export async function createTicketApi(ticketData) {
  return await apiRequest("/support/tickets", {
    method: "POST",
    body: JSON.stringify(ticketData),
  });
}

export async function getMyTicketsApi(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest(`/support/tickets${query ? `?${query}` : ""}`);
}

export async function getTicketByIdApi(ticketId) {
  return await apiRequest(`/support/tickets/${ticketId}`);
}

export async function replyToTicketApi(ticketId, messageData) {
  return await apiRequest(`/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify(messageData),
  });
}

export async function closeTicketApi(ticketId, note) {
  return await apiRequest(`/support/tickets/${ticketId}/close`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export async function reopenTicketApi(ticketId, reason) {
  return await apiRequest(`/support/tickets/${ticketId}/reopen`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function rateTicketApi(ticketId, ratingData) {
  return await apiRequest(`/support/tickets/${ticketId}/rate`, {
    method: "POST",
    body: JSON.stringify(ratingData),
  });
}

/**
 * Convert a File object to base64 Data URL
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an array of File objects to /api/support/upload
 * Falls back seamlessly to base64 data URLs if the backend is unreachable
 */
export async function uploadSupportFilesApi(files = []) {
  if (!files || files.length === 0) return [];

  const rawFiles = files.map((f) => (f instanceof File ? f : f?.file)).filter(Boolean);
  if (rawFiles.length === 0) {
    return files.map((f) => {
      if (typeof f === "string") return { url: f, name: "Image", fileType: "image/jpeg", size: 0 };
      return {
        url: f.url || f.preview || "",
        name: f.name || "Attachment",
        fileType: f.fileType || "image/jpeg",
        size: f.size || 0,
      };
    });
  }

  const formData = new FormData();
  rawFiles.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const res = await apiRequest("/support/upload", {
      method: "POST",
      body: formData,
    });
    if (res?.success && Array.isArray(res.files)) {
      return res.files;
    }
  } catch (err) {
    console.warn("Backend file upload failed, falling back to data URL:", err);
  }

  // Graceful fallback to client-side data URLs
  const base64Results = await Promise.all(
    rawFiles.map(async (file) => {
      const dataUrl = await fileToDataUrl(file);
      return {
        url: dataUrl,
        name: file.name,
        fileType: file.type || "image/jpeg",
        size: file.size,
      };
    })
  );

  return base64Results;
}
