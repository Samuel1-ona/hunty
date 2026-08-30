import { beforeEach, describe, expect, it } from 'vitest';
import {
  awardReferralBonusOnFirstCompletion,
  buildReferralCode,
  consumePendingReferral,
  getReferralStats,
  storePendingReferralCode,
} from '@/lib/referrals';

describe('referrals', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('captures a pending referral when a different wallet registers', () => {
    storePendingReferralCode(
      buildReferralCode('GREFERRERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    );

    const record = consumePendingReferral('GPLAYERBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

    expect(record).not.toBeNull();
    expect(record?.bonusAwarded).toBe(false);
    expect(record?.referrerAddress).toContain('GREFERRER');
  });

  it('awards a referral bonus only once after the referred player completes a hunt', () => {
    const referrer = 'GREFERRERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const referred = 'GPLAYERBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    storePendingReferralCode(buildReferralCode(referrer));
    consumePendingReferral(referred);

    const firstAward = awardReferralBonusOnFirstCompletion(referred, 44, 25);
    const secondAward = awardReferralBonusOnFirstCompletion(referred, 44, 25);
    const stats = getReferralStats(referrer);

    expect(firstAward?.bonusAwarded).toBe(true);
    expect(secondAward?.bonusPoints).toBe(25);
    expect(stats.successfulReferrals).toBe(1);
    expect(stats.bonusPoints).toBe(25);
  });
});
