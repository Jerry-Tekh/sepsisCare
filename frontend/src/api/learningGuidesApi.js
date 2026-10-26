import axiosClient from "./axiosClient";

export function listGuides(params = {}) {
  return axiosClient.get("/library/guides", { params });
}

export function getGuideOptions() {
  return axiosClient.get("/library/guides/options");
}

export function getPdfUrl(guideId, download = false) {
  return axiosClient.get(`/library/guides/${encodeURIComponent(guideId)}/pdf`, {
    params: download ? { download: "true" } : {},
  });
}
