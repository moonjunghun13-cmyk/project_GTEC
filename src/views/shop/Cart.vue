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
  if (compatibilityWarnings.value.length && !compatibilityDialog.value?.open) compatibilityDialog.value?.show()
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
    <dialog ref="compatibilityDialog" class="cart-compatibility-dialog" aria-labelledby="compatibility-dialog-title" aria-describedby="compatibility-dialog-summary" @keydown.esc.stop="closeCompatibilityDialog">
      <header>
        <h2 id="compatibility-dialog-title">부품 호환성 확인</h2>
        <button type="button" class="button" autofocus @click="closeCompatibilityDialog">닫기</button>
      </header>
      <p id="compatibility-dialog-summary">가상 사양 기준으로 확인할 항목이 {{ compatibilityWarnings.length }}건 있어요. 상품은 그대로 담겨 있어요.</p>
      <ul class="cart-compatibility-list">
        <li v-for="group in compatibilityGroups" :key="group.id">
          <strong>{{ group.part }} · {{ group.fit }}</strong>
          <p v-for="warning in group.warnings" :key="warning.key">{{ warning.reason }}</p>
        </li>
      </ul>
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
  position:fixed;
  inset:auto 20px 20px auto;
  z-index:20;
  width:min(420px,calc(100% - 28px));
  max-height:min(520px,68dvh);
  overflow:auto;
  margin:0;
  padding:16px;
  border:1px solid var(--ui-border);
  border-top:3px solid #b86473;
  border-radius:12px;
  background:var(--ui-surface);
  color:var(--ui-text);
  box-shadow:0 12px 40px #11182745;
}
.cart-compatibility-dialog header { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.cart-compatibility-dialog h2 { margin:0; font-size:1.06rem; }
.cart-compatibility-dialog p { margin:4px 0 0; font-size:.83rem; color:var(--ui-muted); }
.cart-compatibility-dialog header .button { padding:5px 10px; min-height:34px; }
.cart-compatibility-list { margin:10px 0 0; padding:0; list-style:none; }
.cart-compatibility-list li { padding:8px 0; border-top:1px solid var(--ui-border); overflow-wrap:anywhere; }
@media(max-width:520px) { .cart-compatibility-dialog { inset:auto 14px 14px auto; } }
</style>
