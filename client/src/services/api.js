import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let csrfToken = null;
let pending = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function clearCsrfToken() {
  csrfToken = null;
}

function ensureCsrfToken() {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!pending) {
    pending = api
      .get("/auth/csrf")
      .then((res) => {
        csrfToken = res.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

const UNSAFE_METHODS = ["post", "put", "patch", "delete"];

api.interceptors.request.use(async (config) => {
  if (UNSAFE_METHODS.includes((config.method || "get").toLowerCase())) {
    config.headers["X-CSRF-Token"] = await ensureCsrfToken();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    if (
      response.status === 403 &&
      response.data?.message === "Invalid CSRF token" &&
      !config._csrfRetried
    ) {
      config._csrfRetried = true;
      clearCsrfToken();
      return api(config);
    }

    if (response.status === 401 && !String(config.url).startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth:expired"));
    }

    return Promise.reject(error);
  }
);

export default api;