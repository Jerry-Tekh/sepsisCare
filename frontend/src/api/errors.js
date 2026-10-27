// Helpers for reading the backend's error responses:
//   { error: "Validation failed", details: [{ path: "email", message: "..." }] }

/** Per-field messages from a validation error, e.g. { email: "Invalid email" }. */
export function fieldErrors(err) {
  const details = err?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  const result = {};
  for (const { path, message } of details) {
    if (path && message && !result[path]) result[path] = message;
  }
  return result;
}

/** A single human-readable message, preferring a specific field message over "Validation failed". */
export function apiErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  if (!err?.response) return "Can't reach the server. Check your connection and try again.";
  const firstDetail = Array.isArray(data?.details) ? data.details.find((d) => d?.message)?.message : null;
  return firstDetail || data?.error || fallback;
}
