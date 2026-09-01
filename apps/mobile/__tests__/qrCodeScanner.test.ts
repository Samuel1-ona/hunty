import type { ScannerCameraState } from '../lib/qrCodeScanner';
import {
  MAX_MANUAL_CODE_LENGTH,
  getScannerStatusText,
  validateManualCode,
} from '../lib/qrCodeScanner';

describe('validateManualCode', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(validateManualCode('')).toEqual({ valid: false, error: 'Please enter a code.' });
    expect(validateManualCode('   ')).toEqual({ valid: false, error: 'Please enter a code.' });
  });

  it('accepts a normal checkpoint code', () => {
    expect(validateManualCode('lantern statue')).toEqual({ valid: true, error: null });
  });

  it('accepts a hunty:v1 encoded payload', () => {
    const payload = `hunty:v1:${'e'.repeat(120)}`;
    expect(validateManualCode(payload).valid).toBe(true);
  });

  it('rejects codes exceeding the maximum length', () => {
    const tooLong = 'a'.repeat(MAX_MANUAL_CODE_LENGTH + 1);
    expect(validateManualCode(tooLong)).toEqual({ valid: false, error: 'Code is too long.' });
  });

  it('accepts a code exactly at the maximum length', () => {
    const atLimit = 'a'.repeat(MAX_MANUAL_CODE_LENGTH);
    expect(validateManualCode(atLimit)).toEqual({ valid: true, error: null });
  });

  it('trims surrounding whitespace before validating', () => {
    expect(validateManualCode('  lantern statue  ')).toEqual({ valid: true, error: null });
  });
});

describe('getScannerStatusText (camera state announcements)', () => {
  const states: ScannerCameraState[] = [
    'starting',
    'ready',
    'permission-required',
    'permission-denied',
    'error',
    'stopped',
    'idle',
  ];

  it('announces "QR Code detected" when a code has been scanned', () => {
    expect(getScannerStatusText('ready', true)).toBe('QR Code detected');
    expect(getScannerStatusText('starting', true)).toBe('QR Code detected');
    expect(getScannerStatusText('error', true)).toBe('QR Code detected');
  });

  it('maps each camera state to a non-repetitive announcement string', () => {
    const expected: Record<string, string> = {
      starting: 'Scanner starting',
      ready: 'Position the QR code within the frame',
      'permission-required': 'Camera permission required',
      'permission-denied': 'Camera access denied',
      error: 'Camera unavailable',
      stopped: 'Scanning stopped',
      idle: 'Position the QR code within the frame',
    };

    for (const state of states) {
      expect(getScannerStatusText(state, false)).toBe(expected[state]);
    }
  });

  it('produces stable output for the same state (no repetitive changes)', () => {
    const first = getScannerStatusText('ready', false);
    const second = getScannerStatusText('ready', false);
    expect(first).toBe(second);
    expect(getScannerStatusText('ready', false)).toBe(getScannerStatusText('ready', false));
  });

  it('covers every required announcement from the accessibility spec', () => {
    expect(getScannerStatusText('starting', false)).toBe('Scanner starting');
    expect(getScannerStatusText('ready', false)).toBe('Position the QR code within the frame');
    expect(getScannerStatusText('ready', true)).toBe('QR Code detected');
    expect(getScannerStatusText('error', false)).toBe('Camera unavailable');
    expect(getScannerStatusText('stopped', false)).toBe('Scanning stopped');
  });
});
