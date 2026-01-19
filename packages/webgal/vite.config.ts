import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import Info from 'unplugin-info/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import loadVersion from 'vite-plugin-package-version';

// https://vitejs.dev/config/

// @ts-expect-error
const env = process.env.NODE_ENV;
console.log(env);

export default defineConfig({
  plugins: [
    react(),
    loadVersion(),
    Info(),
    viteCompression({
      filter: /^(.*assets).*\.(js|css|ttf)$/,
    }),
    // @ts-expect-error
    // visualizer(),
  ],
  resolve: {
    alias: {
      '@': resolve('src'),
    },
  },
  build: {
    // sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
