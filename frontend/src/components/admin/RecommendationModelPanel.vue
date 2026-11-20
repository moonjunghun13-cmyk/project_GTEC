<script setup>
import { onMounted, ref } from 'vue'
import { backendActions } from '../../services/backendActions'
import StatePanel from '../StatePanel.vue'
const data=ref(null),busy=ref(false),refreshing=ref(false),generating=ref(false),error=ref(''),notice=ref('')
async function load(){busy.value=true;error.value='';try{data.value=await backendActions.recommendationStatus()}catch(e){error.value=e.message}finally{busy.value=false}}
async function refresh(){if(refreshing.value || generating.value)return;if(data.value && !data.value.training_data.ready){notice.value='학습 조건을 충족하지 않아 최신화를 실행하지 않았습니다. 기존 모델을 유지합니다.';error.value='';return;}refreshing.value=true;error.value='';notice.value='';try{const result=await backendActions.retrainRecommendation();notice.value=`추천 모델 최신화 완료 · 구매 ${result.purchase_rows ?? 0}건 · 고객 ${result.member_count ?? 0}명`;await load()}catch(e){error.value=e.message}finally{refreshing.value=false}}
async function generateDummyData(){
 if(generating.value || refreshing.value || busy.value)return
 generating.value=true;error.value='';notice.value=''
 try{const result=await backendActions.generateDummyData();notice.value=`더미 데이터 CSV 배치를 생성했습니다${result.batch ? ' · '+result.batch : ''}. DB 반영은 별도로 진행해 주세요.`}
 catch(e){error.value=e.message}
 finally{generating.value=false}
}
onMounted(load)
</script>
<template><article class="recommendation-model-panel" aria-label="추천 시스템 모델 관리"><header><div><h2>추천 시스템</h2><p>실제 구매 기록으로 추천 모델을 최신화합니다.</p></div><div class="model-actions"><button type="button" class="button" :disabled="busy || refreshing || generating" @click="refresh">{{ refreshing ? '모델 최신화 중…' : '모델 최신화' }}</button><button type="button" class="button" :disabled="busy || refreshing || generating" @click="generateDummyData">{{ generating ? '더미 데이터 생성 중…' : '더미 데이터 생성' }}</button></div></header><p v-if="notice" role="status">{{ notice }}</p><StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/><template v-if="data"><div class="model-metrics"><span>최근 학습<strong>{{ data.model.trained_at ? new Date(data.model.trained_at).toLocaleString('ko-KR') : '기록 없음' }}</strong></span><span>구매 기록<strong>{{ data.training_data.purchase_rows }}건</strong></span><span>구매 고객<strong>{{ data.training_data.member_count }}명</strong></span><span>카테고리<strong>{{ data.training_data.category_count }}/12</strong></span></div><p v-if="!data.training_data.ready">구매 100건 이상·고객 30명 이상·12개 카테고리가 필요합니다. 부족하면 기존 모델을 유지합니다.</p></template></article></template>
<style scoped>.recommendation-model-panel{grid-column:1/-1;border:1px solid var(--admin-border);border-radius:10px;background:var(--ui-surface);padding:16px;margin-bottom:12px}header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}h2{font-size:1rem;margin:0}p{font-size:.78rem;color:var(--admin-muted);line-height:1.6}.model-metrics{display:flex;gap:20px;flex-wrap:wrap;font-size:.8rem}.model-metrics strong{display:block;margin-top:5px}.model-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}</style>
