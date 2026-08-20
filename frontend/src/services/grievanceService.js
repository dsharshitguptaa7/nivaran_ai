import { apiRequest } from "./api";

export async function createGrievance(
  title,
  description
) {
  return apiRequest("/grievances", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      title,
      description,
    }),
  });
}

export async function getMyGrievances() {
  return apiRequest("/grievances");
}

export async function getAllGrievances() {
  return apiRequest("/grievances/all");
}

export async function getGrievance(grievanceId) {
  return apiRequest(
    `/grievances/${grievanceId}`
  );
}

export async function getGrievanceHistory(
  grievanceId
) {
  return apiRequest(
    `/grievances/${grievanceId}/history`
  );
}

export async function processGrievanceAI(grievanceId) {
  return apiRequest(
    `/grievances/${grievanceId}/process-ai`,
    {
      method: "POST",
    }
  );
}

export async function escalateGrievance(
  grievanceId,
  reason,
  remarks
) {
  return apiRequest(
    `/grievances/${grievanceId}/escalate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        reason,
        remarks,
      }),
    }
  );
}

export async function reviewAIRecommendation(
  grievanceId,
  categoryId,
  decision
) {
  return apiRequest(
    `/grievances/${grievanceId}/ai-review`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        category_id: categoryId,
        decision,
      }),
    }
  );
}

export async function getCategories() {
  return apiRequest("/categories");
}

export async function resolveGrievance(grievanceId, resolutionNotes) {
  return apiRequest(`/grievances/${grievanceId}/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resolution_notes: resolutionNotes,
    }),
  });
}

export async function closeGrievance(grievanceId, closureRemarks) {
  return apiRequest(`/grievances/${grievanceId}/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      closure_remarks: closureRemarks,
    }),
  });
}

export async function reopenGrievance(grievanceId, reason) {
  return apiRequest(`/grievances/${grievanceId}/reopen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason,
    }),
  });
}