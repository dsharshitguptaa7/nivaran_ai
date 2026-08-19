import api from "./api";

export const getSubjects = async () => {
  const response = await api.get("/subjects");
  return response.data;
};