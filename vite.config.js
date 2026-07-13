import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {}
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})