import api, { setCsrfToken, clearCsrfToken } from "./api";

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function register({ name, email, password }) {
  const { data } = await api.post("/auth/register", { name, email, password });
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearCsrfToken();
  }
}