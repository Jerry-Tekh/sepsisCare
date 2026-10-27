import axiosClient from "./axiosClient";

export function listGuides() { return axiosClient.get("/organization/guides"); }
export function uploadGuide(formData) { return axiosClient.post("/organization/guides", formData, { headers: { "Content-Type": "multipart/form-data" }, slowNotice: false }); }
export function updateGuide(id, payload) { return axiosClient.patch(`/organization/guides/${id}`, payload); }
export function deleteGuide(id) { return axiosClient.delete(`/organization/guides/${id}`); }
export function listSources() { return axiosClient.get("/organization/sources"); }
export function createSource(payload) { return axiosClient.post("/organization/sources", payload); }
export function updateSourceStatus(id, status) { return axiosClient.patch(`/organization/sources/${id}/status`, { status }); }
export function deleteSource(id) { return axiosClient.delete(`/organization/sources/${id}`); }

const apiRoot = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
export function guidePdfUrl(id) { return `${apiRoot}/organization/guides/${encodeURIComponent(id)}/pdf`; }
