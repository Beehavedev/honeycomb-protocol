import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'social.honeycomb.app',
  appName: 'Honeycomb',
  webDir: 'dist/public',
  server: {
    url: 'https://honeycomb-sj2s.onrender.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f23',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f23',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    scheme: 'Honeycomb',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0f0f23',
  },
  android: {
    backgroundColor: '#0f0f23',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
