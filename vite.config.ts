import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    optimizeDeps: {
      include: ['leaflet']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        './images/layers.png': 'leaflet/dist/images/layers.png',
        './images/layers-2x.png': 'leaflet/dist/images/layers-2x.png',
        './images/marker-icon.png': 'leaflet/dist/images/marker-icon.png',
        './images/marker-icon-2x.png': 'leaflet/dist/images/marker-icon-2x.png',
        './images/marker-shadow.png': 'leaflet/dist/images/marker-shadow.png'
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            leaflet: ['leaflet', 'react-leaflet']
          }
        }
      }
    }
  };
});
