import { API_BASE_URL } from "./api";

function getAuthHeaders(isMultipart = false) {
  const token = localStorage.getItem("access_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function requestDocuments(grievanceId, payload) {
  const res = await fetch(`${API_BASE_URL}/grievances/${grievanceId}/document-requests`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to request additional documents.");
  }

  return res.json();
}

export async function getDocumentRequests(grievanceId) {
  const res = await fetch(`${API_BASE_URL}/grievances/${grievanceId}/document-requests`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch document requests.");
  }

  return res.json();
}

export async function uploadRequestedDocument(grievanceId, requestId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_BASE_URL}/grievances/${grievanceId}/document-requests/${requestId}/upload`,
    {
      method: "POST",
      headers: getAuthHeaders(true),
      body: formData,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload requested document.");
  }

  return res.json();
}

export async function reviewRequestedDocument(grievanceId, requestId, payload) {
  const res = await fetch(
    `${API_BASE_URL}/grievances/${grievanceId}/document-requests/${requestId}/review`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to submit document review.");
  }

  return res.json();
}
