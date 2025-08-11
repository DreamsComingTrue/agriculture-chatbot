import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'fuxi_component/demo'),
  plugins: [react()],
  server: {
    port: 5172
  },
  // resolve: {
  //   alias: {
  //     'iframe-agent': resolve(__dirname, 'dist/iframe-agent.js')
  //   }
  // }
});
