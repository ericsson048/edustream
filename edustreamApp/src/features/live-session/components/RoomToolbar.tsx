import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../../theme/colors';

interface ToolbarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  showChat: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleHand: () => void;
  onToggleReactions: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

export function Toolbar({
  isMuted, isVideoOff, isHandRaised, showChat,
  onToggleMute, onToggleVideo, onToggleHand, onToggleReactions, onToggleChat, onLeave,
}: ToolbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.row}>
        <ToolBtn
          icon={isMuted ? 'mic-off' : 'mic'}
          active={isMuted}
          activeColor="#ef4444"
          onPress={onToggleMute}
        />
        <ToolBtn
          icon={isVideoOff ? 'videocam-off' : 'videocam'}
          active={isVideoOff}
          activeColor="#ef4444"
          onPress={onToggleVideo}
        />
        <ToolBtn
          icon={isHandRaised ? 'hand-left' : 'hand-left-outline'}
          active={isHandRaised}
          activeColor="#f59e0b"
          onPress={onToggleHand}
        />
        <ToolBtn icon="happy-outline" active={false} activeColor="#e2e8f0" onPress={onToggleReactions} />
        <ToolBtn
          icon={showChat ? 'chatbubbles' : 'chatbubbles-outline'}
          active={showChat}
          activeColor="#3b82f6"
          onPress={onToggleChat}
        />
        <TouchableOpacity onPress={onLeave} style={styles.leaveBtn} accessibilityLabel="Leave call">
          <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToolBtn({ icon, active, activeColor, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toolBtn, active && { backgroundColor: activeColor + '33' }]}
    >
      <Ionicons name={icon} size={22} color={active ? activeColor : '#e2e8f0'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  toolBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  leaveBtn: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center', alignItems: 'center',
  },
});
