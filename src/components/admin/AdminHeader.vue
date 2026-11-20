<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import AdminIcon from './AdminIcon.vue'
import ThemeToggle from '../ThemeToggle.vue'
const store = useShop()
const router = useRouter()
const search = ref('')
const scope = ref('products')
async function logout() {
  await store.signOut()
  await router.replace('/')
  window.scrollTo({top:0,left:0,behavior:'instant'})
}
function submit() {
  router.push({path:'/admin/'+scope.value,query:{q:search.value.trim() || undefined}})
}
</script>
<template>
  <header class="admin-header">
    <form class="admin-global-search" role="search" @submit.prevent="submit">
      <AdminIcon name="search"/>
      <input v-model="search" aria-label="관리 항목 검색" placeholder="상품명, 주문번호, 회원명을 검색하세요">
      <select v-model="scope" aria-label="검색 대상"><option value="products">상품</option><option value="orders">주문</option><option value="members">회원</option></select>
      <button type="submit" class="header-search-submit">검색</button>
    </form>
    <nav><ThemeToggle/><RouterLink to="/">쇼핑몰 보기</RouterLink><details class="admin-profile"><summary><AdminIcon name="members"/> 관리자⌄</summary><button @click="logout">로그아웃</button></details></nav>
  </header>
</template>
