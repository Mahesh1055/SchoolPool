import api from "../api/api";

export const getGroups = (locality) =>
  api.get(`/CarpoolGroup?locality=${locality || ""}`);

export const createGroup = (data) =>
  api.post("/CarpoolGroup", data);

export const joinGroup = (id, data) =>
  api.post(`/CarpoolGroup/${id}/join`, data);

export const leaveGroup = (id) =>
  api.post(`/CarpoolGroup/${id}/leave`);

export const deleteGroup = (id) =>
  api.delete(`/CarpoolGroup/${id}`);

export const updateGroup = (id, data) =>
  api.put(`/CarpoolGroup/${id}/update`, data);

export const getMyGroups = () =>
  api.get("/CarpoolGroup/my");