import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { productImageStorage } from './scripts/product-image-storage.mjs'
export default defineConfig(({mode}) => {
  const env=loadEnv(mode,process.cwd(),'')
  const target=env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:8090'
  return {plugins:[vue(),productImageStorage()],server:{host:'127.0.0.1',port:5173,strictPort:true,
    proxy:Object.fromEntries(['/api','/oauth2','/login/oauth2'].map(path=>[path,{target,changeOrigin:!path.includes('oauth2')}]))}}
})
