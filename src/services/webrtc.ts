type IceServerEnv = {
  urls: string[];
  username?: string;
  credential?: string;
};

function splitCsv(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLocalRtcConfiguration(): RTCConfiguration {
  const urls = splitCsv(import.meta.env.VITE_WEBRTC_ICE_SERVERS);
  const username = import.meta.env.VITE_WEBRTC_ICE_USERNAME as string | undefined;
  const credential = import.meta.env.VITE_WEBRTC_ICE_CREDENTIAL as string | undefined;

  const servers: IceServerEnv[] = urls.length
    ? [{ urls, username, credential }]
    : [{ urls: ['stun:stun.l.google.com:19302'] }];

  return {
    iceServers: servers.map((server) => ({
      urls: server.urls,
      username: server.username,
      credential: server.credential,
    })),
  };
}

let cachedConfig: RTCConfiguration | null = null;

export async function fetchRtcConfiguration(): Promise<RTCConfiguration> {
  if (cachedConfig) return cachedConfig;
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
    const { tokenStorage } = await import('./tokenStorage');
    const token = tokenStorage.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseURL}/live-sessions/ice-config/`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.iceServers?.length) {
        cachedConfig = { iceServers: data.iceServers };
        return cachedConfig;
      }
    }
  } catch { /* fallback to local */ }
  cachedConfig = getLocalRtcConfiguration();
  return cachedConfig;
}

export function getRtcConfiguration(): RTCConfiguration {
  return cachedConfig || getLocalRtcConfiguration();
}
