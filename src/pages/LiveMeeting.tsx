import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, MessageSquare, Users, Settings, Hand, MoreVertical } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { liveService } from '../services/liveService';
import { useToast } from '../contexts/ToastContext';

type LiveChatMessage = {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
};

type Participant = {
  user_id: string;
  user_name: string;
};

export default function LiveMeeting() {
  const { id = '' } = useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    const socket = liveService.createSessionSocket(id);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as { payload?: { kind?: string; content?: string; user_id?: string; user_name?: string }; sender_id?: string };
      const payload = data.payload;
      if (!payload) return;
      if (payload.kind === 'participant_joined' && payload.user_id && payload.user_name) {
        setParticipants((prev) => (prev.some((item) => item.user_id === payload.user_id) ? prev : [...prev, { user_id: payload.user_id, user_name: payload.user_name }]));
      }
      if (payload.kind === 'participant_left' && payload.user_id) {
        setParticipants((prev) => prev.filter((item) => item.user_id !== payload.user_id));
      }
      if (payload.kind === 'chat_message' && payload.content) {
        setChatMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, sender_id: data.sender_id || payload.user_id || '', sender_name: payload.user_name, content: payload.content }]);
      }
    };
    socket.onerror = () => showToast('Connexion live temps reel indisponible.', 'error');
    return () => socket.close();
  }, [id, showToast]);

  const participantCount = useMemo(() => participants.length, [participants]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-900/80 to-transparent">
          <div>
            <h1 className="text-lg font-bold text-white">Live session room</h1>
            <p className="text-xs text-slate-300">Session realtime • room {id}</p>
          </div>
          <div className="flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            LIVE
          </div>
        </div>

        <div className="flex-1 p-4 pt-20 pb-24 flex items-center justify-center">
          <div className="w-full h-full max-w-6xl grid grid-cols-3 grid-rows-2 gap-4">
            <div className="col-span-2 row-span-2 bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700 shadow-2xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">Realtime Meet</p>
                <p className="text-sm text-slate-400 mt-2">Signalisation WebSocket active</p>
              </div>
            </div>

            {participants.slice(0, 2).map((participant) => (
              <div key={participant.user_id} className="bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700 flex items-center justify-center">
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold">
                  {participant.user_name}
                </div>
                <div className="text-4xl font-black text-slate-500">{participant.user_name.slice(0, 2).toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span>{participantCount} Participants</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <MonitorUp className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Hand className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(-1)} className="w-16 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors ml-4">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="flex p-2 gap-2 border-b border-slate-800">
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button onClick={() => setActiveTab('participants')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'participants' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <Users className="w-4 h-4" /> People
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {(message.sender_name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-200">{message.sender_name || 'User'}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => {
                    if (!chatInput.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
                    socketRef.current.send(JSON.stringify({ kind: 'chat_message', content: chatInput.trim() }));
                    setChatInput('');
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {participants.map((participant) => (
              <div key={participant.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-700">
                    {participant.user_name.split(' ').map((name) => name[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{participant.user_name}</p>
                    <p className="text-xs text-slate-500">Participant</p>
                  </div>
                </div>
                {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-slate-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
