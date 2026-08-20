import { API_BASE_URL } from "./api";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch list of notifications for the current user.
 */
export async function getNotifications({ unread_only = false, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({
    unread_only: String(unread_only),
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let errorMsg = "Failed to fetch notifications";
    try {
      const err = await response.json();
      errorMsg = err?.detail || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Fetch total unread notification count.
 */
export async function getUnreadNotificationCount() {
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return { unread_count: 0 };
  }

  return await response.json();
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let errorMsg = "Failed to mark notification as read";
    try {
      const err = await response.json();
      errorMsg = err?.detail || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllNotificationsAsRead() {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    let errorMsg = "Failed to mark all notifications as read";
    try {
      const err = await response.json();
      errorMsg = err?.detail || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status !== 204) {
    let errorMsg = "Failed to delete notification";
    try {
      const err = await response.json();
      errorMsg = err?.detail || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return true;
}
