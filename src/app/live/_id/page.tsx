import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { liveService, type LiveParticipantItem, type LiveSessionItem } from '../../../services/liveService';
import { getRtcConfiguration } from '../../../services/webrtc';
import VideoGrid from './components/VideoGrid';
import Toolbar from './components/Toolbar';
import ChatPanel from './components/ChatPanel';

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
type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

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

export default function LiveMeeting() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const rtcConfigRef = useRef<RTCConfiguration>(getRtcConfiguration());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUserRef = useRef(false);
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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStatuses, setPeerStatuses] = useState<Record<string, PeerStatus>>({});
  const [chatOpen, setChatOpen] = useState(false);

  const selfUserId = selfParticipant?.user || '';

  useEffect(() => { selfUserIdRef.current = selfUserId; }, [selfUserId]);

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
    const audioSender = peer.getSenders().find((s) => s.track?.kind === 'audio');
    const videoSender = peer.getSenders().find((s) => s.track?.kind === 'video');

    if (audioTrack) {
      if (audioSender) audioSender.replaceTrack(audioTrack).catch(() => undefined);
      else if (cameraStreamRef.current) peer.addTrack(audioTrack, cameraStreamRef.current);
    }
    if (videoTrack) {
      if (videoSender) videoSender.replaceTrack(videoTrack).catch(() => undefined);
      else {
        const src = screenStreamRef.current || cameraStreamRef.current;
        if (src) peer.addTrack(videoTrack, src);
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
      } else if (['connecting', 'new'].includes(peer.connectionState)) {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'connecting' }));
      } else if (peer.connectionState === 'failed') {
        setPeerStatuses((prev) => ({ ...prev, [remoteUserId]: 'failed' }));
        cleanupPeer(remoteUserId);
      } else if (['closed', 'disconnected'].includes(peer.connectionState)) {
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

  // Session + WebSocket
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
        showToast('Unable to join live session.', 'error');
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
            setPeerStatuses((prev) => ({
              ...prev,
              [payload.participant!.user]: sender_id === selfUserIdRef.current ? 'idle' : (prev[payload.participant!.user] || 'connecting'),
            }));
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
            return;
          }

          if (payload.kind === 'chat_message' && payload.content) {
            setChatMessages((prev) => [
              ...prev,
              { id: `${Date.now()}-${prev.length}`, sender_name: payload.user_name, content: payload.content, kind: 'chat' },
            ]);
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
      peersRef.current.forEach((_, uid) => cleanupPeer(uid));
    };
  }, [id, navigate, showToast]);

  useEffect(() => { closedByUserRef.current = false; }, [id]);

  // Poll participants
  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(async () => {
      try { setParticipants(await liveService.listParticipants(id)); } catch { /* noop */ }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [id]);

  // Media setup
  useEffect(() => {
    async function setupMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Your browser does not support camera/mic access.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraStreamRef.current = stream;
        previewStreamRef.current = stream;
        peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
      } catch {
        setMediaError('Allow camera and mic to broadcast your preview.');
      }
    }
    setupMedia();
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    };
  }, []);

  // Sync mic state
  useEffect(() => {
    cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
    syncState({ is_mic_on: !isMuted });
    peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
  }, [isMuted]);

  // Sync video state
  useEffect(() => {
    cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !isVideoOff; });
    syncState({ is_camera_on: !isVideoOff });
    peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
  }, [isVideoOff]);

  useEffect(() => { syncState({ hand_raised: isHandRaised }); }, [isHandRaised]);

  useEffect(() => {
    syncState({ is_screen_sharing: isScreenSharing });
    peersRef.current.forEach((peer) => updatePeerTracks(peer));
    peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
  }, [isScreenSharing]);

  useEffect(() => { syncState({ is_recording: isRecording }); }, [isRecording]);

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
    return next.filter((p) => !p.left_at);
  }, [isHandRaised, isMuted, isRecording, isScreenSharing, isVideoOff, participants, selfParticipant]);

  // Ensure peers for all visible participants
  useEffect(() => {
    if (!selfUserId || socketRef.current?.readyState !== WebSocket.OPEN) return;
    visibleParticipants
      .filter((p) => p.user !== selfUserId)
      .forEach((p) => {
        ensurePeer(p.user);
        if (shouldInitiate(selfUserId, p.user)) createOfferFor(p.user).catch(() => undefined);
      });
  }, [participants, selfUserId]);

  const sendChatMessage = (content: string) => {
    sendSocketPayload({ kind: 'chat_message', content });
  };

  const sendReaction = (reaction: string) => {
    sendSocketPayload({ kind: 'reaction', reaction });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      previewStreamRef.current = cameraStreamRef.current;
      setIsScreenSharing(false);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      previewStreamRef.current = stream;
      setIsScreenSharing(true);
      peersRef.current.forEach((peer) => updatePeerTracks(peer));
      const [track] = stream.getVideoTracks();
      if (track) {
        track.onended = () => {
          screenStreamRef.current = null;
          previewStreamRef.current = cameraStreamRef.current;
          setIsScreenSharing(false);
          peersRef.current.forEach((peer) => updatePeerTracks(peer));
        };
      }
    } catch {
      showToast('Screen share was cancelled.', 'error');
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
      showToast('Recording is not available on this browser.', 'error');
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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

  const handleLeave = () => navigate('/schedule');

  return (
    <div className="relative h-screen bg-slate-950 text-white overflow-hidden">
      {/* Top bar - shows on hover */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-white">{session?.title || 'Live Session'}</h1>
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <Radio className="h-3 w-3" />
            {session?.status || 'LIVE'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{visibleParticipants.length} participant(s)</span>
          {connectionStatus !== 'connected' && (
            <span className="text-xs text-amber-400">
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
            </span>
          )}
        </div>
      </div>

      {/* Media error banner */}
      {mediaError && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center">
          <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-full px-4 py-2 text-xs text-amber-300">
            {mediaError}
          </div>
        </div>
      )}

      {/* Video grid */}
      <div className="h-full pb-20">
        <VideoGrid
          participants={visibleParticipants}
          remoteStreams={remoteStreams}
          selfUserId={selfUserId}
          previewStream={previewStreamRef.current}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          peerStatuses={peerStatuses}
          remoteAudioRefs={remoteAudioRefs}
        />
      </div>

      {/* Bottom toolbar */}
      <Toolbar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        isHandRaised={isHandRaised}
        onToggleMute={() => setIsMuted((v) => !v)}
        onToggleVideo={() => setIsVideoOff((v) => !v)}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleHand={() => setIsHandRaised((v) => !v)}
        onReaction={sendReaction}
        onLeave={handleLeave}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
        participantCount={visibleParticipants.length}
      />

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute inset-y-0 right-0 z-40">
          <ChatPanel
            messages={chatMessages}
            participants={visibleParticipants}
            selfUserId={selfUserId}
            peerStatuses={peerStatuses}
            onSend={sendChatMessage}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
