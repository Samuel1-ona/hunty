import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { JoinHuntButton } from '@components/JoinHuntButton';
import type { UseJoinHuntResult } from '@hooks/useJoinHunt';
import { JoinHuntError } from '@services/joinHunt';

const mockJoin = jest.fn();
const mockConnect = jest.fn();
let mockState: Partial<UseJoinHuntResult> = {};

jest.mock('@hooks/useJoinHunt', () => ({
  useJoinHunt: () => ({
    phase: 'ready',
    stage: null,
    error: null,
    unavailableReason: null,
    transactionHash: null,
    join: mockJoin,
    connect: mockConnect,
    ...mockState,
  }),
}));

// The service is only needed for the JoinHuntError class; skip the Stellar SDK.
jest.mock('@services/joinHunt', () => {
  class JoinHuntError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return { JoinHuntError };
});

jest.mock('@providers/ThemeProvider', () => ({
  useTheme: () => ({
    colors: { background: '#fff', border: '#e5e7eb', primary: '#3737A4', error: '#dc2626' },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));

// Themed primitives reach expo-haptics; render them through plain RN pieces.
jest.mock('@components/themed', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    ThemedCustomText: Text,
    ThemedButton: ({
      text,
      onPress,
      disabled,
      loading,
      testID,
      accessibilityHint,
    }: {
      text: string;
      onPress?: () => void;
      disabled?: boolean;
      loading?: boolean;
      testID?: string;
      accessibilityHint?: string;
    }) =>
      React.createElement(
        Pressable,
        {
          testID,
          accessibilityRole: 'button',
          accessibilityHint,
          accessibilityState: { disabled: Boolean(disabled || loading), busy: Boolean(loading) },
          onPress: disabled || loading ? undefined : onPress,
        },
        React.createElement(Text, null, text),
      ),
  };
});

const hunt = { id: 1, title: 'City Secrets', status: 'Active' as const };

function renderButton(state: Partial<UseJoinHuntResult>) {
  mockState = state;
  const onStartHunt = jest.fn();
  const onSwitchNetwork = jest.fn();
  const utils = render(
    <JoinHuntButton hunt={hunt} onStartHunt={onStartHunt} onSwitchNetwork={onSwitchNetwork} />,
  );
  return { ...utils, onStartHunt, onSwitchNetwork };
}

describe('JoinHuntButton', () => {
  beforeEach(() => {
    mockJoin.mockReset();
    mockConnect.mockReset();
    mockState = {};
  });

  it('starts the on-chain join when ready', () => {
    const { getByTestId, getByText } = renderButton({ phase: 'ready' });

    expect(getByText('Join Hunt')).toBeTruthy();
    expect(getByText(/approve a Soroban registration transaction/)).toBeTruthy();

    fireEvent.press(getByTestId('join-hunt-button'));
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  it('asks for a wallet connection first', () => {
    mockConnect.mockResolvedValue(undefined);
    const { getByTestId, getByText } = renderButton({ phase: 'connect' });

    expect(getByText('Connect Wallet to Join')).toBeTruthy();
    fireEvent.press(getByTestId('join-hunt-button'));
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('shows a connection failure inline', async () => {
    mockConnect.mockRejectedValue(new Error('WalletConnect client is not initialized.'));
    const { getByTestId, findByText } = renderButton({ phase: 'connect' });

    fireEvent.press(getByTestId('join-hunt-button'));

    expect(await findByText('WalletConnect client is not initialized.')).toBeTruthy();
    expect(getByTestId('join-hunt-error')).toBeTruthy();
  });

  it('routes mainnet wallets to the network switcher', () => {
    const { getByTestId, getByText, onSwitchNetwork } = renderButton({ phase: 'wrong_network' });

    expect(getByText('Switch to Testnet')).toBeTruthy();
    fireEvent.press(getByTestId('join-hunt-button'));
    expect(onSwitchNetwork).toHaveBeenCalledTimes(1);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('shows stage progress and blocks presses while joining', () => {
    const { getByTestId, getByText } = renderButton({
      phase: 'in_progress',
      stage: 'awaiting_signature',
    });

    expect(getByText('Approve in your wallet…')).toBeTruthy();
    expect(getByText(/approve the join request/)).toBeTruthy();
    expect(getByTestId('join-hunt-progress').props.accessibilityValue).toEqual({
      min: 0,
      max: 4,
      now: 2,
    });

    const button = getByTestId('join-hunt-button');
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('shows the failure and lets the player retry', () => {
    const { getByTestId, getByText } = renderButton({
      phase: 'error',
      error: new JoinHuntError('Transaction rejected in wallet.', 'SIGNATURE_REJECTED'),
    });

    expect(getByTestId('join-hunt-error')).toBeTruthy();
    expect(getByText('Transaction rejected in wallet.')).toBeTruthy();
    fireEvent.press(getByText('Try Again'));
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  it('explains why joining is unavailable', () => {
    const { getByTestId, getByText } = renderButton({
      phase: 'unavailable',
      unavailableReason: 'This hunt is draft and not open to join.',
    });

    expect(getByText('This hunt is draft and not open to join.')).toBeTruthy();
    expect(getByTestId('join-hunt-button').props.accessibilityState.disabled).toBe(true);
  });

  it('continues into the hunt once joined', () => {
    const { getByTestId, getByText, onStartHunt, queryByTestId } = renderButton({
      phase: 'joined',
    });

    expect(getByText('Start Hunting')).toBeTruthy();
    expect(queryByTestId('join-hunt-progress')).toBeNull();
    fireEvent.press(getByTestId('join-hunt-button'));
    expect(onStartHunt).toHaveBeenCalledTimes(1);
  });
});
