import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'net.koiosdigital.fitapp',
  appName: 'FitApp',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    iosScheme: 'https',
    androidScheme: 'https',
    allowNavigation: ['fitapp.koiosdigital.net'],
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#000000',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
