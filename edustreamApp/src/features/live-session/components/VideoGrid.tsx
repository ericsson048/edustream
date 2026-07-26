import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { VideoTile } from './VideoTile';
import { Spacing } from '../../../theme/colors';

interface Participant {
  user: string;
  user_name?: string;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  hand_raised?: boolean;
  last_reaction?: string;
}

interface VideoGridProps {
  participants: Participant[];
  remoteStreams: Record<string, string>;
  selfUserId: string;
  localStreamURL: string | null;
  isVideoOff: boolean;
  isMuted: boolean;
  isHandRaised: boolean;
  peerStatuses: Record<string, string>;
}

export function VideoGrid({
  participants, remoteStreams, selfUserId, localStreamURL,
  isVideoOff, isMuted, isHandRaised, peerStatuses,
}: VideoGridProps) {
  const count = participants.length;
  const screenW = Dimensions.get('window').width;
  const cols = count <= 1 ? 1 : count <= 2 ? 2 : 2;
  const gap = Spacing.sm;
  const tileW = cols === 1 ? screenW - Spacing.xl * 2 : (screenW - Spacing.xl * 2 - gap) / 2;

  const selfParticipant = participants.find((p) => p.user === selfUserId);
  const remoteParticipants = participants.filter((p) => p.user !== selfUserId);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Local self video - full width */}
      {selfParticipant && (
        <View style={[styles.selfTile, { width: tileW }]}>
          <VideoTile
            streamURL={localStreamURL || undefined}
            userName={selfParticipant.user_name || 'You'}
            isSelf
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            isHandRaised={isHandRaised}
            peerStatus="connected"
          />
        </View>
      )}

      {/* Remote participants - grid */}
      {remoteParticipants.length > 0 && (
        <View style={styles.grid}>
          {remoteParticipants.map((p) => (
            <View key={p.user} style={[styles.gridTile, { width: tileW }]}>
              <VideoTile
                streamURL={remoteStreams[p.user]}
                userName={p.user_name || 'Participant'}
                isSelf={false}
                isVideoOff={!p.is_camera_on}
                isMuted={!p.is_mic_on}
                isHandRaised={!!p.hand_raised}
                peerStatus={peerStatuses[p.user] || 'idle'}
              />
            </View>
          ))}
        </View>
      )}

      {count <= 1 && (
        <View style={styles.waiting}>
          <VideoTile streamURL={undefined} userName="" isSelf isVideoOff isMuted isHandRaised={false} peerStatus="connected" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md },
  selfTile: { alignSelf: 'center', marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridTile: {},
  waiting: { alignItems: 'center', marginTop: Spacing['3xl'] },
});
