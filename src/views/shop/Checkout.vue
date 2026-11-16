<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import { money } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import CheckoutAddressDialog from '../../components/CheckoutAddressDialog.vue'
import StatePanel from '../../components/StatePanel.vue'

const store = useShop()
const route = useRoute()
const router = useRouter()
const addressOpen = ref(false)
const savedDelivery = computed(() => store.deliveryAddresses[store.user?.userId] ?? null)
const paymentGroups = [
  {label:'간편결제', methods:['네이버페이','카카오페이','삼성페이']},
  {label:'일반결제', methods:['카드','계좌이체','휴대폰 결제']},
]
const paymentMethod = ref('카드')
const cashReceipt = ref(false)
const cashReceiptType = ref('소득공제')
const cashReceiptNumber = ref('')
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

async function pay() {
  if (store.role !== 'USER' || busy.value || unavailable.value || !store.checkoutItems.length) return
  error.value = ''
  const saved = savedDelivery.value
  if (!saved) {
    addressOpen.value = true
    return
  }
  const delivery = {
    recipient:saved.recipient,
    phone:saved.phone,
    postcode:saved.postcode,
    address:[saved.address,saved.detail].filter(Boolean).join(' '),
    memo:saved.memo,
  }
  const receiptRequested = paymentMethod.value === '계좌이체' && cashReceipt.value
  if (receiptRequested) {
    const length = cashReceiptNumber.value.replace(/[- ]/g,'').match(/^\d+$/)?.[0].length
    const valid = cashReceiptType.value === '지출증빙' ? length === 10 : length === 10 || length === 11
    if (!valid) {
      error.value = '현금영수증 발급 번호를 확인해 주세요.'
      return
    }
  }

  const items = store.checkoutItems.map(({productId,quantity}) => ({productId,quantity}))
  busy.value = true
  try {
    const order = await shop.order(store.user.userId,items,delivery)
    store.lastCheckout = {
      orderId:order.orderId,
      total:order.total,
      paymentMethod:paymentMethod.value,
      cashReceipt:receiptRequested ? cashReceiptType.value : '',
    }
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
          <div v-if="store.lastCheckout.paymentMethod"><dt>결제 수단</dt><dd>{{ store.lastCheckout.paymentMethod }}</dd></div>
          <div v-if="store.lastCheckout.cashReceipt"><dt>현금영수증</dt><dd>모의 신청 · {{ store.lastCheckout.cashReceipt }}</dd></div>
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

        <fieldset class="checkout-methods" :disabled="busy">
          <legend>결제수단</legend>
          <div v-for="group in paymentGroups" :key="group.label" class="checkout-method-group">
            <p>{{ group.label }}</p>
            <div class="checkout-method-options">
              <label v-for="method in group.methods" :key="method" class="checkout-method">
                <input v-model="paymentMethod" type="radio" name="payment-method" :value="method" @change="cashReceipt = false; cashReceiptNumber = ''">
                <span>{{ method }}</span>
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset v-if="paymentMethod === '계좌이체'" class="checkout-cash-receipt" :disabled="busy">
          <legend>현금영수증</legend>
          <div class="checkout-cash-options">
            <label><input v-model="cashReceipt" type="radio" name="cash-receipt" :value="false"> 미신청</label>
            <label><input v-model="cashReceipt" type="radio" name="cash-receipt" :value="true"> 신청</label>
          </div>
          <div v-if="cashReceipt" class="checkout-cash-fields">
            <label>발급 용도
              <select v-model="cashReceiptType">
                <option>소득공제</option>
                <option>지출증빙</option>
              </select>
            </label>
            <label>{{ cashReceiptType === '소득공제' ? '테스트 휴대폰 번호' : '테스트 사업자등록번호' }}
              <input v-model="cashReceiptNumber" inputmode="numeric" maxlength="20" required>
            </label>
          </div>
        </fieldset>
        <section v-else class="checkout-cash-receipt">
          <h2>현금영수증</h2>
          <p class="muted">계좌이체를 선택하면 신청할 수 있습니다.</p>
        </section>
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
.checkout-methods,.checkout-cash-receipt { min-width:0; margin:0; padding:0; border:0; }
.checkout-methods legend,.checkout-cash-receipt legend { padding:0; margin-bottom:12px; font-size:1.2rem; font-weight:750; }
.checkout-method-group + .checkout-method-group { margin-top:12px; }
.checkout-method-group p,.checkout-cash-receipt p { margin:0 0 8px; font-size:.84rem; color:var(--ui-muted); }
.checkout-method-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.checkout-method { position:relative; display:grid; }
.checkout-method input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:pointer; }
.checkout-method span { display:grid; place-items:center; min-height:44px; padding:6px; text-align:center; border:1px solid var(--ui-border); border-radius:8px; background:var(--ui-surface); }
.checkout-method input:checked + span { border-color:#92a2b8; background:var(--ui-raised); font-weight:750; box-shadow:inset 0 0 0 1px #92a2b8; }
.checkout-method input:focus-visible + span { outline:2px solid #92a2b8; outline-offset:2px; }
.checkout-cash-options { display:flex; flex-wrap:wrap; gap:12px 20px; }
.checkout-cash-options label { display:flex; align-items:center; gap:6px; min-height:32px; }
.checkout-cash-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:10px; }
.checkout-cash-fields :is(input,select) { display:block; width:100%; min-width:0; margin-top:5px; }
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
  .checkout-cash-fields { grid-template-columns:minmax(0,1fr); }
  .checkout-items img { width:44px; height:44px; }
}
</style>
