import { describe, it, expect } from 'vitest';
import { scanHuntContent } from '@/lib/moderation/autoFlag';
import { createHunt } from '@/lib/test-utils/factories';

describe('moderation autoFlag', () => {
  it('flags excessive caps in title', () => {
    const hunt = createHunt({
      title: 'FREE MONEY SCAVENGER HUNT',
      description: 'A normal description for players.',
    });
    const { autoFlags } = scanHuntContent(hunt);
    expect(autoFlags).toContain('excessive_caps');
  });

  it('flags blocked terms and maps policy violations', () => {
    const hunt = createHunt({
      title: 'Casino bonus hunt',
      description: 'Win free money by completing clues around the city center today.',
    });
    const { autoFlags, policyViolations } = scanHuntContent(hunt);
    expect(autoFlags).toContain('blocked_terms');
    expect(policyViolations).toContain('spam');
  });

  it('flags suspicious multiple URLs', () => {
    const hunt = createHunt({
      title: 'Link hunt',
      description: 'Visit https://a.example and https://b.example for clues.',
    });
    const { autoFlags, policyViolations } = scanHuntContent(hunt);
    expect(autoFlags).toContain('suspicious_urls');
    expect(policyViolations).toContain('spam');
  });

  it('flags profanity in description', () => {
    const hunt = createHunt({ title: 'City walk', description: 'This hunt is damn hard but fun.' });
    const { policyViolations } = scanHuntContent(hunt);
    expect(policyViolations).toContain('profanity');
  });
});
