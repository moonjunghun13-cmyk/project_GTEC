<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import { money } from '../../utils'
import CartAddedDialog from '../../components/CartAddedDialog.vue'
import ProductGallery from '../../components/ProductGallery.vue'
import StatePanel from '../../components/StatePanel.vue'
import ProductStoryBanner from '../../components/ProductStoryBanner.vue'
import ProductEditorial from '../../components/ProductEditorial.vue'
const store = useShop()
const route = useRoute()
const router = useRouter()
const product = computed(() => store.products.find(row => row.productId === route.params.id))
const reviews = ref([])
const busy = ref(false)
const error = ref('')
const notice = ref('')
const added = ref(null)
const selected = ref(1)
const gallery = computed(() => {
  const images = product.value?.gallery ?? []
  const slides = images.length === 2 ? [...images,{color:'검정·흰색 비교',comparison:images}] : images
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
  if (selected.value > remaining.value) return
  const amount = selected.value
  const total = inCart.value + amount
  store.quantity(product.value.productId,total)
  store.cartOpen = true
  store.lastAdded = product.value.productId
  store.cartNotice = product.value.name + ' ' + amount + '개를 담았습니다.'
  added.value = {product:{...product.value},quantity:amount}
  notice.value = amount + '개를 담았습니다. 장바구니에 총 ' + total + '개가 있습니다.'
}
let request = 0
async function load() {
  const current = ++request
  busy.value = true
  error.value = ''
  try {
    const rows = await shop.reviews(route.params.id)
    if (current === request) reviews.value = rows
  } catch (e) { if (current === request) error.value = e.message }
  finally { if (current === request) busy.value = false }
}
watch(() => route.params.id, () => {notice.value = ''; added.value = null; selected.value = 1; load()},{immediate:true})
watch(() => [store.role,product.value?.productId], ([role,productId]) => {
  if (role === 'USER' && productId) store.recordView(productId)
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
function writeReview() {
  store.requireUser(() => router.push({path:'/orders',query:{review:product.value.productId}}))
}
</script>
<template>
  <section v-if="product" class="wrap section product-detail-page">
    <RouterLink to="/products">← 상품 목록</RouterLink>
    <div class="detail">
      <ProductGallery :key="product.productId" :product="product" :slides="gallery"/>
      <div class="product-purchase-info"><p class="eyebrow">{{ product.category }} / {{ product.brand }}</p><h1>{{ product.name }}</h1><p>{{ product.spec }}</p><p v-if="product.description">{{ product.description }}</p><p class="price">{{ money(product.price) }}</p><p class="muted">{{ product.stock ? '재고 '+product.stock+'개' : '품절' }}</p>
      <div v-if="product.stock" class="detail-quantity" role="group" aria-label="구매 수량">
        <label for="product-quantity">수량</label>
        <button class="button" type="button" aria-label="수량 줄이기" :disabled="selected <= 1" @click="setSelected(selected-1)">−</button>
        <input id="product-quantity" type="number" inputmode="numeric" min="1" :max="product.stock" :value="selected" @change="setSelected($event.target.value); $event.target.value = selected">
        <button class="button" type="button" aria-label="수량 늘리기" :disabled="selected >= product.stock" @click="setSelected(selected+1)">+</button>
        <strong>{{ money(product.price * selected) }}</strong>
      </div>
      <p v-if="product.stock && selected > remaining" class="muted">
        {{ remaining ? '장바구니에 최대 '+remaining+'개 더 담을 수 있습니다.' : '재고만큼 장바구니에 담았습니다.' }}
      </p>
      <div class="actions">
        <button class="button" :disabled="!product.stock || selected > remaining" @click="addSelected">장바구니 담기</button>
        <button class="button gold" :disabled="!product.stock || store.role === 'ADMIN'" @click="buy">구매하기</button>
        <button class="button" :disabled="store.role === 'ADMIN'" @click="store.requireUser(() => store.favorite(product.productId))">{{ store.favorites.includes(product.productId) ? '♥ 찜 해제' : '♡ 찜하기' }}</button>
      </div><p role="status">{{ notice }}</p></div>
    </div>
    <nav class="product-section-nav" aria-label="상품 상세 안내">
      <a href="#product-description">상품 설명</a><a href="#product-specifications">상세 스펙</a><a href="#product-reviews">구매 리뷰</a>
    </nav>
    <section id="product-description" class="product-story" aria-labelledby="product-story-title">
      <ProductStoryBanner :product="product"/>
      <ProductEditorial :product="product"/>
      <div v-if="product.gallery?.length" class="product-color-showcase">
        <div><p class="eyebrow">PRODUCT GALLERY</p><h3>제품 구성 살펴보기</h3></div>
        <div><figure v-for="item in product.gallery" :key="item.image"><img :src="item.image" :alt="product.name + ' · ' + item.color" loading="lazy"><figcaption>{{ item.color }}</figcaption></figure></div>
      </div>
    </section>
    <section id="product-specifications" class="product-specifications" aria-labelledby="product-spec-title">
      <h2 id="product-spec-title">상세 스펙</h2>
      <dl><div v-for="[label,value] in product.details?.specifications || []" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
      <p class="muted">현재 상품 설명과 규격은 화면 구성을 위한 Mock 정보입니다.</p>
      <div v-if="product.details" class="product-compatibility">
        <div><p class="eyebrow">BEFORE YOU BUILD</p><h3>구매 전 확인해 주세요</h3><p>지금 사용 중인 부품과 함께 비교하면 구성을 계획하기 편리합니다.</p></div>
        <ul><li v-for="check in product.details.checks" :key="check"><span aria-hidden="true">✓</span> {{ check }}</li></ul>
      </div>
    </section>
    <div id="product-reviews" class="section-head"><h2>구매 리뷰</h2><button class="button" :disabled="store.role === 'ADMIN'" @click="writeReview">리뷰 작성</button></div>
    <StatePanel v-if="busy || error || !reviews.length" :busy="busy" :error="error" empty="아직 등록된 리뷰가 없습니다." @retry="load"/>
    <article v-for="review in busy || error ? [] : reviews" :key="review.reviewId" class="review"><strong>{{ review.author }} · {{ review.rating }}/5</strong><p>{{ review.body }}</p><span class="badge">AI 감정분석 (Mock) · {{ review.sentiment }}</span></article>
  </section>
  <StatePanel v-else empty="상품을 찾을 수 없습니다."/>
  <CartAddedDialog v-if="added" :product="added.product" :quantity="added.quantity" @close="added = null"/>
</template>
