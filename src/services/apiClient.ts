import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const access = tokenStorage.getAccessToken();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refresh = tokenStorage.getRefreshToken();
    if (!refresh) {
      tokenStorage.clearTokens();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const refreshResponse = await axios.post(`${baseURL}/auth/refresh/`, { refresh });
      const newAccess = refreshResponse.data?.access as string | undefined;
      if (!newAccess) {
        tokenStorage.clearTokens();
        return Promise.reject(error);
      }
      tokenStorage.setTokens(newAccess, refresh);
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      tokenStorage.clearTokens();
      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.') {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (detail && typeof detail === 'object') {
      const record = detail as Record<string, unknown>;
      if (typeof record.detail === 'string' && record.detail.trim()) return record.detail;
      if (typeof record.message === 'string' && record.message.trim()) return record.message;
      const firstValue = Object.values(record)[0];
      if (typeof firstValue === 'string' && firstValue.trim()) return firstValue;
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
