import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// =======================
// AUTH
// =======================
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me")
};

// =======================
// NOTES
// =======================
export const notesApi = {
  list: () => api.get("/notes"),
  get: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
};

// =======================
// TAGS
// =======================
export const tagsApi = {
  list: () => api.get("/tags"),
  create: (data) => api.post("/tags", data),
  delete: (id) => api.delete(`/tags/${id}`)
};

export default api;