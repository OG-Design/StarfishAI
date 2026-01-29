import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({mode})=>{
  const env = loadEnv(mode, process.cwd()+"../");
  const API_URL = env.API_URL || "" ; // FIX!
  return {
    plugins: [vue()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/socket.io': {
        API_URL,
        ws: true,
        changeOrigin: true
        }
      },

    }
  }
})
