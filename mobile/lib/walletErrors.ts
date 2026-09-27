export type WalletTxErrorKind = 'rejected' | 'timeout' | 'unknown';

export type WalletTxError = {
  kind: WalletTxErrorKind;
  message: string;
};

export function classifyWalletTxError(input: unknown): WalletTxError {
  const source = String(input ?? '').toLowerCase();

  if (
    source.includes('user rejected') ||
    source.includes('rejected by user') ||
    source.includes('declined') ||
    source.includes('cancelled') ||
    source.includes('canceled')
  ) {
    return {
      kind: 'rejected',
      message: 'Transaction rejected in wallet. No changes were made.',
    };
  }

  if (
    source.includes('timeout') ||
    source.includes('timed out') ||
    source.includes('expired') ||
    source.includes('session expired')
  ) {
    return {
      kind: 'timeout',
      message: 'Wallet request timed out. Please retry the transaction.',
    };
  }

  return {
    kind: 'unknown',
    message: 'Wallet transaction failed. Please try again.',
  };
}

