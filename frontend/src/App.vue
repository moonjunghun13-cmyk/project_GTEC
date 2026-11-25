<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from './stores/shop'
import StoreFooter from './components/StoreFooter.vue'
import CartRail from './components/CartRail.vue'
import CartCompatibilityDialog from './components/CartCompatibilityDialog.vue'
import AuthDialog from './components/AuthDialog.vue'
import StatePanel from './components/StatePanel.vue'
import ThemeToggle from './components/ThemeToggle.vue'
const store = useShop()
const route = useRoute()
const router = useRouter()
const search = ref('')
const homeHeaderSolid = ref(false)
let headerFrame = 0
// Keep the intro overlap in place; only the header paint changes at its boundary.
function scheduleHeaderAppearance() {
  if (headerFrame) return
  headerFrame = window.requestAnimationFrame(() => {
    headerFrame = 0
    const intro = route.path === '/' ? document.querySelector('.store-intro') : null
    const header = document.querySelector('.site-header')
    homeHeaderSolid.value = Boolean(intro && header && intro.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom + 1)
  })
}
watch(() => [route.path, store.busy], scheduleHeaderAppearance, {flush:'post'})
watch(() => [store.role,route.fullPath],()=>{
  if(store.role==='ADMIN' && (route.meta.role==='USER' || route.path==='/cart' || route.path.startsWith('/checkout'))){store.closeAuth();router.replace('/admin')}
})
onMounted(() => {
  store.load()
  scheduleHeaderAppearance()
  window.addEventListener('scroll', scheduleHeaderAppearance, {passive:true})
  window.addEventListener('resize', scheduleHeaderAppearance)
})
onUnmounted(() => {
  window.removeEventListener('scroll', scheduleHeaderAppearance)
  window.removeEventListener('resize', scheduleHeaderAppearance)
  window.cancelAnimationFrame(headerFrame)
})
function scrollHome(event) {
  if (route.path === '/' && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    window.scrollTo({top:0,behavior:'instant'})
  }
}
function reviewCartLink(event, navigate) {
  if (route.path === '/cart' || !store.cartWarnings.length || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return navigate(event)
  event.preventDefault()
  return store.reviewCartCompatibility(store.cartItems,'장바구니 보기',() => {
    store.cartOpen = false
    return router.push('/cart')
  })
}
async function signOut() {
  await store.signOut()
  await router.replace('/')
  window.scrollTo({top:0,left:0,behavior:'instant'})
}
</script>

<template>
  <template v-if="route.meta.role !== 'ADMIN'">
    <header class="site-header" :class="{'checkout-header':route.meta.checkout, 'intro-header':route.path === '/', 'home-header-solid':route.path === '/' && homeHeaderSolid}">
      <div class="wrap header-row">
        <RouterLink class="brand" to="/" aria-label="GT전자 홈" @click="scrollHome"><img src="/gt-logo-chrome.png" alt=""></RouterLink>
        <nav class="shop-nav" aria-label="쇼핑 카테고리">
          <RouterLink v-for="category in store.categories" :key="category" :to="{path:'/products',query:{category}}" :class="{'category-selected':route.path === '/products' && route.query.category === category}" :aria-current="route.path === '/products' && route.query.category === category ? 'page' : undefined">{{ category }}</RouterLink>
        </nav>
        <form class="search" role="search" @submit.prevent="router.push({path:'/products',query:{q:search.trim()}})">
          <input v-model="search" aria-label="상품 검색" placeholder="상품 검색">
          <button aria-label="검색"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
        </form>
        <nav aria-label="회원 메뉴"><ThemeToggle/>
          <RouterLink v-if="store.role !== 'ADMIN'" to="/cart" custom v-slot="{ href, navigate }"><a :href="href" @click="reviewCartLink($event, navigate)"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L22 6H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg> 장바구니<span v-if="store.cartCount"> {{ store.cartCount }}</span></a></RouterLink>
          <button v-if="store.role === 'GUEST'" @click="store.openAuth()"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg> 로그인</button>
          <template v-else>
            <RouterLink v-if="store.role === 'ADMIN'" class="dashboard-entry" to="/admin">대시보드</RouterLink>
            <RouterLink v-if="store.role !== 'ADMIN'" to="/account">{{ store.user.name }}님</RouterLink>
            <span v-else class="admin-user-label">{{ store.user.name }}님</span>
            <button @click="signOut">로그아웃</button>
          </template>
        </nav>
      </div>
    </header>
    <main><StatePanel v-if="store.busy || store.error" :busy="store.busy" :error="store.error" @retry="store.load"/><RouterView v-else /></main>
    <StoreFooter />
  </template>
  <RouterView v-else />
  <CartRail v-if="store.role !== 'ADMIN'"/>
  <CartCompatibilityDialog/>
  <AuthDialog v-if="store.authMode" />
</template>
