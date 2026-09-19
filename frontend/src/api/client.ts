import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("axum_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
