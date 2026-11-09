import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { makeRouter } from './router'
import './style.css'
import './storefront.css'
import './chrome-theme.css'
import './color-theme.css'
import { initializeTheme } from './stores/theme'

initializeTheme()
const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(makeRouter(pinia)).mount('#app')
