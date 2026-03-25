import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useEffect, useRef, useState } from 'react';
import { messagingService, type ConversationItem, type MessageItem } from '../services/messagingService';
import { useToast } from '../contexts/ToastContext';

export default function Messages() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newConversationName, setNewConversationName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    messagingService
      .listConversations()
      .then((data) => {
        setConversations(data);
        if (data.length) setActive(data[0]);
      })
      .catch(() => showToast('Impossible de charger les conversations.', 'error'));
  }, [showToast]);

  useEffect(() => {
    if (!active) return;
    messagingService
      .listMessages(active.id)
      .then(setMessages)
      .catch(() => showToast('Impossible de charger les messages.', 'error'));

    socketRef.current?.close();
    const socket = messagingService.createConversationSocket(active.id);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { kind?: string; message?: MessageItem };
      if (payload.kind === 'message_created' && payload.message) {
        setMessages((prev) => (prev.some((item) => item.id === payload.message?.id) ? prev : [...prev, payload.message]));
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === active.id
              ? {
                  ...conversation,
                  latest_message: {
                    id: payload.message.id,
                    content: payload.message.content,
                    sender_name: payload.message.sender_name,
                    created_at: payload.message.created_at,
                  },
                }
              : conversation,
          ),
        );
      }
    };
    socket.onerror = () => showToast('Connexion temps reel messages indisponible.', 'error');
    return () => socket.close();
  }, [active, showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <Header />
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex overflow-hidden">
            <div className="w-80 border-r border-slate-200 overflow-y-auto">
              <div className="p-3 border-b border-slate-200 space-y-2">
                <input
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                  placeholder="New conversation"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                  onClick={async () => {
                    try {
                      const created = await messagingService.createConversation(newConversationName);
                      setConversations((prev) => [created, ...prev]);
                      setActive(created);
                      setNewConversationName('');
                      showToast('Conversation creee.', 'success');
                    } catch {
                      showToast('Creation conversation impossible.', 'error');
                    }
                  }}
                >
                  Creer
                </button>
              </div>
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActive(conversation)}
                  className={`w-full text-left p-4 border-b ${active?.id === conversation.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <p className="font-bold text-sm">{conversation.name || 'Conversation'}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{conversation.latest_message?.content || 'No message'}</p>
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-sm font-semibold">{message.sender_name || 'User'}</p>
                  <p className="text-sm text-slate-700">{message.content}</p>
                </div>
              ))}
              {active && (
                <div className="pt-4 border-t border-slate-200 mt-6 flex gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                    onClick={() => {
                      if (!newMessage.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
                      socketRef.current.send(JSON.stringify({ content: newMessage.trim() }));
                      setNewMessage('');
                    }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
