import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, MessageSquare, Mic, MicOff, PhoneOff, Radio, Users, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { liveService, type LiveSessionItem } from '../services/liveService';
import { useToast } from '../contexts/ToastContext';

type LiveChatMessage = {
  id: string;
  sender_name?: string;
  content: string;
};

export default function LiveMeeting() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const closedByUserRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [session, setSession] = useState<LiveSessionItem | null>(null);
  const [participants, setParticipants] = useState<Array<{ id: string; user: string; user_name?: string; role: 'HOST' | 'STUDENT' }>>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'syncing'>('connecting');
  const [mediaError, setMediaError] = useState<string | null>(null);

  const refreshParticipants = async (sessionId: string) => {
    const liveParticipants = await liveService.listParticipants(sessionId);
    setParticipants(liveParticipants);
  };

  useEffect(() => {
    if (!id) return;
    async function connect() {
      try {
        const sessions = await liveService.listLiveSessions();
        const found = sessions.find((item) => item.id === id) || null;
        setSession(found);
        await liveService.joinSession(id);
        await refreshParticipants(id);
      } catch {
        showToast('Impossible de rejoindre la session live.', 'error');
        navigate('/schedule', { replace: true });
        return;
      }

      const openSocket = () => {
        if (closedByUserRef.current) return;
        setConnectionStatus((current) => (current === 'connected' ? current : 'connecting'));

        const socket = liveService.createSessionSocket(id);
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
          setConnectionStatus('connected');
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data) as { payload?: { kind?: string; content?: string; user_id?: string; user_name?: string } };
          const payload = data.payload;
          if (!payload) return;

          if (payload.kind === 'participant_joined' && payload.user_id) {
            setParticipants((prev) => (
              prev.some((item) => item.user === payload.user_id)
                ? prev
                : [
                  ...prev,
                  {
                    id: `${payload.user_id}-joined`,
                    user: payload.user_id,
                    user_name: payload.user_name,
                    role: payload.user_id === session?.instructor_id ? 'HOST' : 'STUDENT',
                  },
                ]
            ));
          }

          if (payload.kind === 'participant_left' && payload.user_id) {
            setParticipants((prev) => prev.filter((item) => item.user !== payload.user_id));
          }

          if (payload.kind === 'chat_message' && payload.content) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${prev.length}`,
                sender_name: payload.user_name,
                content: payload.content,
              },
            ]);
          }
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onclose = () => {
          if (closedByUserRef.current) return;
          reconnectAttemptsRef.current += 1;
          setConnectionStatus('syncing');
          if (reconnectAttemptsRef.current === 3) {
            showToast('Connexion temps reel instable. Synchronisation automatique active.', 'error');
          }
          const retryDelay = Math.min(1500 * reconnectAttemptsRef.current, 6000);
          reconnectTimerRef.current = window.setTimeout(openSocket, retryDelay);
        };
      };

      openSocket();
    }

    connect();
    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [id, navigate, session?.instructor_id, showToast]);

  useEffect(() => {
    closedByUserRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => {
      refreshParticipants(id).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    async function setupMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError("Votre navigateur ne supporte pas l'acces camera/micro.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        setMediaError(null);
        setIsMuted(false);
        setIsVideoOff(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setMediaError("Autorise la camera et le micro pour voir ton stream local.");
      }
    }

    setupMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, [isMuted]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoOff;
    });
  }, [isVideoOff]);

  const participantCount = useMemo(() => participants.length, [participants]);
  const visibleParticipants = useMemo(() => {
    const next = [...participants];
    if (session?.instructor_id && !next.some((participant) => participant.user === session.instructor_id)) {
      next.unshift({
        id: `host-${session.instructor_id}`,
        user: session.instructor_id,
        user_name: session.instructor_name || 'Host',
        role: 'HOST',
      });
    }
    return next;
  }, [participants, session?.instructor_id, session?.instructor_name]);
  const spotlightParticipants = useMemo(() => visibleParticipants.slice(0, 4), [visibleParticipants]);

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-8 py-5">
          <div>
            <h1 className="text-2xl font-bold">{session?.title || 'Live Session'}</h1>
            <p className="mt-1 text-sm text-slate-400">{session?.course_title || 'Course'} - {participantCount} participant(s)</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400">
            <Radio className="w-4 h-4" />
            {session?.status || 'LIVE'}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[1fr,320px]">
          <div className="flex flex-col">
            <div className="flex-1 p-8">
              <div className="h-full rounded-[32px] border border-slate-800 bg-slate-900 grid place-items-center">
                {mediaError ? (
                  <div className="max-w-xl text-center">
                    <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-amber-500/10 text-amber-400">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-bold">{session?.title || 'Realtime meeting room'}</h2>
                    <p className="mt-2 text-sm text-slate-400">{mediaError}</p>
                  </div>
                ) : (
                  <div className="relative h-full w-full overflow-hidden rounded-[32px]">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`h-full w-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/50" />
                    {isVideoOff ? (
                      <div className="absolute inset-0 grid place-items-center bg-slate-900">
                        <div className="text-center">
                          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-blue-600/20 text-blue-400">
                            <VideoOff className="h-8 w-8" />
                          </div>
                          <h2 className="text-3xl font-bold">{session?.title || 'Realtime meeting room'}</h2>
                          <p className="mt-2 text-sm text-slate-400">Camera is off. Turn it back on to resume the local stream.</p>
                        </div>
                      </div>
                    ) : null}
                    <div className="absolute left-6 top-6 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur">
                      <p className="text-sm font-semibold text-white">Your live preview</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {connectionStatus === 'connected'
                          ? 'Connexion temps reel active'
                          : connectionStatus === 'connecting'
                            ? 'Connexion en cours...'
                            : 'Sync automatique active'}
                      </p>
                    </div>
                    <div className="absolute right-6 top-6 w-[260px] rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Dans la salle</p>
                          <p className="mt-1 text-xs text-slate-300">Host et participants visibles maintenant</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                          {visibleParticipants.length}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {spotlightParticipants.map((participant) => (
                          <div key={`spotlight-${participant.id}`} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                            <div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${
                              participant.role === 'HOST' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-600/20 text-blue-300'
                            }`}>
                              {(participant.user_name || 'P').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{participant.user_name || 'Participant'}</p>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                {participant.role === 'HOST' ? 'Host' : 'Participant'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 px-8 py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Connected people</h3>
                  <p className="text-sm text-slate-400">Host and participants currently visible in this room.</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                  {visibleParticipants.length} online
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleParticipants.map((participant) => (
                  <div key={participant.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-4">
                      <div className={`grid h-12 w-12 place-items-center rounded-full text-sm font-bold ${
                        participant.role === 'HOST' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-600/20 text-blue-300'
                      }`}>
                        {(participant.user_name || 'P').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{participant.user_name || 'Participant'}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{participant.role === 'HOST' ? 'Host' : 'Participant'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 border-t border-slate-800 px-8 py-5">
              <button onClick={() => setIsMuted((value) => !value)} className={`grid h-12 w-12 place-items-center rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'}`}>
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button onClick={() => setIsVideoOff((value) => !value)} className={`grid h-12 w-12 place-items-center rounded-full ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-200'}`}>
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
              </button>
              <button onClick={() => navigate('/schedule')} className="grid h-12 w-14 place-items-center rounded-2xl bg-red-600 text-white">
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          </div>

          <aside className="border-l border-slate-800 bg-slate-900 flex flex-col">
            <div className="flex gap-2 border-b border-slate-800 p-2">
              <button onClick={() => setActiveTab('chat')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
                <MessageSquare className="mr-2 inline h-4 w-4" />
                Chat
              </button>
              <button onClick={() => setActiveTab('participants')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${activeTab === 'participants' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
                <Users className="mr-2 inline h-4 w-4" />
                People
              </button>
            </div>

            {activeTab === 'chat' ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {chatMessages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the discussion.</p>}
                  {chatMessages.map((message) => (
                    <div key={message.id} className="rounded-2xl bg-slate-800 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{message.sender_name || 'Participant'}</p>
                      <p className="mt-1 text-sm text-slate-200">{message.content}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 p-4">
                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        if (!chatInput.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
                        socketRef.current.send(JSON.stringify({ kind: 'chat_message', content: chatInput.trim() }));
                        setChatInput('');
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {visibleParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between rounded-2xl bg-slate-800 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-100">{participant.user_name || 'Participant'}</p>
                      <p className="text-xs text-slate-500">{participant.role}</p>
                    </div>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
                      {(participant.user_name || 'P').slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
