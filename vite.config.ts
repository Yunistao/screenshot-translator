import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 如果端口被占用则报错，而不是自动切换端口
    host: '127.0.0.1', // 监听 IPv4 地址
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // 渲染进程入口
        renderer: './index.html',
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    }
  },
  root: '.',
  publicDir: 'public',
});
