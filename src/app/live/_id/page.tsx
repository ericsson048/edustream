import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Share2, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { liveService, type LiveParticipantItem, type LiveSessionItem } from '../../../services/liveService';
import { getRtcConfiguration, fetchRtcConfiguration } from '../../../services/webrtc';
import { tokenStorage } from '../../../services/tokenStorage';
import axios from 'axios';
import VideoGrid from './components/VideoGrid';
import Toolbar from './components/Toolbar';
import ChatPanel from './components/ChatPanel';
import { useCompositeRecording } from './components/useCompositeRecording';

type LiveChatMessage = { id: string; sender_id?: string; sender_name?: string; content: string; kind?: 'chat' | 'system' };
type LiveSocketPayload = {
  kind?: string;
  content?: string;
  user_name?: string;
  user_id?: string;
  reaction?: string;
  target_user_id?: string;
  participant?: LiveParticipantItem;
  participants?: LiveParticipantItem[];
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  status?: string;
};
type SocketEvent = { payload?: LiveSocketPayload; sender_id?: string };
type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

function upsertParticipant(list: LiveParticipantItem[], participant: LiveParticipantItem) {
  const index = list.findIndex((item) => item.user === participant.user);
  const next = [...list];
  if (index < 0) {
    return [...list, participant];
  }
  if (next[index].id !== participant.id) {
    console.warn('[upsertParticipant] replacing participant', next[index].id, 'with', participant.id, 'for user', participant.user);
  }
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
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const offeredPeersRef = useRef<Set<string>>(new Set());

  const [session, setSession] = useState<LiveSessionItem | null>(null);
  const [participants, setParticipants] = useState<LiveParticipantItem[]>([]);
  const [selfParticipant, setSelfParticipant] = useState<LiveParticipantItem | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStatuses, setPeerStatuses] = useState<Record<string, PeerStatus>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const mediaReadyRef = useRef(false);
  const [pendingEntries, setPendingEntries] = useState<LiveParticipantItem[]>([]);
  const [showEntriesPanel, setShowEntriesPanel] = useState(false);
  const [waitingEntry, setWaitingEntry] = useState(false);
  const [admitted, setAdmitted] = useState(true);

  const selfUserId = selfParticipant?.user || '';
  const isHost = selfParticipant?.role === 'HOST';
  const isHostOrCohost = isHost || selfParticipant?.role === 'CO_HOST';

  const { isRecording, isUploading, startRecording, stopRecording, cleanup: cleanupRecording } = useCompositeRecording({
    sessionId: id,
    remoteStreams,
    localStream: cameraStreamRef.current,
  });

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
        await fetchRtcConfiguration();
        const sessions = await liveService.listLiveSessions();
        const found = sessions.find((item) => item.id === id) || null;
        setSession(found);

        if (!found || found.status === 'ENDED') {
          showToast('Session is not available.', 'error');
          navigate('/schedule', { replace: true });
          return;
        }

        const joined = await liveService.joinSession(id);
        setSelfParticipant(joined);
        setAdmitted(joined.is_admitted !== false);

        const [participantList, chatHistory] = await Promise.all([
          liveService.listParticipants(id),
          liveService.listChatMessages(id),
        ]);
        setParticipants(participantList);
        const historyMessages: LiveChatMessage[] = chatHistory.map((m) => ({ id: m.id, sender_id: m.user, sender_name: m.user_name, content: m.content, kind: 'chat' as const }));
        setChatMessages((prev) => {
          const seen = new Set(prev.map((m) => `${m.sender_id}:${m.content}`));
          const unique = historyMessages.filter((m) => !seen.has(`${m.sender_id}:${m.content}`));
          return [...unique, ...prev];
        });

        if (isHostOrCohost && found.requires_permission) {
          liveService.pendingEntries(id).then(setPendingEntries).catch(() => {});
        }
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

          if (payload.kind === 'session_live') {
            setSession((prev) => prev ? { ...prev, status: 'LIVE' } : prev);
            showToast('The host started the session.', 'info');
            return;
          }

          if (payload.kind === 'session_not_available') {
            showToast('Session is not available.', 'error');
            navigate('/schedule');
            return;
          }

          if (payload.kind === 'session_ended') {
            showToast('The host ended this session.', 'info');
            navigate('/schedule');
            return;
          }

          if (payload.kind === 'entry_requested' && payload.participant) {
            if (isHostOrCohost) {
              setPendingEntries((prev) => upsertParticipant(prev, payload.participant!));
              showToast(`${payload.participant.user_name || 'Someone'} wants to join.`, 'info');
            } else if (payload.participant.user === selfUserIdRef.current) {
              setWaitingEntry(true);
              setAdmitted(false);
            }
            return;
          }

          if (payload.kind === 'entry_granted' && payload.participant) {
            if (payload.participant.user === selfUserIdRef.current) {
              setAdmitted(true);
              setWaitingEntry(false);
              showToast('You have been admitted.', 'success');
            }
            setPendingEntries((prev) => prev.filter((p) => p.user !== payload.participant?.user));
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            return;
          }

          if (payload.kind === 'entry_denied' && payload.user_id) {
            if (payload.user_id === selfUserIdRef.current) {
              showToast('Your entry was denied.', 'error');
              navigate('/schedule');
              return;
            }
            setPendingEntries((prev) => prev.filter((p) => p.user !== payload.user_id));
            return;
          }

          if (payload.kind === 'sent_to_waiting' && payload.participant) {
            if (payload.participant.user === selfUserIdRef.current) {
              setAdmitted(false);
              showToast('You have been sent to the waiting room.', 'info');
            }
            setParticipants((prev) => prev.filter((p) => p.user !== payload.participant?.user));
            return;
          }

          if (payload.kind === 'cohost_added' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            return;
          }

          if (payload.kind === 'participant_joined' && payload.participant) {
            setParticipants((prev) => upsertParticipant(prev, payload.participant!));
            setPeerStatuses((prev) => ({
              ...prev,
              [payload.participant!.user]: sender_id === selfUserIdRef.current ? 'idle' : (prev[payload.participant!.user] || 'connecting'),
            }));
            if (sender_id && selfUserIdRef.current && sender_id !== selfUserIdRef.current && mediaReadyRef.current && shouldInitiate(selfUserIdRef.current, sender_id)) {
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
            setChatMessages((prev) => {
              const isDuplicate = prev.some(
                (m) => m.content === payload.content && m.sender_id === payload.user_id && Date.now() - parseInt(m.id.split('-')[0] || '0', 10) < 2000,
              );
              if (isDuplicate) return prev;
              return [
                ...prev,
                { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, sender_id: payload.user_id, sender_name: payload.user_name, content: payload.content, kind: 'chat' },
              ];
            });
            return;
          }

          if (payload.kind === 'mute_all' && sender_id !== selfUserIdRef.current) {
            setIsMuted(true);
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
    if (!id || !tokenStorage.getAccessToken()) return;
    const interval = window.setInterval(async () => {
      try {
        const fresh = await liveService.listParticipants(id);
        const seen = new Map<string, number>();
        fresh.forEach((p) => {
          const count = (seen.get(p.user) || 0) + 1;
          seen.set(p.user, count);
        });
        seen.forEach((count, user) => {
          if (count > 1) console.warn('[poll] backend returned', count, 'participants with user', user);
        });
        const freshUserIds = new Set(fresh.map((p) => p.user));
        setParticipants((prev) => {
          let next = [...prev];
          for (const p of fresh) next = upsertParticipant(next, p);
          next = next.filter((p) => freshUserIds.has(p.user));
          return next;
        });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          window.clearInterval(interval);
        }
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [id]);

  // Poll pending entries for host
  useEffect(() => {
    if (!id || !isHostOrCohost || !session?.requires_permission || !tokenStorage.getAccessToken()) return;
    const interval = window.setInterval(async () => {
      try {
        const pending = await liveService.pendingEntries(id);
        setPendingEntries(pending);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          window.clearInterval(interval);
        }
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [id, isHostOrCohost, session?.requires_permission]);

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
        mediaReadyRef.current = true;
        setMediaReady(true);
        peersRef.current.forEach((_, uid) => { renegotiatePeer(uid).catch(() => undefined); });
      } catch {
        setMediaError('Allow camera and mic to broadcast your preview.');
      }
    }
    setupMedia();
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      cleanupRecording();
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
    if (!selfUserId || socketRef.current?.readyState !== WebSocket.OPEN || !mediaReady) return;
    visibleParticipants
      .filter((p) => p.user !== selfUserId)
      .forEach((p) => {
        ensurePeer(p.user);
        if (shouldInitiate(selfUserId, p.user)) createOfferFor(p.user).catch(() => undefined);
      });
  }, [participants, selfUserId, mediaReady]);

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
      stopRecording();
    } else {
      if (typeof MediaRecorder === 'undefined') {
        showToast('Recording is not available on this browser.', 'error');
        return;
      }
      startRecording();
    }
  };

  const handleRequestEntry = async () => {
    setWaitingEntry(true);
    try {
      await liveService.requestEntry(id);
      showToast('Request sent. Waiting for host to admit you.', 'info');
    } catch {
      setWaitingEntry(false);
      showToast('Failed to send request.', 'error');
    }
  };

  const handleGrantEntry = async (userId: string) => {
    try {
      await liveService.grantEntry(id, userId);
    } catch {
      showToast('Failed to grant entry.', 'error');
    }
  };

  const handleDenyEntry = async (userId: string) => {
    try {
      await liveService.denyEntry(id, userId);
    } catch {
      showToast('Failed to deny entry.', 'error');
    }
  };

  const handleLeave = () => navigate('/schedule');

  const handleShare = async () => {
    const url = `${window.location.origin}/live/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Stream link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy the link.', 'error');
    }
  };

  const handleEndSession = async () => {
    try {
      await liveService.endLiveSession(id);
      showToast('Session ended.', 'success');
      navigate('/schedule');
    } catch {
      showToast('Failed to end session.', 'error');
    }
  };

  // Not admitted — waiting room
  if (session && (session.status === 'LIVE' || session.status === 'SCHEDULED') && !admitted && !isHost) {
    return (
      <div className="relative h-screen bg-slate-950 text-white overflow-hidden flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Radio className="h-10 w-10 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {waitingEntry ? 'Waiting for admission...' : 'Session requires permission'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {waitingEntry
              ? 'The host will let you in shortly.'
              : 'Click below to request entry.'}
          </p>
          {!waitingEntry && (
            <button onClick={handleRequestEntry} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors">
              Request to Join
            </button>
          )}
          <button onClick={handleLeave} className="block mx-auto mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-slate-950 text-white overflow-hidden">
      {/* Top bar - shows on hover */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-white">{session?.title || 'Live Session'}</h1>
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          {isHostOrCohost && session?.requires_permission && pendingEntries.length > 0 && (
            <button
              onClick={() => setShowEntriesPanel((v) => !v)}
              className="relative flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              {pendingEntries.length} waiting
            </button>
          )}
          <span className="text-xs text-slate-400">{visibleParticipants.length} participant(s)</span>
          {connectionStatus !== 'connected' && (
            <span className="text-xs text-amber-400">
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
            </span>
          )}
        </div>
      </div>

      {/* Pending entries panel */}
      {showEntriesPanel && isHostOrCohost && pendingEntries.length > 0 && (
        <div className="absolute top-16 right-4 z-40 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4">
          <h3 className="text-sm font-bold mb-3">Entry Requests</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pendingEntries.map((p) => (
              <div key={p.user} className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
                <span className="text-xs text-slate-300 truncate">{p.user_name || p.user.slice(0, 8)}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleGrantEntry(p.user)} className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white transition-colors">
                    Allow
                  </button>
                  <button onClick={() => handleDenyEntry(p.user)} className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white transition-colors">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media error banner */}
      {mediaError && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center">
          <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-full px-4 py-2 text-xs text-amber-300">
            {mediaError}
          </div>
        </div>
      )}

      {/* Recording upload indicator */}
      {isUploading && (
        <div className="absolute top-16 inset-x-0 z-30 flex justify-center">
          <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-4 py-2 text-xs text-blue-300">
            Uploading recording...
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex h-full">
        {/* Video grid */}
        <div className="flex-1 pb-20 overflow-hidden">
          <VideoGrid
            participants={visibleParticipants}
            remoteStreams={remoteStreams}
            selfUserId={selfUserId}
            previewStream={previewStreamRef.current}
            cameraStream={cameraStreamRef.current}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            peerStatuses={peerStatuses}
            remoteAudioRefs={remoteAudioRefs}
          />
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="relative z-40 flex-shrink-0 h-full">
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
        onEndSession={isHostOrCohost ? handleEndSession : undefined}
        onMuteAll={isHostOrCohost ? () => sendSocketPayload({ kind: 'mute_all' }) : undefined}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
        participantCount={visibleParticipants.length}
      />
    </div>
  );
}
