import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using relative base path for better compatibility with GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
})
