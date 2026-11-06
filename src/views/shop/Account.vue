<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'
import { money, dateLabel } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import StatePanel from '../../components/StatePanel.vue'
import ProductCard from '../../components/ProductCard.vue'
import MemberDashboard from './MemberDashboard.vue'

const store = useShop()
const route = useRoute()
const router = useRouter()
const orders = ref([])
const loading = ref(false)
const loadError = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const address = ref('')
const phone = ref('')
const recipient = ref(store.user?.name ?? '')
const name = ref(store.user?.name ?? '')
const email = ref(store.user?.email ?? '')
const reviewTarget = ref('')
const rating = ref(5)
const body = ref('')
const favorites = computed(() => store.products.filter(row => store.favorites.includes(row.productId)))
const orderItems = computed(() => orders.value.filter(order => !['환불 대기','환불 완료'].includes(order.status)).flatMap(order => order.items.map(item => ({...item,orderId:order.orderId}))))
const reviewItems = computed(() => orderItems.value.filter(item => !route.query.review || item.productId === route.query.review))
let request = 0
async function loadOrders() {
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const rows = await shop.orders(store.user.userId)
    if (current === request) orders.value = rows
  } catch (e) { if (current === request) loadError.value = e.message }
  finally { if (current === request) loading.value = false }
}
watch(() => route.fullPath, () => {
  error.value = ''
  notice.value = ''
  reviewTarget.value = ''
  if (route.name === 'orders' && store.user) loadOrders()
},{immediate:true})
async function submit(operation) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try { await operation() }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function checkout() {
  submit(async () => {
    const items = store.checkoutItems.map(({productId,quantity}) => ({productId,quantity}))
    await shop.order(store.user.userId,items,{recipient:recipient.value.trim(),address:address.value.trim(),phone:phone.value.trim()})
    store.completeCheckout(items)
    await router.push({name:'orders',query:{placed:'1'}})
    await store.load()
  })
}
function requestOrder(orderId) {
  submit(async () => {
    await shop.requestOrder(store.user.userId,orderId)
    await loadOrders()
    notice.value = '요청을 등록했습니다.'
  })
}
function write(item) {
  reviewTarget.value = item.orderId + item.productId
  rating.value = 5
  body.value = ''
}
function saveReview(item) {
  submit(async () => {
    const row = await shop.review(store.user,item.productId,rating.value,body.value.trim())
    reviewTarget.value = ''
    notice.value = '리뷰 등록 완료 · AI 감정분석 (Mock) ' + row.sentiment
  })
}
</script>
<template>
  <section class="wrap section">
    <p class="eyebrow">GT MEMBERS</p><h1>{{ route.meta.title }}</h1>
    <CheckoutSteps v-if="route.name === 'checkout' || (route.name === 'orders' && route.query.placed)" :step="route.name === 'checkout' ? 2 : 3"/><nav v-if="route.name !== 'account'" class="actions account-nav"><RouterLink to="/account">회원정보</RouterLink><RouterLink to="/orders">주문 내역</RouterLink><RouterLink to="/favorites">찜한 상품</RouterLink></nav>
    <template v-if="route.name === 'account'">
      <MemberDashboard/>
    </template>
    <template v-else-if="route.name === 'favorites'">
      <div v-if="favorites.length" class="product-grid"><ProductCard v-for="product in favorites" :key="product.productId" :product="product"/></div>
      <StatePanel v-else empty="찜한 상품이 없습니다."/>
    </template>
    <template v-else-if="route.name === 'checkout'">
      <StatePanel v-if="!store.checkoutItems.length" empty="장바구니가 비어 있습니다."/>
      <template v-else>
        <div v-for="item in store.checkoutItems" :key="item.productId" class="line"><span>{{ item.name }} × {{ item.quantity }}</span><strong>{{ money(item.price * item.quantity) }}</strong></div>
        <form class="stack form-panel" @submit.prevent="checkout">
          <label>받는 사람<input v-model="recipient" required autocomplete="name"></label>
          <label>연락처 (테스트 번호)<input v-model="phone" type="tel" required pattern="[0-9]{10,11}"></label><label>배송지 (테스트 주소)<input v-model="address" required></label>
          <p class="muted">결제 수단 · Mock 결제</p>
          <button class="button gold" :disabled="busy">{{ busy ? '처리 중…' : money(store.checkoutTotal) + ' 모의 결제' }}</button>
        </form>
      </template>
    </template>
    <template v-else>
      <p v-if="route.query.placed" role="status">모의 결제를 완료했습니다.</p>
      <StatePanel v-if="loading || loadError || !orders.length" :busy="loading" :error="loadError" empty="주문 내역이 없습니다." @retry="loadOrders"/>
      <template v-else>
        <article v-for="order in orders" :key="order.orderId" class="review">
          <strong>{{ dateLabel(order.date) }} · {{ order.status }} · {{ money(order.total) }}</strong>
          <p v-for="item in order.items" :key="item.productId">{{ item.name }} × {{ item.quantity }}</p>
          <p v-if="order.tracking">운송장 {{ order.tracking }}</p>
          <p v-if="order.request">{{ order.request }}</p>
          <button v-if="!order.request && ['결제 완료','배송 준비','배송 완료'].includes(order.status)" class="button" :disabled="busy" @click="requestOrder(order.orderId)">{{ order.status === '배송 완료' ? '반품 요청' : '취소 요청' }}</button>
        </article>
      </template>
      <template v-if="!loading && !loadError">
        <h2 id="member-review">구매 상품 리뷰 작성</h2>
        <StatePanel v-if="!reviewItems.length" empty="리뷰를 작성할 수 있는 구매 상품이 없습니다."/>
        <article v-for="item in reviewItems" :key="item.orderId+item.productId" class="review">
          <RouterLink :to="'/products/'+item.productId">{{ item.name }}</RouterLink>
          <form v-if="reviewTarget === item.orderId+item.productId" class="stack" @submit.prevent="saveReview(item)">
            <label>별점<select v-model.number="rating"><option v-for="n in 5" :key="n" :value="n">{{ n }} / 5</option></select></label>
            <label>리뷰<textarea v-model="body" required maxlength="1000" rows="4"></textarea></label>
            <button class="button gold" :disabled="busy">등록</button>
          </form>
          <button v-else class="button" :disabled="busy" @click="write(item)">리뷰 쓰기</button>
        </article>
      </template>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
