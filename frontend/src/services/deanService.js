import { apiRequest } from "./api";

/**
 * Fetch complete institutional analytics for the Dean Dashboard.
 * Supports dynamic filtering by start_date, end_date, subject_id, category_id, priority, status, and authority_role.
 */
export async function getDeanDashboardAnalytics(filters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.startDate) queryParams.append("start_date", filters.startDate);
  if (filters.endDate) queryParams.append("end_date", filters.endDate);
  if (filters.subjectId) queryParams.append("subject_id", filters.subjectId);
  if (filters.categoryId) queryParams.append("category_id", filters.categoryId);
  if (filters.priority) queryParams.append("priority", filters.priority);
  if (filters.status) queryParams.append("status", filters.status);
  if (filters.authorityRole) queryParams.append("authority_role", filters.authorityRole);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/dean/analytics?${queryString}` : "/dean/analytics";

  return apiRequest(endpoint);
}

/**
 * Fetch the urgent "Requires Dean Attention" cases queue.
 */
export async function getDeanAttentionCases() {
  return apiRequest("/dean/attention");
}

/**
 * Fetch recent institutional activity events timeline.
 */
export async function getDeanActivityFeed(limit = 20) {
  return apiRequest(`/dean/activity-feed?limit=${limit}`);
}
