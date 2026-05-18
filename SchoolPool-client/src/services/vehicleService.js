import api from "../api/api";

export const getVehicles = () => api.get("/Vehicle");
export const addVehicle = (data) => api.post("/Vehicle", data);
export const deleteVehicle = (id) => api.delete(`/Vehicle/${id}`);
export const uploadVehicleDocument = (id, data) => api.post(`/Vehicle/${id}/upload-document`, data);

// Admin
export const getAllVehicles = () => api.get("/Vehicle/admin/all");
export const verifyVehicle = (id) => api.put(`/Vehicle/admin/${id}/verify`);
export const rejectVehicle = (id, data) => api.put(`/Vehicle/admin/${id}/reject`, data);