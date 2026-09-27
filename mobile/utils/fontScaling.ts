import { PixelRatio, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Normalize font size based on screen width and height

export const normalizeFont = (size: number): number => {
  const scale = SCREEN_WIDTH / 320;
  const scaleHeight = SCREEN_HEIGHT / 568;
  const maxSize = Math.max(scale, scaleHeight);
  
  // Cap the maximum font size to prevent excessive scaling
  const cappedScale = Math.min(maxSize, 1.5);
  
  return Math.round(PixelRatio.roundToNearestPixel(size * cappedScale));
};

// Get maximum allowed font scale from system settings
export const getMaxFontScale = (): number => {
  // On iOS, this is the value from Settings > Accessibility > Text Size
  // On Android, this is the value from Settings > Display > Font Size
  // Default maximum is typically 1.3 on iOS and 1.3 on Android
  return 1.3;
};

// Check if text will be clipped at maximum font scaling
export const willTextClip = (text: string, fontSize: number, maxWidth: number): boolean => {
  // Simple heuristic: if the text length * fontSize > maxWidth, it will clip
  const avgCharWidth = fontSize * 0.6; // Approximate average character width
  return text.length * avgCharWidth > maxWidth;
};

// Safe font size that won't clip at maximum scaling
export const getSafeFontSize = (maxWidth: number, text: string): number => {
  const maxScale = getMaxFontScale();
  const avgCharWidth = 0.6;
  
  // Calculate safe font size that fits within maxWidth at max scale
  const safeFontSize = maxWidth / (text.length * avgCharWidth * maxScale);
  
  return Math.min(safeFontSize, 16); // Cap at 16pt for readability
};
