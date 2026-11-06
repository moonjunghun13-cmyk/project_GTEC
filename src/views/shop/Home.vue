<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useShop } from '../../stores/shop'
import { shop } from '../../services'
import HomeBanner from '../../components/HomeBanner.vue'
import CyberAtmosphere from '../../components/CyberAtmosphere.vue'
import CustomerCenter from '../../components/CustomerCenter.vue'
import CartIcon from '../../components/CartIcon.vue'
import ProductCard from '../../components/ProductCard.vue'
import StatePanel from '../../components/StatePanel.vue'
const store = useShop()
const recommended = ref([])
const badges = {interest:'관심 추천',personal:'맞춤 추천',category:'관심 카테고리 기반',popular:'인기 추천'}
const busy = ref(false)
const error = ref('')
const featuredIds = ['P7','GT-7-4','P10','P9']
const featured = computed(() => featuredIds.map(id => store.products.find(product => product.productId === id)).filter(Boolean))
let request = 0
async function load() {
  const current = ++request
  error.value = ''
  busy.value = true
  try {
    const rows = await (store.role === 'USER' ? shop.recommendations(store.favorites,store.recentlyViewed) : shop.demoRecommendations())
    if (current === request) recommended.value = rows
  } catch (e) { if (current === request) error.value = e.message }
  finally { if (current === request) busy.value = false }
}
watch(() => [store.role,store.favorites,store.recentlyViewed],load,{immediate:true})
let headingObserver
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  headingObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('cyber-scroll-visible')
      headingObserver.unobserve(entry.target)
    }
  },{threshold:.15})
  observeSections()
})
function observeSections() {
  if (!headingObserver) return
  document.querySelectorAll('.home-section > .section-head, .home-section > .product-grid, .home-section > .feature-grid, .home-section > .arrivals-photo, .purpose-section, .customer-center').forEach(element => {
    if (element.classList.contains('cyber-scroll-reveal')) return
    element.classList.add('cyber-scroll-reveal')
    headingObserver.observe(element)
  })
}
watch(busy,observeSections,{flush:'post'})
onUnmounted(() => headingObserver?.disconnect())
</script>
<template>
  <section class="store-intro" aria-label="GT전자 인트로">
    <CyberAtmosphere/>
    <img src="/storefront/chrome-neon-intro.png" alt="GT ELECTRONICS. POWER YOUR NEXT LEVEL. 당신의 다음 레벨을 완성하다." fetchpriority="high">
  </section>
  <HomeBanner />
  <section class="home-section">
    <div class="section-head"><div class="recommend-heading">
      <h2>당신을 위한 추천상품</h2>
      <p>{{ store.role === 'USER' ? '최근 본 상품과 찜한 카테고리를 바탕으로 추천해 드려요.' : 'AI 추천 예시를 살펴보세요. 로그인하면 활동을 바탕으로 추천해 드려요.' }}</p>
    </div><RouterLink :to="store.role === 'USER' ? '/products' : '/products?sort=popular'">전체 상품 ›</RouterLink></div>
    <StatePanel v-if="busy || error || !recommended.length" :busy="busy" :error="error" empty="추천할 상품이 없습니다." @retry="load"/>
    <div v-else class="product-grid"><ProductCard v-for="product in recommended" :key="product.productId" :product="product" :ribbon="badges[product.recommendationReason || 'popular']" :ribbon-tone="product.recommendationReason"/></div>
  </section>
  <section class="home-section">
    <div class="purpose-section">
      <div class="section-head"><div><p class="eyebrow">BUILD YOUR WAY</p><h2>용도별 추천</h2><p>내가 하는 일에 맞춰, 필요한 부품부터 찾아보세요.</p></div></div>
      <div class="purpose-grid"><RouterLink v-for="purpose in store.purposes" :key="purpose.id" :to="{path:'/products',query:{purpose:purpose.id,sort:'popular'}}">
        <img :src="purpose.image" alt="" loading="lazy"><div><small>{{ purpose.caption }}</small><h3>{{ purpose.label }}</h3><span>추천 부품 보기 →</span></div>
      </RouterLink></div>
    </div>
    <div class="section-head"><div><h2>BEST SELLER</h2><p>지금 가장 인기 있는 제품</p></div><RouterLink to="/products?sort=popular">더 보기 ›</RouterLink></div>
    <div class="feature-grid">
      <article v-for="feature in featured" :key="feature.productId" class="featured-buy-card"><RouterLink :to="{path:'/products/' + feature.productId}">
        <div class="feature-photo-wrap"><img v-if="feature.image" class="feature-photo" :src="feature.image" alt="" loading="lazy"><span v-else class="feature-photo">이미지 없음</span><img class="product-watermark" src="/gt-logo-chrome.png" alt="" aria-hidden="true"></div>
        <strong>{{ feature.name }}</strong>
      </RouterLink><button class="card-add-button" :aria-label="feature.name+' 장바구니 담기'" :disabled="!feature.stock || store.role === 'ADMIN' || (store.cart.find(row => row.productId === feature.productId)?.quantity ?? 0) >= feature.stock" @click="store.addAndShow(feature.productId)"><CartIcon/></button></article>
    </div>
  </section>
  <section class="home-section">
    <div class="section-head"><div><h2>NEW ARRIVALS</h2><p>새롭게 입고된 최신 제품</p></div><RouterLink to="/products?sort=new">더 보기 ›</RouterLink></div>
    <RouterLink class="arrivals-photo" to="/products?sort=new"><img src="/storefront/arrivals.png" alt="신상품 쇼케이스 · 최신 상품 보기" loading="lazy"></RouterLink>
  </section>
  <CustomerCenter/>
</template>