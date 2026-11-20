<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import AdminIcon from './AdminIcon.vue'
import {isAdminPreview,openAdminPreview,leaveAdminPreview} from '../../services/adminPreview'
const previewMode=isAdminPreview()
const store = useShop()
const router = useRouter()
const search = ref('')
const scope = ref('products')
async function generateDemo(){openAdminPreview();await router.push('/');window.scrollTo({top:0,left:0,behavior:'instant'})}
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
    <nav><button class="admin-dummy-button" type="button" :aria-pressed="previewMode" title="화면 확인용 더미 데이터를 표시합니다. 실제 DB에는 저장하지 않습니다." @click="generateDemo">더미 데이터 생성</button><RouterLink to="/">쇼핑몰 보기</RouterLink><details class="admin-profile"><summary><AdminIcon name="members"/> 관리자⌄</summary><button v-if="previewMode" @click="leaveAdminPreview">실제 데이터로 전환</button><button @click="logout">로그아웃</button></details></nav>
  </header>
</template>
