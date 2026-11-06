import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { makeRouter } from './router'
import './style.css'
import './storefront.css'
import './chrome-theme.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(makeRouter(pinia)).mount('#app')
