<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { checkoutPaymentGroups, shop } from '../../services'
import { openTossTestWindow, tossTestConfigured } from '../../services/tossCheckout'
import { money } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import CheckoutPaymentDialog from '../../components/CheckoutPaymentDialog.vue'
import PaymentBrand from '../../components/PaymentBrand.vue'
import CheckoutAddressDialog from '../../components/CheckoutAddressDialog.vue'
import StatePanel from '../../components/StatePanel.vue'

const store = useShop()
const route = useRoute()
const router = useRouter()
const apiPayment = (import.meta.env.VITE_AUTH_MODE || 'api') === 'api'
const addressOpen = ref(false)
const savedDelivery = computed(() => store.deliveryAddresses[store.user?.userId] ?? null)
const pendingPayment = ref(null)
const paymentNotice = ref('')
const tossOpen = ref(false)
const tossError = ref('')
let disposeToss
let tossAttempt = 0
const paymentMethod = ref('카드')
function saveDelivery(delivery) {
  store.deliveryAddresses[store.user.userId] = delivery
  addressOpen.value = false
  error.value = ''
}

const error = ref('')
const busy = ref(false)
const complete = computed(() => route.name === 'checkout-complete')
const quantity = computed(() => store.checkoutItems.reduce((sum,item) => sum + item.quantity,0))
const unavailable = computed(() => store.checkoutItems.some(item => item.quantity > item.stock))

function openPayment() {
  if (store.role !== 'USER' || busy.value || unavailable.value || !store.checkoutItems.length) return
  if (apiPayment) { startTossPayment(); return }
  error.value = ''
  paymentNotice.value = ''
  if (!savedDelivery.value) {
    addressOpen.value = true
    return
  }
  pendingPayment.value = {method:paymentMethod.value,total:store.checkoutTotal}
}
async function startTossPayment() {
  if (!tossTestConfigured || store.role !== 'USER' || busy.value || tossOpen.value || unavailable.value || !store.checkoutItems.length) return
  tossError.value = ''
  paymentNotice.value = ''
  if (!savedDelivery.value) {
    addressOpen.value = true
    return
  }

  const attempt = ++tossAttempt
  const memberId = store.user.userId
  let total = store.checkoutTotal
  let orderId = crypto.randomUUID()
  let pendingOrderId = null
  const items = store.checkoutItems.map(({productId,quantity}) => ({productId,quantity}))
  const [first,...rest] = store.checkoutItems
  const suffix = rest.length ? ' 외 ' + rest.length + '종' : ''
  const orderName = first.name.slice(0,100 - suffix.length) + suffix
  tossOpen.value = true
  const active = () => tossAttempt === attempt && store.user?.userId === memberId && route.name === 'checkout'
  try {
    if (apiPayment) {
      const saved = savedDelivery.value
      const delivery = {
        recipient:saved.recipient,phone:saved.phone,postcode:saved.postcode,
        address:[saved.address,saved.detail].filter(Boolean).join(' '),detail:'',
      }
      const order = await shop.createPendingOrder(memberId,items,delivery)
      if (!active()) return
      orderId = order.orderNumber
      pendingOrderId = order.orderId
      total = order.total
    }
    const dispose = await openTossTestWindow({
      memberId,orderId,cancelOrderId:pendingOrderId,total,orderName,items,active,
      cancel:() => {
        if (!active()) return
        if (pendingOrderId) void shop.cancelPendingOrder(memberId,pendingOrderId).catch(() => {})
        disposeToss = undefined
        tossOpen.value = false
        paymentNotice.value = '토스 결제창을 닫았습니다.'
      },
      report:(message,cancelOrder = false) => {
        if (!active()) return
        if (cancelOrder && pendingOrderId) void shop.cancelPendingOrder(memberId,pendingOrderId).catch(() => {})
        const close = disposeToss
        disposeToss = undefined
        close?.()
        tossOpen.value = false
        tossError.value = message
      },
    })
    if (active() && tossOpen.value) disposeToss = dispose
    else dispose?.()
  } catch (e) {
    if (active()) {
      if (pendingOrderId) void shop.cancelPendingOrder(memberId,pendingOrderId).catch(() => {})
      tossOpen.value = false
      tossError.value = e.message
    }
  }
}
onBeforeUnmount(() => {
  tossAttempt++
  disposeToss?.()
})

function cancelPayment() {
  pendingPayment.value = null
  error.value = ''
  paymentNotice.value = '결제를 취소했습니다.'
}
async function pay(outcome) {
  const saved = savedDelivery.value
  if (store.role !== 'USER' || busy.value || !pendingPayment.value || !saved) return
  error.value = ''
  const delivery = {
    recipient:saved.recipient,
    phone:saved.phone,
    postcode:saved.postcode,
    address:[saved.address,saved.detail].filter(Boolean).join(' '),
    memo:saved.memo,
  }
  const items = store.checkoutItems.map(({productId,quantity}) => ({productId,quantity}))
  busy.value = true
  try {
    const order = await shop.order(store.user.userId,items,delivery,{...pendingPayment.value,outcome})
    store.lastCheckout = {
      orderId:order.orderId,
      total:order.total,
      paymentMethod:order.paymentMethod,
    }
    pendingPayment.value = null
    await store.completeCheckout(items)
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
        <p role="status">{{ apiPayment ? '결제가 완료되었습니다.' : '모의 결제를 완료했습니다.' }}</p>
        <dl>
          <div><dt>주문번호</dt><dd>{{ store.lastCheckout.orderId }}</dd></div>
          <div><dt>결제 금액</dt><dd>{{ money(store.lastCheckout.total) }}</dd></div>
          <div v-if="store.lastCheckout.paymentMethod"><dt>결제 수단</dt><dd>{{ store.lastCheckout.paymentMethod }}</dd></div>
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

    <form v-else class="checkout-layout" @submit.prevent="openPayment">
      <div class="checkout-information">
        <section class="checkout-delivery" aria-labelledby="checkout-delivery-title">
          <div class="checkout-delivery-heading">
            <h2 id="checkout-delivery-title">배송지</h2>
            <button v-if="savedDelivery" class="button" type="button" :disabled="busy" @click="addressOpen = true">변경</button>
          </div>
          <template v-if="savedDelivery">
            <strong>{{ savedDelivery.recipient }}</strong>
            <span>{{ savedDelivery.phone }}</span>
            <p><span v-if="savedDelivery.postcode">({{ savedDelivery.postcode }}) </span>{{ savedDelivery.address }} {{ savedDelivery.detail }}</p>
            <p v-if="savedDelivery.memo" class="muted">배송 메모 · {{ savedDelivery.memo }}</p>
          </template>
          <button v-else class="button checkout-address-add" type="button" @click="addressOpen = true"><span aria-hidden="true">+</span> 배송지 추가</button>
        </section>
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

        <fieldset v-if="!apiPayment" class="checkout-methods" :disabled="busy">
          <legend>결제수단</legend>
          <div v-for="group in checkoutPaymentGroups" :key="group.label" class="checkout-method-group">
            <p>{{ group.label }}</p>
            <div class="checkout-method-options">
              <label v-for="method in group.methods" :key="method" class="checkout-method">
                <input v-model="paymentMethod" type="radio" name="payment-method" :value="method">
                <span class="checkout-method-label"><PaymentBrand :method="method"/>{{ method }}</span>
              </label>
            </div>
          </div>
        </fieldset>

      </div>

      <aside class="checkout-payment" aria-labelledby="checkout-total-title">
        <h2 id="checkout-total-title">결제 요약</h2>
        <dl>
          <div><dt>상품 금액</dt><dd>{{ money(store.checkoutTotal) }}</dd></div>
          <div><dt>배송비</dt><dd>무료</dd></div>
          <div class="checkout-total"><dt>총 결제금액</dt><dd>{{ money(store.checkoutTotal) }}</dd></div>
        </dl>
        <p class="checkout-note">{{ apiPayment ? '토스페이먼츠 테스트 결제입니다. 결제 승인 결과는 백엔드에서 확인합니다.' : '모의 결제입니다. 테스트 배송 정보를 입력해 주세요.' }}</p>
        <p v-if="unavailable" class="error">장바구니에서 상품 재고를 확인해 주세요.</p>
        <p v-if="paymentNotice" class="checkout-note" role="status">{{ paymentNotice }}</p>
        <p v-if="tossError" class="error" role="alert">{{ tossError }}</p>
        <button v-if="!apiPayment" type="submit" class="button" :disabled="busy || unavailable || tossOpen">{{ busy ? '처리 중…' : '모의 결제하기' }}</button>
        <button v-if="apiPayment" type="submit" class="button toss-test-button" :disabled="!tossTestConfigured || busy || unavailable || tossOpen" :aria-describedby="tossTestConfigured ? undefined : 'toss-test-status'"><PaymentBrand method="토스페이먼츠"/>{{ tossOpen ? '토스 결제창 열림…' : '토스페이먼츠 테스트 결제' }}</button>
        <button v-else type="button" class="button toss-test-button" :disabled="!tossTestConfigured || busy || unavailable || tossOpen" :aria-describedby="tossTestConfigured ? undefined : 'toss-test-status'" @click="startTossPayment"><PaymentBrand method="토스페이먼츠"/>{{ tossOpen ? '토스 결제창 열림…' : '토스페이먼츠 테스트 결제' }}</button>
        <p v-if="!tossTestConfigured" id="toss-test-status" class="checkout-note toss-test-status">테스트 키를 설정하면 토스페이먼츠 결제창을 열 수 있어요.</p>
      </aside>
    </form>
    <CheckoutPaymentDialog v-if="pendingPayment && !apiPayment" :method="pendingPayment.method" :total="pendingPayment.total" :busy="busy" :error="error" @approve="pay" @close="cancelPayment"/>
    <CheckoutAddressDialog v-if="addressOpen" :current="savedDelivery" :member-name="store.user?.name" @close="addressOpen = false" @save="saveDelivery"/>
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
.checkout-delivery { display:grid; gap:6px; padding-bottom:20px; border-bottom:1px solid var(--ui-border); }
.checkout-delivery-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:8px; }
.checkout-delivery-heading h2 { margin:0; }
.checkout-delivery p { margin:0; overflow-wrap:anywhere; }
.checkout-delivery .checkout-address-add { justify-self:start; gap:8px; }
.checkout-address-add span { font-size:1.15rem; }
.checkout-methods { min-width:0; margin:0; padding:0; border:0; }
.checkout-methods legend { padding:0; margin-bottom:12px; font-size:1.2rem; font-weight:750; }
.checkout-method-group + .checkout-method-group { margin-top:12px; }
.checkout-method-group p { margin:0 0 8px; font-size:.84rem; color:var(--ui-muted); }
.checkout-method-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.checkout-method { position:relative; display:grid; }
.checkout-method input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; }
.checkout-method-label { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:4px 8px; min-height:48px; padding:6px; text-align:center; border:1px solid var(--ui-border); border-radius:8px; background:var(--ui-surface); }
.checkout-method input:checked + .checkout-method-label { border-color:#92a2b8; background:var(--ui-raised); font-weight:750; box-shadow:inset 0 0 0 1px #92a2b8; }
.checkout-method input:focus-visible + .checkout-method-label { outline:2px solid #92a2b8; outline-offset:2px; }
.checkout-payment,.checkout-receipt { padding:22px; border:1px solid var(--ui-border); border-radius:12px; background:var(--ui-raised); }
.checkout-payment dl,.checkout-receipt dl { display:grid; gap:10px; margin:0; }
.checkout-payment dl > div,.checkout-receipt dl > div { display:flex; justify-content:space-between; gap:12px; }
.checkout-payment dt,.checkout-receipt dt { color:var(--ui-muted); }
.checkout-payment dd,.checkout-receipt dd { margin:0; text-align:right; font-weight:700; overflow-wrap:anywhere; min-width:0; }
.checkout-payment .checkout-total { align-items:center; border-top:1px solid var(--ui-border); padding-top:14px; margin-top:4px; font-weight:750; }
.checkout-total dd { font-size:1.35rem; }
.checkout-note { color:var(--ui-muted); font-size:.8rem; line-height:1.55; margin:14px 0; }
.checkout-payment .button { width:100%; min-height:46px; background:#dce5f0; border-color:#aab8cc; color:#182231; }
.checkout-payment .toss-test-button { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:8px; background:var(--ui-surface); color:var(--ui-text); }
.toss-test-status { margin:8px 0 0; }
.checkout-payment .button:hover:not(:disabled) { background:#edf3fb; color:#182231; }
.checkout-receipt { max-width:560px; }
.checkout-links { margin-top:18px; }
@media (max-width:760px) {
  .checkout-layout { grid-template-columns:minmax(0,1fr); }
}
@media (max-width:410px) {
  .checkout-items img { width:44px; height:44px; }
}
</style>
