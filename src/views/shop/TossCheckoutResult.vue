<script setup>
import { useRoute, useRouter } from 'vue-router'
import { money } from '../../utils'
import { readTossTestResult } from '../../services/tossCheckout'

const route = useRoute()
const router = useRouter()
const result = readTossTestResult(route.params.result,route.query)
if (Object.keys(route.query).length) router.replace({path:route.path})
const headings = {
  authenticated:'토스 테스트 결제 인증 완료',
  cancelled:'토스 테스트 결제 취소',
  failed:'토스 테스트 결제 실패',
  invalid:'토스 테스트 결제 결과 확인 불가',
}
const notes = {
  authenticated:'주문을 완료하려면 서버의 결제 승인이 필요합니다.',
  cancelled:'상품을 다시 담아 결제를 재시도할 수 있습니다.',
  failed:'상품을 다시 담아 결제 정보를 확인해 주세요.',
  invalid:'결제 요청 정보와 결과가 일치하지 않거나 요청을 찾을 수 없습니다.',
}
</script>

<template>
  <section class="wrap section toss-result">
    <h1>{{ headings[result.status] }}</h1>
    <p role="status">{{ notes[result.status] }}</p>
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
