import axios from "axios";
import { getDefaultStore } from "jotai";
import { tokenAtom } from "@/atoms";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const rawToken = localStorage.getItem("ci_token");
  if (rawToken) {
    try {
      const token = JSON.parse(rawToken);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // fallback if not a valid JSON string
      config.headers.Authorization = `Bearer ${rawToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const store = getDefaultStore();
      store.set(tokenAtom, null);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post("/auth/login", data),
  register:       (data) => api.post("/auth/register", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  me:             ()     => api.get("/auth/me"),
  updateProfile:  (data) => api.put("/auth/me", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// ── Dashboard ───────────────────────────────────────────────────────
export const dashboardApi = {
  get: (params) => api.get("/dashboard", { params }),
};

// ── Products ────────────────────────────────────────────────────────
export const productsApi = {
  list:           (params) => api.get("/products", { params }),
  get:            (id)     => api.get(`/products/${id}`),
  create:         (data)   => api.post("/products", data),
  update:         (id, data) => api.put(`/products/${id}`, data),
  delete:         (id)     => api.delete(`/products/${id}`),
  stock:          (id)     => api.get(`/products/${id}/stock`),
  history:        (id, params) => api.get(`/products/${id}/history`, { params }),
  categories:     ()       => api.get("/products/categories"),
  createCategory: (data)   => api.post("/products/categories", data),
  updateCategory: (id, data) => api.put(`/products/categories/${id}`, data),
  deleteCategory: (id)     => api.delete(`/products/categories/${id}`),
  upsertReorder:  (id, data) => api.post(`/products/${id}/reorder-rules`, data),
};

// ── Warehouses ──────────────────────────────────────────────────────
export const warehousesApi = {
  list:           ()       => api.get("/warehouses"),
  get:            (id)     => api.get(`/warehouses/${id}`),
  create:         (data)   => api.post("/warehouses", data),
  update:         (id, data) => api.put(`/warehouses/${id}`, data),
  delete:         (id)     => api.delete(`/warehouses/${id}`),
  stock:          (id, params) => api.get(`/warehouses/${id}/stock`, { params }),
  locations:      (wid)    => api.get(`/warehouses/${wid}/locations`),
  createLocation: (wid, data) => api.post(`/warehouses/${wid}/locations`, data),
  updateLocation: (wid, lid, data) => api.put(`/warehouses/${wid}/locations/${lid}`, data),
  deleteLocation: (wid, lid) => api.delete(`/warehouses/${wid}/locations/${lid}`),
};

// ── Receipts ────────────────────────────────────────────────────────
export const receiptsApi = {
  list:           (params) => api.get("/receipts", { params }),
  get:            (id)     => api.get(`/receipts/${id}`),
  create:         (data)   => api.post("/receipts", data),
  update:         (id, data) => api.put(`/receipts/${id}`, data),
  validate:       (id, data) => api.post(`/receipts/${id}/validate`, data),
  cancel:         (id)     => api.post(`/receipts/${id}/cancel`),
  suppliers:      ()       => api.get("/receipts/suppliers"),
  createSupplier: (data)   => api.post("/receipts/suppliers", data),
};

// ── Deliveries ──────────────────────────────────────────────────────
export const deliveriesApi = {
  list:     (params) => api.get("/deliveries", { params }),
  get:      (id)     => api.get(`/deliveries/${id}`),
  create:   (data)   => api.post("/deliveries", data),
  update:   (id, data) => api.put(`/deliveries/${id}`, data),
  pick:     (id)     => api.post(`/deliveries/${id}/pick`),
  pack:     (id)     => api.post(`/deliveries/${id}/pack`),
  validate: (id)     => api.post(`/deliveries/${id}/validate`),
  cancel:   (id)     => api.post(`/deliveries/${id}/cancel`),
};

// ── Transfers ───────────────────────────────────────────────────────
export const transfersApi = {
  list:     (params) => api.get("/transfers", { params }),
  get:      (id)     => api.get(`/transfers/${id}`),
  create:   (data)   => api.post("/transfers", data),
  update:   (id, data) => api.put(`/transfers/${id}`, data),
  validate: (id)     => api.post(`/transfers/${id}/validate`),
  cancel:   (id)     => api.post(`/transfers/${id}/cancel`),
};

// ── Adjustments ─────────────────────────────────────────────────────
export const adjustmentsApi = {
  list:     (params) => api.get("/adjustments", { params }),
  get:      (id)     => api.get(`/adjustments/${id}`),
  create:   (data)   => api.post("/adjustments", data),
  update:   (id, data) => api.put(`/adjustments/${id}`, data),
  validate: (id)     => api.post(`/adjustments/${id}/validate`),
  cancel:   (id)     => api.post(`/adjustments/${id}/cancel`),
};

// ── Ledger ──────────────────────────────────────────────────────────
export const ledgerApi = {
  list:    (params) => api.get("/ledger", { params }),
  summary: (params) => api.get("/ledger/summary", { params }),
};

// ── Users ───────────────────────────────────────────────────────────
export const usersApi = {
  list:          (params) => api.get("/users", { params }),
  get:           (id)     => api.get(`/users/${id}`),
  create:        (data)   => api.post("/users", data),
  update:        (id, data) => api.put(`/users/${id}`, data),
  delete:        (id)     => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};
