import type { LiveParticipantItem } from '../../../../services/liveService';
import VideoTile from './VideoTile';

type PeerStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface VideoGridProps {
  participants: LiveParticipantItem[];
  remoteStreams: Record<string, MediaStream>;
  selfUserId: string;
  previewStream: MediaStream | null;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  peerStatuses: Record<string, PeerStatus>;
  remoteAudioRefs: React.RefObject<Record<string, HTMLAudioElement | null>>;
}

function getGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1 max-w-4xl mx-auto';
  if (count === 2) return 'grid-cols-2 max-w-5xl mx-auto';
  if (count <= 4) return 'grid-cols-2 max-w-5xl mx-auto';
  if (count <= 6) return 'grid-cols-3';
  return 'grid-cols-3 xl:grid-cols-4';
}

export default function VideoGrid({
  participants,
  remoteStreams,
  selfUserId,
  previewStream,
  isVideoOff,
  isScreenSharing,
  peerStatuses,
  remoteAudioRefs,
}: VideoGridProps) {
  const count = participants.length;

  return (
    <div className={`grid gap-3 p-4 h-full content-center ${getGridClass(count)}`}>
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
              <audio
                ref={(node) => {
                  if (remoteAudioRefs.current) {
                    remoteAudioRefs.current[participant.user] = node;
                  }
                  if (node && remoteStreams[participant.user]) {
                    node.srcObject = remoteStreams[participant.user];
                  }
                }}
                autoPlay
                playsInline
                className="hidden"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
