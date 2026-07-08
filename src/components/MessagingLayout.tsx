import { useEffect, useRef, useState, type ComponentType } from 'react';
import { messagingService, type ConversationItem, type MessageItem, type ContactItem } from '../services/messagingService';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Header from './Header';
import { Search, Send, Paperclip, MoreVertical, ChevronLeft, MessageCircle, Users, MessageSquare, Check, CheckCheck } from 'lucide-react';
import clsx from 'clsx';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatLastSeen(dateStr: string | null) {
  if (!dateStr) return 'Offline';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Online';
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

const avatarColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function SkeletonConversations() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-2.5 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonMessages() {
  const bubbles = [
    { align: 'justify-start', width: 'w-3/4' },
    { align: 'justify-end', width: 'w-1/2' },
    { align: 'justify-start', width: 'w-2/3' },
    { align: 'justify-end', width: 'w-3/5' },
    { align: 'justify-start', width: 'w-1/2' },
  ];
  return (
    <div className="space-y-3 px-4 py-4">
      {bubbles.map((b, i) => (
        <div key={i} className={clsx('flex', b.align)}>
          <div className={clsx(b.width, 'h-10 bg-slate-200 rounded-2xl animate-pulse')} />
        </div>
      ))}
    </div>
  );
}

const roleLabel: Record<string, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
};

export default function MessagingLayout({ Sidebar }: { Sidebar: ComponentType }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'conversations' | 'contacts'>('conversations');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showMobileList, setShowMobileList] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const convMapRef = useRef<Map<string, ContactItem>>(new Map());

  useEffect(() => {
    setLoadingConvs(true);
    messagingService
      .listConversations()
      .then((data) => {
        setConversations(data);
        if (data.length && !active) setActive(data[0]);
      })
      .catch(() => showToast('Impossible de charger les conversations.', 'error'))
      .finally(() => setLoadingConvs(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    setMessages([]);
    messagingService
      .listMessages(active.id)
      .then(setMessages)
      .catch(() => showToast('Impossible de charger les messages.', 'error'))
      .finally(() => setLoadingMsgs(false));

    messagingService.markConversationRead(active.id).catch(() => {});

    socketRef.current?.close();
    const socket = messagingService.createConversationSocket(active.id);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { kind?: string; message?: MessageItem };
        if (payload.kind === 'message_created' && payload.message) {
          setMessages((prev) => (prev.some((item) => item.id === payload.message?.id) ? prev : [...prev, payload.message]));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === active.id
                ? { ...c, latest_message: { id: payload.message.id, content: payload.message.content, sender_name: payload.message.sender_name, created_at: payload.message.created_at } }
                : c,
            ),
          );
          messagingService.markConversationRead(active.id).catch(() => {});
        }
      } catch {}
    };
    socket.onerror = () => {};
    return () => socket.close();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chatEndRef.current) return;
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConvs = conversations.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectConversation = (conv: ConversationItem) => {
    setActive(conv);
    setShowMobileList(false);
    messagingService.markConversationRead(conv.id).catch(() => {});
  };

  const handleBack = () => setShowMobileList(true);

  async function handleContactClick(contact: ContactItem) {
    const existing = conversations.find((c) =>
      !c.is_group && c.name === contact.full_name
    );
    if (existing) {
      handleSelectConversation(existing);
      return;
    }
    try {
      const conv = await apiClient.post<ConversationItem>('/conversations/', {
        name: contact.full_name,
        is_group: false,
        participant_ids: [contact.id],
      }).then((r) => r.data);
      setConversations((prev) => [conv, ...prev]);
      setActive(conv);
      setShowMobileList(false);
      setTab('conversations');
    } catch {
      showToast('Erreur creation conversation.', 'error');
    }
  }

  function handleLoadContacts() {
    setLoadingContacts(true);
    messagingService.listContacts()
      .then((data) => {
        setContacts(data);
        convMapRef.current = new Map(data.map((c) => [c.full_name, c]));
      })
      .catch(() => showToast('Impossible de charger les contacts.', 'error'))
      .finally(() => setLoadingContacts(false));
  }

  useEffect(() => {
    if (tab === 'contacts' && contacts.length === 0 && !loadingContacts) {
      handleLoadContacts();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeContact = active ? convMapRef.current.get(active.name) : null;

  function handleSend() {
    if (!newMessage.trim() || !active) return;
    const content = newMessage.trim();
    setNewMessage('');

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ kind: 'message', content }));
      return;
    }

    messagingService.sendMessage(active.id, content)
      .then((msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === active.id
              ? { ...c, latest_message: { id: msg.id, content: msg.content, sender_name: msg.sender_name, created_at: msg.created_at } }
              : c,
          ),
        );
      })
      .catch(() => showToast('Erreur envoi message.', 'error'));
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <Header />
        <div className="flex-1 p-0 md:p-4 overflow-hidden bg-slate-100/50">
          <div className="bg-white md:rounded-2xl md:shadow-sm border border-slate-200 h-full flex overflow-hidden">
            {/* Left Panel */}
            <div className={clsx(
              'w-full md:w-80 md:border-r border-slate-200 flex flex-col md:flex',
              showMobileList ? 'flex' : 'hidden',
            )}>
              {/* Tabs */}
              <div className="flex border-b border-slate-200 shrink-0">
                <button
                  onClick={() => setTab('conversations')}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors',
                    tab === 'conversations'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chats
                </button>
                <button
                  onClick={() => setTab('contacts')}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors',
                    tab === 'contacts'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <Users className="w-4 h-4" />
                  Contacts
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === 'contacts' ? 'Search contacts...' : 'Search conversations...'}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Conversations List */}
              {tab === 'conversations' && (
                <div className="flex-1 overflow-y-auto">
                  {loadingConvs ? (
                    <SkeletonConversations />
                  ) : filteredConvs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-16 px-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <MessageCircle className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No conversations yet</p>
                      <p className="text-xs text-slate-400 mt-1 text-center">Go to Contacts tab to start one</p>
                    </div>
                  ) : (
                    filteredConvs.map((conv) => {
                      const contact = convMapRef.current.get(conv.name);
                      const isUnread = conv.latest_message && conv.latest_message.sender_name !== user?.full_name;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left group',
                            active?.id === conv.id && 'bg-blue-50/60 hover:bg-blue-50/60',
                          )}
                        >
                          <div className="relative shrink-0">
                            <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm', getAvatarColor(conv.name))}>
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                            {contact?.is_online && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={clsx('text-sm truncate', isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800')}>{conv.name}</p>
                              {conv.latest_message && (
                                <span className="text-[11px] text-slate-400 ml-2 shrink-0">{formatTime(conv.latest_message.created_at)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                              <p className={clsx('text-xs truncate', isUnread ? 'text-slate-700 font-medium' : 'text-slate-400')}>
                                {conv.latest_message?.content || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Contacts List */}
              {tab === 'contacts' && (
                <div className="flex-1 overflow-y-auto">
                  {loadingContacts ? (
                    <SkeletonConversations />
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-16 px-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">No contacts yet</p>
                      <p className="text-xs text-slate-400 mt-1 text-center">Enroll in courses to see your contacts</p>
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleContactClick(contact)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className="relative shrink-0">
                          <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm', getAvatarColor(contact.full_name))}>
                            {contact.full_name.charAt(0).toUpperCase()}
                          </div>
                          {contact.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 truncate">{contact.full_name}</p>
                            <span className={clsx(
                              'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                              contact.role === 'INSTRUCTOR' ? 'text-purple-600 bg-purple-50' :
                              contact.role === 'STUDENT' ? 'text-green-600 bg-green-50' :
                              'text-blue-600 bg-blue-50',
                            )}>
                              {roleLabel[contact.role] || contact.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{formatLastSeen(contact.last_seen)}</p>
                          {contact.course_names.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.course_names.slice(0, 2).map((name) => (
                                <span key={name} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[120px]">{name}</span>
                              ))}
                              {contact.course_names.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{contact.course_names.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className={clsx(
              'flex-1 flex flex-col md:flex',
              showMobileList ? 'hidden' : 'flex',
            )}>
              {active ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                    <button onClick={handleBack} className="md:hidden p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors">
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="relative shrink-0">
                      <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm', getAvatarColor(active.name))}>
                        {active.name.charAt(0).toUpperCase()}
                      </div>
                      {activeContact?.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{active.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {activeContact
                          ? (activeContact.is_online ? 'Online' : formatLastSeen(activeContact.last_seen))
                          : (active.is_group ? 'Group conversation' : 'Direct conversation')}
                      </p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>

                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {loadingMsgs ? (
                      <SkeletonMessages />
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                          <MessageCircle className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No messages yet</p>
                        <p className="text-xs text-slate-400 mt-1">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      <div className="px-4 py-4 space-y-1">
                        {messages.map((msg, idx) => {
                          const own = msg.sender_name === user?.full_name;
                          const prev = messages[idx - 1];
                          const showAvatar = !own && (!prev || prev.sender_name !== msg.sender_name);
                          return (
                            <div
                              key={msg.id}
                              className={clsx('flex items-end gap-2 animate-in', own ? 'justify-end' : 'justify-start')}
                              style={{ animation: 'fadeInUp 0.25s ease-out both', animationDelay: `${Math.min(idx * 15, 300)}ms` }}
                            >
                              {!own && showAvatar && (
                                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-1', getAvatarColor(msg.sender_name || ''))}>
                                  {(msg.sender_name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              {!own && !showAvatar && <div className="w-7 shrink-0" />}
                              <div className={clsx(
                                'max-w-[75%] px-3.5 py-2 shadow-sm',
                                own
                                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                                  : 'bg-white text-slate-800 rounded-2xl rounded-bl-md border border-slate-100',
                              )}>
                                {!own && showAvatar && msg.sender_name && (
                                  <p className="text-[11px] font-bold text-blue-600 mb-0.5">{msg.sender_name}</p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                <div className={clsx('flex items-center justify-end gap-1 mt-1', own ? '' : '')}>
                                  <p className={clsx('text-[10px]', own ? 'text-blue-200' : 'text-slate-400')}>{formatTime(msg.created_at)}</p>
                                  {own && (
                                    msg.is_read
                                      ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                      : <Check className="w-3.5 h-3.5 text-blue-200/60" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <div className="flex-1 relative">
                        <input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                          }}
                          placeholder="Type a message..."
                          className="w-full px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/50">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <MessageCircle className="w-9 h-9 text-slate-300" />
                    </div>
                    <p className="text-xl font-bold text-slate-600">Your Messages</p>
                    <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">Select a conversation or contact to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { opacity: 0; }
      `}</style>
    </div>
  );
}
