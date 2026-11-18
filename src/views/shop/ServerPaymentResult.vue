<script setup>
import { onMounted,ref } from 'vue'
import { useRoute } from 'vue-router'
import { money } from '../../utils'
import { readTossTestResult } from '../../services/tossCheckout'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'
const route=useRoute(),store=useShop(),busy=ref(false),error=ref(''),confirmed=ref(false)
const result=readTossTestResult(route.params.result,route.query)
window.history.replaceState({},'',route.path)
onMounted(async () => {
  if (result.status !== 'authenticated') return
  busy.value=true
  try {
    const pending=JSON.parse(sessionStorage.getItem('gt-server-checkout') || 'null')
    if (!pending || pending.memberId !== store.user?.userId || pending.orderNumber !== result.orderId) throw new Error('로그인 회원과 결제 주문 정보를 확인해 주세요.')
    let payment=await shop.payment(result.orderId)
    if (payment.status !== 'DONE') payment=await shop.confirmPayment({paymentKey:result.paymentKey,orderId:result.orderId,amount:result.total})
    if (payment.status !== 'DONE') throw new Error('서버 결제가 승인되지 않았습니다.')
    confirmed.value=true
    store.lastCheckout={orderId:payment.orderNumber,total:payment.amount,paymentMethod:payment.method}
    await store.completeCheckout(pending.items)
    sessionStorage.removeItem('gt-server-checkout')
    await store.load()
  } catch(e) { error.value=e.message }
  finally { busy.value=false }
})
</script>
<template>
  <section class="wrap section">
    <h1>{{ confirmed ? '결제 완료' : busy ? '서버 결제 승인 중' : '결제 결과' }}</h1>
    <p v-if="busy" role="status">서버에서 주문과 결제 금액을 확인하고 있습니다.</p>
    <p v-else-if="confirmed" role="status">서버에서 결제를 승인했습니다.</p>
    <p v-else-if="!error">{{ result.status === 'cancelled' ? '결제를 취소했습니다. 미결제 주문은 주문 내역에서 취소할 수 있습니다.' : result.status === 'failed' ? '결제에 실패했습니다. 주문 내역을 확인해 주세요.' : '결제 요청 정보를 확인할 수 없습니다.' }}</p>
    <p v-if="error" class="error" role="alert">{{ error }} 주문 내역에서 결제 상태를 확인해 주세요.</p>
    <p v-if="result.orderId">주문번호 {{ result.orderId }} · {{ money(result.total) }}</p>
    <RouterLink class="button" to="/orders">주문 내역</RouterLink>
  </section>
</template>
