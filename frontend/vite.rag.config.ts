import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: resolve(__dirname, 'rag_uploader/uploader'),
  plugins: [react(), tailwindcss()],
  server: {
    port: 5170
  },
  // resolve: {
  //   alias: {
  //     'iframe-agent': resolve(__dirname, 'dist/iframe-agent.js')
  //   }
  // }
});
