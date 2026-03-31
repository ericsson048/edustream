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

export function getRtcConfiguration(): RTCConfiguration {
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
