import api from "../api/api";

// Users
export const getUsers = () => api.get("/Admin/users");
export const addUser = (data) => api.post("/Admin/users", data);
export const updateUser = (id, data) => api.put(`/Admin/users/${id}`, data);
export const verifyUser = (id) => api.put(`/Admin/users/${id}/verify`);
export const deleteUser = (id) => api.delete(`/Admin/users/${id}`);

// Schools
export const getSchools = () => api.get("/Admin/schools");
export const addSchool = (data) => api.post("/Admin/schools", data);
export const updateSchool = (id, data) => api.put(`/Admin/schools/${id}`, data);
export const deleteSchool = (id) => api.delete(`/Admin/schools/${id}`);

// Groups
export const getGroups = () => api.get("/Admin/groups");
export const verifyGroup = (id) => api.put(`/Admin/groups/${id}/verify`);
export const rejectGroup = (id) => api.put(`/Admin/groups/${id}/reject`);
export const updateGroup = (id, data) => api.put(`/Admin/groups/${id}`, data);
export const deleteGroup = (id) => api.delete(`/Admin/groups/${id}`);

// Rides
export const getRides = () => api.get("/Admin/rides");
export const updateRideStatus = (id, status) => api.put(`/Admin/rides/${id}/status`, { status });
export const deleteRide = (id) => api.delete(`/Admin/rides/${id}`);

// Verifications
export const getVerifications = () => api.get("/Admin/verifications");
export const approveVerification = (id) => api.put(`/Admin/verifications/${id}/approve`);
export const rejectVerification = (id) => api.put(`/Admin/verifications/${id}/reject`);

// ✅ Notifications — now pointing to /Admin/notifications/
export const sendNotification = (data) => api.post("/Admin/notifications/send", data);
export const sendToRole = (data) => api.post("/Admin/notifications/send-role", data);