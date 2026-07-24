import { describe, it, expect, vi } from 'vitest';

// Mock react-native's Platform module to simulate different environments
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Set to web to verify it gracefully no-ops
  },
}));

// Mock expo-haptics completely to verify that even if it's imported, our utility delegates safely
vi.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  notificationAsync: vi.fn(),
  impactAsync: vi.fn(),
  selectionAsync: vi.fn(),
}));

import {
  triggerNotification,
  triggerImpact,
  triggerSelection,
  hapticTriggers,
} from '../haptics';

describe('Haptics Platform Safety', () => {
  it('does not throw errors on unsupported OS (web)', async () => {
    // Under Web, haptics should gracefully return or not crash
    await expect(triggerNotification('success')).resolves.not.toThrow();
    await expect(triggerImpact('medium')).resolves.not.toThrow();
    await expect(triggerSelection()).resolves.not.toThrow();
  });

  it('triggers haptic semantic helpers without throwing', () => {
    expect(() => hapticTriggers.joinSuccess()).not.toThrow();
    expect(() => hapticTriggers.scanSuccess()).not.toThrow();
    expect(() => hapticTriggers.scanSubtle()).not.toThrow();
    expect(() => hapticTriggers.taskSuccess()).not.toThrow();
    expect(() => hapticTriggers.rewardHeavy()).not.toThrow();
  });
});
