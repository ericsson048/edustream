import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Plus, Trash2, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiService, ConversationItem } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  usage?: Usage;
}

const MAX_HISTORY = 6;

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConvList, setShowConvList] = useState(false);
  const [position, setPosition] = useState(() => {
    try { const saved = localStorage.getItem('chatbot_pos'); return saved ? JSON.parse(saved) : { x: 0, y: 0 }; }
    catch { return { x: 0, y: 0 }; }
  });
  const posRef = useRef(position);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, posX: 0, posY: 0 });
  const chatbotRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const socketReadyRef = useRef(false);
  const pendingMessagesRef = useRef<{ prompt: string; history: { role: string; content: string }[]; conversation_id?: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  function handleTogglePointerDown(e: React.PointerEvent) {
    dragRef.current.dragging = false;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.posX = posRef.current.x;
    dragRef.current.posY = posRef.current.y;
    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.dragging = true;
      if (dragRef.current.dragging) {
        const newPos = { x: dragRef.current.posX + dx, y: dragRef.current.posY + dy };
        setPosition(newPos);
        posRef.current = newPos;
      }
    };
    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      if (!dragRef.current.dragging) setIsOpen((prev) => !prev);
      else try { localStorage.setItem('chatbot_pos', JSON.stringify(posRef.current)); } catch {}
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    loadConversations();
  }, [isAuthenticated, isOpen]);

  async function loadConversations() {
    try {
      const list = await aiService.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0].id);
        loadMessages(list[0].id);
      } else if (list.length === 0) {
        const conv = await aiService.createConversation();
        setConversations([conv]);
        setActiveConversationId(conv.id);
        setMessages([]);
      }
    } catch { /* ignore */ }
  }

  async function loadMessages(convId: string) {
    try {
      const items = await aiService.listMessages(convId);
      const msgs: Message[] = [];
      let tokens = 0;
      for (const item of items) {
        msgs.push({ id: `user-${item.id}`, role: 'user', text: item.prompt });
        msgs.push({ id: `ai-${item.id}`, role: 'model', text: item.response });
      }
      setMessages(msgs);
      setTotalTokens(tokens);
    } catch {
      setMessages([]);
    }
  }

  async function handleNewConversation() {
    try {
      const conv = await aiService.createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setShowConvList(false);
      setMessages([]);
      setTotalTokens(0);
    } catch {
      showToast('Erreur creation conversation.', 'error');
    }
  }

  async function handleDeleteConversation(id: string) {
    try {
      await aiService.deleteConversation(id);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      if (activeConversationId === id) {
        if (updated.length > 0) {
          setActiveConversationId(updated[0].id);
        } else {
          const conv = await aiService.createConversation();
          setConversations([conv]);
          setActiveConversationId(conv.id);
          setMessages([]);
          setTotalTokens(0);
        }
      }
    } catch {
      showToast('Erreur suppression.', 'error');
    }
  }

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    socketReadyRef.current = false;
    const socket = aiService.createTutorSocket();
    socketRef.current = socket;
    socket.onopen = () => {
      socketReadyRef.current = true;
      for (const pending of pendingMessagesRef.current) {
        socket.send(JSON.stringify(pending));
      }
      pendingMessagesRef.current = [];
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { kind?: string; response?: string; detail?: string; usage?: Usage };
      if (payload.kind === 'ai_response' && payload.response) {
        const usage = payload.usage;
        if (usage?.total_tokens) setTotalTokens((prev) => prev + usage.total_tokens);
        setMessages((prev) => [...prev, { id: `${Date.now()}-ai`, role: 'model', text: payload.response!, usage }]);
        setIsLoading(false);
      } else if (payload.kind === 'error') {
        showToast(payload.detail || 'Erreur IA.', 'error');
        setMessages((prev) => [...prev, { id: `${Date.now()}-err`, role: 'model', text: payload.detail || 'Erreur IA.' }]);
        setIsLoading(false);
      }
    };
    socket.onerror = () => {
      showToast('Connexion IA indisponible.', 'error');
      setIsLoading(false);
    };
    return () => {
      socketReadyRef.current = false;
      socket.close();
    };
  }, [isAuthenticated, isOpen, showToast]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      if (!isAuthenticated) throw new Error('Not authenticated');
      const recent = messages.filter((m) => m.id !== 'welcome');
      const sliced = recent.slice(-MAX_HISTORY);
      const history = sliced.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const msg: { prompt: string; history: { role: string; content: string }[]; conversation_id?: string } = { prompt: userMessage.text, history };
      if (activeConversationId) msg.conversation_id = activeConversationId;
      if (socketRef.current && socketReadyRef.current) {
        socketRef.current.send(JSON.stringify(msg));
      } else if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) {
        pendingMessagesRef.current.push(msg);
      } else {
        throw new Error('Socket unavailable');
      }
    } catch {
      showToast('Erreur IA: verifiez votre connexion.', 'error');
      setMessages((prev) => [...prev, { id: `${Date.now()}-err`, role: 'model', text: 'Je ne peux pas repondre pour le moment.' }]);
      setIsLoading(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div
      ref={chatbotRef}
      className="fixed z-50 hidden print:hidden sm:flex flex-col items-end"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, bottom: 24, right: 24 }}
    >
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{activeConversation?.title || 'EduStream AI'}</h3>
                  <button onClick={() => setShowConvList(!showConvList)} className="text-white/70 hover:text-white p-0.5 rounded transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleNewConversation} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="New conversation">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showConvList && (
            <div className="border-b border-slate-200 max-h-40 overflow-y-auto bg-slate-50">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={clsx(
                    'flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-100 transition-colors',
                    conv.id === activeConversationId && 'bg-blue-50'
                  )}
                  onClick={() => { setActiveConversationId(conv.id); setShowConvList(false); loadMessages(conv.id); }}
                >
                  <span className="truncate text-slate-700">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    className="text-slate-400 hover:text-red-500 shrink-0 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-sm">
                <Sparkles className="w-8 h-8 mb-2 text-blue-400" />
                <p>Ask me anything about EduStream!</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={clsx('flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[85%] p-3 rounded-2xl text-sm shadow-sm',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none',
                  )}
                >
                  {msg.role === 'user' ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-blue-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                  {msg.usage && (
                    <p className="mt-1.5 text-[10px] text-slate-400 text-right">{msg.usage.total_tokens} tokens</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-800 border border-slate-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask a question..."
                className="w-full pl-4 pr-12 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="absolute right-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 mt-2">
              <p className="text-[10px] text-slate-400">{totalTokens > 0 && `${totalTokens} tokens used`}</p>
              <p className="text-[10px] text-slate-400">EduStream AI</p>
            </div>
          </form>
        </div>
      )}

      <button
        onPointerDown={handleTogglePointerDown}
        className={clsx(
          'h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 touch-none',
          isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-blue-600 text-white',
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </div>
  );
}