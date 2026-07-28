import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Users, X, Send, Crown, Mic, MicOff, MonitorUp, Hand } from 'lucide-react';
import type { LiveParticipantItem } from '../../../../services/liveService';

type LiveChatMessage = { id: string; sender_id?: string; sender_name?: string; content: string; kind?: 'chat' | 'system' };
type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface ChatPanelProps {
  messages: LiveChatMessage[];
  participants: LiveParticipantItem[];
  selfUserId: string;
  peerStatuses: Record<string, PeerStatus>;
  onSend: (content: string) => void;
  onClose: () => void;
}

export default function ChatPanel({
  messages, participants, selfUserId, peerStatuses, onSend, onClose,
}: ChatPanelProps) {
  const [tab, setTab] = useState<'chat' | 'people'>('chat');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/10 w-80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'chat' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            onClick={() => setTab('people')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'people' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            People
            <span className="ml-1 h-5 w-5 grid place-items-center rounded-full bg-white/10 text-[10px]">
              {participants.length}
            </span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 grid place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {tab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-slate-500 mt-8">No messages yet</p>
            )}
            {messages.map((message) => {
              const isSelfMessage = message.sender_id && message.sender_id === selfUserId;
              return (
                <div key={message.id} className={`${message.kind === 'system' ? 'text-center' : ''}`}>
                  {message.kind === 'system' ? (
                    <p className="text-xs text-amber-400/80 bg-amber-500/10 rounded-full px-3 py-1 inline-block">
                      {message.content}
                    </p>
                  ) : (
                    <div className={isSelfMessage ? 'flex flex-col items-end' : ''}>
                      <p className="text-[11px] font-bold text-slate-400 mb-1">
                        {isSelfMessage ? 'You' : (message.sender_name || 'Participant')}
                      </p>
                      <div className={`rounded-2xl px-3 py-2 max-w-[85%] ${
                        isSelfMessage
                          ? 'bg-blue-600/80 rounded-tr-md'
                          : 'bg-white/5 rounded-tl-md'
                      }`}>
                        <p className="text-sm text-slate-200">{message.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              <button
                onClick={handleSend}
                className="h-10 w-10 grid place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {participants.map((participant) => {
            const isSelf = participant.user === selfUserId;
            const status = isSelf ? 'connected' : (peerStatuses[participant.user] || 'idle');
            return (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="relative">
                  <div className="h-9 w-9 grid place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
                    {(participant.user_name || 'P').slice(0, 2).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                    status === 'connected' ? 'bg-emerald-400' :
                    status === 'connecting' ? 'bg-amber-400' :
                    status === 'failed' ? 'bg-red-400' : 'bg-slate-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">
                      {participant.user_name || 'Participant'}
                    </p>
                    {isSelf && <span className="text-[10px] text-slate-400">(you)</span>}
                    {participant.role === 'HOST' && <Crown className="h-3 w-3 text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {participant.is_mic_on ? (
                      <Mic className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <MicOff className="h-3 w-3 text-red-400" />
                    )}
                    {participant.is_screen_sharing && <MonitorUp className="h-3 w-3 text-sky-400" />}
                    {participant.hand_raised && <Hand className="h-3 w-3 text-amber-400" />}
                    {participant.last_reaction && (
                      <span className="text-xs">{participant.last_reaction}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
