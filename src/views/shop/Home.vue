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
const featured = computed(() => store.products.slice(0,4))
const categoryCards = computed(() => store.categories.map(category => ({category,product:store.products.find(row => row.category === category)})).filter(row => row.product))
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
  <section class="home-section category-showcase">
    <div class="section-head"><div><h2>카테고리별 상품</h2><p>부품과 주변기기를 이미지로 살펴보세요.</p></div><RouterLink to="/products">전체 상품 ›</RouterLink></div>
    <div class="category-image-grid"><RouterLink v-for="{category,product} in categoryCards" :key="category" :to="{path:'/products',query:{category}}"><img :src="product.image" :alt="category" loading="lazy"><strong>{{ category }}</strong></RouterLink></div>
  </section>
  <section class="home-section">
    <div class="section-head"><div class="recommend-heading">
      <h2>당신을 위한 추천상품</h2>
      <p>추천 기능은 아직 연동하지 않았습니다.</p>
    </div><RouterLink :to="store.role === 'USER' ? '/products' : '/products?sort=popular'">전체 상품 ›</RouterLink></div>
    <StatePanel v-if="busy || error || !recommended.length" :busy="busy" :error="error" empty="추천 기능은 아직 연동하지 않았습니다." @retry="load"/>
    <div v-else class="product-grid"><ProductCard v-for="product in recommended" :key="product.productId" :product="product" :ribbon="badges[product.recommendationReason || 'popular']" :ribbon-tone="product.recommendationReason"/></div>
  </section>
  <section class="home-section">
    <div v-if="store.purposes.length" class="purpose-section">
      <div class="section-head"><div><p class="eyebrow">BUILD YOUR WAY</p><h2>용도별 상품</h2><p>내가 하는 일에 맞춰, 필요한 부품부터 찾아보세요.</p></div></div>
      <div class="purpose-grid"><RouterLink v-for="purpose in store.purposes" :key="purpose.id" :to="{path:'/products',query:{purpose:purpose.id,sort:'popular'}}">
        <img :src="purpose.image" alt="" loading="lazy"><div><small>{{ purpose.caption }}</small><h3>{{ purpose.label }}</h3><span>부품 보기 →</span></div>
      </RouterLink></div>
    </div>
    <div class="section-head"><div><h2>PRODUCTS</h2><p>서버에 등록된 상품</p></div><RouterLink to="/products">더 보기 ›</RouterLink></div>
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

<style scoped>
.category-image-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:18px; }
.category-image-grid a { display:grid; gap:12px; text-align:center; padding:18px 12px; border:1px solid var(--ui-border); border-radius:14px; background:var(--ui-surface); transition:transform .2s; }
.category-image-grid a:hover { transform:translateY(-4px); }
.category-image-grid img { width:100%; aspect-ratio:1; object-fit:contain; border-radius:8px; background:white; }
@media(max-width:900px) { .category-image-grid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; } }
@media(max-width:560px) { .category-image-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } .category-image-grid a { padding:10px 7px; gap:8px; font-size:.85rem; } }
</style>
