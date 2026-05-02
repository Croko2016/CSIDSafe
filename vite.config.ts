import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kai-ora/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
