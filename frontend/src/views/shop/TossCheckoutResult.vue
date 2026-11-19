<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { money } from '../../utils'
import { readTossTestResult } from '../../services/tossCheckout'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'

const route = useRoute()
const router = useRouter()
const store = useShop()
const apiPayment = import.meta.env.VITE_AUTH_MODE === 'api'
const result = ref(readTossTestResult(route.params.result,route.query))
const approvalError = ref('')
if (Object.keys(route.query).length) router.replace({path:route.path})
const headings = {
  authenticated:'토스 테스트 결제 인증 완료',
  'approval-failed':'토스 테스트 결제 승인 실패',
  cancelled:'토스 테스트 결제 취소',
  failed:'토스 테스트 결제 실패',
  invalid:'토스 테스트 결제 결과 확인 불가',
}
const notes = {
  authenticated:'주문을 완료하려면 서버의 결제 승인이 필요합니다.',
  'approval-failed':'결제 요청은 확인했지만 서버 승인에 실패했습니다. 오류를 확인한 뒤 다시 시도해 주세요.',
  cancelled:'상품을 다시 담아 결제를 재시도할 수 있습니다.',
  failed:'상품을 다시 담아 결제 정보를 확인해 주세요.',
  invalid:'결제 요청 정보와 결과가 일치하지 않거나 요청을 찾을 수 없습니다.',
}
onMounted(async () => {
  if (!apiPayment) return
  if (['cancelled','failed'].includes(result.value.status) && result.value.orderId) {
    try { await shop.cancelPendingOrder(store.user?.userId,result.value.orderId) }
    catch (error) { approvalError.value = `대기 주문 정리를 완료하지 못했습니다. 주문 취소 API를 확인해 주세요. ${error.message}` }
    return
  }
  if (result.value.status !== 'authenticated') return
  try {
    const payment = await shop.confirmPayment(result.value.paymentKey,result.value.orderId,result.value.total)
    store.lastCheckout = {orderId:payment.orderNumber ?? result.value.orderId,total:payment.amount ?? result.value.total,
      paymentMethod:payment.method ?? '토스페이먼츠'}
    await store.completeCheckout(result.value.items)
    await store.load()
    await router.replace({name:'checkout-complete'})
  } catch (error) {
    approvalError.value = error.message
    result.value = {...result.value,status:'approval-failed'}
  }
})
</script>

<template>
  <section class="wrap section toss-result">
    <h1>{{ headings[result.status] }}</h1>
    <p role="status">{{ notes[result.status] }}</p>
    <p v-if="approvalError" class="error" role="alert">{{ approvalError }}</p>
    <dl v-if="result.status === 'authenticated'">
      <div><dt>결제 요청 번호</dt><dd>{{ result.orderId }}</dd></div>
      <div><dt>요청 금액</dt><dd>{{ money(result.total) }}</dd></div>
    </dl>
    <RouterLink class="button" to="/products">상품 목록으로 돌아가기</RouterLink>
  </section>
</template>

<style scoped>
.toss-result { max-width:640px; }
.toss-result h1 { font-size:clamp(1.8rem,4vw,2.5rem); }
.toss-result dl { margin:18px 0; padding-block:14px; border-block:1px solid var(--ui-border); }
.toss-result dl div { display:flex; flex-wrap:wrap; justify-content:space-between; gap:6px 12px; }
.toss-result dl div + div { margin-top:8px; }
.toss-result dt { color:var(--ui-muted); }
.toss-result dd { margin:0; overflow-wrap:anywhere; }
</style>
