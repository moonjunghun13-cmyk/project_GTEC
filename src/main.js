import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useShop } from './stores/shop'
import { makeRouter } from './router'
import './style.css'
import './storefront.css'
import './chrome-theme.css'
import './color-theme.css'
import { initializeTheme } from './stores/theme'

initializeTheme()
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
const store = useShop(pinia)
window.addEventListener('gt-auth-expired',() => { store.user=null; store.cart=[]; store.favorites=[]; store.openAuth() })
store.initialize().finally(() => { app.use(makeRouter(pinia)).mount('#app') })
