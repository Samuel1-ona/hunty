/**
 * Pure, side-effect-free helpers for the QR scanner's non-visual (accessibility)
 * behaviour. Extracting them here keeps the camera state -> announcement mapping
 * and manual-entry validation deterministic and unit-testable without rendering
 * native components.
 */

/** Distinct camera/scanner states that should be surfaced to assistive tech. */
export type ScannerCameraState =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'permission-required'
  | 'permission-denied'
  | 'error'
  | 'stopped';

export interface ManualCodeValidation {
  valid: boolean;
  error: string | null;
}

/** Upper bound for a manually entered code. Real QR payloads (base64) can be long. */
export const MAX_MANUAL_CODE_LENGTH = 512;

/**
 * Validates a code entered manually before it is treated as if it were scanned.
 * Any non-empty, reasonably sized string is accepted; the actual clue-matching
 * validation is performed by the parent screen (exactly as it is for a real
 * scan) so manual entry behaves identically to a successful scan.
 */
export function validateManualCode(code: string): ManualCodeValidation {
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a code.' };
  }
  if (trimmed.length > MAX_MANUAL_CODE_LENGTH) {
    return { valid: false, error: 'Code is too long.' };
  }
  return { valid: true, error: null };
}

/**
 * Maps the current scanner state (plus whether a code has been detected) to the
 * text surfaced through the scanner's live region. Returning a stable string for
 * a given state ensures screen readers do not announce duplicate/repetitive
 * messages.
 *
 * States covered (per accessibility requirements):
 *  - starting        -> "Scanner starting"
 *  - ready           -> "Position the QR code within the frame"
 *  - scanned/detected -> "QR Code detected"
 *  - permission-required -> "Camera permission required"
 *  - permission-denied -> "Camera access denied"
 *  - error           -> "Camera unavailable"
 *  - stopped         -> "Scanning stopped"
 */
export function getScannerStatusText(state: ScannerCameraState, scanned: boolean): string {
  if (scanned) {
    return 'QR Code detected';
  }
  switch (state) {
    case 'starting':
      return 'Scanner starting';
    case 'ready':
      return 'Position the QR code within the frame';
    case 'permission-required':
      return 'Camera permission required';
    case 'permission-denied':
      return 'Camera access denied';
    case 'error':
      return 'Camera unavailable';
    case 'stopped':
      return 'Scanning stopped';
    case 'idle':
    default:
      return 'Position the QR code within the frame';
  }
}
