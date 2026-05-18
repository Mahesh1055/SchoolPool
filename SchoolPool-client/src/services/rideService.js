import api from "../api/api";

export const startRide = (data) => api.post("/Ride/start", data);
export const scheduleRide = (data) => api.post("/Ride/schedule", data);
export const completeRide = (id) => api.put(`/Ride/${id}/complete`);
export const getMyRides = () => api.get("/Ride/my");
export const getGroupRides = (groupId) => api.get(`/Ride/group/${groupId}`);
export const getActiveRides = () => api.get("/Ride/active");
export const markAttendance = (data) => api.put("/Ride/attendance", data);
export const getRideAttendance = (rideId) => api.get(`/Ride/${rideId}/attendance`);

// ✅ Seat bookings
export const bookSeat = (data) => api.post("/Ride/book-seat", data);
export const cancelSeat = (bookingId) => api.delete(`/Ride/cancel-seat/${bookingId}`);
export const getMySeatBookings = () => api.get("/Ride/my-seat-bookings");
export const getGroupSeatBookings = (groupId) => api.get(`/Ride/group-seat-bookings/${groupId}`);

// Admin
export const approveRide = (id) => api.put(`/Ride/admin/${id}/approve`);
export const rejectRide = (id, data) => api.put(`/Ride/admin/${id}/reject`, data);