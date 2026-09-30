import axiosClient from "./axiosClient";

export function startQuery(patientId, question) {
  return axiosClient.post(`/patients/${patientId}/safety-query/start`, { question });
}

export function sendMessage(queryId, message) {
  return axiosClient.post(`/safety-query/${queryId}/message`, { message });
}

export function listQueries(patientId) {
  return axiosClient.get(`/patients/${patientId}/safety-query`);
}

export function getQuery(queryId) {
  return axiosClient.get(`/safety-query/${queryId}`);
}

export function closeQuery(queryId) {
  return axiosClient.post(`/safety-query/${queryId}/close`);
}
