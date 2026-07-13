import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.204.215.26:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('edustream_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('edustream_refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        await SecureStore.setItemAsync('edustream_access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(original);
      } catch {
        await SecureStore.deleteItemAsync('edustream_access_token');
        await SecureStore.deleteItemAsync('edustream_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);
