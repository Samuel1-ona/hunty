import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addHunt,
  buildHuntInviteUrl,
  DEFAULT_HUNT_INVITE_TTL_MS,
  generateHuntInvite,
  getHuntById,
  revokeHuntInvite,
  validateHuntInvite,
  validateHuntInviteToken,
} from '@/lib/huntStore';
import type { StoredHunt } from '@/lib/types';

const privateHunt: StoredHunt = {
  id: 8801,
  title: 'Invitation only',
  description: 'A private test hunt',
  cluesCount: 2,
  status: 'Active',
  rewardType: 'XLM',
  is_private: true,
};

const publicHunt: StoredHunt = {
  ...privateHunt,
  id: 8802,
  title: 'Public hunt',
  is_private: false,
};

describe('private hunt invites', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T10:00:00.000Z'));
    addHunt(privateHunt);
    addHunt(publicHunt);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('generates a UUID invite and persists its expiration with the hunt', () => {
    const invite = generateHuntInvite(privateHunt.id);

    expect(invite.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(invite.createdAt).toBe(Date.now());
    expect(invite.expiresAt).toBe(Date.now() + DEFAULT_HUNT_INVITE_TTL_MS);
    expect(getHuntById(privateHunt.id)?.invite).toEqual(invite);
  });

  it('accepts only the current token for the matching private hunt', () => {
    const firstInvite = generateHuntInvite(privateHunt.id);
    expect(validateHuntInviteToken(privateHunt.id, firstInvite.token)).toEqual({
      isValid: true,
      reason: 'valid',
    });

    const replacement = generateHuntInvite(privateHunt.id);
    expect(replacement.token).not.toBe(firstInvite.token);
    expect(validateHuntInviteToken(privateHunt.id, firstInvite.token)).toEqual({
      isValid: false,
      reason: 'invalid',
    });
    expect(validateHuntInviteToken(privateHunt.id, replacement.token).isValid).toBe(true);
  });

  it('denies missing and invalid tokens', () => {
    generateHuntInvite(privateHunt.id);

    expect(validateHuntInviteToken(privateHunt.id, null)).toEqual({
      isValid: false,
      reason: 'required',
    });
    expect(validateHuntInviteToken(privateHunt.id, 'not-the-token')).toEqual({
      isValid: false,
      reason: 'invalid',
    });
  });

  it('reports an expired matching token', () => {
    const invite = generateHuntInvite(privateHunt.id, 60_000);

    expect(validateHuntInviteToken(privateHunt.id, invite.token, invite.expiresAt)).toEqual({
      isValid: false,
      reason: 'expired',
    });
  });

  it('revokes the current link and denies its token', () => {
    const invite = generateHuntInvite(privateHunt.id);

    expect(revokeHuntInvite(privateHunt.id)).toBe(true);
    expect(getHuntById(privateHunt.id)?.invite).toBeUndefined();
    expect(validateHuntInviteToken(privateHunt.id, invite.token)).toEqual({
      isValid: false,
      reason: 'invalid',
    });
    expect(revokeHuntInvite(privateHunt.id)).toBe(false);
  });

  it('does not require an invite for public hunts', () => {
    expect(validateHuntInvite(publicHunt, null)).toEqual({
      isValid: true,
      reason: 'public',
    });
  });

  it('does not generate invites for public or missing hunts', () => {
    expect(() => generateHuntInvite(publicHunt.id)).toThrow(/private hunts/i);
    expect(() => generateHuntInvite(999_999)).toThrow(/not found/i);
    expect(() => generateHuntInvite(privateHunt.id, 0)).toThrow(/expiration/i);
  });

  it('builds the canonical encoded invite URL', () => {
    expect(buildHuntInviteUrl(42, 'token/with spaces', 'https://example.com/')).toBe(
      'https://example.com/hunt/42?invite=token%2Fwith%20spaces'
    );
  });
});
