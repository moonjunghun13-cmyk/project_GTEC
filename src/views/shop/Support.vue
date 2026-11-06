<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import StatePanel from '../../components/StatePanel.vue'
import './support-page.css'
const store = useShop()
const route = useRoute()
const router = useRouter()
const tab = computed(() => ['faq','notices','inquiries'].includes(route.query.tab) ? route.query.tab : 'faq')
const data = ref({faqs:[],notices:[]})
const inquiries = ref([])
const busy = ref(false)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const title = ref('')
const body = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await shop.support()
    inquiries.value = store.role === 'USER' ? await shop.inquiries(store.user.userId) : []
  } catch(e) { error.value = e.message }
  finally { loading.value = false }
}
watch(() => [store.role,route.query.tab],load,{immediate:true})
async function submit() {
  if (busy.value || store.role !== 'USER') return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await shop.inquiry(store.user.userId,{title:title.value.trim(),body:body.value.trim()})
    title.value = ''
    body.value = ''
    inquiries.value = await shop.inquiries(store.user.userId)
    notice.value = '문의를 등록했습니다.'
  } catch(e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <section class="wrap section support-page">
    <p class="eyebrow">GT SUPPORT</p><h1>고객센터</h1><p class="muted">상품과 주문에 관한 궁금한 점을 확인하세요.</p>
    <nav class="support-tabs" aria-label="고객센터 메뉴"><RouterLink v-for="[value,label] in [['faq','자주 묻는 질문'],['notices','공지사항'],['inquiries','1:1 문의']]" :key="value" :to="{path:'/support',query:{tab:value}}" :aria-current="tab === value ? 'page' : undefined">{{ label }}</RouterLink></nav>
    <StatePanel v-if="loading" busy/>
    <template v-else>
      <p v-if="error" role="alert" class="error">{{ error }} <button @click="load">다시 시도</button></p>
      <template v-if="tab === 'faq'"><details v-for="item in data.faqs" :key="item.title" class="support-entry"><summary>{{ item.title }}</summary><p>{{ item.body }}</p></details></template>
      <template v-else-if="tab === 'notices'"><details v-for="item in data.notices" :key="item.noticeId" class="support-entry" :open="route.query.id === item.noticeId"><summary>{{ item.title }}</summary><p>{{ item.body }}</p></details><StatePanel v-if="!data.notices.length" empty="등록된 공지가 없습니다."/></template>
      <template v-else>
        <div v-if="store.role !== 'USER'" class="support-signin"><h2>문의 작성과 답변 확인</h2><p>회원 로그인 후 내 문의를 이용해 주세요.</p><button v-if="store.role === 'GUEST'" class="button gold" @click="store.requireUser(() => router.replace('/support?tab=inquiries'))">로그인</button></div>
        <template v-else>
                    <form class="support-form" @submit.prevent="submit">
            <header class="support-form-heading"><div><p>CONTACT GT</p><h2>1:1 문의 작성</h2></div><span>궁금한 점을 남겨주시면 답변해 드리겠습니다.</span></header>
            <div class="support-field"><label for="inquiry-title">문의 제목 <span>필수</span></label><div><input id="inquiry-title" v-model="title" required maxlength="100" placeholder="문의 제목을 입력해 주세요."><small>{{ title.length }} / 100</small></div></div>
            <div class="support-field"><label for="inquiry-body">문의 내용 <span>필수</span></label><div><textarea id="inquiry-body" v-model="body" required maxlength="2000" rows="8" placeholder="상품명이나 주문 내용 등 문의 사항을 자세히 적어주세요." aria-describedby="inquiry-help"></textarea><small>{{ body.length }} / 2,000</small></div></div>
            <footer class="support-form-footer"><p id="inquiry-help">비밀번호나 결제 정보 등 민감한 정보는 입력하지 마세요.</p><button class="support-submit" :disabled="busy">{{ busy ? '등록 중…' : '문의 등록' }} <span aria-hidden="true">↗</span></button></footer>
            <p v-if="notice" class="support-saved" role="status">{{ notice }}</p>
          </form>
          <h2>내 문의</h2><details v-for="item in inquiries" :key="item.inquiryId" class="support-entry"><summary>{{ item.title }} <small>{{ item.answer ? '답변 완료' : '답변 대기' }}</small></summary><p>{{ item.body }}</p><div class="support-answer"><strong>GT전자 답변</strong><p>{{ item.answer || '답변을 기다리고 있습니다.' }}</p></div></details><StatePanel v-if="!inquiries.length" empty="작성한 문의가 없습니다."/>
        </template>
      </template>
    </template>
  </section>
</template>
