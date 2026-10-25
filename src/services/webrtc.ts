import { apiClient } from './apiClient';

type IceServerEnv = {
  urls: string[];
};

function splitCsv(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLocalRtcConfiguration(): RTCConfiguration {
  const urls = splitCsv(import.meta.env.VITE_WEBRTC_ICE_SERVERS);
  const servers: IceServerEnv[] = urls.length
    ? [{ urls }]
    : [{ urls: ['stun:stun.l.google.com:19302'] }];

  return {
    iceServers: servers.map((server) => ({ urls: server.urls })),
  };
}

let cachedConfig: RTCConfiguration | null = null;

export async function fetchRtcConfiguration(): Promise<RTCConfiguration> {
  if (cachedConfig) return cachedConfig;
  try {
    const { data } = await apiClient.get<{ iceServers?: RTCIceServer[] }>('/live-sessions/ice-config/');
    if (data.iceServers?.length) {
      cachedConfig = { iceServers: data.iceServers };
      return cachedConfig;
    }
  } catch { /* fallback to local */ }
  cachedConfig = getLocalRtcConfiguration();
  return cachedConfig;
}

export function getRtcConfiguration(): RTCConfiguration {
  return cachedConfig || getLocalRtcConfiguration();
}
