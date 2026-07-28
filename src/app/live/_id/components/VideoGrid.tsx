import { MonitorUp } from 'lucide-react';
import type { LiveParticipantItem } from '../../../../services/liveService';
import VideoTile from './VideoTile';

type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface VideoGridProps {
  participants: LiveParticipantItem[];
  remoteStreams: Record<string, MediaStream>;
  selfUserId: string;
  previewStream: MediaStream | null;
  cameraStream: MediaStream | null;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerStatuses: Record<string, PeerStatus>;
  remoteAudioRefs: React.RefObject<Record<string, HTMLAudioElement | null>>;
}

function getGridStyle(count: number): React.CSSProperties {
  if (count <= 1) return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 480px), 1fr))' };
  if (count === 2) return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))' };
  if (count <= 4) return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' };
  if (count <= 6) return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' };
  return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' };
}

function AudioNode({
  participant,
  stream,
  remoteAudioRefs,
}: {
  participant: LiveParticipantItem;
  stream: MediaStream | undefined;
  remoteAudioRefs: React.RefObject<Record<string, HTMLAudioElement | null>>;
}) {
  return (
    <audio
      ref={(node) => {
        if (remoteAudioRefs.current) {
          remoteAudioRefs.current[participant.user] = node;
        }
        if (node && stream) {
          node.srcObject = stream;
        }
      }}
      autoPlay
      playsInline
      className="hidden"
    />
  );
}

export default function VideoGrid({
  participants,
  remoteStreams,
  selfUserId,
  previewStream,
  cameraStream,
  isVideoOff,
  isScreenSharing,
  peerStatuses,
  remoteAudioRefs,
}: VideoGridProps) {
  const count = participants.length;

  const sharer = participants.find((p) => p.is_screen_sharing);
  const isPresentationMode = Boolean(sharer);

  if (isPresentationMode && sharer) {
    const isSelfSharer = sharer.user === selfUserId;
    const others = participants.filter((p) => p.user !== sharer.user);

    return (
      <div className="flex flex-col h-full p-4 gap-3">
        {/* Main presenter area */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-800 border border-white/5">
          <VideoTile
            participant={sharer}
            stream={isSelfSharer ? previewStream : remoteStreams[sharer.user]}
            isSelf={isSelfSharer}
            previewStream={previewStream}
            isVideoOff={false}
            isScreenSharing={true}
            peerStatus="connected"
            presentationMode
          />
          {/* Presenter badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-sky-600/90 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10">
            <MonitorUp className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-bold text-white">
              {isSelfSharer ? 'You are sharing' : `${sharer.user_name || 'Participant'} is sharing`}
            </span>
          </div>
          {/* Self camera overlay when self-sharing */}
          {isSelfSharer && cameraStream && !isVideoOff && (
            <div className="absolute bottom-4 right-4 w-48 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-10">
              <video
                autoPlay
                muted
                playsInline
                ref={(node) => {
                  if (node && cameraStream) node.srcObject = cameraStream;
                }}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          {!isSelfSharer && (
            <AudioNode participant={sharer} stream={remoteStreams[sharer.user]} remoteAudioRefs={remoteAudioRefs} />
          )}
        </div>

        {/* Filmstrip of other participants */}
        {others.length > 0 && (
          <div className="flex-shrink-0 h-28 flex gap-2 overflow-x-auto px-1 pb-1">
            {others.map((participant) => {
              const isSelf = participant.user === selfUserId;
              return (
                <div key={participant.id} className="relative flex-shrink-0 w-40 h-full">
                  <VideoTile
                    participant={participant}
                    stream={remoteStreams[participant.user]}
                    isSelf={isSelf}
                    previewStream={previewStream}
                    isVideoOff={isVideoOff}
                    isScreenSharing={false}
                    peerStatus={isSelf ? 'connected' : (peerStatuses[participant.user] || 'idle')}
                    filmstrip
                  />
                  {!isSelf && (
                    <AudioNode participant={participant} stream={remoteStreams[participant.user]} remoteAudioRefs={remoteAudioRefs} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3 p-4 h-full content-center w-full"
      style={getGridStyle(count)}
    >
      {participants.map((participant) => {
        const isSelf = participant.user === selfUserId;
        return (
          <div key={participant.id} className="relative">
            <VideoTile
              participant={participant}
              stream={remoteStreams[participant.user]}
              isSelf={isSelf}
              previewStream={previewStream}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              peerStatus={isSelf ? 'connected' : (peerStatuses[participant.user] || 'idle')}
            />
            {!isSelf && (
              <AudioNode participant={participant} stream={remoteStreams[participant.user]} remoteAudioRefs={remoteAudioRefs} />
            )}
          </div>
        );
      })}
    </div>
  );
}
