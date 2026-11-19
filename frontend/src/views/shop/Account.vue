<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shop } from '../../services'
import { reviewSentimentLabel } from '../../services/reviewSentiment'
import { useShop } from '../../stores/shop'
import { money, dateLabel } from '../../utils'
import CheckoutSteps from '../../components/CheckoutSteps.vue'
import StatePanel from '../../components/StatePanel.vue'
import ProductCard from '../../components/ProductCard.vue'
import MemberDashboard from './MemberDashboard.vue'

const store = useShop()
const apiMode = import.meta.env.VITE_AUTH_MODE === 'api'
const route = useRoute()
const router = useRouter()
const orders = ref([])
const loading = ref(false)
const loadError = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const name = ref(store.user?.name ?? '')
const email = ref(store.user?.email ?? '')
const reviewTarget = ref('')
const reviewedOrderItemIds = ref([])
const rating = ref(null)
const body = ref('')
const favorites = computed(() => store.products.filter(row => store.favorites.includes(row.productId)))
const orderItems = computed(() => orders.value.filter(order => !['환불 대기','환불 완료'].includes(order.status)).flatMap(order => order.items.map(item => ({...item,orderId:order.orderId}))))
const reviewItems = computed(() => orderItems.value.filter(item =>
  (!apiMode || (orders.value.some(order => order.orderId === item.orderId && order.status === '구매 확정')
    && !reviewedOrderItemIds.value.includes(String(item.orderItemId))))
  && (!route.query.review || item.productId === route.query.review)))
let request = 0
async function loadOrders() {
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const [rows,reviews] = await Promise.all([shop.orders(store.user.userId),shop.myReviews(store.user.userId)])
    if (current === request) {
      orders.value = rows
      reviewedOrderItemIds.value = reviews.map(review => String(review.orderItemId))
    }
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
function requestOrder(orderId) {
  submit(async () => {
    const order = orders.value.find(row => row.orderId === orderId)
    await shop.requestOrder(store.user.userId,orderId,order?.items[0]?.orderItemId)
    await loadOrders()
    notice.value = order?.status === '배송 완료' ? '반품 요청을 등록했습니다.' : '주문을 취소했습니다.'
  })
}
function completeOrder(orderId) {
  submit(async () => {
    await shop.completeOrder(store.user.userId,orderId)
    await loadOrders()
    notice.value = '구매를 확정했습니다. 이제 구매 상품 리뷰를 작성할 수 있습니다.'
  })
}
function write(item) {
  reviewTarget.value = item.orderId + item.productId
  rating.value = null
  body.value = ''
}
function saveReview(item) {
  submit(async () => {
    const row = await shop.review(store.user,item.productId,rating.value,body.value.trim(),item.orderItemId)
    reviewTarget.value = ''
    if (apiMode) reviewedOrderItemIds.value = [...reviewedOrderItemIds.value,String(item.orderItemId)]
    notice.value = '리뷰 등록 완료 · ' + reviewSentimentLabel(row)
  })
}
</script>
<template>
  <section class="wrap section">
    <p class="eyebrow">GT MEMBERS</p><h1>{{ route.meta.title }}</h1>
    <CheckoutSteps v-if="route.name === 'orders' && route.query.placed" :step="3"/><nav v-if="route.name !== 'account'" class="actions account-nav"><RouterLink to="/account">회원정보</RouterLink><RouterLink to="/orders">주문 내역</RouterLink><RouterLink to="/favorites">찜한 상품</RouterLink></nav>
    <template v-if="route.name === 'account'">
      <MemberDashboard/>
    </template>
    <template v-else-if="route.name === 'favorites'">
      <div v-if="favorites.length" class="product-grid"><ProductCard v-for="product in favorites" :key="product.productId" :product="product"/></div>
      <StatePanel v-else empty="찜한 상품이 없습니다."/>
    </template>
    <template v-else>
      <p v-if="route.query.placed" role="status">{{ apiMode ? '결제가 완료되었습니다.' : '모의 결제를 완료했습니다.' }}</p>
      <StatePanel v-if="loading || loadError || !orders.length" :busy="loading" :error="loadError" empty="주문 내역이 없습니다." @retry="loadOrders"/>
      <template v-else>
        <article v-for="order in orders" :key="order.orderId" class="review">
          <strong>{{ dateLabel(order.date) }} · {{ order.status }} · {{ money(order.total) }}</strong>
          <p v-for="item in order.items" :key="item.productId">{{ item.name }} × {{ item.quantity }}</p>
          <p v-if="order.paymentMethod">결제 수단 · {{ order.paymentMethod }}</p>
          <p v-if="order.tracking">운송장 {{ order.tracking }}</p>
          <p v-if="order.request">{{ order.request }}</p>
          <button v-if="apiMode && order.status === '배송 완료' && !order.request" class="button" :disabled="busy" @click="completeOrder(order.orderId)">구매 확정</button>
          <button v-if="!order.request && (apiMode ? ['결제 완료','배송 완료'].includes(order.status) : ['결제 완료','배송 준비','배송 완료'].includes(order.status))" class="button" :disabled="busy" @click="requestOrder(order.orderId)">{{ order.status === '배송 완료' ? '반품 요청' : apiMode ? '주문 취소' : '취소 요청' }}</button>
        </article>
      </template>
      <template v-if="!loading && !loadError">
        <h2 id="member-review">구매 상품 리뷰 작성</h2>
        <StatePanel v-if="!reviewItems.length" empty="리뷰를 작성할 수 있는 구매 상품이 없습니다."/>
        <article v-for="item in reviewItems" :key="item.orderId+item.productId" class="review">
          <RouterLink :to="'/products/'+item.productId">{{ item.name }}</RouterLink>
          <form v-if="reviewTarget === item.orderId+item.productId" class="stack" @submit.prevent="saveReview(item)">
            <fieldset class="review-rating" :disabled="busy">
              <legend>별점</legend>
              <div class="review-rating-options">
                <label v-for="score in 5" :key="score">
                  <input v-model="rating" type="radio" name="review-rating" :value="score" :aria-label="score + '점'" required>
                  <span :class="{filled:score <= rating}" aria-hidden="true">{{ score <= rating ? '★' : '☆' }}</span>
                </label>
              </div>
              <p aria-live="polite">{{ rating ? rating + ' / 5점' : '별점을 선택해 주세요.' }}</p>
            </fieldset>
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

<style scoped>
.review-rating { min-width:0; margin:0; padding:0; border:0; }
.review-rating legend { padding:0; font-size:.9rem; }
.review-rating-options { display:flex; flex-wrap:wrap; gap:2px; }
.review-rating-options label { position:relative; display:grid; place-items:center; width:44px; height:44px; cursor:pointer; }
.review-rating-options input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; cursor:inherit; }
.review-rating-options span { padding:0 5px; border-radius:5px; color:var(--ui-muted); font-size:1.65rem; line-height:1.3; }
.review-rating-options .filled { color:var(--ui-text); }
.review-rating-options input:focus-visible + span { outline:2px solid currentColor; outline-offset:2px; }
.review-rating p { margin:0; color:var(--ui-muted); font-size:.78rem; }
</style>
