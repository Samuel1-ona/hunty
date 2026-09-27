import { PixelRatio, Platform } from 'react-native';

// Maximum font scale allowed by system settings
// iOS: Settings > Accessibility > Text Size (max ~1.3)
// Android: Settings > Display > Font Size (max ~1.3)
export const MAX_FONT_SCALE = 1.3;

// Base font sizes for different text elements
export const BASE_SIZES = {
  xxlarge: 28,
  xlarge: 24,
  large: 20,
  medium: 16,
  small: 14,
  xsmall: 12,
};

// Normalize font size based on screen density and prevent excessive scaling
export const normalizeFont = (size: number): number => {
  const scale = PixelRatio.getFontScale();
  const maxScale = MAX_FONT_SCALE;
  
  // Apply scale but cap at maximum allowed
  const scaledSize = size * Math.min(scale, maxScale);
  
  // Round to nearest pixel for crisp rendering
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

// Get safe font size that won't clip at maximum scaling
export const getSafeFontSize = (maxWidth: number, text: string, baseSize: number = 16): number => {
  const avgCharWidth = baseSize * 0.6;
  const maxScale = MAX_FONT_SCALE;
  
  // Calculate safe font size that fits within maxWidth at max scale
  const safeFontSize = maxWidth / (text.length * avgCharWidth * maxScale);
  
  // Ensure minimum readable size (12pt)
  return Math.max(12, Math.min(safeFontSize, baseSize));
};

// Check if text will clip at maximum font scaling
export const willTextClip = (text: string, fontSize: number, maxWidth: number): boolean => {
  const maxScale = MAX_FONT_SCALE;
  const scaledFontSize = fontSize * maxScale;
  const avgCharWidth = scaledFontSize * 0.6;
  
  return text.length * avgCharWidth > maxWidth;
};

// Get font scale warning level
export const getFontScaleWarning = (currentScale: number): 'none' | 'warning' | 'critical' => {
  if (currentScale <= 1.0) return 'none';
  if (currentScale <= 1.2) return 'warning';
  return 'critical';
};

// Platform-specific font scaling configuration
export const getPlatformFontConfig = () => {
  return {
    maxScale: MAX_FONT_SCALE,
    platform: Platform.OS,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };
};
