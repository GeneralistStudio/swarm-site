import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites serve from /<repo-name>/, not the domain
  // root, so asset URLs need this prefix baked in at build time.
  base: '/swarm-site/',
})
