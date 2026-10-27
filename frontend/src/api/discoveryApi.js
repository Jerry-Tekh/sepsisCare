import axiosClient from "./axiosClient";

export function startOnboarding(patientId) {
  return axiosClient.post(`/patients/${patientId}/onboarding/start`, null, { slowNotice: false });
}

export function getActiveOnboardingSession(patientId) {
  return axiosClient.get(`/patients/${patientId}/onboarding/active`);
}

export function getOnboardingSession(sessionId) {
  return axiosClient.get(`/onboarding/${sessionId}`);
}

export function listOnboardingSessions(patientId) {
  return axiosClient.get(`/patients/${patientId}/onboarding/sessions`);
}

export function submitOnboardingAnswer(sessionId, answer) {
  return axiosClient.post(`/onboarding/${sessionId}/answer`, { answer }, { slowNotice: false });
}
