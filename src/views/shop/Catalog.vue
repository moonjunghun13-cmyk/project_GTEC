<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import ProductCard from '../../components/ProductCard.vue'
import StatePanel from '../../components/StatePanel.vue'
import CyberAtmosphere from '../../components/CyberAtmosphere.vue'
import { useTheme } from '../../stores/theme'
const store = useShop()
const theme = useTheme()
const route = useRoute()
const router = useRouter()
const filters = reactive({q:'', category:'', maxPrice:'', sort:''})
const inStock = computed(() => route.query.inStock === '1')
watch([() => route.query.q, () => route.query.category, () => route.query.maxPrice, () => route.query.sort], ([q, category, maxPrice, sort]) => {
  Object.assign(filters, {q:String(q ?? ''), category:String(category ?? ''), maxPrice:String(maxPrice ?? ''), sort:String(sort ?? '')})
}, {immediate:true})
function applyFilters() {
  const {q, category, maxPrice, sort} = filters
  router.replace({query:{...route.query, q:q.trim() || undefined, category:category || undefined, maxPrice:maxPrice === '' ? undefined : String(maxPrice), sort:sort || undefined}})
}
function toggleStock(event) {
  router.replace({query:{...route.query, inStock:event.target.checked ? '1' : undefined}})
}
const purpose = computed(() => store.purposes.find(row => row.id === route.query.purpose))
const results = computed(() => {
  const {q,category,maxPrice,sort} = route.query
  const priceLimit = Number(maxPrice)
  const term = String(q ?? '').trim().toLowerCase()
  const rows = store.products.filter(row => (!category || row.category === category) && (!purpose.value || row.purposes?.includes(purpose.value.id))
    && (!inStock.value || row.stock > 0) && (!maxPrice || !Number.isFinite(priceLimit) || priceLimit < 0 || row.price <= priceLimit)
    && [row.brand,row.name,row.category,row.spec].join(' ').toLowerCase().includes(term))
  if (sort === 'low') rows.sort((a,b) => a.price-b.price)
  if (sort === 'high') rows.sort((a,b) => b.price-a.price)
  if (sort === 'popular') rows.sort((a,b) => b.popularity-a.popularity)
  if (sort === 'new') rows.reverse()
  return rows
})
</script>
<template>
  <div class="catalog-scene">
    <div v-if="theme.mode === 'dark'" class="catalog-atmosphere"><CyberAtmosphere :interactive="false" :ambient="false" viewport-density/></div>
    <div v-else class="catalog-light-atmosphere" aria-hidden="true"></div>
  <section class="wrap section catalog-page">
    <p class="eyebrow">THE CATALOG</p><h1>{{ purpose ? purpose.label + ' 추천 부품' : route.query.category || (route.query.q ? '검색 결과' : route.query.sort === 'new' ? '신상품' : route.query.sort === 'popular' ? '베스트 상품' : '전체 상품') }}</h1>
    <p v-if="purpose">{{ purpose.description }}</p><p v-if="purpose" class="muted">개별 부품 추천입니다. 구매 전 부품 간 호환성을 확인해 주세요.</p><p v-if="route.query.q">“{{ route.query.q }}” 검색</p>
    <form class="filters catalog-filters" aria-label="상품 검색 및 필터" @submit.prevent="applyFilters">
      <label class="catalog-keyword">상품 검색<input v-model="filters.q" type="search" placeholder="상품명 또는 브랜드"></label>
      <label>카테고리<select v-model="filters.category"><option value="">전체</option><option v-for="category in store.categories" :key="category">{{ category }}</option></select></label>
      <label>최대 가격<input v-model="filters.maxPrice" type="number" min="0" step="1" placeholder="제한 없음"></label>
      <label>정렬<select v-model="filters.sort"><option value="">기본</option><option value="popular">인기순</option><option value="new">신상품순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option></select></label>
      <button class="button catalog-apply" type="submit">확인</button>
    </form>
    <div class="catalog-results-bar">
      <p class="muted" role="status">{{ results.length }}개 상품</p>
      <label class="check catalog-stock"><input :checked="inStock" type="checkbox" @change="toggleStock"> 재고 있음</label>
    </div>
    <div v-if="results.length" class="product-grid"><ProductCard v-for="product in results" :key="product.productId" :product="product"/></div>
    <StatePanel v-else empty="조건에 맞는 상품이 없습니다."/>
  </section>
  </div>
</template>

<style scoped>
.catalog-scene{position:relative;isolation:isolate}
.catalog-page{position:relative}
.catalog-atmosphere{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.8;overflow:hidden}
.catalog-page .catalog-filters {
  display:grid;
  grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr)) auto;
  align-items:end;
  gap:14px;
  padding:clamp(16px,2.4vw,28px);
  background:var(--ui-surface);
  border:1px solid var(--ui-border);
  border-radius:10px;
}
.catalog-filters label { display:grid; gap:7px; min-width:0; font-size:.84rem; font-weight:650; }
.catalog-page .catalog-filters :is(input,select) { width:100%; min-width:0; min-height:44px; padding:8px 12px; color:var(--ui-text); background:var(--ui-bg); border-color:var(--ui-border); }
.catalog-filters .catalog-apply { min-height:44px; padding-inline:22px; background:#dbe2eb; color:#1b232f; border-color:#aab6c6; }
.catalog-filters .catalog-apply:hover { background:#edf1f6; color:#1b232f; }
.catalog-results-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 16px; }
.catalog-results-bar p { margin:0; }
.catalog-stock { min-height:36px; gap:8px; cursor:pointer; font-weight:650; font-size:.86rem; }
.catalog-stock input { width:16px; height:16px; margin:0; }
@media(max-width:760px) {
  .catalog-page .catalog-filters { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .catalog-keyword { grid-column:1/-1; }
}
.catalog-light-atmosphere {
  position:absolute;
  inset:0 0 auto;
  height:min(850px,100%);
  z-index:-1;
  overflow:hidden;
  pointer-events:none;
  background:
    radial-gradient(ellipse at 0 12%,#dce6f4 0%,transparent 52%),
    radial-gradient(ellipse at 100% 0%,#e0e5f1 0%,transparent 50%),
    linear-gradient(180deg,#eff3f9,transparent 88%);
}
.catalog-light-atmosphere::before {
  content:"";
  position:absolute;
  inset:0;
  background:
    repeating-linear-gradient(0deg,#8ea3bf38 0 1px,transparent 1px 36px),
    repeating-linear-gradient(90deg,#8ea3bf38 0 1px,transparent 1px 36px),
    repeating-linear-gradient(132deg,transparent 0 86px,#91a5c84d 87px,transparent 88px 174px);
  mask-image:linear-gradient(180deg,#000 0%,#0008 48%,transparent 93%);
}
.catalog-light-atmosphere::after {
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(112deg,transparent 38%,#fff9 47%,#d4e0f4a6 50%,#fff8 53%,transparent 62%);
  mask-image:linear-gradient(180deg,#000 0%,transparent 84%);
  animation:catalog-light-sweep 10s ease-in-out infinite alternate;
}
@keyframes catalog-light-sweep {
  from { transform:translateX(-32%); opacity:.42; }
  to { transform:translateX(32%); opacity:.78; }
}
@media(prefers-reduced-motion:reduce) {
  .catalog-light-atmosphere::after { animation:none; opacity:.5; }
}
</style>
