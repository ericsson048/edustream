import { useEffect, useMemo, useRef, useState } from 'react';
import { Disc3, Hand, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Radio, SmilePlus, Users, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { liveService, type LiveParticipantItem, type LiveSessionItem } from '../services/liveService';
import { getRtcConfiguration } from '../services/webrtc';

type LiveChatMessage = { id: string; sender_name?: string; content: string; kind?: 'chat' | 'system' };
type LiveSocketPayload = {
  kind?: string;
  content?: string;
  user_name?: string;
  reaction?: string;
  target_user_id?: string;
  participant?: LiveParticipantItem;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type SocketEvent = { payload?: LiveSocketPayload; sender_id?: string };

const QUICK_REACTIONS = ['👍', '👏', '🔥', '🎉', '❤️', '😂'];
type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';
type MediaStatus = { audio: boolean; video: boolean };

function upsertParticipant(list: LiveParticipantItem[], participant: LiveParticipantItem) {
  const index = list.findIndex((item) => item.user === participant.user);
  if (index < 0) return [...list, participant];
  const next = [...list];
  next[index] = { ...next[index], ...participant };
  return next;
}

function shouldInitiate(selfUserId: string, remoteUserId: string) {
  return selfUserId.localeCompare(remoteUserId) < 0;
}

function ParticipantTile({
  participant,
  stream,
  isSelf,
  previewStream,
  isVideoOff,
  isScreenSharing,
  peerStatus,
  mediaStatus,
}: {
  participant: LiveParticipantItem;
  stream?: MediaStream;
  isSelf: boolean;
  previewStream: MediaStream | null;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerStatus: PeerStatus;
  mediaStatus: MediaStatus;
}) {
  const initials = (participant.user_name || 'P').slice(0, 2).toUpperCase();
  const hasRemoteMedia = Boolean(stream && stream.getTracks().length);
  const showSelfVideo = isSelf && previewStream && (!isVideoOff || isScreenSharing);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-4 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950">
        {showSelfVideo ? (
          <video
            autoPlay
            muted
            playsInline
            ref={(node) => {
              if (!node || !previewStream) return;
              node.srcObject = previewStream;
            }}
            className="h-full w-full object-cover"
          />
        ) : hasRemoteMedia ? (
          <video
            autoPlay
            playsInline
            ref={(node) => {
              if (!node || !stream) return;
              node.srcObject = stream;
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">{initials}</div>
              <p className="text-sm font-semibold text-white">{participant.user_name || 'Participant'}</p>
              <p className="mt-1 px-4 text-xs text-slate-300">
                {participant.is_screen_sharing ? "Partage d'ecran annonce" : participant.is_camera_on ? 'Connexion video en cours via WebRTC' : 'Nom et statut visibles'}
              </p>
            </div>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-white">{participant.user_name || 'Participant'}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{participant.role === 'HOST' ? 'Host' : 'Participant'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isSelf ? (
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            peerStatus === 'connected'
              ? 'bg-emerald-500/15 text-emerald-300'
              : peerStatus === 'connecting'
                ? 'bg-amber-500/15 text-amber-300'
                : peerStatus === 'failed'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-slate-700 text-slate-300'
          }`}>
            {peerStatus === 'connected'
              ? 'WebRTC etablie'
              : peerStatus === 'connecting'
                ? 'WebRTC en attente'
                : peerStatus === 'failed'
                  ? 'WebRTC echec'
                  : 'WebRTC idle'}
          </span>
        ) : null}
        {!isSelf ? (
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${mediaStatus.audio ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
            {mediaStatus.audio ? 'Audio recu' : 'Audio absent'}
          </span>
        ) : null}
        {!isSelf ? (
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${mediaStatus.video ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-700 text-slate-300'}`}>
            {mediaStatus.video ? 'Video recue' : 'Video absente'}
          </span>
        ) : null}
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${participant.is_mic_on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{participant.is_mic_on ? 'Mic on' : 'Mic off'}</span>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${participant.is_camera_on || participant.is_screen_sharing ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-700 text-slate-300'}`}>{participant.is_screen_sharing ? 'Screen' : participant.is_camera_on ? 'Cam on' : 'Cam off'}</span>
        {participant.hand_raised ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300">Parole</span> : null}
        {participant.is_recording ? <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-300">Rec</span> : null}
        {participant.last_reaction ? <span className="rounded-full bg-white/10 px-2 py-1 text-sm">{participant.last_reaction}</span> : null}
      </div>
    </div>
  );
}

export default function LiveMeeting() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const rtcConfigRef = useRef<RTCConfiguration>(getRtcConfiguration());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUserRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfUserIdRef = useRef('');
  const remoteAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offeredPeersRef = useRef<Set<string>>(new Set());
  const [session, setSession] = useState<LiveSessionItem | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantItem[]>([]);
  const [selfParticipant, setSelfParticipant] = useState<LiveParticipantItem | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [tab, setTab] = useState<'chat' | 'participants'>('chat');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reactionBanner, setReactionBanner] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStatuses, setPeerStatuses] = useState<Record<string, PeerStatus>>({});
  const [audioEnabled, setAudioEnabled] = useState(false);

  const selfUserId = selfParticipant?.user || '';

  useEffect(() => {
    selfUserIdRef.current = selfUserId;
  }, [selfUserId]);

  const sendSocketPayload = (payload: LiveSocketPayload) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  };

  const syncState = (state: Partial<Pick<LiveParticipantItem, 'is_mic_on' | 'is_camera_on' | 'is_screen_sharing' | 'hand_raised' | 'is_recording'>>) => {
    sendSocketPayload({ kind: 'participant_state', ...state });
  };

  const getVideoTrack = () => {
    const activeStream = screenStreamRef.current || cameraStreamRef.current;
    return activeStream?.getVideoTracks()[0] || null;
  };

  const getAudioTrack = () => cameraStreamRef.current?.getAudioTracks()[0] || null;

  const updatePeerTracks = (peer: RTCPeerConnection) => {
    const audioTrack = getAudioTrack();
    const videoTrack = getVideoTrack();

    const audioSender = peer.getSenders().find((sender) => sender.track?.kind === 'audio');
    const videoSender = peer.getSenders().find((sender) => sender.track?.kind === 'video');

    if (audioTrack) {
      if (audioSender) {
        audioSender.replaceTrack(audioTrack).catch(() => undefined);
      } else {
        peer.addTrack(audioTrack, cameraStreamRef.current!);
      }
    }

    if (videoTrack) {
      if (videoSender) {
        videoSender.replaceTrack(videoTrack).catch(() => undefined);
      } else {
        const sourceStream = screenStreamRef.current || cameraStreamRef.current;
        if (sourceStream) peer.addTrack(videoTrack, sourceStream);
      }
    } else if (videoSender) {
      videoSender.replaceTrack(null).catch(() => undefined);
    }
  };

  const cleanupPeer = (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.close();
      peersRef.current.delete(remoteUserId);
    }
    offeredPeersRef.current.delete(remoteUserId);
    setPeerStatuses((prev) => {
      if (prev[remoteUserId] === 'failed') return prev;
      return { ...prev, [remoteUserId]: 'idle' };
    });
    setRemoteStreams((prev) => {
      if (!(remoteUserId in prev)) return prev;
      const next = { ...prev };
      delete next[remoteUserId];
      return next;
    });
    delete remoteAudioRefs.current[remoteUserId];
  };

  const playRemoteAudio = async (remoteUserId: string, stream?: MediaStream) => {
    const audioEl = remoteAudioRefs.current[remoteUserId];
    const mediaStream = stream || remoteStreams[remoteUserId];
    if (!audioEl || !mediaStream) return;
    audioEl.srcObject = mediaStream;
    audioEl.autoplay = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.muted = false;
    try {
      await audioEl.play();
      setAudioEnabled(true);
    } catch {
      setAudioEnabled(false);
    }
  };

  const renegotiatePeer = async (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (!peer || !selfUserIdRef.current) return;
    if (peer.signalingState !== 'stable') return;
    updatePeerTracks(peer);
    if (!shouldInitiate(selfUserIdRef.current, remoteUserId)) return;
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({
      kind: 'webrtc_offer',
      target_user_id: remoteUserId,
      description: peer.localDescription || offer,
    });
  };

  const ensurePeer = (remoteUserId: string) => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing) return existing;

    const peer = new RTCPeerConnection(rtcConfigRef.current);
    setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
    updatePeerTracks(peer);

    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => ({ ...prev, [remoteUserId]: stream }));
      window.setTimeout(() => {
        playRemoteAudio(remoteUserId, stream).catch(() => undefined);
      }, 0);
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSocketPayload({
        kind: 'webrtc_ice_candidate',
        target_user_id: remoteUserId,
        candidate: event.candidate.toJSON(),
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connected' }));
        return;
      }
      if (['connecting', 'new'].includes(peer.connectionState)) {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
        return;
      }
      if (peer.connectionState === 'failed') {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'failed' }));
        cleanupPeer(remoteUserId);
        return;
      }
      if (['closed', 'disconnected'].includes(peer.connectionState)) {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'idle' }));
        cleanupPeer(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, peer);
    return peer;
  };

  const createOfferFor = async (remoteUserId: string) => {
    if (!selfUserId || offeredPeersRef.current.has(remoteUserId)) return;
    const peer = ensurePeer(remoteUserId);
    offeredPeersRef.current.add(remoteUserId);
    updatePeerTracks(peer);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSocketPayload({
      kind: 'webrtc_offer',
      target_user_id: remoteUserId,
      description: peer.localDescription || offer,
    });
  };

  useEffect(() => {
    if (!id) return;
    let reconnectAttempts = 0;

    async function load() {
      try {
        const sessions = await liveService.listLiveSessions();
        setSession(sessions.find((item) => item.id === id) || null);
        const joined = await liveService.joinSession(id);
        setSelfParticipant(joined);
        setParticipants(await liveService.listParticipants(id));
      } catch {
        showToast('Impossible de rejoindre la session live.', 'error');
        navigate('/schedule', { replace: true });
        return;
      }

      const openSocket = () => {
        if (closedByUserRef.current) return;
        const socket = liveService.createSessionSocket(id);
        socketRef.current = socket;
        setConnectionStatus('connecting');

        socket.onopen = () => {
          reconnectAttempts = 0;
          setConnectionStatus('connected');
          syncState({
            is_mic_on: !isMuted,
            is_camera_on: !isVideoOff,
            is_screen_sharing: isScreenSharing,
            hand_raised: isHandRaised,
            is_recording: isRecording,
          });
        };

        socket.onmessage = async (event) => {
          const { payload, sender_id } = JSON.parse(event.data) as SocketEvent;
          if (!payload) return;

          if (payload.kind === 'participant_joined' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            setPeerStatuses((prev) => ({ ...prev, [payload.participant!.user]: sender_id === selfUserIdRef.current ? 'idle' : (prev[payload.participant!.user] || 'connecting') }));
            if (sender_id && selfUserIdRef.current && sender_id !== selfUserIdRef.current && shouldInitiate(selfUserIdRef.current, sender_id)) {
              createOfferFor(sender_id).catch(() => undefined);
            }
            return;
          }

          if (payload.kind === 'participant_left' && payload.participant?.user) {
            cleanupPeer(payload.participant.user);
            setParticipants((prev) => prev.filter((item) => item.user !== payload.participant?.user));
            return;
          }

          if (payload.kind === 'participant_state' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            return;
          }

          if (payload.kind === 'reaction' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            const label = `${payload.participant.user_name || 'Participant'} ${payload.reaction || payload.participant.last_reaction || ''}`;
            setReactionBanner(label);
            window.setTimeout(() => setReactionBanner((current) => (current === label ? null : current)), 2000);
            return;
          }

          if (payload.kind === 'chat_message' && payload.content) {
            setChatMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, sender_name: payload.user_name, content: payload.content, kind: 'chat' }]);
            return;
          }

          if (!selfUserIdRef.current || !sender_id || sender_id === selfUserIdRef.current) return;
          if (payload.target_user_id !== selfUserIdRef.current) return;

          if (payload.kind === 'webrtc_offer' && payload.description) {
            const peer = ensurePeer(sender_id);
            updatePeerTracks(peer);
            await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            sendSocketPayload({
              kind: 'webrtc_answer',
              target_user_id: sender_id,
              description: peer.localDescription || answer,
            });
            return;
          }

          if (payload.kind === 'webrtc_answer' && payload.description) {
            const peer = ensurePeer(sender_id);
            await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
            return;
          }

          if (payload.kind === 'webrtc_ice_candidate' && payload.candidate) {
            const peer = ensurePeer(sender_id);
            await peer.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => undefined);
          }
        };

        socket.onclose = () => {
          if (closedByUserRef.current) return;
          reconnectAttempts += 1;
          setConnectionStatus('syncing');
          reconnectTimerRef.current = window.setTimeout(openSocket, Math.min(1500 * reconnectAttempts, 6000));
        };
        socket.onerror = () => socket.close();
      };

      openSocket();
    }

    load();
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      peersRef.current.forEach((_, remoteUserId) => cleanupPeer(remoteUserId));
    };
  }, [id, navigate, showToast]);

  useEffect(() => {
    closedByUserRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(async () => {
      try {
        const fresh = await liveService.listParticipants(id);
        setParticipants(fresh);
      } catch {
        return;
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    async function setupMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("Votre navigateur ne supporte pas l'acces camera/micro.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraStreamRef.current = stream;
        previewStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        peersRef.current.forEach((_, remoteUserId) => {
          renegotiatePeer(remoteUserId).catch(() => undefined);
        });
      } catch {
        setMediaError("Autorise la camera et le micro pour diffuser ton apercu local.");
      }
    }
    setupMedia();
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    cameraStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
    syncState({ is_mic_on: !isMuted });
    peersRef.current.forEach((_, remoteUserId) => {
      renegotiatePeer(remoteUserId).catch(() => undefined);
    });
  }, [isMuted]);

  useEffect(() => {
    cameraStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoOff;
    });
    syncState({ is_camera_on: !isVideoOff });
    peersRef.current.forEach((_, remoteUserId) => {
      renegotiatePeer(remoteUserId).catch(() => undefined);
    });
  }, [isVideoOff]);

  useEffect(() => {
    syncState({ hand_raised: isHandRaised });
  }, [isHandRaised]);

  useEffect(() => {
    syncState({ is_screen_sharing: isScreenSharing });
    peersRef.current.forEach((peer) => updatePeerTracks(peer));
    peersRef.current.forEach((_, remoteUserId) => {
      renegotiatePeer(remoteUserId).catch(() => undefined);
    });
  }, [isScreenSharing]);

  useEffect(() => {
    syncState({ is_recording: isRecording });
  }, [isRecording]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([remoteUserId, stream]) => {
      playRemoteAudio(remoteUserId, stream).catch(() => undefined);
    });
  }, [remoteStreams]);

  useEffect(() => {
    if (!selfUserId || socketRef.current?.readyState !== WebSocket.OPEN) return;
    visibleParticipants
      .filter((participant) => participant.user !== selfUserId)
      .forEach((participant) => {
        ensurePeer(participant.user);
        if (shouldInitiate(selfUserId, participant.user)) {
          createOfferFor(participant.user).catch(() => undefined);
        }
      });
  }, [participants, selfUserId]);

  const visibleParticipants = useMemo(() => {
    const next = [...participants];
    if (selfParticipant) {
      const index = next.findIndex((item) => item.user === selfParticipant.user);
      if (index >= 0) next.splice(index, 1);
      next.unshift({
        ...selfParticipant,
        is_mic_on: !isMuted,
        is_camera_on: !isVideoOff,
        is_screen_sharing: isScreenSharing,
        hand_raised: isHandRaised,
        is_recording: isRecording,
      });
    }
    return next.filter((participant) => !participant.left_at);
  }, [isHandRaised, isMuted, isRecording, isScreenSharing, isVideoOff, participants, selfParticipant]);

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    sendSocketPayload({ kind: 'chat_message', content: chatInput.trim() });
    setChatInput('');
  };

  const sendReaction = (reaction: string) => {
    sendSocketPayload({ kind: 'reaction', reaction });
  };

  const enableRemoteAudio = () => {
    Object.entries(remoteStreams).forEach(([remoteUserId, stream]) => {
      playRemoteAudio(remoteUserId, stream).catch(() => undefined);
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      previewStreamRef.current = cameraStreamRef.current;
      if (localVideoRef.current) localVideoRef.current.srcObject = cameraStreamRef.current;
      setIsScreenSharing(false);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      previewStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsScreenSharing(true);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      const [track] = stream.getVideoTracks();
      if (track) {
        track.onended = () => {
          screenStreamRef.current = null;
          previewStreamRef.current = cameraStreamRef.current;
          if (localVideoRef.current) localVideoRef.current.srcObject = cameraStreamRef.current;
          setIsScreenSharing(false);
          peersRef.current.forEach((peer) => updatePeerTracks(peer));
        };
      }
    } catch {
      showToast("Le partage d'ecran a ete annule.", 'error');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    const stream = previewStreamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') {
      showToast("L'enregistrement n'est pas disponible sur ce navigateur.", 'error');
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      if (!chunksRef.current.length) return;
      const url = URL.createObjectURL(new Blob(chunksRef.current, { type: 'video/webm' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `edustream-live-${id}.webm`;
      link.click();
      URL.revokeObjectURL(url);
    };
    recorder.start();
    setIsRecording(true);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-8 py-5">
          <div>
            <h1 className="text-2xl font-bold">{session?.title || 'Live Session'}</h1>
            <p className="mt-1 text-sm text-slate-400">{session?.course_title || 'Course'} - {visibleParticipants.length} participant(s)</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400"><Radio className="h-4 w-4" />{session?.status || 'LIVE'}</div>
            {!audioEnabled && Object.keys(remoteStreams).length > 0 ? (
              <button onClick={enableRemoteAudio} className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200">
                Activer l'audio distant
              </button>
            ) : null}
            {reactionBanner ? <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">{reactionBanner}</div> : null}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-[1fr,320px]">
          <section className="flex flex-col">
            <div className="grid flex-1 gap-5 p-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
              <div className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-900">
                <video ref={localVideoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${isVideoOff && !isScreenSharing ? 'opacity-0' : 'opacity-100'}`} />
                <div className="absolute left-6 top-6 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm backdrop-blur">
                  <p className="font-semibold">{isScreenSharing ? "Ton ecran partage" : 'Ton flux local'}</p>
                  <p className="mt-1 text-xs text-slate-300">{mediaError || (connectionStatus === 'connected' ? 'Connexion temps reel active' : connectionStatus === 'connecting' ? 'Connexion en cours...' : 'Sync automatique active')}</p>
                </div>
                <div className="absolute right-6 top-6 flex flex-wrap gap-2">
                  {isHandRaised ? <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">Main levee</span> : null}
                  {isScreenSharing ? <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300">Partage ecran</span> : null}
                  {isRecording ? <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">Rec local</span> : null}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-800 bg-[#0b1220] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Participants visibles</p>
                    <p className="mt-1 text-xs text-slate-400">Flux WebRTC, role, reactions, partage d'ecran et demande de parole.</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">{visibleParticipants.length}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleParticipants.slice(0, 6).map((participant) => (
                    <div key={participant.id}>
                      <ParticipantTile
                        participant={participant}
                        stream={remoteStreams[participant.user]}
                        isSelf={participant.user === selfUserId}
                        previewStream={previewStreamRef.current}
                        isVideoOff={isVideoOff}
                        isScreenSharing={isScreenSharing}
                        peerStatus={participant.user === selfUserId ? 'connected' : (peerStatuses[participant.user] || 'idle')}
                        mediaStatus={{
                          audio: Boolean(remoteStreams[participant.user]?.getAudioTracks().some((track) => track.readyState === 'live')),
                          video: Boolean(remoteStreams[participant.user]?.getVideoTracks().some((track) => track.readyState === 'live')),
                        }}
                      />
                      {participant.user !== selfUserId ? (
                        <audio
                          ref={(node) => {
                            remoteAudioRefs.current[participant.user] = node;
                            if (node && remoteStreams[participant.user]) {
                              node.srcObject = remoteStreams[participant.user];
                            }
                          }}
                          autoPlay
                          playsInline
                          className="hidden"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 px-8 py-5">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => setIsMuted((value) => !value)} className={`grid h-12 w-12 place-items-center rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'}`}>{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>
                <button onClick={() => setIsVideoOff((value) => !value)} className={`grid h-12 w-12 place-items-center rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'}`}>{isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}</button>
                <button onClick={toggleScreenShare} className={`grid h-12 w-12 place-items-center rounded-full ${isScreenSharing ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-200'}`}><MonitorUp className="h-5 w-5" /></button>
                <button onClick={toggleRecording} className={`grid h-12 w-12 place-items-center rounded-full ${isRecording ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-200'}`}><Disc3 className={`h-5 w-5 ${isRecording ? 'animate-spin' : ''}`} /></button>
                <button onClick={() => setIsHandRaised((value) => !value)} className={`grid h-12 w-12 place-items-center rounded-full ${isHandRaised ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-200'}`}><Hand className="h-5 w-5" /></button>
                <button onClick={() => navigate('/schedule')} className="grid h-12 w-14 place-items-center rounded-2xl bg-red-600 text-white"><PhoneOff className="h-5 w-5" /></button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300"><SmilePlus className="h-4 w-4" />Reagir vite</span>
                {QUICK_REACTIONS.map((reaction) => <button key={reaction} onClick={() => sendReaction(reaction)} className="rounded-full bg-slate-800 px-3 py-2 text-lg hover:bg-slate-700">{reaction}</button>)}
              </div>
            </div>
          </section>

          <aside className="flex flex-col border-l border-slate-800 bg-slate-900">
            <div className="flex gap-2 border-b border-slate-800 p-2">
              <button onClick={() => setTab('chat')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><MessageSquare className="mr-2 inline h-4 w-4" />Chat</button>
              <button onClick={() => setTab('participants')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'participants' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><Users className="mr-2 inline h-4 w-4" />People</button>
            </div>
            {tab === 'chat' ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {chatMessages.length === 0 ? <p className="text-sm text-slate-500">Aucun message pour le moment.</p> : null}
                  {chatMessages.map((message) => <div key={message.id} className={`rounded-2xl p-3 ${message.kind === 'system' ? 'bg-amber-500/10' : 'bg-slate-800'}`}><p className={`text-xs font-bold uppercase tracking-wide ${message.kind === 'system' ? 'text-amber-300' : 'text-slate-500'}`}>{message.kind === 'system' ? 'SYSTEME' : message.sender_name || 'Participant'}</p><p className="mt-1 text-sm text-slate-200">{message.content}</p></div>)}
                </div>
                <div className="border-t border-slate-800 p-4">
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChatMessage(); }} placeholder="Ecrire un message..." className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={sendChatMessage} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {visibleParticipants.map((participant) => <div key={participant.id} className="rounded-2xl bg-slate-800 p-3"><p className="text-sm font-bold text-slate-100">{participant.user_name || 'Participant'}</p><p className="text-xs text-slate-500">{participant.role}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${participant.user === selfUserId ? 'bg-emerald-500/15 text-emerald-300' : (peerStatuses[participant.user] || 'idle') === 'connected' ? 'bg-emerald-500/15 text-emerald-300' : (peerStatuses[participant.user] || 'idle') === 'connecting' ? 'bg-amber-500/15 text-amber-300' : (peerStatuses[participant.user] || 'idle') === 'failed' ? 'bg-red-500/15 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{participant.user === selfUserId ? 'toi' : (peerStatuses[participant.user] || 'idle') === 'connected' ? 'webrtc ok' : (peerStatuses[participant.user] || 'idle') === 'connecting' ? 'webrtc attente' : (peerStatuses[participant.user] || 'idle') === 'failed' ? 'webrtc echec' : 'webrtc idle'}</span>{participant.hand_raised ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300">parole</span> : null}{participant.is_screen_sharing ? <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-bold text-sky-300">ecran</span> : null}{participant.last_reaction ? <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white">{participant.last_reaction}</span> : null}</div></div>)}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
