import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'fuxi_component/iframeAgent.ts'),
      name: 'IframeAgent',
      fileName: 'iframe-agent',
      formats: ['es', 'umd']
    },
  },
  plugins: [dts()]
});
