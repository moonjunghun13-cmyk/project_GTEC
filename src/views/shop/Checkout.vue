<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import { money } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import StatePanel from '../../components/StatePanel.vue'

const store = useShop()
const route = useRoute()
const router = useRouter()
const recipient = ref(store.user?.name ?? '')
const phone = ref('')
const address = ref('')
const addressDetail = ref('')
const memo = ref('')
const error = ref('')
const busy = ref(false)
const complete = computed(() => route.name === 'checkout-complete')
const quantity = computed(() => store.checkoutItems.reduce((sum,item) => sum + item.quantity,0))
const unavailable = computed(() => store.checkoutItems.some(item => item.quantity > item.stock))

async function pay() {
  if (busy.value || unavailable.value || !store.checkoutItems.length) return
  error.value = ''
  const delivery = {
    recipient:recipient.value.trim(),
    phone:phone.value.trim(),
    address:[address.value.trim(),addressDetail.value.trim()].filter(Boolean).join(' '),
    memo:memo.value.trim(),
  }
  if (!delivery.recipient || !address.value.trim() || !/^\d{10,11}$/.test(delivery.phone.replace(/[- ]/g,''))) {
    error.value = '받는 사람, 전화번호, 배송지를 확인해 주세요.'
    return
  }

  const items = store.checkoutItems.map(({productId,quantity}) => ({productId,quantity}))
  busy.value = true
  try {
    const order = store.user
      ? await shop.order(store.user.userId,items,delivery)
      : await shop.guestOrder(items,delivery)
    store.lastCheckout = {orderId:order.orderId,total:order.total}
    store.completeCheckout(items)
    await router.replace({name:'checkout-complete'})
    await store.load()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="wrap section checkout-page">
    <header class="checkout-heading">
      <div>
        <RouterLink v-if="!complete" to="/cart">← 장바구니</RouterLink>
        <h1>{{ complete ? '주문 완료' : '주문 · 결제' }}</h1>
      </div>
      <CheckoutSteps :step="complete ? 3 : 2"/>
    </header>

    <template v-if="complete">
      <section v-if="store.lastCheckout" class="checkout-receipt" aria-label="주문 확인">
        <p role="status">모의 결제를 완료했습니다.</p>
        <dl>
          <div><dt>주문번호</dt><dd>{{ store.lastCheckout.orderId }}</dd></div>
          <div><dt>결제 금액</dt><dd>{{ money(store.lastCheckout.total) }}</dd></div>
        </dl>
      </section>
      <StatePanel v-else empty="이 화면에서 확인할 최근 주문이 없습니다."/>
      <div class="actions checkout-links">
        <RouterLink v-if="store.role === 'USER'" class="button" to="/orders">주문 내역 보기</RouterLink>
        <RouterLink class="button" to="/products">쇼핑 계속하기</RouterLink>
      </div>
    </template>

    <template v-else-if="!store.checkoutItems.length">
      <StatePanel empty="결제할 상품이 없습니다."/>
      <RouterLink to="/cart">장바구니로 이동 →</RouterLink>
    </template>

    <form v-else class="checkout-layout" @submit.prevent="pay">
      <div class="checkout-information">
        <section aria-labelledby="checkout-items-title">
          <h2 id="checkout-items-title">주문 상품 <small>{{ quantity }}개</small></h2>
          <ul class="checkout-items">
            <li v-for="item in store.checkoutItems" :key="item.productId">
              <img v-if="item.image" :src="item.image" alt="" width="54" height="54">
              <div><strong>{{ item.name }}</strong><small>수량 {{ item.quantity }}개</small></div>
              <strong>{{ money(item.price * item.quantity) }}</strong>
            </li>
          </ul>
        </section>

        <fieldset class="checkout-delivery" :disabled="busy">
          <legend>배송 정보</legend>
          <div class="checkout-contact">
            <label>받는 사람 이름<input v-model="recipient" required maxlength="80" autocomplete="shipping name"></label>
            <label>전화번호<input v-model="phone" type="tel" required maxlength="20" autocomplete="shipping tel" placeholder="010-1234-5678"></label>
          </div>
          <label>배송지<input v-model="address" required maxlength="160" autocomplete="shipping address-line1" placeholder="도로명, 건물번호"></label>
          <label>상세 주소 <span>(선택)</span><input v-model="addressDetail" maxlength="120" autocomplete="shipping address-line2" placeholder="동·호수 등"></label>
          <label>배송 메모 <span>(선택)</span><textarea v-model="memo" rows="2" maxlength="200" placeholder="배송 시 참고할 사항"></textarea></label>
        </fieldset>
      </div>

      <aside class="checkout-payment" aria-labelledby="checkout-total-title">
        <h2 id="checkout-total-title">결제 요약</h2>
        <dl>
          <div><dt>상품 금액</dt><dd>{{ money(store.checkoutTotal) }}</dd></div>
          <div><dt>배송비</dt><dd>무료</dd></div>
          <div class="checkout-total"><dt>총 결제금액</dt><dd>{{ money(store.checkoutTotal) }}</dd></div>
        </dl>
        <p class="checkout-note">모의 결제입니다. 테스트 배송 정보를 입력해 주세요.</p>
        <p v-if="unavailable" class="error">장바구니에서 상품 재고를 확인해 주세요.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" class="button" :disabled="busy || unavailable">{{ busy ? '처리 중…' : '모의 결제하기' }}</button>
      </aside>
    </form>
  </section>
</template>

<style scoped>
.checkout-page { max-width:1120px; padding-block:clamp(24px,4vw,56px); }
.checkout-heading { display:flex; justify-content:space-between; align-items:end; gap:16px 24px; flex-wrap:wrap; padding-bottom:20px; border-bottom:1px solid var(--ui-border); margin-bottom:28px; }
.checkout-heading a { display:inline-block; color:var(--ui-muted); font-size:.85rem; margin-bottom:10px; }
.checkout-heading a:hover { text-decoration:underline; }
.checkout-heading h1 { font-size:clamp(1.9rem,4vw,3rem); line-height:1.15; margin:0; }
.checkout-heading :deep(.checkout-steps) { margin:0; }
.checkout-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(260px,320px); gap:clamp(24px,4vw,48px); align-items:start; }
.checkout-information { display:grid; gap:28px; min-width:0; }
.checkout-layout h2,.checkout-delivery legend { margin:0 0 12px; font-size:1.2rem; font-weight:750; }
.checkout-layout h2 small { margin-left:5px; color:var(--ui-muted); font-size:.8rem; }
.checkout-items { list-style:none; padding:0; margin:0; border-top:1px solid var(--ui-border); }
.checkout-items li { display:flex; align-items:center; gap:12px; min-width:0; padding:11px 0; border-bottom:1px solid var(--ui-border); }
.checkout-items img { flex:none; object-fit:contain; border-radius:6px; background:#fff; }
.checkout-items li > div { flex:1; min-width:0; overflow-wrap:anywhere; }
.checkout-items small { display:block; margin-top:4px; color:var(--ui-muted); }
.checkout-items li > strong { white-space:nowrap; font-size:.9rem; }
.checkout-delivery { min-width:0; display:grid; gap:14px; margin:0; padding:0; border:0; }
.checkout-contact { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.checkout-delivery label { display:block; min-width:0; font-weight:650; }
.checkout-delivery label span { color:var(--ui-muted); font-weight:400; }
.checkout-delivery :is(input,textarea) { display:block; width:100%; min-width:0; margin-top:6px; padding:10px 12px; border:1px solid var(--ui-border); border-radius:7px; color:var(--ui-text); background:var(--ui-surface); }
.checkout-delivery textarea { resize:vertical; }
.checkout-payment,.checkout-receipt { padding:22px; border:1px solid var(--ui-border); border-radius:12px; background:var(--ui-raised); }
.checkout-payment dl,.checkout-receipt dl { display:grid; gap:10px; margin:0; }
.checkout-payment dl > div,.checkout-receipt dl > div { display:flex; justify-content:space-between; gap:12px; }
.checkout-payment dt,.checkout-receipt dt { color:var(--ui-muted); }
.checkout-payment dd,.checkout-receipt dd { margin:0; text-align:right; font-weight:700; overflow-wrap:anywhere; min-width:0; }
.checkout-payment .checkout-total { align-items:center; border-top:1px solid var(--ui-border); padding-top:14px; margin-top:4px; font-weight:750; }
.checkout-total dd { font-size:1.35rem; }
.checkout-note { color:var(--ui-muted); font-size:.8rem; line-height:1.55; margin:14px 0; }
.checkout-payment .button { width:100%; min-height:46px; background:#dce5f0; border-color:#aab8cc; color:#182231; }
.checkout-payment .button:hover:not(:disabled) { background:#edf3fb; color:#182231; }
.checkout-receipt { max-width:560px; }
.checkout-links { margin-top:18px; }
@media (max-width:760px) {
  .checkout-layout { grid-template-columns:minmax(0,1fr); }
}
@media (max-width:410px) {
  .checkout-contact { grid-template-columns:minmax(0,1fr); }
  .checkout-items img { width:44px; height:44px; }
}
</style>
