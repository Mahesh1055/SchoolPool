import api from "../api/api";

export const getChildren = () => api.get("/Child");
export const addChild = (data) => api.post("/Child", data);
export const updateChild = (id, data) => api.put(`/Child/${id}`, data);
export const deleteChild = (id) => api.delete(`/Child/${id}`);
export const uploadChildDocument = (id, data) => api.post(`/Child/${id}/upload-document`, data);

// Admin
export const getAllChildren = () => api.get("/Child/admin/all");
export const verifyChild = (id) => api.put(`/Child/admin/${id}/verify`);
export const rejectChild = (id, data) => api.put(`/Child/admin/${id}/reject`, data);