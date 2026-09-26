import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { HuntCard } from '@components/HuntCard';
import type { StoredHunt } from '@hunty/types';

/**
 * The card renders through a real react-native tree (the app's Jest config now
 * uses react-native's preset); only the pieces that reach native modules are
 * doubled: the themed primitives pull in expo-haptics, and the cover image
 * pulls in expo-image, neither of which has a Jest mock in this app.
 */
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@providers/ThemeProvider', () => ({
  useTheme: () => ({ colors: { border: '#e5e7eb' } }),
}));

jest.mock('@components/themed', () => {
  // Render through react-native's own Text/View so text queries and
  // `numberOfLines` behave exactly as they do in the app. `jest.requireActual`
  // is used because a jest.mock factory may not close over imports.
  const { Text, View } = jest.requireActual('react-native');
  return { ThemedView: View, ThemedCustomText: Text };
});

jest.mock('@components/HuntCoverImage', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    HuntCoverImage: ({ alt }: { alt: string }) =>
      React.createElement(View, { accessibilityLabel: alt, testID: 'hunt-cover-image' }),
  };
});

const hunt: StoredHunt = {
  id: 7,
  title: 'Downtown Dash',
  description: 'Five clues across the old town.',
  cluesCount: 5,
  status: 'Active',
  rewardType: 'XLM',
};

describe('HuntCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the hunt title and description', () => {
    const { getByText } = render(<HuntCard hunt={hunt} />);

    expect(getByText('Downtown Dash')).toBeTruthy();
    expect(getByText('Five clues across the old town.')).toBeTruthy();
  });

  it('exposes itself as a button labelled with title and description', () => {
    const { getByTestId } = render(<HuntCard hunt={hunt} />);

    const card = getByTestId('hunt-card-7');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBe('Downtown Dash. Five clues across the old town.');
    expect(card.props.accessibilityHint).toBe('Opens hunt details');
  });

  it('still builds a label when the description is empty', () => {
    const { getByTestId } = render(<HuntCard hunt={{ ...hunt, description: '' }} />);

    expect(getByTestId('hunt-card-7').props.accessibilityLabel).toBe('Downtown Dash. ');
  });

  it('routes to the hunt details screen when pressed', () => {
    const { getByTestId } = render(<HuntCard hunt={hunt} />);

    fireEvent.press(getByTestId('hunt-card-7'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/hunt/7');
  });

  it('clamps the description to two lines', () => {
    const { getByText } = render(<HuntCard hunt={hunt} />);

    expect(getByText('Five clues across the old town.').props.numberOfLines).toBe(2);
  });

  it('passes the title into the cover image alt text', () => {
    const { getByLabelText } = render(<HuntCard hunt={hunt} />);

    expect(getByLabelText('Downtown Dash cover')).toBeTruthy();
  });
});
