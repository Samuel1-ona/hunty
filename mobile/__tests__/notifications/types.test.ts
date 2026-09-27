/**
 * Tests for notification payload types and navigation target resolution.
 */

import { resolveNavTarget } from '../../services/notifications/types';
import type {
  HuntStartPayload,
  CorrectAnswerPayload,
  LeaderboardOutrankedPayload,
  HuntEndingSoonPayload,
  RewardPayload,
  AchievementPayload,
} from '../../services/notifications/types';

describe('resolveNavTarget', () => {
  it('routes hunt_start to /hunt/:id', () => {
    const payload: HuntStartPayload = {
      type: 'hunt_start',
      huntId: 10,
      huntTitle: 'City Secrets',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/10' });
  });

  it('routes correct_answer to /hunt/:id', () => {
    const payload: CorrectAnswerPayload = {
      type: 'correct_answer',
      huntId: 5,
      huntTitle: 'Campus Quest',
      score: 100,
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/5' });
  });

  it('routes leaderboard_outranked to /hunt/:id', () => {
    const payload: LeaderboardOutrankedPayload = {
      type: 'leaderboard_outranked',
      huntId: 3,
      huntTitle: 'Sprint',
      currentRank: 2,
      overtakenBy: 'GUSER789',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/3' });
  });

  it('routes hunt_ending_soon to /hunt/:id', () => {
    const payload: HuntEndingSoonPayload = {
      type: 'hunt_ending_soon',
      huntId: 42,
      huntTitle: 'Museum Mystery',
      minutesRemaining: 30,
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/42' });
  });

  it('routes reward to /hunt/:id', () => {
    const payload: RewardPayload = {
      type: 'reward',
      huntId: 7,
      huntTitle: 'Treasure Trail',
      rewardAmount: '50',
      rewardType: 'XLM',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/7' });
  });

  it('routes reward without optional fields to /hunt/:id', () => {
    const payload: RewardPayload = {
      type: 'reward',
      huntId: 15,
      huntTitle: 'Quick Run',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/hunt/15' });
  });

  it('routes achievement to /(tabs)/profile', () => {
    const payload: AchievementPayload = {
      type: 'achievement',
      achievementId: 'first_hunt',
      achievementTitle: 'First Steps',
      description: 'Complete your first hunt',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/(tabs)/profile' });
  });

  it('routes achievement without description to /(tabs)/profile', () => {
    const payload: AchievementPayload = {
      type: 'achievement',
      achievementId: 'speed_demon',
      achievementTitle: 'Speed Demon',
    };
    expect(resolveNavTarget(payload)).toEqual({ path: '/(tabs)/profile' });
  });
});
