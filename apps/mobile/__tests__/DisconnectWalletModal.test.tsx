import { fireEvent, render } from '@testing-library/react-native';

import { DisconnectWalletModal } from '../components/settings/DisconnectWalletModal';

jest.mock('@providers/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#e5e7eb',
      error: '#ef4444',
      secondary: '#8b5cf6',
      text: '#111827',
    },
  }),
}));

describe('DisconnectWalletModal', () => {
  it('opens and confirms disconnect', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { getByLabelText, getByText, rerender } = render(
      <DisconnectWalletModal
        visible={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    rerender(
      <DisconnectWalletModal
        visible
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(getByText('Disconnect Wallet')).toBeTruthy();
    fireEvent.press(getByLabelText('Confirm disconnect wallet'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});