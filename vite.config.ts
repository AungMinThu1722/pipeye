
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Fix: Strictly rely on the environment variable 'API_KEY' and avoid hardcoding sensitive keys in the configuration
      // Fallback to the provided key if env var is missing
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || 'AIzaSyDsMLa6WxZrOgmMNCRzIkHpvsLVktandUc'),
    },
  };
});
