<script setup>
import { ref } from 'vue'
import { api } from '../../api'
import { money,dateLabel } from '../../utils'
const props=defineProps({orderId:{type:String,required:true},orderNumber:String})
const data=ref(null),busy=ref(false)
const statuses={REQUESTED:'요청',APPROVED:'승인',REJECTED:'거절',REFUNDED:'환불 완료',READY:'준비',IN_PROGRESS:'진행 중',DONE:'결제 완료',CANCELED:'취소',PARTIAL_CANCELED:'부분 취소',FAILED:'실패',ABORTED:'중단',EXPIRED:'만료'}
async function load(){
  if(busy.value)return;busy.value=true
  const entries=[['order',`/api/orders/${props.orderId}`],['delivery',`/api/orders/${props.orderId}/delivery`],['returns',`/api/orders/${props.orderId}/returns`],['payment',`/api/payments/${encodeURIComponent(props.orderNumber || '')}`]]
  const results=await Promise.allSettled(entries.map(async([,path])=>(await api.get(path)).data))
  data.value=Object.fromEntries(results.map((result,index)=>[entries[index][0],result.status==='fulfilled'?{value:result.value}:{error:result.reason.response?.status===404?'등록된 정보가 없습니다.':result.reason.message}]))
  busy.value=false
}
function open(event){if(event.target.open && !data.value)load()}
const receipt=value=>typeof value==='string' && /^https:\/\//i.test(value)?value:null
</script>
<template><details class="order-details" @toggle="open"><summary>주문·배송·결제·반품 상세</summary><p v-if="busy" role="status">불러오는 중입니다…</p><template v-if="data"><section><h3>주문 정보</h3><p v-if="data.order.error" role="status">{{ data.order.error }}</p><template v-else><p>주문번호 {{ data.order.value.orderNumber }} · 합계 {{ money(data.order.value.totalAmount) }}</p><p>{{ data.order.value.shippingName }} · {{ data.order.value.shippingAddress1 }} {{ data.order.value.shippingAddress2 }}</p></template></section><section><h3>배송 정보</h3><p v-if="data.delivery.error" role="status">{{ data.delivery.error }}</p><template v-else><p>{{ data.delivery.value.carrierName || '택배사 미등록' }} · 운송장 {{ data.delivery.value.invoiceNumber || '미등록' }}</p><p v-if="data.delivery.value.estimatedAt">예상 배송일 {{ data.delivery.value.estimatedAt }}</p></template></section><section><h3>결제 정보</h3><p v-if="data.payment.error" role="status">{{ data.payment.error }}</p><template v-else><p>{{ statuses[data.payment.value.status] || data.payment.value.status }} · {{ money(data.payment.value.amount) }}</p><p v-if="data.payment.value.approvedAt">승인일 {{ dateLabel(data.payment.value.approvedAt) }}</p><a v-if="receipt(data.payment.value.receiptUrl)" :href="receipt(data.payment.value.receiptUrl)" target="_blank" rel="noopener noreferrer">결제 영수증</a></template></section><section><h3>반품 내역</h3><p v-if="data.returns.error" role="status">{{ data.returns.error }}</p><template v-else><p v-if="!data.returns.value.length">반품 내역이 없습니다.</p><article v-for="row in data.returns.value" :key="row.id"><p>{{ row.productName || '상품 '+row.orderItemId }} · {{ row.quantity }}개 · {{ statuses[row.status] || row.status }}</p><p>사유 {{ row.reason }} · 환불 금액 {{ money(row.refundAmount ?? 0) }}</p></article></template></section><button type="button" class="button" :disabled="busy" @click="load">상세 새로고침</button></template></details></template>
<style scoped>.order-details{margin-top:12px;padding:12px;border:1px solid var(--ui-border);border-radius:8px}.order-details section{margin:14px 0}.order-details h3{font-size:.95rem}.order-details p{font-size:.85rem;overflow-wrap:anywhere}</style>
