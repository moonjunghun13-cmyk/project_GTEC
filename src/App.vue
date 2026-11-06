<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from './stores/shop'
import StoreFooter from './components/StoreFooter.vue'
import CartRail from './components/CartRail.vue'
import AuthDialog from './components/AuthDialog.vue'
import StatePanel from './components/StatePanel.vue'
const store = useShop()
const route = useRoute()
const router = useRouter()
const search = ref('')
onMounted(() => store.load())
function scrollHome(event) {
  if (route.path === '/' && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    window.scrollTo({top:0,behavior:'instant'})
  }
}
function signOut() {
  store.signOut()
  if (route.meta.role) router.push('/')
}
</script>

<template>
  <template v-if="route.meta.role !== 'ADMIN'">
    <header class="site-header" :class="{'intro-header':route.path === '/'}">
      <div class="wrap header-row">
        <RouterLink class="brand" to="/" aria-label="GT전자 홈" @click="scrollHome"><img src="/gt-logo-chrome.png" alt=""></RouterLink>
        <nav class="shop-nav" aria-label="쇼핑 카테고리">
          <RouterLink v-for="category in store.categories" :key="category" :to="{path:'/products',query:{category}}" :class="{'category-selected':route.path === '/products' && route.query.category === category}" :aria-current="route.path === '/products' && route.query.category === category ? 'page' : undefined">{{ category }}</RouterLink>
        </nav>
        <form class="search" role="search" @submit.prevent="router.push({path:'/products',query:{q:search.trim()}})">
          <input v-model="search" aria-label="상품 검색" placeholder="상품 검색">
          <button aria-label="검색"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>
        </form>
        <nav aria-label="회원 메뉴">
          <RouterLink to="/cart"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h3l2.5 12h11L22 6H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg> 장바구니<span v-if="store.cartCount"> {{ store.cartCount }}</span></RouterLink>
          <button v-if="store.role === 'GUEST'" @click="store.openAuth()"><svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg> 로그인</button>
          <template v-else>
            <RouterLink v-if="store.role === 'ADMIN'" to="/admin">관리자</RouterLink>
            <RouterLink v-else to="/account">{{ store.user.name }}님</RouterLink>
            <button @click="signOut">로그아웃</button>
          </template>
        </nav>
      </div>
    </header>
    <main><StatePanel v-if="store.busy || store.error" :busy="store.busy" :error="store.error" @retry="store.load"/><RouterView v-else /></main>
    <StoreFooter />
  </template>
  <RouterView v-else />
  <CartRail/>
  <AuthDialog v-if="store.authMode" />
</template>
