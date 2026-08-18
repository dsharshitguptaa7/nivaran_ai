import { apiRequest } from "./api";

export async function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(userData),
  });
}

export async function loginUser(email, password) {
  const formData = new URLSearchParams();

  formData.append("username", email);
  formData.append("password", password);

  const response = await fetch(
    "http://127.0.0.1:8000/api/v1/auth/login",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: formData,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || "Login failed"
    );
  }

  localStorage.setItem(
    "access_token",
    data.access_token
  );

  return data;
}

export async function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function logoutUser() {
  localStorage.removeItem("access_token");
}