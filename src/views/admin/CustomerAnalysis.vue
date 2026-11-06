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
    <p class="customer-analysis-note">Mock 회원·주문 기준 · 환불 완료 주문 제외 · 방문 및 장바구니 행동 데이터는 수집하지 않습니다.</p>
    <div class="customer-metrics"><article><span>전체 회원</span><strong>{{ members.length }}<small>명</small></strong><p>일반 회원 기준</p></article><article><span>구매 고객</span><strong>{{ buyers.length }}<small>명</small></strong><p>유효 주문 1건 이상</p></article><article><span>재구매 고객</span><strong>{{ repeat }}<small>명</small></strong><p>유효 주문 2건 이상</p></article><article><span>재구매 고객 비율</span><strong>{{ rate }}<small>%</small></strong><p>구매 고객 중 재구매 고객</p></article></div>
    <div class="customer-charts"><article><header><h2>신규 회원 추이</h2><span>최근 14일 · 한국 시간</span></header><AdminChart type="line" :labels="trend.map(r=>r[0])" :values="trend.map(r=>r[1])" label="신규 회원 (명)"/></article><article><header><h2>고객 구매 구성</h2><span>전체 회원 기준</span></header><AdminChart v-if="members.length" type="doughnut" :labels="['미구매','1회 구매','재구매']" :values="[members.length-buyers.length,buyers.length-repeat,repeat]" label="고객 수 (명)"/><StatePanel v-else empty="등록된 회원이 없습니다."/></article></div>
    <div class="customer-charts"><article><header><h2>카테고리별 구매 고객</h2><span>카테고리 내 중복 고객 제외</span></header><AdminChart v-if="categories.length" :labels="categories.map(r=>r[0])" :values="categories.map(r=>r[1])" label="구매 고객 (명)"/><StatePanel v-else empty="분석할 구매 내역이 없습니다."/></article><article><header><h2>구매 활동이 많은 고객</h2><RouterLink to="/admin/members">회원 관리 ↗</RouterLink></header><div v-if="ranking.length" class="customer-table"><table><thead><tr><th>고객</th><th>주문 수</th><th>구매 금액</th></tr></thead><tbody><tr v-for="m in ranking" :key="m.userId"><td>{{ m.name }}</td><td>{{ m.count }}건</td><td>{{ money(m.total) }}</td></tr></tbody></table></div><StatePanel v-else empty="구매 고객이 없습니다."/></article></div>
  </section>
</template>
<style scoped>
.customer-analysis{display:grid;gap:20px;min-width:0}.customer-analysis-note{font-size:12px;color:#7d7568;margin:0;line-height:1.8}.customer-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.customer-metrics article{padding:24px;background:#fff;border:1px solid #e7e2d8;border-radius:12px}.customer-metrics article:first-child{background:#191815;color:#fff}.customer-metrics span{font-size:12px;color:#8c764e}.customer-metrics strong{display:block;font-size:33px;font-weight:650;margin:14px 0 10px;line-height:1}.customer-metrics small{font-size:13px;margin-left:6px;font-weight:400}.customer-metrics p{font-size:11px;color:#908678;margin:0}.customer-charts{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:20px}.customer-charts>article{padding:24px;border:1px solid #e7e2d8;background:white;border-radius:12px;min-width:0}.customer-charts header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:22px}.customer-charts h2{font-size:17px;margin:0}.customer-charts header span,.customer-charts header a{font-size:11px;color:#8a7a61}.customer-charts :deep(.admin-chart){height:245px}.customer-table{overflow-x:auto}.customer-table table{width:100%;border-collapse:collapse;font-size:12px}.customer-table :is(th,td){padding:12px 6px;text-align:right;border-bottom:1px solid #eeeae3;white-space:nowrap}.customer-table tr>:first-child{text-align:left}.customer-table th{color:#897958;font-weight:500}@media(max-width:900px){.customer-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.customer-charts{grid-template-columns:1fr}}@media(max-width:520px){.customer-metrics{gap:10px}.customer-metrics article{padding:18px}.customer-metrics strong{font-size:28px}.customer-charts>article{padding:18px}.customer-charts :deep(.admin-chart){height:215px}}
</style>
