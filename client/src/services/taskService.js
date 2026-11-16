import api from "./api";

export const listTasks = () => api.get("/tasks").then((r) => r.data.tasks);
export const createTask = (data) => api.post("/tasks", data).then((r) => r.data.task);
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data).then((r) => r.data.task);
export const removeTask = (id) => api.delete(`/tasks/${id}`);