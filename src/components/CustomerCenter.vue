<script setup>
import { onMounted, ref } from 'vue'
import { shop } from '../services'
const notices = ref([])
const error = ref(false)
async function load() {
  error.value = false
  try { notices.value = (await shop.support()).notices.slice(0,3) }
  catch { error.value = true }
}
onMounted(load)
</script>
<template>
  <section class="home-section customer-center" aria-labelledby="customer-center-title">
    <div class="section-head"><div><p class="eyebrow">GT SUPPORT</p><h2 id="customer-center-title">고객센터</h2><p>쇼핑 중 궁금한 점을 확인해 보세요.</p></div><RouterLink to="/support">고객센터 바로가기 →</RouterLink></div>
    <div class="customer-center-grid">
      <RouterLink class="customer-help" to="/support?tab=inquiries"><small>CONTACT US</small><h3>도움이 필요하신가요?</h3><p>상품과 주문에 관한 궁금한 점을<br>1:1 문의로 남겨주세요.</p><strong>1:1 문의하기 →</strong></RouterLink>
      <div class="customer-notices"><header><h3>공지사항</h3><RouterLink to="/support?tab=notices">전체 보기 ›</RouterLink></header><p v-if="error" role="status">공지를 불러오지 못했습니다. <button class="auth-link" @click="load">다시 시도</button></p><p v-else-if="!notices.length" class="muted">등록된 공지가 없습니다.</p><RouterLink v-for="notice in notices" :key="notice.noticeId" :to="{path:'/support',query:{tab:'notices',id:notice.noticeId}}">{{ notice.title }} <span>›</span></RouterLink></div>
      <div class="customer-quick"><h3>빠른 안내</h3><RouterLink to="/support?tab=faq">자주 묻는 질문 <span>→</span></RouterLink><RouterLink to="/orders">주문 · 배송 조회 <span>→</span></RouterLink><RouterLink to="/support?tab=inquiries">내 문의와 답변 <span>→</span></RouterLink></div>
    </div>
  </section>
</template>
