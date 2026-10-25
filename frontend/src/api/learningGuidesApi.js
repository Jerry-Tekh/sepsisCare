import axiosClient from "./axiosClient";

export function listGuides(params = {}) {
  return axiosClient.get("/library/guides", { params });
}

export function getGuideOptions() {
  return axiosClient.get("/library/guides/options");
}

const apiRoot = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");

export function pdfUrl(guideId, download = false) {
  return `${apiRoot}/library/guides/${encodeURIComponent(guideId)}/pdf${download ? "?download=true" : ""}`;
}
