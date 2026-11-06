<script setup>
import { computed, ref, watch } from 'vue'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'
import { money, dateLabel } from '../../utils'
import StatePanel from '../../components/StatePanel.vue'
import ProductCard from '../../components/ProductCard.vue'
import './member-dashboard.css'

const store = useShop()
const data = ref({orders:[],reviewCount:0,inquiryCount:0})
const loading = ref(true)
const loadError = ref('')
const name = ref('')
const email = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const profileOpen = ref(false)
const recommended = ref([])
const recommending = ref(false)
const recommendationError = ref('')
const badges = {interest:'관심 추천',personal:'맞춤 추천',category:'관심 카테고리 기반',popular:'인기 추천'}
let recommendationRequest = 0
async function loadRecommendations() {
  const current = ++recommendationRequest
  recommending.value = true
  recommendationError.value = ''
  try {
    // Reuse the existing service boundary; recommendation logic and future AI integration stay unchanged.
    const rows = await shop.recommendations(store.favorites,store.recentlyViewed)
    if (current === recommendationRequest) recommended.value = rows
  } catch(e) { if (current === recommendationRequest) recommendationError.value = e.message }
  finally { if (current === recommendationRequest) recommending.value = false }
}
watch(() => [store.user?.userId,...store.favorites,...store.recentlyViewed],loadRecommendations,{immediate:true})
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const result = await shop.memberSummary(store.user.userId)
    if (current === request) data.value = result
  } catch (e) { if (current === request) loadError.value = e.message }
  finally { if (current === request) loading.value = false }
}
watch(() => store.user?.userId, () => {
  name.value = store.user?.name || ''
  email.value = store.user?.email || ''
  if (store.user) load()
},{immediate:true})
const recent = computed(() => [...data.value.orders].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,3))
const stages = ['결제 완료','배송 준비','배송 중','배송 완료']
const preview = computed(() => store.products.filter(p => store.favorites.includes(p.productId)).slice(0,3))
const provider = computed(() => ({kakao:'카카오',naver:'네이버',google:'구글'}[store.user?.socialProvider] || '이메일'))
const image = item => store.products.find(p => p.productId === item.productId)?.image || item.image
async function save() {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  const userId = store.user.userId
  try {
    const updated = await shop.profile(userId,{name:name.value.trim(),email:email.value.trim().toLowerCase()})
    if (store.user?.userId === userId) { store.user = updated; notice.value = '회원정보를 저장했습니다.' }
  } catch(e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <div class="member-dashboard">
    <section class="member-welcome">
      <div class="member-identity"><div class="member-monogram" aria-hidden="true"><img src="/gt-logo-chrome.png" alt=""></div><div><p>YOUR NEXT LEVEL STARTS HERE</p><h2>{{ store.user?.name }}<span>님의 쇼핑 공간</span></h2><small>{{ provider }} 로그인 · GT MEMBER</small></div></div>
      <button class="member-edit" @click="profileOpen = !profileOpen" :aria-expanded="profileOpen" aria-controls="member-profile">회원정보 수정 <span aria-hidden="true">↗</span></button>
    </section>
    <section v-if="profileOpen" id="member-profile" class="member-profile">
      <div class="member-section-head"><h2>회원정보 수정</h2><button @click="profileOpen=false" aria-label="회원정보 수정 닫기">닫기 ×</button></div>
      <form class="member-profile-form" @submit.prevent="save"><label>이름<input v-model="name" required maxlength="50" autocomplete="name"></label><label>이메일<input v-model="email" type="email" required autocomplete="email"></label><button :disabled="busy">{{ busy ? '저장 중…' : '변경사항 저장' }}</button><p>현재 실행 중인 Mock 환경에 반영됩니다.</p><p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p></form>
    </section>
    <StatePanel v-if="loading || loadError" :busy="loading" :error="loadError" @retry="load"/>
    <template v-else>
      <section class="member-overview" aria-label="나의 쇼핑 현황">
        <div class="member-overview-heading"><p>MY SHOPPING</p><h2>주문 · 배송</h2><RouterLink to="/orders">전체 내역 ↗</RouterLink></div>
        <RouterLink v-for="stage in stages" :key="stage" to="/orders" class="member-stat"><strong>{{ data.orders.filter(o=>o.status===stage).length }}</strong><span>{{ stage }}</span></RouterLink>
        <RouterLink to="/favorites" class="member-stat member-stat-saved"><strong>{{ store.favorites.length }}</strong><span>찜한 상품 ♡</span></RouterLink>
        <RouterLink to="/orders" class="member-stat"><strong>{{ data.reviewCount }}</strong><span>작성한 리뷰</span></RouterLink>
      </section>
      <div class="member-activity">
        <section class="member-recent"><div class="member-section-head"><h2>최근 주문</h2><RouterLink to="/orders">전체보기 ↗</RouterLink></div>
          <div v-if="!recent.length" class="member-empty"><div><h3>첫 번째 주문을 기다리고 있어요.</h3><p>당신의 다음 레벨을 완성할 부품을 만나보세요.</p><RouterLink to="/products">쇼핑 시작하기 →</RouterLink></div></div>
          <RouterLink v-for="order in recent" v-else :key="order.orderId" to="/orders" class="member-order-row"><img v-if="image(order.items[0])" :src="image(order.items[0])" :alt="order.items[0].name"><div><small>{{ dateLabel(order.date) }}</small><strong>{{ order.items[0]?.name }}<template v-if="order.items.length>1"> 외 {{ order.items.length-1 }}건</template></strong><span>{{ money(order.total) }}</span></div><b>{{ order.status }}</b></RouterLink>
        </section>
        <section class="member-saved"><div class="member-section-head"><h2>눈여겨본 상품 <small>{{ store.favorites.length }}</small></h2><RouterLink to="/favorites">전체보기 ↗</RouterLink></div>
          <div v-if="preview.length" class="member-favorites"><RouterLink v-for="p in preview" :key="p.productId" :to="'/products/'+p.productId"><div><img :src="p.image" :alt="p.name"></div><strong>{{ p.name }}</strong><span>{{ money(p.price) }}</span></RouterLink></div>
          <div v-else class="member-empty"><span aria-hidden="true">♡</span><div><h3>마음에 드는 상품을 모아보세요.</h3><p>상품의 하트를 누르면 여기에 표시됩니다.</p><RouterLink to="/products">상품 둘러보기 →</RouterLink></div></div>
        </section>
      </div>
    </template>
    <section class="member-recommendations" aria-labelledby="member-recommend-title">
      <div class="member-section-head"><div><p>SELECTED FOR YOU</p><h2 id="member-recommend-title">당신을 위한 추천상품</h2><span>관심 상품과 최근 살펴본 카테고리를 모아봤어요.</span></div><RouterLink to="/products">전체 상품 ↗</RouterLink></div>
      <StatePanel v-if="recommending || recommendationError || !recommended.length" :busy="recommending" :error="recommendationError" empty="추천할 상품을 준비하고 있습니다." @retry="loadRecommendations"/>
      <div v-else class="product-grid"><ProductCard v-for="product in recommended" :key="product.productId" :product="product" :ribbon="badges[product.recommendationReason || 'popular']" :ribbon-tone="product.recommendationReason"/></div>
    </section>
  </div>
</template>