import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootLayout from './app/_layout';
import { initializeSentry, Sentry } from './config/sentry';
import ReactQueryProvider from './providers/ReactQueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { initializeSplashScreen } from './utils/splashScreenManager';

// Initialize splash screen on app start
initializeSplashScreen();
initializeSentry();

function App() {
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="default" />
          <RootLayout />
        </SafeAreaProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  );
}

export default Sentry.wrap(App);
