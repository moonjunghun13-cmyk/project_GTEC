<script setup>
import { computed, onMounted, ref } from 'vue'
import AdminChart from '../../components/admin/AdminChart.vue'
import AdminIcon from '../../components/admin/AdminIcon.vue'
import StatePanel from '../../components/StatePanel.vue'
import { money } from '../../utils'
import { generateDemoAppend, getCustomerInsights } from '../../services'
const props = defineProps({data:{type:Object,required:true}})
const apiMode = import.meta.env.VITE_AUTH_MODE === 'api'
const insights = ref(null)
const insightBusy = ref(false)
const insightError = ref('')
const demoBusy = ref(false)
const demoError = ref('')
const demoBatch = ref(null)
async function appendDemoData() {
  if (demoBusy.value) return
  demoBusy.value = true
  demoError.value = ''
  demoBatch.value = null
  try { demoBatch.value = await generateDemoAppend() }
  catch (error) { demoError.value = error.response?.data?.message || error.message }
  finally { demoBusy.value = false }
}
async function loadInsights() {
  insightBusy.value = true
  insightError.value = ''
  try { insights.value = await getCustomerInsights() }
  catch (error) { insightError.value = error.message }
  finally { insightBusy.value = false }
}
if (apiMode) onMounted(loadInsights)
const members = computed(()=>props.data.members.filter(m=>m.role==='USER'))
const purchases = computed(()=>props.data.orders.filter(o=>o.status!=='환불 완료' && members.value.some(m=>m.userId===o.userId)))
const customers = computed(()=>members.value.map(m=>{const orders=purchases.value.filter(o=>o.userId===m.userId);return {...m,count:orders.length,total:orders.reduce((n,o)=>n+o.total,0)}}))
const buyers = computed(()=>customers.value.filter(m=>m.count>0))
const repeat = computed(()=>customers.value.filter(m=>m.count>1).length)
const rate = computed(()=>buyers.value.length ? Math.round(repeat.value/buyers.value.length*100) : 0)
const day = value => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(value))
const trend = computed(()=>{
  const now=new Date(day(new Date())+'T12:00:00Z')
  return Array.from({length:14},(_,i)=>{const date=new Date(now);date.setUTCDate(date.getUTCDate()-13+i);const key=date.toISOString().slice(0,10);return [key.slice(5),members.value.filter(m=>m.createdAt && day(m.createdAt)===key).length]})
})
const categories = computed(()=>{
  const groups=new Map()
  for(const o of purchases.value) for(const item of o.items){const key=item.category || '기타';if(!groups.has(key)) groups.set(key,new Set());groups.get(key).add(o.userId)}
  return [...groups].map(([name,ids])=>[name,ids.size]).sort((a,b)=>b[1]-a[1])
})
const ranking = computed(()=>[...buyers.value].sort((a,b)=>b.count-a.count || b.total-a.total).slice(0,8))
const attentionCandidates = computed(() => (insights.value?.predictions?.predictions ?? [])
  .filter(row => row.attention_candidate)
  .sort((a,b) => a.model_probability - b.model_probability)
  .slice(0,8))
</script>
<template>
  <section class="customer-analysis" aria-label="고객분석 보고서">
    <template v-if="apiMode">
      <header class="customer-insights-heading"><div><p class="customer-analysis-note">AI 고객 분석 서비스 · 기준일 {{ insights?.summary?.as_of || '—' }}</p><p v-if="insights?.summary?.note" class="customer-analysis-note">{{ insights.summary.note }}</p></div><button class="button" :disabled="insightBusy" @click="loadInsights">{{ insightBusy ? '불러오는 중…' : '새로고침' }}</button></header>
      <section class="customer-demo-batch" aria-label="AI 학습용 더미 데이터">
        <div>
          <h2>AI 학습용 더미 데이터</h2>
          <p class="customer-analysis-note">회원 100명, 주문 1,000건, 리뷰 500건의 CSV를 한 배치로 생성합니다.</p>
        </div>
        <button type="button" class="button" :disabled="demoBusy" @click="appendDemoData">{{ demoBusy ? '생성 중…' : '증분 데이터 생성' }}</button>
        <p v-if="demoBatch" class="customer-analysis-note" role="status">{{ demoBatch.batch }} {{ demoBatch.reused ? '복구 완료' : '생성 완료' }} · 회원 {{ demoBatch.member_count }}명 · 주문 {{ demoBatch.order_count }}건 · 리뷰 {{ demoBatch.review_count }}건 · DB 반영 대기</p>
        <p v-if="demoError" class="error" role="alert">{{ demoError }}</p>
      </section>
      <StatePanel v-if="insightBusy || insightError" :busy="insightBusy" :error="insightError" @retry="loadInsights"/>
      <template v-else-if="insights">
        <div class="customer-metrics"><article><span>전체 회원</span><strong>{{ insights.summary.registered_user_count }}<small>명</small></strong><p>USER 회원</p></article><article><span>구매 고객</span><strong>{{ insights.summary.purchasing_customer_count }}<small>명</small></strong><p>정상 결제 주문 기준</p></article><article><span>총 주문</span><strong>{{ insights.summary.order_count }}<small>건</small></strong><p>{{ money(insights.summary.total_order_amount) }}</p></article><article><span>재구매율</span><strong>{{ insights.repurchase.repurchase_rate_percent ?? 0 }}<small>%</small></strong><p>{{ insights.repurchase.repeat_customer_count }}명 재구매</p></article></div>
        <div class="customer-charts"><article><header><h2><AdminIcon name="customers"/>월별 고객 유지율</h2><span>완료된 주문 월 기준</span></header><AdminChart v-if="insights.retention.months.length" type="line" :labels="insights.retention.months.map(row=>row.month)" :values="insights.retention.months.map(row=>row.retention_rate_percent ?? 0)" label="유지율 (%)"/><StatePanel v-else empty="월별 구매 기록이 충분하지 않습니다."/><p class="customer-analysis-note">{{ insights.retention.note }}</p></article><article><header><h2><AdminIcon name="orders"/>구매 고객 구성</h2><span>구매 고객 기준</span></header><AdminChart v-if="insights.repurchase.purchasing_customer_count" type="doughnut" :labels="['1회 구매','재구매']" :values="[insights.repurchase.one_time_customer_count,insights.repurchase.repeat_customer_count]" label="구매 고객 수 (명)"/><StatePanel v-else empty="분석할 구매 내역이 없습니다."/><p class="customer-analysis-note">{{ insights.repurchase.definition }}</p></article></div>
        <div class="customer-charts"><article><header><h2><AdminIcon name="members"/>재구매 검토 후보</h2><span>{{ insights.predictions.prediction_month }} 예측 · 모델 점수 기준</span></header><div v-if="attentionCandidates.length" class="customer-table" tabindex="0" role="region" aria-label="재구매 검토 후보"><table><thead><tr><th>회원</th><th>최근 구매 경과</th><th>구매 횟수</th><th>모델 점수</th></tr></thead><tbody><tr v-for="row in attentionCandidates" :key="row.member_id"><td>{{ data.members.find(member=>member.userId===String(row.member_id))?.name || `회원 ${row.member_id}` }}</td><td>{{ row.recency_days }}일</td><td>{{ row.purchase_count }}회</td><td>{{ (row.model_probability * 100).toFixed(1) }}%</td></tr></tbody></table></div><StatePanel v-else empty="재구매 예측 후보가 없습니다."/><p class="customer-analysis-note">{{ insights.predictions.note }}</p></article><article><header><h2><AdminIcon name="sales"/>재학습 준비 상태</h2><span>{{ insights.training.eligible ? '조건 충족' : '자료 보강 필요' }}</span></header><p>{{ insights.training.customer_count }}명 · {{ insights.training.training_case_count }}건 · {{ insights.training.month_count }}개월</p><ul v-if="insights.training.reasons?.length"><li v-for="reason in insights.training.reasons" :key="reason">{{ reason }}</li></ul><p class="customer-analysis-note">{{ insights.training.note }}</p></article></div>
      </template>
    </template>
    <template v-else>
      <p class="customer-analysis-note">일반 회원 및 주문 기준 · 환불 완료 제외</p>
      <div class="customer-metrics"><article><span>전체 회원</span><strong>{{ members.length }}<small>명</small></strong><p>일반 회원 기준</p></article><article><span>구매 고객</span><strong>{{ buyers.length }}<small>명</small></strong><p>유효 주문 1건 이상</p></article><article><span>재구매 고객</span><strong>{{ repeat }}<small>명</small></strong><p>유효 주문 2건 이상</p></article><article><span>재구매 고객 비율</span><strong>{{ rate }}<small>%</small></strong><p>구매 고객 중 재구매 고객</p></article></div>
      <div class="customer-charts"><article><header><h2><AdminIcon name="members"/>신규 회원 추이</h2><span>최근 14일 · 한국 시간</span></header><AdminChart type="line" :labels="trend.map(r=>r[0])" :values="trend.map(r=>r[1])" label="신규 회원 (명)"/></article><article><header><h2><AdminIcon name="orders"/>고객 구매 구성</h2><span>전체 회원 기준</span></header><AdminChart v-if="members.length" type="doughnut" :labels="['미구매','1회 구매','재구매']" :values="[members.length-buyers.length,buyers.length-repeat,repeat]" label="고객 수 (명)"/><StatePanel v-else empty="등록된 회원이 없습니다."/></article></div>
      <div class="customer-charts"><article><header><h2><AdminIcon name="customers"/>카테고리별 구매 고객</h2><span>카테고리 내 중복 고객 제외</span></header><AdminChart v-if="categories.length" :labels="categories.map(r=>r[0])" :values="categories.map(r=>r[1])" label="구매 고객 (명)"/><StatePanel v-else empty="분석할 구매 내역이 없습니다."/></article><article><header><h2><AdminIcon name="sales"/>구매 활동이 많은 고객</h2><RouterLink to="/admin/members">회원 관리 ↗</RouterLink></header><div v-if="ranking.length" class="customer-table" tabindex="0" role="region" aria-label="구매 고객 순위"><table><thead><tr><th>고객</th><th>주문 수</th><th>구매 금액</th></tr></thead><tbody><tr v-for="m in ranking" :key="m.userId"><td>{{ m.name }}</td><td>{{ m.count }}건</td><td>{{ money(m.total) }}</td></tr></tbody></table></div><StatePanel v-else empty="구매 고객이 없습니다."/></article></div>
    </template>
  </section>
</template>
<style scoped>
.customer-analysis { display:grid; gap:12px; min-width:0; }
.customer-demo-batch { display:flex; gap:8px 16px; flex-wrap:wrap; align-items:center; justify-content:space-between; padding:12px 16px; border:1px solid var(--admin-border); border-radius:10px; background:var(--ui-surface); }
.customer-demo-batch h2 { margin:0 0 4px; font-size:1rem; }
.customer-demo-batch > p { flex-basis:100%; margin:0; }
.customer-analysis-note { margin:0; color:var(--admin-muted); font-size:.74rem; line-height:1.45; }
.customer-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.customer-metrics article { min-width:0; padding:12px 16px; border:1px solid var(--admin-border); border-radius:10px; background:var(--ui-surface); }
.customer-metrics article:first-child { background:#252d38; color:#fff; }
.customer-metrics span,.customer-metrics p { font-size:.74rem; color:var(--admin-muted); }
.customer-metrics article:first-child :is(span,p) { color:#d4deed; }
.customer-metrics strong { display:block; margin:6px 0 4px; font-size:clamp(1.3rem,2vw,1.8rem); line-height:1.15; }
.customer-metrics small { margin-left:4px; font-size:.75rem; font-weight:500; }
.customer-metrics p { margin:0; }
.customer-charts { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(0,1fr); gap:12px; }
.customer-charts > article { min-width:0; padding:12px 16px; border:1px solid var(--admin-border); border-radius:10px; background:var(--ui-surface); }
.customer-charts header { display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:4px 12px; margin-bottom:8px; }
.customer-charts h2 { font-size:1rem; margin:0; }
.customer-charts header :is(span,a) { color:var(--admin-muted); font-size:.72rem; }
.customer-charts :deep(.admin-chart) { height:clamp(116px,18dvh,178px); margin-top:0; }
.customer-table { max-height:clamp(116px,18dvh,178px); overflow:auto; }
.customer-table table { width:100%; border-collapse:collapse; font-size:.78rem; }
.customer-table :is(th,td) { padding:7px 5px; text-align:right; border-bottom:1px solid var(--admin-border); white-space:nowrap; }
.customer-table tr > :first-child { text-align:left; }
.customer-table th { color:var(--admin-muted); }
@media(min-width:1120px) {
  .customer-analysis {
    flex:1;
    grid-template-rows:auto auto repeat(2,minmax(162px,1fr));
  }
  .customer-charts > article { display:flex; flex-direction:column; min-height:0; }
  .customer-charts header { flex:none; }
  .customer-charts :deep(.admin-chart) { flex:1; position:relative; height:auto; min-height:0; }
  .customer-charts :deep(.admin-chart canvas) { position:absolute; inset:0; }
  .customer-table { flex:1; min-height:0; max-height:none; }
  .customer-table thead { position:sticky; top:0; background:var(--ui-surface); }
}
@media(max-width:700px) {
  .customer-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .customer-charts { grid-template-columns:minmax(0,1fr); }
  .customer-charts :deep(.admin-chart),.customer-table { height:auto; max-height:none; }
  .customer-charts :deep(.admin-chart) { height:158px; }
}
</style>
