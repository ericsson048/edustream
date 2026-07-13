import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { scheduleService, type LiveSession } from '../../src/services/schedule';
import { BorderRadius, Spacing } from '../../src/theme/colors';
import { SkeletonLoader } from '../../src/components/SkeletonLoader';
import { useAlert } from '../../src/components/AlertDialog';

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alert } = useAlert();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!id) return;
    scheduleService.getSession(id).then(setSession).catch(() => router.back()).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await scheduleService.joinSession(id);
      setJoined(true);
    } catch {
      await alert({ title: 'Error', message: 'Could not join session. You must be enrolled in the course.' });
    } finally {
      setJoining(false);
    }
  };

  const isLive = session?.status === 'LIVE';
  const isScheduled = session?.status === 'SCHEDULED';
  const isEnded = session?.status === 'ENDED';

  const statusConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    SCHEDULED: { icon: 'calendar-outline', color: colors.warning, label: 'Scheduled' },
    LIVE: { icon: 'radio-outline', color: colors.error, label: 'Live Now' },
    ENDED: { icon: 'checkmark-outline', color: colors.textMuted, label: 'Ended' },
  };
  const cfg = statusConfig[session?.status || 'SCHEDULED'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing['6xl'] }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <SkeletonLoader height={200} rounded="xl" />
            <SkeletonLoader height={30} rounded="lg" style={{ marginTop: Spacing.lg, width: '70%' }} />
            <SkeletonLoader height={60} rounded="lg" style={{ marginTop: Spacing.md }} />
          </>
        ) : session ? (
          <>
            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing['2xl'], alignItems: 'center' }}>
              <View style={[styles.liveIcon, { backgroundColor: isLive ? colors.error + '20' : colors.primaryLight }]}>
                <Ionicons
                  name={isLive ? 'radio' : isEnded ? 'checkmark-circle-outline' : 'calendar-outline'}
                  size={44}
                  color={isLive ? colors.error : colors.primary}
                />
              </View>
              <ThemedText variant="h2" bold style={{ marginTop: Spacing.lg, textAlign: 'center' }}>{session.title}</ThemedText>
              {session.course_title && (
                <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>{session.course_title}</ThemedText>
              )}
              <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20', marginTop: Spacing.md }]}>
                <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                <ThemedText variant="label" style={{ color: cfg.color, marginLeft: 4 }}>{cfg.label}</ThemedText>
              </View>
            </ThemedView>

            <ThemedView variant="card" rounded="xl" elevated style={{ padding: Spacing.xl, marginTop: Spacing.xl }}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <ThemedText variant="body" style={{ marginLeft: Spacing.md }}>{session.instructor_name || 'Instructor'}</ThemedText>
              </View>
              <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <ThemedText variant="body" style={{ marginLeft: Spacing.md }}>
                  {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes}min
                </ThemedText>
              </View>
            </ThemedView>

            {isLive && !joined && (
              <TouchableOpacity onPress={handleJoin} disabled={joining} style={[styles.joinBtn, { backgroundColor: colors.error, marginTop: Spacing['2xl'] }]}>
                {joining ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={22} color="#fff" />
                    <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>Join Session</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isLive && joined && (
              <TouchableOpacity onPress={() => Linking.openURL('https://meet.edustream.app')} style={[styles.joinBtn, { backgroundColor: colors.error, marginTop: Spacing['2xl'] }]}>
                <Ionicons name="videocam-outline" size={22} color="#fff" />
                <ThemedText bold style={{ color: '#fff', marginLeft: Spacing.sm, fontSize: 16 }}>Open Video Room</ThemedText>
              </TouchableOpacity>
            )}

            {isScheduled && (
              <ThemedView variant="secondary" rounded="xl" style={{ padding: Spacing.md, marginTop: Spacing.xl, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                <ThemedText variant="caption" color="muted" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                  This session hasn&apos;t started yet. Join when it&apos;s live.
                </ThemedText>
              </ThemedView>
            )}

            {isEnded && (
              <ThemedView variant="secondary" rounded="xl" style={{ padding: Spacing.md, marginTop: Spacing.xl, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <ThemedText variant="caption" style={{ color: colors.success, marginLeft: Spacing.sm, flex: 1 }}>
                  This session has ended.
                </ThemedText>
              </ThemedView>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  liveIcon: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
