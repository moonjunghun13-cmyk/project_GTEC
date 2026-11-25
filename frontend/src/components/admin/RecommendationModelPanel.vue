<script setup>
import { onMounted, ref } from 'vue'
import { backendActions } from '../../services/backendActions'
import StatePanel from '../StatePanel.vue'
const props=defineProps({preview:Boolean,showSystemLink:{type:Boolean,default:true}})
const data=ref(null),busy=ref(false),refreshing=ref(false),error=ref(''),notice=ref('')
async function load(){busy.value=true;error.value='';try{data.value=await backendActions.recommendationStatus()}catch(e){error.value=e.message}finally{busy.value=false}}
async function refresh(){if(refreshing.value)return;if(data.value && !data.value.training_data.ready){notice.value='학습 조건을 충족하지 않아 최신화를 실행하지 않았습니다. 기존 모델을 유지합니다.';error.value='';return;}refreshing.value=true;error.value='';notice.value='';try{const result=await backendActions.retrainRecommendation();notice.value=`추천 모델 최신화 완료 · 구매 ${result.purchase_rows ?? 0}건 · 고객 ${result.member_count ?? 0}명`;await load()}catch(e){error.value=e.message}finally{refreshing.value=false}}
onMounted(load)
</script>
<template><article class="recommendation-model-panel" aria-label="추천 시스템 모델 관리"><header><div><h2>추천 시스템</h2><p>실제 서버의 구매 기록으로 추천 모델을 최신화합니다.</p></div><div class="model-actions"><RouterLink v-if="showSystemLink" class="button" to="/admin/recommendations">추천시스템</RouterLink><button type="button" class="button" :disabled="busy || refreshing" @click="refresh">{{ refreshing ? '모델 최신화 중…' : '모델 최신화' }}</button></div></header><p v-if="preview" class="server-model-note">모델 최신화는 실제 서버의 구매 기록을 기준으로 실행합니다.</p><p v-if="notice" role="status">{{ notice }}</p><StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/><template v-if="data"><div class="model-metrics"><span>최근 학습<strong>{{ data.model.trained_at ? new Date(data.model.trained_at).toLocaleString('ko-KR') : '기록 없음' }}</strong></span><span>구매 기록<strong>{{ data.training_data.purchase_rows }}건</strong></span><span>구매 고객<strong>{{ data.training_data.member_count }}명</strong></span><span>카테고리<strong>{{ data.training_data.category_count }}/12</strong></span></div><p v-if="!data.training_data.ready">구매 100건 이상·고객 30명 이상·12개 카테고리가 필요합니다. 부족하면 기존 모델을 유지합니다.</p></template></article></template>
<style scoped>
.recommendation-model-panel{border:1px solid var(--admin-border,#dce3eb);border-radius:12px;background:var(--ui-surface,#fff);padding:18px 20px;margin:0;min-width:0}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}h2{font-size:18px;margin:0;font-weight:750}p{font-size:14px;color:var(--admin-muted,#64748b);line-height:1.6;margin:7px 0 0}.model-metrics{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:16px;margin-top:16px;padding-top:14px;border-top:1px solid var(--admin-border,#e5eaf0);font-size:14px;color:var(--admin-muted,#64748b)}.model-metrics strong{display:block;margin-top:5px;font-size:17px;color:var(--admin-text,#243244)}.model-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}.model-actions .button{min-height:38px;font-size:14px;padding:8px 13px}
@media(max-width:650px){.model-metrics{grid-template-columns:repeat(2,1fr)}.model-actions{margin-left:0}}
</style>
