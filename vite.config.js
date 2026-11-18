import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins:[vue()],
  server:{host:'127.0.0.1',port:5173,strictPort:true,
    proxy:Object.fromEntries(['/api','/oauth2','/login/oauth2'].map(path => [path,{target:'http://localhost:8090',changeOrigin:true}]))},
})
