import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useEffect, useState } from 'react';
import { messagingService, type ConversationItem, type MessageItem } from '../services/messagingService';
import { useToast } from '../contexts/ToastContext';

export default function Messages() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
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
  }, [active, showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <Header />
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex overflow-hidden">
            <div className="w-80 border-r border-slate-200 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`w-full text-left p-4 border-b ${active?.id === c.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <p className="font-bold text-sm">{c.name || 'Conversation'}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.latest_message?.content || 'No message'}</p>
                </button>
              ))}
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-sm font-semibold">{m.sender_name || 'User'}</p>
                  <p className="text-sm text-slate-700">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
