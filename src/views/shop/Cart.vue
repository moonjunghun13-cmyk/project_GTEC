<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { money } from '../../utils'
import { cartCompatibilityWarnings } from '../../services/cartCompatibility'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import StatePanel from '../../components/StatePanel.vue'
const store = useShop()
const router = useRouter()
const selected = ref([])
watch(() => store.cartItems.map(item => item.productId), (ids,previous = []) => {
  selected.value = ids.filter(id => selected.value.includes(id) || !previous.includes(id))
},{immediate:true})
const chosen = computed(() => store.cartItems.filter(item => selected.value.includes(item.productId)))
const compatibilityWarnings = computed(() => cartCompatibilityWarnings(store.cartItems))
const compatibilityGroups = computed(() => {
  const groups = new Map()
  for (const warning of compatibilityWarnings.value) {
    const id = warning.part.productId + ':' + warning.fit.productId
    if (!groups.has(id)) groups.set(id,{ id, part:warning.part.name, fit:warning.fit.name, warnings:[] })
    groups.get(id).warnings.push(warning)
  }
  return [...groups.values()]
})
const compatibilityDialog = ref(null)
const compatibilityTrigger = ref(null)
function openCompatibilityDialog() {
  if (compatibilityWarnings.value.length && !compatibilityDialog.value?.open) compatibilityDialog.value?.showModal()
}
function closeCompatibilityDialog() {
  compatibilityDialog.value?.close()
  compatibilityTrigger.value?.focus()
}
onMounted(openCompatibilityDialog)
watch(() => compatibilityWarnings.value.length, (count,previous) => {
  if (!count) compatibilityDialog.value?.close()
  else if (!previous) openCompatibilityDialog()
}, {flush:'post'})
const allSelected = computed(() => !!store.cartItems.length && chosen.value.length === store.cartItems.length)
const selectedQuantity = computed(() => chosen.value.reduce((sum,item) => sum + item.quantity,0))
const selectedTotal = computed(() => chosen.value.reduce((sum,item) => sum + item.price * item.quantity,0))
const unavailable = computed(() => chosen.value.some(item => item.stock < item.quantity || item.stock === 0))
function selectAll(event) { selected.value = event.target.checked ? store.cartItems.map(item => item.productId) : [] }
function removeSelected() {
  for (const id of [...selected.value]) store.quantity(id,0)
}
function quantity(item,event) {
  const value = Number(event.target.value)
  if (Number.isInteger(value) && value >= 1) store.quantity(item.productId,value)
  event.target.value = store.cart.find(row => row.productId === item.productId)?.quantity ?? 0
}
function checkout() {
  if (!chosen.value.length || unavailable.value) return
  const ids = chosen.value.map(item => item.productId)
  store.requireUser(() => {
    store.checkoutIds = ids
    store.cartOpen = false
    return router.push('/checkout')
  })
}
</script>
<template>
  <section class="wrap section">
    <div class="cart-page-heading"><div class="cart-title-block"><h1>장바구니</h1><div><strong>Shopping cart</strong><p>담은 상품과 수량을 확인해 주세요.</p></div></div><CheckoutSteps :step="1"/></div>
    <p v-if="store.role === 'GUEST'" class="muted">비회원 장바구니는 현재 브라우저 탭에 임시 저장됩니다.</p>
    <button v-if="compatibilityWarnings.length" ref="compatibilityTrigger" type="button" class="button cart-compatibility-trigger" aria-haspopup="dialog" @click="openCompatibilityDialog">
      부품 호환성 경고 {{ compatibilityWarnings.length }}건 보기
    </button>
    <dialog ref="compatibilityDialog" class="cart-compatibility-dialog" aria-labelledby="compatibility-dialog-title" aria-describedby="compatibility-dialog-summary" @cancel.prevent="closeCompatibilityDialog">
      <header class="cart-compatibility-heading">
        <span class="cart-warning-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 4.8a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3z"/>
            <path d="M12 9v4.5m0 3.1h.01"/>
          </svg>
        </span>
        <div>
          <h2 id="compatibility-dialog-title">부품 호환성 확인</h2>
          <p id="compatibility-dialog-summary">가상 사양 기준으로 확인할 항목이 {{ compatibilityWarnings.length }}건 있어요.</p>
        </div>
      </header>
      <ul class="cart-compatibility-list" aria-label="호환성 경고 목록" tabindex="0">
        <li v-for="group in compatibilityGroups" :key="group.id">
          <strong>{{ group.part }} · {{ group.fit }}</strong>
          <p v-for="warning in group.warnings" :key="warning.key">{{ warning.reason }}</p>
        </li>
      </ul>
      <footer class="cart-compatibility-actions">
        <button type="button" class="button" autofocus @click="closeCompatibilityDialog">닫기</button>
      </footer>
    </dialog>
    <StatePanel v-if="!store.cartItems.length" empty="장바구니에 담긴 상품이 없습니다."/>
    <div v-else class="cart-workspace">
      <div>
        <div class="cart-selection-toolbar">
          <label class="check"><input type="checkbox" :checked="allSelected" :indeterminate="chosen.length > 0 && !allSelected" @change="selectAll"> 전체 선택 <span>{{ chosen.length }} / {{ store.cartItems.length }}</span></label>
          <button :disabled="!chosen.length" @click="removeSelected">선택 삭제</button>
        </div>
        <article v-for="item in store.cartItems" :key="item.productId" class="line cart-line selectable-cart-line">
          <input v-model="selected" type="checkbox" :value="item.productId" :aria-label="item.name+' 주문 선택'">
          <RouterLink class="cart-product" :to="'/products/'+item.productId">
            <img v-if="item.image" :src="item.image" alt="" loading="lazy"><span v-else class="cart-image-empty">이미지 없음</span>
            <span><small>{{ item.category }} · {{ item.brand }}</small><strong>{{ item.name }}</strong><small>개당 {{ money(item.price) }}</small></span>
          </RouterLink>
          <div class="cart-line-quantity"><button :disabled="item.quantity <= 1 || !item.stock" :aria-label="item.name+' 수량 줄이기'" @click="store.quantity(item.productId,item.quantity-1)">−</button><input type="number" inputmode="numeric" min="1" :max="item.stock" :value="item.quantity" :disabled="!item.stock" :aria-label="item.name+' 수량'" @change="quantity(item,$event)"><button :disabled="item.quantity >= item.stock" :aria-label="item.name+' 수량 늘리기'" @click="store.quantity(item.productId,item.quantity+1)">+</button></div>
          <strong class="cart-line-total">{{ money(item.price*item.quantity) }}</strong>
          <button class="cart-line-delete" :aria-label="item.name+' 삭제'" @click="store.quantity(item.productId,0)">삭제</button>
          <p v-if="!item.stock || item.quantity > item.stock" class="error cart-stock-error">재고가 부족합니다. 수량을 조정하거나 선택을 해제해 주세요.</p>
        </article>
      </div>
      <aside class="cart-selection-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">주문 요약</h2>
        <dl><div><dt>선택 상품</dt><dd>{{ chosen.length }}종 · {{ selectedQuantity }}개</dd></div><div><dt>상품 금액</dt><dd>{{ money(selectedTotal) }}</dd></div><div><dt>배송비</dt><dd>무료</dd></div></dl>
        <div class="cart-selected-total"><span>총 주문금액</span><strong>{{ money(selectedTotal) }}</strong></div>
        <button class="button gold" :disabled="!chosen.length || unavailable || store.role === 'ADMIN'" @click="checkout">선택 상품 {{ selectedQuantity }}개 주문하기</button>
        <p v-if="!chosen.length">주문할 상품을 선택해 주세요.</p><p v-else-if="unavailable" class="error">선택 상품의 재고를 확인해 주세요.</p><p v-else>선택한 상품만 주문합니다.</p>
      </aside>
    </div>
    <RouterLink to="/products">← 쇼핑 계속하기</RouterLink>
  </section>
</template>

<style scoped>
.cart-compatibility-trigger { margin:0 0 12px; }
.cart-compatibility-dialog {
  width:min(520px,calc(100% - 28px));
  max-height:min(640px,calc(100dvh - 36px));
  margin:auto;
  padding:0;
  overflow:hidden;
  border:1px solid var(--ui-border);
  border-radius:18px;
  background:var(--ui-surface);
  color:var(--ui-text);
  box-shadow:0 20px 72px #080d1759;
}
.cart-compatibility-dialog[open] { display:grid; grid-template-rows:auto minmax(0,1fr) auto; }
.cart-compatibility-dialog::backdrop { background:#080c15a0; backdrop-filter:blur(4px); }
.cart-compatibility-heading { display:flex; align-items:center; gap:14px; padding:20px 22px 16px; }
.cart-warning-icon {
  display:grid;
  place-items:center;
  flex:none;
  width:46px;
  height:46px;
  border-radius:13px;
  background:color-mix(in srgb,var(--cart-warning,#a33649) 15%,var(--ui-surface));
  color:var(--cart-warning,#a33649);
}
:global(:root[data-theme=dark]) .cart-warning-icon { --cart-warning:#ffabb9; }
.cart-warning-icon svg { width:26px; height:26px; }
.cart-compatibility-heading h2 { margin:0; font-size:1.22rem; letter-spacing:-.02em; }
.cart-compatibility-dialog p { margin:4px 0 0; font-size:.85rem; line-height:1.55; color:var(--ui-muted); }
.cart-compatibility-list { min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; margin:0 22px; padding:0; list-style:none; }
.cart-compatibility-list li { padding:12px 4px; border-top:1px solid var(--ui-border); word-break:keep-all; overflow-wrap:anywhere; }
.cart-compatibility-actions { display:flex; justify-content:flex-end; padding:14px 22px 18px; border-top:1px solid var(--ui-border); }
.cart-compatibility-actions .button { min-width:92px; min-height:42px; }
@media(max-width:520px) {
  .cart-compatibility-heading,.cart-compatibility-actions { padding-inline:16px; }
  .cart-compatibility-list { margin-inline:16px; }
}
</style>
