import { Mic, MicOff, Hand, Crown, MonitorUp } from 'lucide-react';
import type { LiveParticipantItem } from '../../../../services/liveService';

type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface VideoTileProps {
  participant: LiveParticipantItem;
  stream?: MediaStream;
  isSelf: boolean;
  previewStream: MediaStream | null;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerStatus: PeerStatus;
  isSpeaking?: boolean;
  presentationMode?: boolean;
  filmstrip?: boolean;
}

export default function VideoTile({
  participant,
  stream,
  isSelf,
  previewStream,
  isVideoOff,
  isScreenSharing,
  peerStatus,
  isSpeaking,
  presentationMode,
  filmstrip,
}: VideoTileProps) {
  const initials = (participant.user_name || 'P').slice(0, 2).toUpperCase();
  const hasRemoteMedia = Boolean(stream && stream.getTracks().length);
  const showSelfVideo = isSelf && previewStream && (!isVideoOff || isScreenSharing);
  const showVideo = showSelfVideo || hasRemoteMedia;

  return (
    <div
      className={`relative overflow-hidden bg-slate-800 border transition-all duration-300 ${
        presentationMode ? 'h-full rounded-2xl' : filmstrip ? 'h-full rounded-xl' : 'aspect-video rounded-2xl'
      } ${
        isSpeaking ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/10' : 'border-white/5'
      }`}
    >
      {showSelfVideo ? (
        <video
          autoPlay
          muted
          playsInline
          ref={(node) => {
            if (!node || !previewStream) return;
            node.srcObject = previewStream;
          }}
          className="h-full w-full object-cover"
        />
      ) : hasRemoteMedia ? (
        <video
          autoPlay
          playsInline
          ref={(node) => {
            if (!node || !stream) return;
            node.srcObject = stream;
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-bold text-white backdrop-blur-sm">
              {initials}
            </div>
            <p className="text-sm font-medium text-slate-300">{participant.user_name || 'Participant'}</p>
          </div>
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
        {participant.role === 'HOST' && (
          <Crown className="h-3 w-3 text-amber-400" />
        )}
        <span className="text-xs font-medium text-white">
          {isSelf ? 'You' : participant.user_name || 'Participant'}
        </span>
        {participant.is_screen_sharing && (
          <MonitorUp className="h-3 w-3 text-sky-400" />
        )}
      </div>

      {/* Mic indicator */}
      <div className="absolute top-3 right-3">
        {participant.is_mic_on ? (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-red-500/80 backdrop-blur-sm">
            <MicOff className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Hand raised indicator */}
      {participant.hand_raised && (
        <div className="absolute top-3 left-3 grid h-7 w-7 place-items-center rounded-full bg-amber-500/90 backdrop-blur-sm">
          <Hand className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Reaction overlay */}
      {participant.last_reaction && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-3xl animate-bounce pointer-events-none">
          {participant.last_reaction}
        </div>
      )}

      {/* Self video off overlay */}
      {isSelf && isVideoOff && !isScreenSharing && (
        <div className="absolute inset-0 grid place-items-center bg-slate-800">
          <div className="text-center">
            <div className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-bold text-white">
              {initials}
            </div>
            <p className="text-xs text-slate-400">Camera off</p>
          </div>
        </div>
      )}
    </div>
  );
}
