<script setup>
import { computed } from 'vue'
import AdminChart from '../../components/admin/AdminChart.vue'
import StatePanel from '../../components/StatePanel.vue'
import { money } from '../../utils'
const props = defineProps({data:{type:Object,required:true}})
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
</script>
<template>
  <section class="customer-analysis" aria-label="고객분석 보고서">
    <p class="customer-analysis-note">일반 회원 및 주문 기준 · 환불 완료 제외</p>
    <div class="customer-metrics"><article><span>전체 회원</span><strong>{{ members.length }}<small>명</small></strong><p>일반 회원 기준</p></article><article><span>구매 고객</span><strong>{{ buyers.length }}<small>명</small></strong><p>유효 주문 1건 이상</p></article><article><span>재구매 고객</span><strong>{{ repeat }}<small>명</small></strong><p>유효 주문 2건 이상</p></article><article><span>재구매 고객 비율</span><strong>{{ rate }}<small>%</small></strong><p>구매 고객 중 재구매 고객</p></article></div>
    <div class="customer-charts"><article><header><h2>신규 회원 추이</h2><span>최근 14일 · 한국 시간</span></header><AdminChart type="line" :labels="trend.map(r=>r[0])" :values="trend.map(r=>r[1])" label="신규 회원 (명)"/></article><article><header><h2>고객 구매 구성</h2><span>전체 회원 기준</span></header><AdminChart v-if="members.length" type="doughnut" :labels="['미구매','1회 구매','재구매']" :values="[members.length-buyers.length,buyers.length-repeat,repeat]" label="고객 수 (명)"/><StatePanel v-else empty="등록된 회원이 없습니다."/></article></div>
    <div class="customer-charts"><article><header><h2>카테고리별 구매 고객</h2><span>카테고리 내 중복 고객 제외</span></header><AdminChart v-if="categories.length" :labels="categories.map(r=>r[0])" :values="categories.map(r=>r[1])" label="구매 고객 (명)"/><StatePanel v-else empty="분석할 구매 내역이 없습니다."/></article><article><header><h2>구매 활동이 많은 고객</h2><RouterLink to="/admin/members">회원 관리 ↗</RouterLink></header><div v-if="ranking.length" class="customer-table" tabindex="0" role="region" aria-label="구매 고객 순위"><table><thead><tr><th>고객</th><th>주문 수</th><th>구매 금액</th></tr></thead><tbody><tr v-for="m in ranking" :key="m.userId"><td>{{ m.name }}</td><td>{{ m.count }}건</td><td>{{ money(m.total) }}</td></tr></tbody></table></div><StatePanel v-else empty="구매 고객이 없습니다."/></article></div>
  </section>
</template>
<style scoped>
.customer-analysis { display:grid; gap:12px; min-width:0; }
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
