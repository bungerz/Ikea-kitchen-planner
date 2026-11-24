import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three-gpu-pathtracer') || id.includes('three-mesh-bvh')) {
            return 'pathtracer';
          }
          if (id.includes('node_modules/denoiser') || id.includes('node_modules/@tensorflow')) {
            return 'denoiser';
          }
          if (id.includes('node_modules/n8ao')) {
            return 'postfx';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  }
});
