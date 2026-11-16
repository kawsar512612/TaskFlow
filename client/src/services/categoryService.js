import api from "./api";

export const listCategories = () => api.get("/categories").then((r) => r.data.categories);
export const createCategory = (data) => api.post("/categories", data).then((r) => r.data.category);
export const updateCategory = (id, data) =>
  api.patch(`/categories/${id}`, data).then((r) => r.data.category);
export const removeCategory = (id) => api.delete(`/categories/${id}`);