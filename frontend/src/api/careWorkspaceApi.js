import axiosClient from "./axiosClient";

export function getWorkspace(patientId) {
  return axiosClient.get(`/patients/${patientId}/care-workspace`);
}
export function generateCarePlan(patientId, request, conversationId) {
  return axiosClient.post(`/patients/${patientId}/care-workspace/generate`, { request, conversationId });
}
export function recordCarePlanCheckIn(patientId, planId, payload) {
  return axiosClient.post(`/patients/${patientId}/care-workspace/${planId}/check-in`, payload);
}
export function listCareFlags(patientId) {
  return axiosClient.get(`/patients/${patientId}/care-workspace/flags`);
}
export function resolveCareFlag(patientId, flagId, outcome) {
  return axiosClient.patch(`/patients/${patientId}/care-workspace/flags/${flagId}/resolve`, { outcome });
}
export function updateCareFlag(patientId, flagId, payload) {
  return axiosClient.patch(`/patients/${patientId}/care-workspace/flags/${flagId}`, payload);
}
