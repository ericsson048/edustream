import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { communityService, type StudyGroupItem, type StudyGroupMessageItem } from '../../../../services/communityService';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { ArrowLeft, Users, Send, MessageCircle } from 'lucide-react';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [group, setGroup] = useState<StudyGroupItem | null>(null);
  const [messages, setMessages] = useState<StudyGroupMessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    communityService.getStudyGroup(id)
      .then((data) => {
        setGroup(data);
        setIsMember(data.members?.includes(user?.id ?? '') ?? false);
      })
      .catch(() => showToast('Impossible de charger le groupe.', 'error'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id || !isMember) return;
    communityService.listStudyGroupMessages(id)
      .then(setMessages)
      .catch(() => showToast('Impossible de charger les messages.', 'error'));

    socketRef.current?.close();
    const socket = communityService.createStudyGroupSocket(id);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { kind?: string; message?: StudyGroupMessageItem };
        if (payload.kind === 'study_group_message_created' && payload.message) {
          setMessages((prev) => (prev.some((m) => m.id === payload.message?.id) ? prev : [...prev, payload.message]));
        }
      } catch {}
    };
    socket.onerror = () => {};
    return () => socket.close();
  }, [id, isMember]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleJoin() {
    if (!id) return;
    try {
      const result = await communityService.joinStudyGroup(id);
      setIsMember(true);
      if (group) setGroup({ ...group, members_count: result.members_count });
      showToast('Groupe rejoint.', 'success');
    } catch {
      showToast('Impossible de rejoindre ce groupe.', 'error');
    }
  }

  function handleSend() {
    if (!newMessage.trim() || !id) return;
    const content = newMessage.trim();
    setNewMessage('');

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ content }));
      return;
    }

    communityService.sendStudyGroupMessage(id, content)
      .then((msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      })
      .catch(() => showToast("Erreur lors de l'envoi.", 'error'));
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <Header />
        <div className="flex-1 p-0 md:p-6 overflow-hidden">
          <div className="bg-white md:rounded-2xl md:shadow-sm border border-slate-200 h-full flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : !group ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-slate-500 font-medium">Groupe introuvable.</p>
                <button onClick={() => navigate('/community')} className="text-blue-600 text-sm mt-2">Retour</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
                  <button onClick={() => navigate('/community')} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 truncate">{group.name}</h1>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {group.members_count || 0} members
                    </p>
                  </div>
                  {!isMember && (
                    <button
                      onClick={handleJoin}
                      className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      Rejoindre
                    </button>
                  )}
                  {isMember && (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-semibold">
                      Membre
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/50 p-6">
                  {!isMember ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Users className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Rejoignez ce groupe pour discuter</p>
                      <p className="text-xs text-slate-400 mt-1">{group.description}</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <MessageCircle className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Aucun message pour le moment</p>
                      <p className="text-xs text-slate-400 mt-1">Soyez le premier a ecrire !</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {(msg.sender_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{msg.sender_name || 'Member'}</p>
                            <span className="text-[11px] text-slate-400 ml-auto">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 pl-9">{msg.content}</p>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {isMember && (
                  <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3 max-w-3xl mx-auto">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ecrivez un message..."
                        className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
