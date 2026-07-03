import axiosClient from "./axiosClient";

export function getLatestRiskProfile(patientId) {
  return axiosClient.get(`/patients/${patientId}/risk-profile`);
}

export function getRiskProfileHistory(patientId) {
  return axiosClient.get(`/patients/${patientId}/risk-profile/history`);
}
