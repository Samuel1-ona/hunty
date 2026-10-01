import { useTheme } from '@providers/ThemeProvider';
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

interface QueuedAnswersBannerProps {
  /** Number of answers waiting in the offline queue. */
  count: number;
  isOnline: boolean;
}

export function formatQueuedAnswersMessage(count: number, isOnline: boolean): string {
  const answers = count === 1 ? '1 answer' : `${count} answers`;
  if (isOnline) {
    return `Syncing ${answers} queued while offline…`;
  }
  return `You are offline. ${answers} queued – ${
    count === 1 ? 'it' : 'they'
  } will be submitted when you reconnect.`;
}

/**
 * Tells players how many answers are waiting in the local offline queue.
 * Renders nothing once the queue is empty (i.e. after a successful sync).
 */
export const QueuedAnswersBanner: React.FC<QueuedAnswersBannerProps> = ({ count, isOnline }) => {
  const { colors } = useTheme();
  const visible = count > 0;
  const message = formatQueuedAnswersMessage(count, isOnline);

  // iOS has no live regions, so announce changes explicitly for VoiceOver.
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [visible, message]);

  if (!visible) return null;

  const tint = isOnline ? colors.primary : colors.warning;

  return (
    <View
      testID="queued-answers-banner"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={[styles.container, { backgroundColor: tint + '20', borderColor: tint }]}
    >
      <Text style={[styles.count, { color: tint }]} importantForAccessibility="no">
        {count}
      </Text>
      <Text style={[styles.text, { color: colors.text }]} importantForAccessibility="no">
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  count: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
