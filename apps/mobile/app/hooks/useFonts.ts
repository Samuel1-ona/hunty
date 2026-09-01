import { useFonts as useExpoFonts } from 'expo-font';

export const useFonts = () => {
  return useExpoFonts({
    'HankenGrotesk-Regular': require('../../assets/fonts/HankenGrotesk_400Regular.ttf'),
    'HankenGrotesk-Medium': require('../../assets/fonts/HankenGrotesk_500Medium.ttf'),
    'HankenGrotesk-SemiBold': require('../../assets/fonts/HankenGrotesk_600SemiBold.ttf'),
    'HankenGrotesk-Bold': require('../../assets/fonts/HankenGrotesk_700Bold.ttf'),
    'HankenGrotesk-ExtraBold': require('../../assets/fonts/HankenGrotesk_800ExtraBold.ttf'),
    'HankenGrotesk-Black': require('../../assets/fonts/HankenGrotesk_900Black.ttf'),
  });
};
