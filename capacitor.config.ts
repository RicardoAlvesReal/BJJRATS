import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thebjjrats.app',
  appName: 'BJJRats',
  webDir: 'dist/public',
  server: {
    // iOS: permite navegação SPA (history API)
    iosScheme: 'capacitor',
    androidScheme: 'https',
    // Para dev no emulador/simulador, descomente:
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
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
