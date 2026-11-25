<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import AdminIcon from './AdminIcon.vue'
import {isAdminPreview,leaveAdminPreview,adminPreviewEvent} from '../../services/adminPreview'
import {backendActions} from '../../services/backendActions'
const previewMode=isAdminPreview()
const store = useShop()
const router = useRouter()
const search = ref('')
const scope = ref('products')
const generating=ref(false)
async function generateDemo(){
 if(generating.value)return
 generating.value=true
 try{
  const result=await backendActions.generateDummyData()
  if(!result?.db_applied)throw new Error('DB 반영 완료를 확인하지 못했습니다. 서버 상태를 확인해 주세요.')
  if(isAdminPreview()){
   const current=router.currentRoute.value
   await router.replace({path:current.path,query:{...current.query,preview:undefined}})
   leaveAdminPreview()
  }
  window.dispatchEvent(new CustomEvent(adminPreviewEvent,{detail:{products:result.product_count,members:result.member_count,orders:result.order_count,reviews:result.review_count}}))
 }
 catch(e){window.dispatchEvent(new CustomEvent(adminPreviewEvent,{detail:{error:e.message}}))}
 finally{generating.value=false}
}
async function switchToLive(){
 const current=router.currentRoute.value
 await router.replace({path:current.path,query:{...current.query,preview:undefined}})
 leaveAdminPreview();window.dispatchEvent(new CustomEvent(adminPreviewEvent,{detail:{live:true}}))
}
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
    <nav><button class="admin-dummy-button" type="button" :disabled="generating" title="새 더미 데이터를 실제 DB에 추가합니다." @click="generateDemo">{{ generating ? '더미 데이터 저장 중…' : '더미 데이터 생성' }}</button><RouterLink to="/">쇼핑몰 보기</RouterLink><details class="admin-profile"><summary><AdminIcon name="members"/> 관리자⌄</summary><div class="admin-profile-menu"><button v-if="previewMode" type="button" @click="switchToLive">실제 데이터로 전환</button><button type="button" @click="logout">로그아웃</button></div></details></nav>
  </header>
</template>
