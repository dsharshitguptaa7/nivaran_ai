import { apiRequest, API_BASE_URL } from "./api";

/**
 * Upload a document attached to a grievance.
 * @param {string} grievanceId - Grievance ID or UUID
 * @param {File} file - File object from input
 * @param {string} documentType - "ATTACHMENT" | "RESOLUTION_PROOF" | "EVIDENCE"
 */
export async function uploadDocument(grievanceId, file, documentType = "ATTACHMENT") {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/grievances/${grievanceId}/documents`, {
    method: "POST",
    headers,
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.detail || "Document upload failed");
  }

  return data;
}

/**
 * Get all documents attached to a grievance.
 * @param {string} grievanceId
 */
export async function getGrievanceDocuments(grievanceId) {
  return apiRequest(`/grievances/${grievanceId}/documents`);
}

/**
 * Download a document file by its ID.
 * @param {string} documentId
 * @param {string} fileName
 */
export async function downloadDocument(documentId, fileName = "download") {
  const token = localStorage.getItem("access_token");
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
    headers,
  });

  if (!response.ok) {
    let errorDetail = "Failed to download document";
    try {
      const errJson = await response.json();
      errorDetail = errJson?.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Delete a document by its ID.
 * @param {string} documentId
 */
export async function deleteDocument(documentId) {
  return apiRequest(`/documents/${documentId}`, {
    method: "DELETE",
  });
}
