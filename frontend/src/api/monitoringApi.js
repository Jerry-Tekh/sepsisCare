import axiosClient from "./axiosClient";

export function listVitals(patientId, limit) {
  return axiosClient.get(`/patients/${patientId}/monitoring/vitals`, { params: { limit } });
}

export function createVital(patientId, data) {
  return axiosClient.post(`/patients/${patientId}/monitoring/vitals`, data);
}

export function deleteVital(readingId) {
  return axiosClient.delete(`/monitoring/vitals/${readingId}`);
}

export function listCheckIns(patientId, limit) {
  return axiosClient.get(`/patients/${patientId}/monitoring/check-ins`, { params: { limit } });
}

export function createCheckIn(patientId, data) {
  return axiosClient.post(`/patients/${patientId}/monitoring/check-ins`, data);
}

export function deleteCheckIn(checkInId) {
  return axiosClient.delete(`/monitoring/check-ins/${checkInId}`);
}

/** Latest WATCH/URGENT entry per patient in the last 48 hours. */
export function getRecentAlerts() {
  return axiosClient.get("/dashboard/alerts");
}
