const ACCESS_TOKEN_KEY = 'edustream_access_token';
const REFRESH_TOKEN_KEY = 'edustream_refresh_token';

// sessionStorage (not localStorage): tokens do not survive a browser restart,
// reducing the window in which a stolen/XSS-exfiltrated token can be used.
const store = typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;

export const tokenStorage = {
  getAccessToken(): string | null {
    return store?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },
  getRefreshToken(): string | null {
    return store?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },
  setTokens(access: string, refresh: string): void {
    store?.setItem(ACCESS_TOKEN_KEY, access);
    store?.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clearTokens(): void {
    store?.removeItem(ACCESS_TOKEN_KEY);
    store?.removeItem(REFRESH_TOKEN_KEY);
  },
};
