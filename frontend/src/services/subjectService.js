import { apiRequest } from "./api";

export async function getSubjects() {
  return apiRequest("/subjects");
}