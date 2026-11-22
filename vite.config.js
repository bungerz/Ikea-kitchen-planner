import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three-gpu-pathtracer') || id.includes('three-mesh-bvh')) {
            return 'pathtracer';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  }
});
