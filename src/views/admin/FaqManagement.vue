<script setup>
import { computed,onMounted,ref } from 'vue'
import { backendActions } from '../../services/backendActions'
import StatePanel from '../../components/StatePanel.vue'
const rows=ref([]),busy=ref(false),error=ref(''),query=ref('')
const filtered=computed(()=>rows.value.filter(row=>(row.title+' '+row.content).toLowerCase().includes(query.value.toLowerCase())))
async function load(){busy.value=true;error.value='';try{rows.value=await backendActions.faqs()}catch(e){error.value=e.message}finally{busy.value=false}}
onMounted(load)
</script>
<template><section class="section"><h1>FAQ 조회</h1><p>현재 로그인 방식에서는 FAQ 조회만 지원됩니다. 등록·수정·삭제는 서버의 관리자 세션 인증 연결이 필요합니다.</p><label>FAQ 검색<input v-model="query" type="search" placeholder="제목 또는 내용"/></label><StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/><details v-for="row in filtered" :key="row.id" class="review"><summary>{{ row.title }}</summary><p style="white-space:pre-wrap">{{ row.content }}</p></details><p v-if="!busy && !filtered.length">표시할 FAQ가 없습니다.</p></section></template>
