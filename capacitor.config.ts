import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'jp.cosmohype.app',
  appName: 'Cosmohype',
  webDir: 'public',
  server: {
    url: 'https://cosmohype.vercel.app',
    cleartext: false,
  },
}

export default config
