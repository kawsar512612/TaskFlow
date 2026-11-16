import api from "./api";

export const getStats = () => api.get("/stats").then((r) => r.data.stats);