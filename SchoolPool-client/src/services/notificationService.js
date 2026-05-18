import api from "../api/api";

export const getNotifications = () => api.get("/Notification");
export const markAsRead = (id) => api.put(`/Notification/${id}/read`);
export const markAllAsRead = () => api.put("/Notification/read-all");
export const sendNotification = (data) => api.post("/Notification/send", data);
export const sendToRole = (data) => api.post("/Notification/send-role", data);