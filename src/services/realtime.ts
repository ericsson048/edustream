import { tokenStorage } from './tokenStorage';

function getApiOrigin() {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
  return new URL(baseURL).origin;
}

export function buildWebSocketUrl(path: string) {
  const origin = getApiOrigin();
  const wsProtocol = origin.startsWith('https://') ? 'wss://' : 'ws://';
  const token = tokenStorage.getAccessToken();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${wsProtocol}${origin.replace(/^https?:\/\//, '')}${normalizedPath}`);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}
