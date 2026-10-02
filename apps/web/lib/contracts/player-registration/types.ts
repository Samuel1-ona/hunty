export type RegistrationStatus =
  | 'UNREGISTERED'
  | 'PENDING'
  | 'REGISTERED'
  | 'REJECTED'
  | 'FAILED';

export interface RegistrationParams {
  playerId: string;
  displayName: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationResult {
  txHash: string;
  blockNumber: number;
  status: RegistrationStatus;
}