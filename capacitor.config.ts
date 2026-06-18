import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thebjjrats.app',
  appName: 'BJJRats',
  webDir: 'dist/public',
  server: {
    // Em produção, carrega do bundle local
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
