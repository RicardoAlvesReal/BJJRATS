import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thebjjrats.app.oficial',
  appName: 'BJJRats',
  webDir: 'dist/public',
  server: {
    url: 'https://www.thebjjrats.com',
    cleartext: false,
    // iOS: permite navegação SPA (history API)
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
    },
  },
};

export default config;
