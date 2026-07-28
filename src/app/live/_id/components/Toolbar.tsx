import {
  Mic, MicOff, Video, VideoOff, MonitorUp, Disc3,
  Hand, SmilePlus, PhoneOff, MessageSquare, Users,
} from 'lucide-react';
import { useState } from 'react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

interface ToolbarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleHand: () => void;
  onReaction: (reaction: string) => void;
  onLeave: () => void;
  onEndSession?: () => void;
  onMuteAll?: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
  participantCount: number;
}

export default function Toolbar({
  isMuted, isVideoOff, isScreenSharing, isRecording, isHandRaised,
  onToggleMute, onToggleVideo, onToggleScreenShare, onToggleRecording,
  onToggleHand, onReaction, onLeave, onEndSession, onMuteAll, onToggleChat, chatOpen, participantCount,
}: ToolbarProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="absolute bottom-0 inset-x-0 z-30">
      {/* Reactions popup */}
      {showReactions && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex items-center gap-1 bg-slate-800/90 backdrop-blur-xl rounded-full px-3 py-2 border border-white/10 shadow-2xl">
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction}
              onClick={() => { onReaction(reaction); setShowReactions(false); }}
              className="h-10 w-10 grid place-items-center rounded-full text-xl hover:bg-white/10 transition-colors"
            >
              {reaction}
            </button>
          ))}
        </div>
      )}

      {/* Main toolbar */}
      <div className="flex items-center justify-center gap-2 px-6 py-4 bg-black/40 backdrop-blur-xl border-t border-white/5">
        {/* Mic */}
        <button
          onClick={onToggleMute}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        {/* Screen share */}
        <button
          onClick={onToggleScreenShare}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            isScreenSharing ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <MonitorUp className="h-5 w-5" />
        </button>

        {/* Record */}
        <button
          onClick={onToggleRecording}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isRecording ? 'Stop recording' : 'Record'}
        >
          <Disc3 className={`h-5 w-5 ${isRecording ? 'animate-spin' : ''}`} />
        </button>

        {/* Hand */}
        <button
          onClick={onToggleHand}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            isHandRaised ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand className="h-5 w-5" />
        </button>

        {/* Reactions */}
        <button
          onClick={() => setShowReactions(!showReactions)}
          className={`h-12 w-12 grid place-items-center rounded-full transition-all ${
            showReactions ? 'bg-white/20 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Reactions"
        >
          <SmilePlus className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20 mx-1" />

        {/* Chat */}
        <button
          onClick={onToggleChat}
          className={`relative h-12 w-12 grid place-items-center rounded-full transition-all ${
            chatOpen ? 'bg-white/20 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Participants */}
        <div className="relative h-12 px-4 grid place-items-center rounded-full bg-white/10 text-white text-sm font-medium gap-2">
          <Users className="h-4 w-4" />
          {participantCount}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20 mx-1" />

        {/* Leave */}
        <button
          onClick={onLeave}
          className="h-12 px-6 grid place-items-center gap-2 rounded-full bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
          title="Leave call"
        >
          <PhoneOff className="h-5 w-5" />
          <span className="hidden sm:inline">Leave</span>
        </button>

        {/* End Session (host only) */}
        {onEndSession && (
          <button
            onClick={onEndSession}
            className="h-12 px-6 grid place-items-center gap-2 rounded-full bg-red-700 text-white font-bold text-sm hover:bg-red-800 transition-all border border-red-400/30"
            title="End session for everyone"
          >
            <span className="hidden sm:inline">End Session</span>
          </button>
        )}

        {/* Mute All (host only) */}
        {onMuteAll && (
          <button
            onClick={onMuteAll}
            className="h-12 px-4 grid place-items-center gap-2 rounded-full bg-amber-600/80 text-white font-bold text-sm hover:bg-amber-700 transition-all"
            title="Mute all participants"
          >
            <MicOff className="h-5 w-5" />
            <span className="hidden sm:inline">Mute All</span>
          </button>
        )}
      </div>
    </div>
  );
}
