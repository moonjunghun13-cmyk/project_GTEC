<script setup>
import HeartIcon from '../../components/HeartIcon.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import { reviewSentimentLabel } from '../../services/reviewSentiment'
import { money } from '../../utils'
import CartAddedDialog from '../../components/CartAddedDialog.vue'
import ProductGallery from '../../components/ProductGallery.vue'
import StatePanel from '../../components/StatePanel.vue'
import AdminPagination from '../../components/admin/AdminPagination.vue'
import ProductStoryBanner from '../../components/ProductStoryBanner.vue'
import ProductEditorial from '../../components/ProductEditorial.vue'
const store = useShop()
const route = useRoute()
const router = useRouter()
const product = computed(() => store.products.find(row => row.productId === route.params.id))
const reviews = ref([])
const reviewPage=ref(0),reviewTotal=ref(0),reviewPages=ref(0)
async function changeReviewPage(page){reviewPage.value=page;await load()}
const busy = ref(false)
const error = ref('')
const notice = ref('')
const added = ref(null)
const selected = ref(1)
const tabs = [
  {id:'product-description',label:'상품 설명'},
  {id:'product-specifications',label:'상세 스펙'},
  {id:'product-reviews',label:'구매 리뷰'},
]
const activeTab = ref(tabs[0].id)
function handleTabKey(event, index) {
  const last = tabs.length - 1
  const destination = {
    ArrowLeft:index === 0 ? last : index - 1,
    ArrowRight:index === last ? 0 : index + 1,
    Home:0,
    End:last,
  }[event.key]
  if (destination === undefined) return
  event.preventDefault()
  activeTab.value = tabs[destination].id
  event.currentTarget.parentElement.children[destination].focus()
}
const gallery = computed(() => {
  const images = product.value?.gallery ?? []
  const slides = images
  const image = product.value?.image
  const originals = image && image !== images[0]?.image ? [{color:'대표',image},...slides] : slides
  return [...originals,...(product.value?.lifestyle ?? []).filter(item => !originals.some(slide => slide.image === item.image)).map(item => ({color:item.label,image:item.image}))]
})

const inCart = computed(() => store.cart.find(item => item.productId === product.value?.productId)?.quantity ?? 0)
const remaining = computed(() => Math.max(0,(product.value?.stock ?? 0) - inCart.value))
function setSelected(value) {
  const integer = Math.trunc(Number(value)) || 1
  selected.value = Math.max(1,Math.min(integer,product.value.stock))
}
function addSelected() {
  if (store.role === 'ADMIN' || selected.value > remaining.value) return
  const amount = selected.value
  const total = inCart.value + amount
  const hasWarnings = store.addAndShow(product.value.productId,amount)
  if (!hasWarnings) added.value = {product:{...product.value},quantity:amount}
  notice.value = amount + '개를 담았습니다. 장바구니에 총 ' + total + '개가 있습니다.'
}
let request = 0
async function load() {
  const current = ++request
  busy.value = true
  error.value = ''
  try {
    const result = await shop.reviewsPage(route.params.id,{page:reviewPage.value,size:20})
    if (current === request) {reviews.value=result.rows;reviewTotal.value=result.total;reviewPages.value=result.pages}
  } catch (e) { if (current === request) error.value = e.message }
  finally { if (current === request) busy.value = false }
}
watch(() => route.params.id, () => {notice.value = ''; added.value = null; selected.value = 1; reviewPage.value=0;reviewTotal.value=0;reviewPages.value=0; activeTab.value = tabs[0].id; load()},{immediate:true})
watch(() => [store.role,product.value?.productId], ([role,productId]) => {
  if (store.canShop && productId) store.recordView(productId)
},{immediate:true})
function buy() {
  const productId = product.value.productId
  const quantity = selected.value
  store.requireUser(() => {
    store.quantity(productId,quantity)
    store.checkoutIds = [productId]
    return router.push('/checkout')
  })
}
</script>
<template>
  <section v-if="product" class="wrap section product-detail-page">
    <RouterLink to="/products">← 상품 목록</RouterLink>
    <div class="detail">
      <ProductGallery :key="product.productId" :product="product" :slides="gallery"/>
      <div class="product-purchase-info"><p class="eyebrow">{{ product.category }}<template v-if="product.brand"> / {{ product.brand }}</template></p><h1>{{ product.name }}</h1><p>{{ product.spec }}</p><p v-if="product.description">{{ product.description }}</p><p class="price">{{ money(product.price) }}</p><p class="muted">{{ product.stock ? '재고 '+product.stock+'개' : '품절' }}</p>
      <div v-if="product.stock && store.role !== 'ADMIN'" class="detail-quantity" role="group" aria-label="구매 수량">
        <label for="product-quantity">수량</label>
        <button class="button" type="button" aria-label="수량 줄이기" :disabled="selected <= 1" @click="setSelected(selected-1)">−</button>
        <input id="product-quantity" type="number" inputmode="numeric" min="1" :max="product.stock" :value="selected" @change="setSelected($event.target.value); $event.target.value = selected">
        <button class="button" type="button" aria-label="수량 늘리기" :disabled="selected >= product.stock" @click="setSelected(selected+1)">+</button>
        <strong>{{ money(product.price * selected) }}</strong>
      </div>
      <p v-if="product.stock && selected > remaining" class="muted">
        {{ remaining ? '장바구니에 최대 '+remaining+'개 더 담을 수 있습니다.' : '재고만큼 장바구니에 담았습니다.' }}
      </p>
      <div v-if="store.role !== 'ADMIN'" class="actions">
        <button class="button" :disabled="!product.stock || selected > remaining" @click="addSelected">장바구니 담기</button>
        <button class="button gold" :disabled="!product.stock" @click="buy">구매하기</button>
        <button class="button product-wishlist" :aria-pressed="store.favorites.includes(product.productId)" @click="store.requireUser(() => store.favorite(product.productId))"><span class="wishlist-heart"><HeartIcon :active="store.favorites.includes(product.productId)"/></span> {{ store.favorites.includes(product.productId) ? '찜 해제' : '찜하기' }}</button>
      </div><p role="status">{{ notice }}</p></div>
    </div>
    <div class="product-section-nav" role="tablist" aria-label="상품 상세 안내">
      <button
        v-for="(tab,index) in tabs"
        :id="tab.id + '-tab'"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-controls="tab.id"
        :aria-selected="activeTab === tab.id"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="activeTab = tab.id"
        @keydown="handleTabKey($event,index)"
      >{{ tab.label }}<span v-if="tab.id === 'product-reviews' && !busy && !error" class="review-tab-count">{{ reviewTotal }}</span></button>
    </div>
    <section v-show="activeTab === 'product-description'" id="product-description" class="product-story" role="tabpanel" aria-labelledby="product-description-tab" tabindex="0">
      <ProductStoryBanner :product="product"/>
      <ProductEditorial :product="product"/>

    </section>
    <section v-show="activeTab === 'product-specifications'" id="product-specifications" class="product-specifications" role="tabpanel" aria-labelledby="product-specifications-tab" tabindex="0">
      <h2 id="product-spec-title">상세 스펙</h2>
      <dl><div v-for="[label,value] in product.details?.specifications || []" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
      <p v-if="product.specSource" class="muted"><a :href="product.specSource" target="_blank" rel="noopener noreferrer">제품 사양 출처 ↗</a></p>
      <div v-if="product.details" class="product-compatibility">
        <div><p class="eyebrow">BEFORE YOU BUILD</p><h3>구매 전 확인해 주세요</h3><p>지금 사용 중인 부품과 함께 비교하면 구성을 계획하기 편리합니다.</p></div>
        <ul><li v-for="check in product.details.checks" :key="check"><span aria-hidden="true">✓</span> {{ check }}</li></ul>
      </div>
    </section>
    <section v-show="activeTab === 'product-reviews'" id="product-reviews" role="tabpanel" aria-labelledby="product-reviews-tab" tabindex="0">
      <div class="section-head product-reviews-heading"><h2>구매 리뷰</h2><small v-if="!busy && !error && reviews.length && reviews.every(review => review.sentimentSource === 'mock')" class="review-demo-note">예시 리뷰</small></div>
      <StatePanel v-if="busy || error || !reviews.length" :busy="busy" :error="error" empty="아직 등록된 리뷰가 없습니다." @retry="load"/>
      <article v-for="review in busy || error ? [] : reviews" :key="review.reviewId" class="review">
        <div class="review-heading">
          <strong>{{ review.author }}</strong>
        </div>
        <p>{{ review.body }}</p>
        <span v-if="reviewSentimentLabel(review)" class="badge">{{ reviewSentimentLabel(review) }}</span>
      </article>
      <AdminPagination v-if="reviewTotal" :page="reviewPage" :pages="reviewPages" :total="reviewTotal" :busy="busy" label="리뷰" @change="changeReviewPage"/>
    </section>
  </section>
  <StatePanel v-else empty="상품을 찾을 수 없습니다."/>
  <CartAddedDialog v-if="added" :product="added.product" :quantity="added.quantity" @close="added = null"/>
</template>

<style scoped>
.review-demo-note { color:var(--ui-muted); }
.review-tab-count { margin-inline-start:6px; font-size:.8em; font-variant-numeric:tabular-nums; }
.review-heading { display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; }
.review-score { display:inline-flex; gap:2px; color:var(--ui-text); font-size:1.15rem; line-height:1.2; }
.review-score-value { color:var(--ui-muted); font-size:.85rem; font-variant-numeric:tabular-nums; }
</style>
