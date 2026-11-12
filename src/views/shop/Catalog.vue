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
  height:min(670px,100%);
  z-index:-1;
  overflow:hidden;
  pointer-events:none;
  background:
    radial-gradient(ellipse at 93% 4%,#e0e5ed,transparent 51%),
    radial-gradient(ellipse at 61% 10%,#f0edf6,transparent 47%),
    linear-gradient(180deg,#edf0f4 0%,#f8f9fb 48%,transparent 94%);
  mask-image:linear-gradient(#000 20%,transparent 96%);
}
.catalog-light-atmosphere::before,
.catalog-light-atmosphere::after {
  content:"";
  position:absolute;
  width:clamp(740px,92vw,1580px);
  height:clamp(260px,33vw,490px);
  border-radius:50%;
  mask-image:radial-gradient(ellipse closest-side,#0000 86%,#000 86.5% 98.5%,#0000 100%);
}
.catalog-light-atmosphere::before {
  top:-65px;
  right:36%;
  transform:rotate(19deg);
  background:linear-gradient(162deg,#fbfcff 35%,#d3dbe5 54%,#a9b6c6 59%,#fff 62%,#ccd6e3 64%,#f3f4f8 75%);
  opacity:.48;
}
.catalog-light-atmosphere::after {
  top:-88px;
  right:-15%;
  transform:rotate(-17deg);
  background:
    radial-gradient(ellipse closest-side,transparent 86%,#72809670 87%,#e0e8f57a 89%,transparent 91%,#fff9 95%,#8394ae63 98%,#fff8 99%),
    radial-gradient(ellipse at 66% 77%,#fff 0%,#fff0 31%),
    linear-gradient(155deg,#dde4ec 25%,#fff 38%,#b5c2d1 46%,#f6faff 53%,#9ba9bd 59%,#e8eff8 64%,#d5cbe7 69%,#f4f7fb 77%);
  background-size:100% 100%,170% 130%,100% 100%;
  animation:catalog-chrome-reflection 12s ease-in-out infinite alternate;
  opacity:.88;
}
@keyframes catalog-chrome-reflection {
  from { background-position:0 0,0 50%,0 0; }
  to { background-position:0 0,100% 50%,0 0; }
}
@media(max-width:650px) {
  .catalog-light-atmosphere::after { right:-95%; top:-58px; opacity:.68; }
  .catalog-light-atmosphere::before { right:18%; top:-24px; opacity:.36; }
}
@media(prefers-reduced-motion:reduce) {
  .catalog-light-atmosphere::after { animation:none; background-position:0 0,50% 50%,0 0; }
}
</style>
