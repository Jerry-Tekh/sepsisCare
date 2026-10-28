import axiosClient from "./axiosClient";

export function listPatients() {
  return axiosClient.get("/patients");
}

export function createPatient(data) {
  return axiosClient.post("/patients", data);
}

export function getPatient(id) {
  return axiosClient.get(`/patients/${id}`);
}

export function updatePatient(id, data) {
  return axiosClient.put(`/patients/${id}`, data);
}

export function deletePatient(id) {
  return axiosClient.delete(`/patients/${id}`);
}

export function listHealthcareSeekingEvents(patientId) {
  return axiosClient.get(`/patients/${patientId}/healthcare-seeking`);
}

export function recordWarningSign(patientId, data) {
  return axiosClient.post(`/patients/${patientId}/healthcare-seeking`, data);
}

export function recordHealthcareArrival(patientId, eventId, data) {
  return axiosClient.patch(`/patients/${patientId}/healthcare-seeking/${eventId}/arrival`, data);
}

export function getDashboardSummary() {
  return axiosClient.get("/dashboard/summary");
}

export function getDashboardWelcome() {
  return axiosClient.get("/dashboard/welcome");
}
