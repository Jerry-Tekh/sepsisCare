import axiosClient from "./axiosClient";

export function register({ fullName, email, password }) {
  return axiosClient.post("/auth/register", { fullName, email, password });
}

export function login({ email, password }) {
  return axiosClient.post("/auth/login", { email, password });
}

export function logout() {
  return axiosClient.post("/auth/logout");
}

/**
 * Validates the httpOnly cookie and returns the current user.
 * Called on app load to restore the session — the client can never read
 * the cookie itself, so we ask the server to verify it for us.
 */
export function me() {
  return axiosClient.get("/auth/me");
}
