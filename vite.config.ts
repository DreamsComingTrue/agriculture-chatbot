import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Pass environment variables to the app
    'import.meta.env.OLLAMA_DOMAIN': JSON.stringify(process.env.OLLAMA_DOMAIN),
  },
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',  // Allow LAN/WAN access
    port: 5173,
    strictPort: true
  },
})
