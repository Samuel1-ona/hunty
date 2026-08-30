import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HuntInviteControls } from '@/components/HuntInviteControls';
import { addHunt, getHuntById } from '@/lib/huntStore';
import type { StoredHunt } from '@/lib/types';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const hunt: StoredHunt = {
  id: 450,
  title: 'Dashboard private hunt',
  description: 'Private',
  cluesCount: 1,
  status: 'Active',
  rewardType: 'XLM',
  is_private: true,
};

function InviteControlsHarness() {
  const [currentHunt, setCurrentHunt] = useState(() => getHuntById(hunt.id)!);

  return (
    <HuntInviteControls
      hunt={currentHunt}
      onRefresh={() => setCurrentHunt(getHuntById(hunt.id)!)}
    />
  );
}

describe('HuntInviteControls', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    addHunt(hunt);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('lets a creator generate, copy, and revoke a private-hunt invite', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<InviteControlsHarness />);

    await user.click(
      screen.getByRole('button', { name: /generate invite link for dashboard private hunt/i })
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/localhost(?::\d+)?\/hunt\/450\?invite=/)
      );
    });
    expect(
      screen.getByRole('button', { name: /copy invite link for dashboard private hunt/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /copy invite link for dashboard private hunt/i })
    );
    expect(writeText).toHaveBeenCalledTimes(2);

    await user.click(
      screen.getByRole('button', { name: /revoke invite link for dashboard private hunt/i })
    );

    expect(window.confirm).toHaveBeenCalled();
    expect(getHuntById(hunt.id)?.invite).toBeUndefined();
    expect(
      screen.getByRole('button', { name: /generate invite link for dashboard private hunt/i })
    ).toBeInTheDocument();
  });

  it('does not render invite actions for a public hunt', () => {
    render(<HuntInviteControls hunt={{ ...hunt, is_private: false }} onRefresh={vi.fn()} />);

    expect(screen.queryByText(/private invite/i)).not.toBeInTheDocument();
  });
});
