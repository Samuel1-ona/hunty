import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { formatQueuedAnswersMessage, QueuedAnswersBanner } from '@components/QueuedAnswersBanner';

jest.mock('@providers/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { primary: '#3b82f6', warning: '#f59e0b', text: '#111827' },
  }),
}));

describe('formatQueuedAnswersMessage', () => {
  it('uses the singular form for one answer', () => {
    expect(formatQueuedAnswersMessage(1, false)).toBe(
      'You are offline. 1 answer queued – it will be submitted when you reconnect.',
    );
  });

  it('uses the plural form for several answers', () => {
    expect(formatQueuedAnswersMessage(3, false)).toBe(
      'You are offline. 3 answers queued – they will be submitted when you reconnect.',
    );
  });

  it('describes a pending sync once back online', () => {
    expect(formatQueuedAnswersMessage(2, true)).toBe('Syncing 2 answers queued while offline…');
  });
});

describe('QueuedAnswersBanner', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    announce.mockRestore();
  });

  it('shows the number of queued answers', () => {
    render(<QueuedAnswersBanner count={3} isOnline={false} />);

    expect(screen.getByTestId('queued-answers-banner')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(
      screen.getByText(
        'You are offline. 3 answers queued – they will be submitted when you reconnect.',
      ),
    ).toBeTruthy();
  });

  it('renders nothing when the queue is empty', () => {
    render(<QueuedAnswersBanner count={0} isOnline={false} />);

    expect(screen.queryByTestId('queued-answers-banner')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('disappears when the count drops to zero after a sync', () => {
    const { rerender } = render(<QueuedAnswersBanner count={2} isOnline={false} />);
    expect(screen.getByTestId('queued-answers-banner')).toBeTruthy();

    rerender(<QueuedAnswersBanner count={2} isOnline />);
    expect(screen.getByText('Syncing 2 answers queued while offline…')).toBeTruthy();

    rerender(<QueuedAnswersBanner count={0} isOnline />);
    expect(screen.queryByTestId('queued-answers-banner')).toBeNull();
  });

  describe('accessibility', () => {
    it('is exposed to screen readers as a single alert with a full label', () => {
      render(<QueuedAnswersBanner count={1} isOnline={false} />);

      const banner = screen.getByRole('alert');
      expect(banner.props.accessible).toBe(true);
      expect(banner.props.accessibilityLabel).toBe(
        'You are offline. 1 answer queued – it will be submitted when you reconnect.',
      );
      expect(
        screen.getByLabelText(
          'You are offline. 1 answer queued – it will be submitted when you reconnect.',
        ),
      ).toBeTruthy();
    });

    it('uses a polite live region so Android TalkBack reads updates', () => {
      render(<QueuedAnswersBanner count={2} isOnline={false} />);

      expect(screen.getByRole('alert').props.accessibilityLiveRegion).toBe('polite');
    });

    it('announces the message for iOS VoiceOver and re-announces when the count changes', () => {
      const { rerender } = render(<QueuedAnswersBanner count={1} isOnline={false} />);
      expect(announce).toHaveBeenLastCalledWith(
        'You are offline. 1 answer queued – it will be submitted when you reconnect.',
      );

      rerender(<QueuedAnswersBanner count={2} isOnline={false} />);
      expect(announce).toHaveBeenLastCalledWith(
        'You are offline. 2 answers queued – they will be submitted when you reconnect.',
      );
      expect(announce).toHaveBeenCalledTimes(2);
    });
  });
});
