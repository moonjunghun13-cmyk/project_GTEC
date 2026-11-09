<script setup>
import { computed, ref, watch } from 'vue'
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
const inStock = ref(false)
const maxPrice = ref('')
watch(() => route.query.category, () => { maxPrice.value = ''; inStock.value = false })
function filter(key,value) { router.replace({query:{...route.query,[key]:value || undefined}}) }
const purpose = computed(() => store.purposes.find(row => row.id === route.query.purpose))
const results = computed(() => {
  const {q,category,sort} = route.query
  const term = String(q ?? '').trim().toLowerCase()
  const rows = store.products.filter(row => (!category || row.category === category) && (!purpose.value || row.purposes?.includes(purpose.value.id))
    && (!inStock.value || row.stock > 0) && (!maxPrice.value || row.price <= Number(maxPrice.value))
    && [row.brand,row.name,row.category,row.spec].join(' ').toLowerCase().includes(term))
  if (sort === 'low') rows.sort((a,b) => a.price-b.price)
  if (sort === 'high') rows.sort((a,b) => b.price-a.price)
  if (sort === 'popular') rows.sort((a,b) => b.popularity-a.popularity)
  if (sort === 'new') rows.reverse()
  return rows
})
</script>
<template>
  <section class="wrap section catalog-page">
    <div v-if="theme.mode === 'dark'" class="catalog-atmosphere"><CyberAtmosphere :interactive="false" :ambient="false" viewport-density/></div>
    <p class="eyebrow">THE CATALOG</p><h1>{{ purpose ? purpose.label + ' 추천 부품' : route.query.category || (route.query.q ? '검색 결과' : route.query.sort === 'new' ? '신상품' : route.query.sort === 'popular' ? '베스트 상품' : '전체 상품') }}</h1>
    <p v-if="purpose">{{ purpose.description }}</p><p v-if="purpose" class="muted">개별 부품 추천입니다. 구매 전 부품 간 호환성을 확인해 주세요.</p><p v-if="route.query.q">“{{ route.query.q }}” 검색</p>
    <div class="filters">
      <label>카테고리 <select :value="route.query.category || ''" @change="filter('category',$event.target.value)"><option value="">전체</option><option v-for="category in store.categories" :key="category">{{ category }}</option></select></label>
      <label>최대 가격 <input v-model.number="maxPrice" type="number" min="0" step="10000" placeholder="제한 없음"></label>
      <label class="check"><input v-model="inStock" type="checkbox"> 재고 있음</label>
      <label>정렬 <select :value="route.query.sort || ''" @change="filter('sort',$event.target.value)"><option value="">기본</option><option value="popular">인기순</option><option value="new">신상품순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option></select></label>
    </div>
    <p class="muted">{{ results.length }}개 상품</p>
    <div v-if="results.length" class="product-grid"><ProductCard v-for="product in results" :key="product.productId" :product="product"/></div>
    <StatePanel v-else empty="조건에 맞는 상품이 없습니다."/>
  </section>
</template>

<style scoped>
.catalog-page{position:relative;isolation:isolate}
.catalog-atmosphere{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.8;overflow:hidden}
</style>
