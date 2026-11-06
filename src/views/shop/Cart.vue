<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { money } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import StatePanel from '../../components/StatePanel.vue'
const store = useShop()
const router = useRouter()
const selected = ref([])
watch(() => store.cartItems.map(item => item.productId), (ids,previous = []) => {
  selected.value = ids.filter(id => selected.value.includes(id) || !previous.includes(id))
},{immediate:true})
const chosen = computed(() => store.cartItems.filter(item => selected.value.includes(item.productId)))
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
          <div class="cart-line-quantity"><button :disabled="item.quantity <= 1 || !item.stock" :aria-label="item.name+' 수량 줄이기'" @click="store.quantity(item.productId,item.quantity-1)">−</button><input type="number" min="1" :max="item.stock" :value="item.quantity" :disabled="!item.stock" :aria-label="item.name+' 수량'" @change="quantity(item,$event)"><button :disabled="item.quantity >= item.stock" :aria-label="item.name+' 수량 늘리기'" @click="store.quantity(item.productId,item.quantity+1)">+</button></div>
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
