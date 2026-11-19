<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { shop } from '../../services'
import StatePanel from '../../components/StatePanel.vue'
import './support-page.css'

const route = useRoute()
const tab = computed(() => route.query.tab === 'notices' ? 'notices' : 'faq')
const data = ref({faqs:[],notices:[]})
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try { data.value = await shop.support() }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <section class="wrap section support-page">
    <p class="eyebrow">GT SUPPORT</p><h1>고객센터</h1><p class="muted">상품과 주문에 관한 궁금한 점을 확인하세요.</p>
    <nav class="support-tabs" aria-label="고객센터 메뉴"><RouterLink v-for="[value,label] in [['faq','자주 묻는 질문'],['notices','공지사항']]" :key="value" :to="{path:'/support',query:{tab:value}}" :aria-current="tab === value ? 'page' : undefined">{{ label }}</RouterLink></nav>
    <StatePanel v-if="loading" busy/>
    <template v-else>
      <p v-if="error" role="alert" class="error">{{ error }} <button @click="load">다시 시도</button></p>
      <template v-if="tab === 'faq'"><details v-for="item in data.faqs" :key="item.title" class="support-entry"><summary>{{ item.title }}</summary><p>{{ item.body }}</p></details></template>
      <template v-else><details v-for="item in data.notices" :key="item.noticeId" class="support-entry" :open="route.query.id === item.noticeId"><summary>{{ item.title }}</summary><p>{{ item.body }}</p></details><StatePanel v-if="!data.notices.length" empty="등록된 공지가 없습니다."/></template>
    </template>
  </section>
</template>
