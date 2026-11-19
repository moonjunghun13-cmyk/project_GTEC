<script setup>
import { onMounted, ref } from 'vue'
import { backendActions } from '../../services/backendActions'
import StatePanel from '../../components/StatePanel.vue'
const rows=ref([]),busy=ref(false),error=ref(''),notice=ref(''),selected=ref(null),rating=ref(5),content=ref('')
async function load(){busy.value=true;error.value='';try{rows.value=await backendActions.myReviews()}catch(e){error.value=e.message}finally{busy.value=false}}
function edit(row){selected.value=row.id;rating.value=row.rating;content.value=row.content}
async function save(){if(busy.value)return;busy.value=true;error.value='';notice.value='';try{await backendActions.updateReview(selected.value,rating.value,content.value.trim());selected.value=null;await load();notice.value='리뷰를 수정했습니다. 수정된 내용은 다시 분석됩니다.'}catch(e){error.value=e.message}finally{busy.value=false}}
async function remove(id){if(busy.value || !window.confirm('이 리뷰를 삭제할까요?'))return;busy.value=true;error.value='';notice.value='';try{await backendActions.deleteReview(id);await load();notice.value='리뷰를 삭제했습니다.'}catch(e){error.value=e.message}finally{busy.value=false}}
onMounted(load)
</script>
<template><section class="wrap section"><h1>내 리뷰 관리</h1><nav class="actions"><RouterLink to="/account">마이페이지</RouterLink><RouterLink to="/orders">주문 내역</RouterLink></nav><StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/><p v-if="notice" role="status">{{ notice }}</p><p v-if="!busy && !rows.length">작성한 리뷰가 없습니다.</p><article v-for="row in rows" :key="row.id" class="review"><h2>{{ row.productName || '상품 '+row.productId }}</h2><form v-if="selected===row.id" class="stack" @submit.prevent="save"><label>별점<select v-model.number="rating"><option v-for="score in 5" :key="score" :value="score">{{ score }}점</option></select></label><label>리뷰<textarea v-model="content" required rows="4"/></label><div class="actions"><button class="button" :disabled="busy">저장</button><button type="button" class="button" @click="selected=null">취소</button></div></form><template v-else><p>{{ row.rating }}점 · {{ row.content }}</p><div class="actions"><button class="button" :disabled="busy" @click="edit(row)">수정</button><button class="button" :disabled="busy" @click="remove(row.id)">삭제</button></div></template></article></section></template>
