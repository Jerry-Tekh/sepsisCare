import axiosClient from "./axiosClient";

export function listMaterials(patientId) {
  return axiosClient.get(`/patients/${patientId}/microlearning`);
}

export function requestGeneration(patientId, topic) {
  return axiosClient.post(`/patients/${patientId}/microlearning/generate`, { topic });
}

export function getMaterial(materialId) {
  return axiosClient.get(`/microlearning/${materialId}`);
}

export function toggleAssign(materialId, assign) {
  return axiosClient.patch(`/microlearning/${materialId}/assign`, { assign });
}

/**
 * Downloads a material as a PDF blob and triggers a browser download.
 * Uses axiosClient so the httpOnly cookie is sent automatically.
 */
export async function downloadPDF(materialId, title) {
  const res = await axiosClient.get(`/microlearning/${materialId}/download/pdf`, {
    responseType: "blob",
  });
  const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href  = url;
  link.download = `${(title || "guide").replace(/[^a-z0-9]/gi, "_").slice(0, 60)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a material as an SVG picture card and triggers a browser download.
 */
export async function downloadCard(materialId, title) {
  const res = await axiosClient.get(`/microlearning/${materialId}/download/card`, {
    responseType: "blob",
  });
  const url  = URL.createObjectURL(new Blob([res.data], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href  = url;
  link.download = `${(title || "guide").replace(/[^a-z0-9]/gi, "_").slice(0, 60)}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
