<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { admin } from '../../services'
import { useShop } from '../../stores/shop'
import { money,dateLabel } from '../../utils'
import AdminIcon from '../../components/admin/AdminIcon.vue'
import AdminChart from '../../components/admin/AdminChart.vue'
import StatePanel from '../../components/StatePanel.vue'
import CustomerAnalysis from './CustomerAnalysis.vue'
import './workspace.css'
import './dashboard-reference.css'
import './operations-board.css'
import './admin-common.css'

const store = useShop()
const route = useRoute()
const router = useRouter()
function openDashboardCard(event, path) {
  if (event.type === 'keydown' && event.target !== event.currentTarget) return
  if (event.target.closest('a,button,input,select,textarea')) return
  router.push(path)
}
const dashboardSearch = reactive({products:'',orders:'',members:'',reviews:''})
const dashboardRows = computed(() => {
  if (!data.value) return {products:[],orders:[],members:[],reviews:[]}
  const matches = (term, fields) => !term || fields.some(value => String(value ?? '').toLocaleLowerCase().includes(term))
  return Object.fromEntries(Object.keys(dashboardSearch).map(section => {
    const term = dashboardSearch[section].trim().toLocaleLowerCase()
    const source = section === 'orders' ? [...data.value.orders].sort((a,b) => b.date.localeCompare(a.date)) : data.value[section]
    const filtered = source.filter(row => {
      const fields = section === 'products' ? [row.productId,row.name,row.brand,row.category]
        : section === 'orders' ? [row.orderId,row.delivery?.recipient,row.status,...row.items.map(item => item.name)]
        : section === 'members' ? [row.userId,row.username,row.name,row.email,row.role,row.status]
        : [row.reviewId,productName(row.productId),row.author,row.body,row.sentiment]
      return matches(term,fields)
    })
    return [section,filtered.slice(0,4)]
  }))
})
const data = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const loadError = ref('')
const notice = ref('')
const search = ref('')
const categoryFilter = ref('')
const selected = ref('')
const period = ref('day')
const rangeDays = ref(7)
const graphUnit = ref('day')
const rangeLabel = computed(() => rangeDays.value === 1 ? '오늘' : '최근 ' + rangeDays.value + '일')
const rangeStart = computed(() => {
  const date = new Date(today() + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() - rangeDays.value + 1)
  return date.toISOString().slice(0,10)
})
const rangeOrders = computed(() => data.value.orders.filter(row => day(row.date) >= rangeStart.value && day(row.date) <= today()))
const rangeRevenue = computed(() => sum(rangeOrders.value) - sum(data.value.orders.filter(row => row.refundedAt && day(row.refundedAt) >= rangeStart.value && day(row.refundedAt) <= today())))
const dashboardTrend = computed(() => {
  if (graphUnit.value === 'month') return chartRevenue('month',6)
  const days = chartRevenue('day',rangeDays.value)
  if (graphUnit.value === 'day') return days.map(([date,total]) => [date.slice(5).replace('-','.'),total])
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push([days[i][0].slice(5),days.slice(i,i+7).reduce((total,row) => total+row[1],0)])
  }
  return weeks
})
const stockCounts = computed(() => [
  data.value.products.filter(row => row.stock >= 10).length,
  data.value.products.filter(row => row.stock > 0 && row.stock < 10).length,
  data.value.products.filter(row => row.stock === 0).length,
])
const adminFaq = [
  ['환불은 어떻게 하나요?','취소·반품·환불 메뉴에서 요청을 확인하고 승인한 뒤 Mock 환불 완료 처리를 진행합니다.'],
  ['배송 처리는 어디서 하나요?','주문·배송에서 주문을 선택하고 배송 준비, 운송장 입력, 발송 순서로 진행합니다.'],
  ['상품 이미지 변경은 어떻게 하나요?','상품 관리에서 상품을 선택하고 대표 이미지 파일을 추가한 뒤 저장해 주세요.'],
  ['재고는 어디서 수정하나요?','상품 관리에서 상품을 선택하고 재고 수량을 변경한 뒤 저장합니다.'],
]
const form = reactive({})
const page = computed(() => route.meta.section || 'dashboard')
const actor = () => store.user?.userId
const pending = row => ['취소 요청','반품 요청'].includes(row.request)
const lowStock = computed(() => data.value.products.filter(row => row.stock < 10 && row.selling !== false))
const day = value => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(value))
const today = () => day(new Date())
const paidToday = computed(() => data.value.orders.filter(row => day(row.date) === today()))
const sum = rows => rows.reduce((total,row) => total + row.total,0)
const revenueToday = computed(() => sum(paidToday.value) - sum(data.value.orders.filter(row => row.refundedAt && day(row.refundedAt) === today())))
const visibleReviews = computed(() => data.value.reviews.filter(row => !row.hidden))
const sentiments = ['긍정','중립','부정']
const sentimentCounts = computed(() => sentiments.map(label => visibleReviews.value.filter(row => row.sentiment === label).length))
const groupedSentiment = computed(() => {
  const groups = new Map()
  for (const row of visibleReviews.value) {
    const counts = groups.get(row.productId) ?? [0,0,0]
    const index = sentiments.indexOf(row.sentiment)
    if (index >= 0) counts[index]++
    groups.set(row.productId,counts)
  }
  return [...groups].map(([id,counts]) => ({id,name:productName(id),counts}))
})
const trend = computed(() => {
  const grouped = {}
  const key = date => day(date).slice(0,period.value === 'month' ? 7 : 10)
  for (const row of data.value.orders) {
    grouped[key(row.date)] = (grouped[key(row.date)] ?? 0) + row.total
    if (row.refundedAt) grouped[key(row.refundedAt)] = (grouped[key(row.refundedAt)] ?? 0) - row.total
  }
  return Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).slice(-12)
})
function chartRevenue(unit, count) {
  const current = today()
  const anchor = new Date(current + 'T12:00:00Z')
  const buckets = new Map()
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(anchor)
    if (unit === 'month') {
      date.setUTCDate(1)
      date.setUTCMonth(date.getUTCMonth() - offset)
    } else date.setUTCDate(date.getUTCDate() - offset)
    const key = date.toISOString().slice(0,unit === 'month' ? 7 : 10)
    buckets.set(key,0)
  }
  for (const order of data.value.orders) {
    const booked = day(order.date).slice(0,unit === 'month' ? 7 : 10)
    if (buckets.has(booked)) buckets.set(booked,buckets.get(booked) + order.total)
    if (order.refundedAt) {
      const refunded = day(order.refundedAt).slice(0,unit === 'month' ? 7 : 10)
      if (buckets.has(refunded)) buckets.set(refunded,buckets.get(refunded) - order.total)
    }
  }
  return [...buckets]
}
const dailyRevenue = computed(() => chartRevenue('day',7))
const monthlyRevenue = computed(() => chartRevenue('month',6))
const sales = computed(() => {
  const products = new Map()
  const categories = new Map()
  for (const order of data.value.orders.filter(row => row.status !== '환불 완료')) {
    for (const item of order.items) {
      const category = item.category ?? '기타'
      categories.set(category,(categories.get(category) ?? 0) + item.price * item.quantity)
      const rank = products.get(item.productId) ?? {id:item.productId,name:item.name,category,quantity:0,total:0}
      rank.quantity += item.quantity
      rank.total += item.price * item.quantity
      products.set(item.productId,rank)
    }
  }
  return {categories:[...categories].sort((a,b) => b[1]-a[1]),ranking:[...products.values()].sort((a,b) => b.quantity-a.quantity || b.total-a.total)}
})
const sourceRows = computed(() => {
  if (!data.value) return []
  if (page.value === 'refunds') return data.value.orders.filter(row => row.request || row.refundedAt)
  return data.value[page.value] ?? []
})
const rows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return sourceRows.value.filter(row => {
    if (page.value === 'products' && categoryFilter.value && row.category !== categoryFilter.value) return false
    return !term || Object.values(row).some(value =>
      typeof value === 'string' && !value.startsWith('data:image/') && value.toLowerCase().includes(term))
  })
})
const rowGroups = computed(() => {
  if (page.value !== 'products') return [{label:'',items:rows.value}]
  return (data.value?.categories ?? []).map(label => ({
    label,
    items:rows.value.filter(row => row.category === label),
  })).filter(group => group.items.length)
})
const readingImage = ref(false)
function chooseImage(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  notice.value = ''
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    error.value = '5MB 이하의 PNG, JPG, WebP 이미지를 선택해 주세요.'
    return
  }
  const selection = selected.value
  const reader = new FileReader()
  readingImage.value = true
  reader.onload = () => {
    if (page.value === 'products' && selected.value === selection) form.image = reader.result
  }
  reader.onerror = () => {
    if (page.value === 'products' && selected.value === selection) error.value = '이미지를 읽을 수 없습니다.'
  }
  reader.onloadend = () => { readingImage.value = false }
  reader.readAsDataURL(file)
}
const keyField = computed(() => ({products:'productId',orders:'orderId',refunds:'orderId',members:'userId',reviews:'reviewId',inquiries:'inquiryId',notices:'noticeId'})[page.value])
const detail = computed(() => sourceRows.value.find(row => row[keyField.value] === selected.value))
const titleFor = row => row.name ?? row.title ?? row.orderId ?? row.author
function productName(id) { return data.value.products.find(row => row.productId === id)?.name ?? id }
function summary(row) {
  if (page.value === 'products') return row.category+' · '+money(row.price)+' · 재고 '+row.stock+'개'+(row.selling === false ? ' · 판매중지' : row.stock === 0 ? ' · 품절' : '')
  if (page.value === 'members') return row.email+' · '+(row.status ?? '정상')
  if (page.value === 'reviews') return productName(row.productId)+' · '+row.rating+'점 · '+(row.hidden ? '숨김' : row.sentiment)
  if (page.value === 'inquiries') return row.author+' · '+(row.answer ? '답변 완료' : '미답변')
  if (row.orderId) return dateLabel(row.date)+' · '+row.status+' · '+money(row.total)+(row.request ? ' · '+row.request : '')
  return row.date ? dateLabel(row.date) : '공지'
}
async function load() {
  loading.value = true
  loadError.value = ''
  try { data.value = await admin.snapshot(actor()); if (page.value === 'products' && route.query.create) select() }
  catch (e) { loadError.value = e.message }
  finally { loading.value = false }
}
watch(() => [page.value,route.query.q], () => { search.value = String(route.query.q || ''); categoryFilter.value = ''; selected.value = ''; error.value = ''; notice.value = ''; period.value = 'day' },{immediate:true})
load()
function select(row) {
  error.value = ''
  notice.value = ''
  selected.value = row?.[keyField.value] ?? 'new'
  for (const key of Object.keys(form)) delete form[key]
  if (page.value === 'products') Object.assign(form,{name:'',category:data.value.categories[0],brand:'',price:0,stock:0,spec:'',image:'',description:'',...row,selling:row?.selling !== false})
  if (page.value === 'notices') Object.assign(form,{title:'',body:'',...row})
  if (page.value === 'orders') form.tracking = row.tracking ?? ''
  if (page.value === 'members') form.status = row.status ?? '정상'
  if (page.value === 'inquiries') form.answer = row.answer ?? ''
}
async function mutate(action, close = false) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await action()
    if (close) selected.value = ''
    data.value = await admin.snapshot(actor())
    notice.value = '변경사항을 저장했습니다.'
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function remove() {
  if (!window.confirm('선택한 항목을 삭제할까요?')) return
  if (page.value === 'products') mutate(() => admin.removeProduct(actor(),detail.value.productId),true)
  else mutate(() => admin.removeNotice(actor(),detail.value.noticeId),true)
}
</script>
<template>
  <header v-if="page === 'dashboard'" class="reference-heading">
    <div class="reference-title"><h1>대시보드</h1><p>쇼핑몰의 운영 현황을 한눈에 확인하세요.</p></div>
    <div class="reference-range">
      <div class="sales-period" role="group" aria-label="대시보드 집계 기간">
        <button v-for="days in [1,7,30]" :key="days" :aria-pressed="rangeDays === days" @click="rangeDays = days">{{ days === 1 ? '오늘' : '최근 '+days+'일' }}</button>
      </div>
      <time :datetime="today()">{{ rangeStart }} ~ {{ today() }}</time>
    </div>
  </header>
  <header v-else class="ops-page-title"><div><p class="eyebrow">GT OPERATIONS · MOCK</p><h1>{{ route.meta.title }}</h1></div></header>  <StatePanel v-if="loading || loadError" :busy="loading" :error="loadError" @retry="load"/>
  <template v-else-if="data">
    <section v-if="page === 'dashboard'" class="ops-dashboard reference-dashboard" aria-label="운영 현황">
      <div class="reference-kpis">
        <article class="reference-kpi-gold dashboard-link-card" role="link" tabindex="0" aria-label="고객분석으로 이동" @click="openDashboardCard($event,'/admin/customers')" @keydown.enter="openDashboardCard($event,'/admin/customers')"><AdminIcon name="coin"/><div><span>총 순매출액</span><strong>{{ money(rangeRevenue) }}</strong><small>{{ rangeLabel }} · 환불 반영</small></div></article>
        <RouterLink to="/admin/orders"><AdminIcon name="orders"/><div><span>신규 주문</span><strong>{{ rangeOrders.length }}건</strong><small>{{ rangeLabel }} 주문</small></div></RouterLink>
        <RouterLink to="/admin/orders"><AdminIcon name="truck"/><div><span>배송 대기</span><strong>{{ data.orders.filter(row => ['결제 완료','배송 준비'].includes(row.status) && !pending(row)).length }}건</strong><small>현재 처리 대기</small></div></RouterLink>
        <RouterLink to="/admin/members"><AdminIcon name="members"/><div><span>신규 가입 회원</span><strong>{{ data.members.filter(row => row.role === 'USER' && row.createdAt && day(row.createdAt) >= rangeStart).length }}명</strong><small>{{ rangeLabel }} 가입</small></div></RouterLink>
      </div>
      <div class="operations-board">
        <article class="reference-panel board-trend">
          <header><h2><AdminIcon name="sales"/>매출 추이</h2><div class="sales-period" role="group" aria-label="차트 집계 단위"><button v-for="[value,label] in [['day','일간'],['week','주간'],['month','월간']]" :key="value" :aria-pressed="graphUnit === value" @click="graphUnit = value">{{ label }}</button></div></header>
          <AdminChart type="line" :labels="dashboardTrend.map(row => row[0])" :values="dashboardTrend.map(row => row[1])" label="순매출 (원)"/>
        </article>
        <article class="reference-panel board-faq"><header><h2><AdminIcon name="inquiries"/>FAQ</h2><RouterLink to="/admin/inquiries">문의 관리 ›</RouterLink></header>
          <details v-for="[question,answer] in adminFaq" :key="question"><summary>{{ question }}</summary><p>{{ answer }}</p></details>
        </article>
        <article class="reference-panel board-products">
          <header><h2><AdminIcon name="products"/>상품 관리</h2><div><RouterLink to="/admin/products">전체보기 ›</RouterLink><RouterLink class="board-add" to="/admin/products?create=1">+ 상품 등록</RouterLink></div></header>
          <label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearch.products" type="search" aria-label="대시보드 상품 검색" placeholder="상품명 · 카테고리 · ID"></label>
          <div class="board-table"><table><thead><tr><th>상품명</th><th>카테고리</th><th>재고</th><th>가격</th><th>상태</th><th>관리</th></tr></thead><tbody>
            <tr v-for="row in dashboardRows.products" :key="row.productId"><th scope="row"><RouterLink :to="{path:'/admin/products',query:{q:row.productId}}"><img v-if="row.image" :src="row.image" alt="">{{ row.name }}</RouterLink></th><td>{{ row.category }}</td><td>{{ row.stock }}개</td><td>{{ money(row.price) }}</td><td><span class="board-status" :data-status="row.stock === 0 ? '품절' : '판매중'">{{ row.selling === false ? '중지' : row.stock === 0 ? '품절' : '판매중' }}</span></td><td><RouterLink :to="{path:'/admin/products',query:{q:row.productId}}" :aria-label="row.name+' 수정'">수정</RouterLink></td></tr>
          <tr v-if="!dashboardRows.products.length"><td class="board-search-empty" colspan="6">{{ dashboardSearch.products.trim() ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-orders">
          <header><h2><AdminIcon name="orders"/>주문 관리</h2><RouterLink to="/admin/orders">전체보기 ›</RouterLink></header>
          <label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearch.orders" type="search" aria-label="대시보드 주문 검색" placeholder="주문번호 · 주문자 · 상품명"></label>
          <div class="board-table"><table><thead><tr><th>주문번호</th><th>주문자</th><th>주문금액</th><th>상태</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.orders" :key="row.orderId"><th scope="row"><RouterLink :to="{path:'/admin/orders',query:{q:row.orderId}}" :title="row.orderId">{{ row.orderId.slice(-12) }}</RouterLink></th><td>{{ row.delivery.recipient }}</td><td>{{ money(row.total) }}</td><td><span class="board-status" :data-status="row.status">{{ row.status }}</span></td><td><RouterLink :to="{path:'/admin/orders',query:{q:row.orderId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.orders.length"><td class="board-search-empty" colspan="5">{{ dashboardSearch.orders.trim() ? '검색 결과가 없습니다.' : '등록된 주문이 없습니다.' }}</td></tr></tbody></table></div>
          <p class="board-help">운송장과 배송 상태는 주문 관리에서 변경할 수 있습니다.</p>
        </article>
        <article class="reference-panel board-members"><header><h2><AdminIcon name="members"/>회원 관리</h2><RouterLink to="/admin/members">전체보기 ›</RouterLink></header>
          <label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearch.members" type="search" aria-label="대시보드 회원 검색" placeholder="이름 · 이메일 · 회원 ID"></label>
          <div class="board-table"><table><thead><tr><th>회원 ID</th><th>이름</th><th>권한</th><th>상태</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.members" :key="row.userId"><th scope="row">{{ row.username || row.userId }}</th><td>{{ row.name }}</td><td>{{ row.role }}</td><td><span class="board-status" :data-status="row.status || '정상'">{{ row.status || '정상' }}</span></td><td><RouterLink :to="{path:'/admin/members',query:{q:row.userId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.members.length"><td class="board-search-empty" colspan="5">{{ dashboardSearch.members.trim() ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-reviews"><header><h2><AdminIcon name="reviews"/>리뷰 관리</h2><RouterLink to="/admin/reviews">전체보기 ›</RouterLink></header>
          <label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearch.reviews" type="search" aria-label="대시보드 리뷰 검색" placeholder="상품명 · 작성자 · 리뷰 내용"></label>
          <div class="board-table"><table><thead><tr><th>상품명</th><th>별점</th><th>감정분석</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.reviews" :key="row.reviewId"><th scope="row">{{ productName(row.productId) }}</th><td class="board-stars"><span aria-hidden="true">★</span> {{ row.rating.toFixed(1) }}</td><td><span class="board-status" :data-status="row.sentiment">{{ row.sentiment }}</span></td><td><RouterLink :to="{path:'/admin/reviews',query:{q:row.reviewId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.reviews.length"><td class="board-search-empty" colspan="4">{{ dashboardSearch.reviews.trim() ? '검색 결과가 없습니다.' : '등록된 리뷰가 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-notices"><header><h2><AdminIcon name="notices"/>공지사항</h2><RouterLink to="/admin/notices">전체보기 ›</RouterLink></header>
          <ul><li v-for="row in data.notices.slice(0,5)" :key="row.noticeId"><RouterLink :to="{path:'/admin/notices',query:{q:row.noticeId}}"><strong>{{ row.title }}</strong><span>{{ row.body }}</span></RouterLink></li></ul><p v-if="!data.notices.length" class="muted">등록된 공지가 없습니다.</p>
          <RouterLink class="board-notice-add" to="/admin/notices">공지사항 관리 →</RouterLink>
        </article>
      </div>

    </section>

    <CustomerAnalysis v-else-if="page === 'customers'" :data="data"/>
    <section v-else-if="page === 'sentiment'" class="sentiment-report" aria-label="리뷰 분석 보고서">
      <div class="sentiment-overview">
        <header>
          <div><p class="eyebrow">REVIEW INSIGHTS</p><h2>고객 반응 요약</h2></div>
          <span class="sentiment-sample">공개 리뷰 {{ visibleReviews.length }}건 · Mock</span>
        </header>
        <div class="sentiment-metrics">
          <article v-for="(label,index) in sentiments" :key="label" :class="'sentiment-tone-'+index">
            <h3>{{ label }}</h3>
            <strong>{{ visibleReviews.length ? Math.round(sentimentCounts[index] / visibleReviews.length * 100) : 0 }}%</strong>
            <span>{{ sentimentCounts[index] }}건</span>
          </article>
        </div>
        <div v-if="visibleReviews.length" class="sentiment-distribution" aria-hidden="true">
          <span v-for="(count,index) in sentimentCounts" :key="index" :class="'sentiment-tone-'+index" :style="{flexGrow:count}"></span>
        </div>
        <p v-else class="sentiment-empty">분석할 공개 리뷰가 없습니다.</p>
      </div>

      <section class="sentiment-products" aria-labelledby="sentiment-products-title">
        <header><div><h2 id="sentiment-products-title">상품별 고객 반응</h2><p>공개 리뷰가 있는 상품 {{ groupedSentiment.length }}개</p></div><RouterLink to="/admin/reviews">리뷰 관리 →</RouterLink></header>
        <table v-if="groupedSentiment.length">
          <thead><tr><th scope="col">상품</th><th v-for="label in sentiments" :key="label" scope="col">{{ label }}</th></tr></thead>
          <tbody>
            <tr v-for="row in groupedSentiment" :key="row.id">
              <th scope="row">{{ row.name }}</th>
              <td v-for="(count,index) in row.counts" :key="index"><span :class="['sentiment-count','sentiment-tone-'+index]">{{ count }}건</span></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="sentiment-empty">상품별 분석 결과가 없습니다.</p>
      </section>
    </section>
    <template v-else>
      <div class="ops-toolbar">
        <label v-if="page === 'products'">카테고리
          <select v-model="categoryFilter">
            <option value="">전체 카테고리</option>
            <option v-for="category in data.categories" :key="category">{{ category }}</option>
          </select>
        </label>
        <label>목록 검색 <input v-model="search" type="search" placeholder="이름, 제목 또는 ID"></label>
        <span>{{ rows.length }}건</span>
        <button v-if="['products','notices'].includes(page)" class="button gold" :disabled="busy || readingImage" @click="select()">새 {{ page === 'products' ? '상품' : '공지' }} 등록</button>
      </div>
      <div class="ops-split ops-records">
        <div class="ops-panel ops-list">
          <StatePanel v-if="!rows.length" empty="표시할 항목이 없습니다."/>
          <div v-for="group in rowGroups" :key="group.label" class="ops-list-group">
            <h3 v-if="group.label">{{ group.label }} <small>{{ group.items.length }}개</small></h3>
            <button v-for="row in group.items" :key="row[keyField]" :class="{'ops-product-row':page === 'products'}" :aria-pressed="selected === row[keyField]" :disabled="busy || readingImage" @click="select(row)">
              <template v-if="page === 'products'">
                <img v-if="row.image" :src="row.image" alt="" loading="lazy">
                <span v-else class="ops-thumb-empty">이미지 없음</span>
              </template>
              <div><strong>{{ titleFor(row) }}</strong><span>{{ summary(row) }}</span></div>
            </button>
          </div>
        </div>
        <article class="ops-panel">
          <h2>{{ selected === 'new' ? '신규 등록' : detail ? titleFor(detail) : '항목 상세' }}</h2>
          <p v-if="!selected" class="muted">목록에서 항목을 선택해 주세요.</p>
          <form v-else-if="page === 'products'" class="stack" @submit.prevent="!readingImage && mutate(() => admin.saveProduct(actor(),form),selected === 'new')">
            <label>상품명<input v-model="form.name" required></label><label>브랜드<input v-model="form.brand" required></label>
            <label>카테고리<select v-model="form.category"><option v-for="category in data.categories" :key="category">{{ category }}</option></select></label>
            <label>가격 (원)<input v-model.number="form.price" type="number" min="1" required></label><label>재고 수량<input v-model.number="form.stock" type="number" min="0" required></label>
            <label>상세 스펙<input v-model="form.spec" required></label>
            <div class="ops-image-editor">
              <div class="ops-image-preview"><img v-if="form.image" :src="form.image" alt="상품 이미지 미리보기"><span v-else>등록된 이미지 없음</span></div>
              <label>대표 이미지 추가 또는 변경<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="busy || readingImage" @change="chooseImage"></label>
              <small>PNG, JPG, WebP · 최대 5MB</small>
              <button v-if="form.image" type="button" class="button" :disabled="busy || readingImage" @click="form.image = ''">대표 이미지 제거</button>
            </div>
            <label>상품 설명<textarea v-model="form.description" rows="3"></textarea></label>
            <label class="check"><input v-model="form.selling" type="checkbox"> 판매 중</label>
            <div class="actions"><button class="button gold" :disabled="busy || readingImage">저장</button><button v-if="detail" type="button" class="button" :disabled="busy" @click="remove">상품 삭제</button></div>
          </form>
          <template v-else-if="detail && ['orders','refunds'].includes(page)">
            <p>{{ summary(detail) }}</p><p>수령인 {{ detail.delivery?.recipient }} · {{ detail.delivery?.phone || '연락처 미등록' }}</p><p>{{ detail.delivery?.address }}</p>
            <ul><li v-for="item in detail.items" :key="item.productId">{{ item.name }} × {{ item.quantity }} · {{ money(item.price * item.quantity) }}</li></ul>
            <p>운송장 {{ detail.tracking || '미등록' }}</p>
            <RouterLink class="button gold" :to="'/admin/shipping/'+encodeURIComponent(detail.orderId)">배송 상세 보기 →</RouterLink>
            <form v-if="page === 'orders' && !pending(detail) && ['결제 완료','배송 준비','배송 중'].includes(detail.status)" class="stack" @submit.prevent="mutate(() => admin.advanceOrder(actor(),detail.orderId,form.tracking))">
              <label v-if="detail.status === '배송 준비'">운송장 번호<input v-model="form.tracking" required></label>
              <button class="button gold" :disabled="busy">{{ {'결제 완료':'배송 준비 처리','배송 준비':'발송 처리','배송 중':'배송 완료 처리'}[detail.status] }}</button>
            </form>
            <div v-if="page === 'refunds' && pending(detail)" class="actions"><button class="button gold" :disabled="busy" @click="mutate(() => admin.resolveOrder(actor(),detail.orderId,true))">요청 승인</button><button class="button" :disabled="busy" @click="mutate(() => admin.resolveOrder(actor(),detail.orderId,false))">요청 거절</button></div>
            <button v-if="page === 'refunds' && detail.status === '환불 대기'" class="button gold" :disabled="busy" @click="mutate(() => admin.refund(actor(),detail.orderId))">Mock 환불 완료 처리</button>
            <p v-if="detail.refundedAt">환불 완료일 {{ dateLabel(detail.refundedAt) }}</p>
          </template>
          <template v-else-if="detail && page === 'members'">
            <p>{{ detail.email }} · {{ detail.role }}</p><p>회원 ID {{ detail.userId }}</p>
            <form v-if="detail.role !== 'ADMIN'" class="stack" @submit.prevent="mutate(() => admin.memberStatus(actor(),detail.userId,form.status))">
              <label>계정 상태<select v-model="form.status"><option>정상</option><option>정지</option><option>비활성</option></select></label><button class="button gold" :disabled="busy">저장</button>
            </form>
          </template>
          <template v-else-if="detail && page === 'reviews'"><p>{{ summary(detail) }}</p><p class="ops-body">{{ detail.body }}</p><button class="button" :disabled="busy" @click="mutate(() => admin.reviewVisibility(actor(),detail.reviewId,!detail.hidden))">{{ detail.hidden ? '다시 공개' : '리뷰 숨기기' }}</button></template>
          <template v-else-if="detail && page === 'inquiries'"><p class="ops-body">{{ detail.body }}</p><form class="stack" @submit.prevent="mutate(() => admin.answer(actor(),detail.inquiryId,form.answer))"><label>관리자 답변<textarea v-model="form.answer" rows="5" required></textarea></label><button class="button gold" :disabled="busy">답변 저장</button></form></template>
          <form v-else-if="page === 'notices' && selected" class="stack" @submit.prevent="mutate(() => admin.saveNotice(actor(),form),selected === 'new')"><label>제목<input v-model="form.title" required></label><label>내용<textarea v-model="form.body" rows="6" required></textarea></label><div class="actions"><button class="button gold" :disabled="busy">저장</button><button v-if="detail" class="button" type="button" :disabled="busy" @click="remove">공지 삭제</button></div></form>
          <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
        </article>
      </div>
    </template>
  </template>
</template>
