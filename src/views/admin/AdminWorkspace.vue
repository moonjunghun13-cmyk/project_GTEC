<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { admin } from '../../services'
import { adminFaq } from '../../services/adminFaq'
import { useShop } from '../../stores/shop'
import { money,dateLabel } from '../../utils'
import AdminIcon from '../../components/admin/AdminIcon.vue'
import AdminChart from '../../components/admin/AdminChart.vue'
import StatePanel from '../../components/StatePanel.vue'
import CustomerAnalysis from './CustomerAnalysis.vue'
import RecommendationModelPanel from '../../components/admin/RecommendationModelPanel.vue'
import { backendActions } from '../../services/backendActions'
import LiveSentimentReport from './LiveSentimentReport.vue'
import { readReviewSentiment, sentimentApiConfigured } from '../../services/reviewSentiment'
import './workspace.css'
import './dashboard-reference.css'
import './operations-board.css'
import './admin-common.css'
import './admin-readable.css'
import ProductImagesEditor from '../../components/admin/ProductImagesEditor.vue'
import { filterAdminRows } from '../../services/adminRecords'
import { productStatusLabel, imageUrlsFor } from '../../services/adminProducts'

const store = useShop()
const route = useRoute()
const router = useRouter()
const apiMode = (import.meta.env.VITE_AUTH_MODE || 'api') === 'api'
function openDashboardCard(event, path) {
  if (event.type === 'keydown' && event.target !== event.currentTarget) return
  if (event.target.closest('a,button,input,select,textarea')) return
  router.push(path)
}
const dashboardSearch = reactive({products:'',orders:'',members:'',reviews:''})
const dashboardSearchDraft = reactive({products:'',orders:'',members:'',reviews:''})
function confirmDashboardSearch(section){dashboardSearch[section]=dashboardSearchDraft[section].trim()}
function clearDashboardSearch(section){if(!dashboardSearchDraft[section].trim())dashboardSearch[section]=''}
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
    return [section,filtered]
  }))
})
const data = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const loadError = ref('')
const notice = ref('')
const search = ref('')
const searchDraft=ref('')
function applySearch(){search.value=searchDraft.value.trim();selected.value=''}
watch(searchDraft,value=>{if(!value.trim())search.value=''})
const categoryFilter = ref('')
const orderStatusFilter=ref('')
const productStatusFilter=ref('')
const recordSort=ref('newest')
const reviewSentimentFilter=ref('')
const analysisRevision=ref(0)
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
// Shared with the FAQ management page; the dashboard layout stays unchanged.
const form = reactive({})
const shippingPath = '/admin/shipping'
const isShipping = computed(() => route.path === shippingPath || route.path === shippingPath + '/')
const page = computed(() => {
  if (isShipping.value && route.query.tab === 'refunds') return 'refunds'
  return route.meta.section || 'dashboard'
})
const pageIcons = {products:'products',orders:'orders',refunds:'refunds',members:'members',reviews:'reviews',inquiries:'inquiries',notices:'notices',customers:'customers',sentiment:'sentiment'}
const workspacePages = {
  products:['상품 목록','상품명, 모델명 또는 ID'],
  orders:['주문 목록','주문번호 또는 배송 상태'],
  shipping:['배송 목록','주문번호 또는 운송장 번호'],
  refunds:['취소·반품·환불 목록','주문번호 또는 요청 상태'],
  members:['회원 목록','이름, 이메일 또는 회원 ID'],
  reviews:['리뷰 목록','작성자, 리뷰 내용 또는 ID'],
  inquiries:['문의 목록','제목, 작성자 또는 문의 내용'],
  notices:['공지 목록','제목 또는 공지 내용'],
}
const recordPage = computed(() => workspacePages[isShipping.value && page.value === 'orders' ? 'shipping' : page.value])
const pageIcon = computed(() => isShipping.value && page.value === 'orders' ? 'truck' : pageIcons[page.value])
const detailPanel = ref(null)
const listPanel=ref(null)
const productListScroll=ref(0)
async function returnToProductList(){
  if(busy.value || readingImage.value)return
  selected.value='';error.value=''
  await nextTick()
  listPanel.value?.scrollTo({top:productListScroll.value})
  listPanel.value?.focus({preventScroll:true})
}
const detailHeading = ref(null)
function markRefunded(id){if(!window.confirm('이 기능은 결제 취소를 실행하지 않고 반품을 환불 완료 상태로 기록합니다. 실제 환불이 완료된 경우에만 진행하세요.'))return;mutate(()=>backendActions.markReturnRefunded(id))}
const actor = () => store.user?.userId
const pending = row => apiMode && page.value === 'refunds'
  ? row.returnStatus === 'REQUESTED'
  : ['취소 요청','반품 요청'].includes(row.request)
const lowStock = computed(() => data.value.products.filter(row => row.stock < 10 && row.selling !== false))
const day = value => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(value))
const today = () => day(new Date())
const paidToday = computed(() => data.value.orders.filter(row => day(row.date) === today()))
const sum = rows => rows.filter(row => ['PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'].includes(row.backendStatus)).reduce((total,row) => total + row.total,0)
const revenueToday = computed(() => sum(paidToday.value) - sum(data.value.orders.filter(row => row.refundedAt && day(row.refundedAt) === today())))
const visibleReviews = computed(() => data.value.reviews.filter(row => !row.hidden))
const sentiments = [{ label:'긍정', tone:'sentiment-tone-0' }, { label:'부정', tone:'sentiment-tone-2' }]
const sentimentSort = ref('total')
const percentFormat = new Intl.NumberFormat('ko-KR',{ style:'percent', maximumFractionDigits:1 })
const sentimentCounts = computed(() => sentiments.map(({label}) => visibleReviews.value.filter(row => row.sentiment === label).length))
const analyzedReviewCount = computed(() => sentimentCounts.value.reduce((total,count) => total + count,0))
const groupedSentiment = computed(() => {
  const groups = new Map()
  for (const row of visibleReviews.value) {
    const index = sentiments.findIndex(({label}) => label === row.sentiment)
    if (index < 0) continue
    const counts = groups.get(row.productId) ?? [0,0]
    counts[index]++
    groups.set(row.productId,counts)
  }
  return [...groups].map(([id,counts]) => ({id,name:productName(id),counts,total:counts[0]+counts[1]}))
    .sort((a,b) => {
      const index = sentimentSort.value === 'positive' ? 0 : sentimentSort.value === 'negative' ? 1 : -1
      const difference = index < 0 ? 0 : b.counts[index] * a.total - a.counts[index] * b.total
      return difference || b.total - a.total || a.name.localeCompare(b.name,'ko')
    })
})
const trend = computed(() => {
  const grouped = {}
  const key = date => day(date).slice(0,period.value === 'month' ? 7 : 10)
  for (const row of data.value.orders.filter(row => ['PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'].includes(row.backendStatus))) {
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
  for (const order of data.value.orders.filter(row => ['PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'].includes(row.backendStatus))) {
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
  for (const order of data.value.orders.filter(row => ['PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'].includes(row.backendStatus))) {
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
  if (page.value === 'refunds') return apiMode
    ? (data.value.returns ?? [])
    : data.value.orders.filter(row => row.request || row.refundedAt || ['환불 대기','환불 완료'].includes(row.status))
  return data.value[page.value] ?? []
})
const rows = computed(() => filterAdminRows(sourceRows.value,{page:page.value,search:search.value,
  category:categoryFilter.value,status:page.value==='products' ? productStatusFilter.value : orderStatusFilter.value,
  sort:recordSort.value,sentiment:reviewSentimentFilter.value}))
const rowGroups = computed(() => {
  if (page.value !== 'products' || recordSort.value!=='category') return [{label:'',items:rows.value}]
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
const keyField = computed(() => page.value === 'refunds' && apiMode ? 'returnId'
  : ({products:'productId',orders:'orderId',refunds:'orderId',members:'userId',reviews:'reviewId',inquiries:'inquiryId',notices:'noticeId'})[page.value])
const detail = computed(() => sourceRows.value.find(row => row[keyField.value] === selected.value))
const detailSentimentScore = computed(() => page.value === 'reviews' && detail.value ? readReviewSentiment(detail.value).score : null)
const titleFor = row => row.name ?? row.title ?? row.orderId ?? row.author
function productName(id) { return data.value.products.find(row => row.productId === id)?.name ?? id }
function recordStatus(row) {
  if (page.value === 'products') return productStatusLabel(row)
  if (page.value === 'refunds' && apiMode) return ({REQUESTED:'반품 요청',APPROVED:'반품 승인',REJECTED:'반품 거절',REFUNDED:'처리 완료'})[row.returnStatus] ?? row.returnStatus
  if (page.value === 'orders' || page.value === 'refunds') return row.request || row.status
  if (page.value === 'reviews') return row.hidden ? '숨김' : readReviewSentiment(row).label
  if (page.value === 'inquiries') return row.answer ? '답변 완료' : '미답변'
  if (page.value === 'members') return row.status || '정상'
  return ''
}
function recordSummary(row) {
  if (page.value === 'reviews') return productName(row.productId)
  if (page.value === 'products') return row.category+' · '+money(row.price)+' · 재고 '+row.stock+'개'
  if (page.value === 'inquiries') return row.author
  if (page.value === 'members') return row.email
  if (page.value === 'orders' || page.value === 'refunds') return dateLabel(row.date)+' · '+(row.delivery?.recipient || '수령인 미등록')+' · '+money(row.total)
  return row.date ? dateLabel(row.date) : ''
}
async function openRecord(row) {
  if(page.value==='products')productListScroll.value=listPanel.value?.scrollTop ?? 0
  select(row)
  await nextTick()
  detailPanel.value?.scrollTo({top:0})
  if (window.matchMedia('(max-width:1000px)').matches) detailHeading.value?.focus()
}
async function load() {
  loading.value = true
  loadError.value = ''
  try { data.value = await admin.snapshot(actor()); if (page.value === 'products' && route.query.create) select() }
  catch (e) { loadError.value = e.message }
  finally { loading.value = false }
}
watch(() => [page.value,route.query.q], () => { search.value = String(route.query.q || ''); searchDraft.value=search.value; categoryFilter.value = ''; orderStatusFilter.value='';productStatusFilter.value='';recordSort.value='newest';reviewSentimentFilter.value=''; selected.value = ''; error.value = ''; notice.value = ''; period.value = 'day' },{immediate:true})
load()
function select(row) {
  error.value = ''
  notice.value = ''
  selected.value = row?.[keyField.value] ?? 'new'
  for (const key of Object.keys(form)) delete form[key]
  if (page.value === 'products') Object.assign(form,{name:'',category:data.value.categories[0],brand:'',price:0,stock:0,spec:'',image:'',description:'',...row,imageUrls:imageUrlsFor(row ?? {}),selling:row?.selling !== false})
  if (page.value === 'notices') Object.assign(form,{title:'',body:'',...row})
  if (page.value === 'orders') form.tracking = row.tracking ?? ''
  if (page.value === 'refunds' && apiMode) form.refundAmount = row.refundAmount || row.items?.[0]?.price * row.items?.[0]?.quantity || row.total || 0
  if (page.value === 'members') { form.status = row.status ?? '정상'; form.role=row.role }
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
    notice.value = '변경사항을 저장했습니다.'
    try {
      data.value = await admin.snapshot(actor())
      if(page.value==='products') {
        const current=data.value.products.find(row=>row.productId===form.productId)
        if(current)Object.assign(form,JSON.parse(JSON.stringify(current)))
        const catalog=await import('../../services').then(({shop})=>shop.catalog())
        store.products=catalog.products
      }
      analysisRevision.value++
      if(selected.value && selected.value!=='new' && !rows.value.some(row=>row[keyField.value]===selected.value))selected.value=''
    }catch(e){error.value='저장은 완료됐지만 목록 새로고침에 실패했습니다. '+e.message}
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function remove() {
  if (!window.confirm('선택한 항목을 삭제할까요?')) return
  mutate(() => admin.removeNotice(actor(),detail.value.noticeId),true)
}
function toggleSelling() {
  const product=detail.value
  const selling=product.selling===false
  if(!window.confirm(selling ? '이 상품의 판매를 재개할까요?' : '이 상품의 판매를 중지할까요? 상품 정보는 유지됩니다.'))return
  mutate(()=>admin.setProductSelling(actor(),product.productId,selling))
}
async function refreshReviews(){
  try{data.value=await admin.snapshot(actor())}catch(e){error.value=e.message}
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
  <header v-else class="ops-page-title admin-page-heading">
    <span class="admin-page-symbol"><AdminIcon :name="pageIcon"/></span>
    <h1>{{ route.meta.title }}</h1>
  </header>
  <nav v-if="isShipping" class="shipping-management-tabs" aria-label="배송 관리 메뉴">
    <RouterLink :to="shippingPath" :aria-current="page === 'orders' ? 'page' : undefined"><AdminIcon name="shipping"/>배송 목록</RouterLink>
    <RouterLink :to="{path:shippingPath,query:{tab:'refunds'}}" :aria-current="page === 'refunds' ? 'page' : undefined"><AdminIcon name="refunds"/>취소 · 반품 · 환불</RouterLink>
  </nav>
  <LiveSentimentReport v-if="page === 'sentiment' && sentimentApiConfigured"/>
  <StatePanel v-else-if="loading || loadError" :busy="loading" :error="loadError" @retry="load"/>
  <template v-else-if="data">
    <p v-if="error" class="error admin-feedback" role="alert">{{ error }}</p>
    <p v-if="notice" class="admin-feedback" role="status">{{ notice }}</p>
    <section v-if="page === 'dashboard'" class="ops-dashboard reference-dashboard" aria-label="운영 현황">
      <RecommendationModelPanel/>
      <div class="reference-kpis">
        <article class="reference-kpi-gold dashboard-link-card" role="link" tabindex="0" aria-label="고객분석으로 이동" @click="openDashboardCard($event,'/admin/customers')" @keydown.enter="openDashboardCard($event,'/admin/customers')"><AdminIcon name="coin"/><div><span>총 순매출액</span><strong>{{ money(rangeRevenue) }}</strong><small>{{ rangeLabel }} · 환불 반영</small></div></article>
        <RouterLink to="/admin/orders"><AdminIcon name="orders"/><div><span>신규 주문</span><strong>{{ rangeOrders.length }}건</strong><small>{{ rangeLabel }} 주문</small></div></RouterLink>
        <RouterLink to="/admin/shipping"><AdminIcon name="truck"/><div><span>배송 대기</span><strong>{{ data.orders.filter(row => ['결제 완료','배송 준비'].includes(row.status) && !pending(row)).length }}건</strong><small>현재 처리 대기</small></div></RouterLink>
        <RouterLink to="/admin/members"><AdminIcon name="members"/><div><span>신규 가입 회원</span><strong>{{ data.members.filter(row => row.role === 'USER' && row.createdAt && day(row.createdAt) >= rangeStart).length }}명</strong><small>{{ rangeLabel }} 가입</small></div></RouterLink>
      </div>
      <div class="operations-board">
        <article class="reference-panel board-trend">
          <header><h2><AdminIcon name="sales"/>매출 추이</h2><div class="sales-period" role="group" aria-label="차트 집계 단위"><button v-for="[value,label] in [['day','일간'],['week','주간'],['month','월간']]" :key="value" :aria-pressed="graphUnit === value" @click="graphUnit = value">{{ label }}</button></div></header>
          <AdminChart type="line" :labels="dashboardTrend.map(row => row[0])" :values="dashboardTrend.map(row => row[1])" label="순매출 (원)"/>
        </article>
        <article class="reference-panel board-faq"><header><h2><AdminIcon name="inquiries"/>FAQ</h2><RouterLink to="/admin/faqs">FAQ 조회 ›</RouterLink></header>
          <details v-for="[question,answer] in adminFaq" :key="question"><summary>{{ question }}</summary><p>{{ answer }}</p></details>
        </article>
        <article class="reference-panel board-products">
          <header><h2><AdminIcon name="products"/>상품 관리</h2><div><RouterLink to="/admin/products">전체보기 ›</RouterLink><RouterLink class="board-add" to="/admin/products?create=1">+ 상품 등록</RouterLink></div></header>
          <form class="board-search-form" role="search" @submit.prevent="confirmDashboardSearch('products')"><label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearchDraft.products" type="search" @input="clearDashboardSearch('products')" aria-label="대시보드 상품 검색" placeholder="상품명 · 카테고리 · ID"></label><button type="submit" class="board-search-confirm">확인</button></form>
          <div class="board-table" tabindex="0" role="region" aria-label="상품 목록"><table><thead><tr><th>상품명</th><th>카테고리</th><th>재고</th><th>가격</th><th>상태</th><th>관리</th></tr></thead><tbody>
            <tr v-for="row in dashboardRows.products" :key="row.productId"><th scope="row"><RouterLink :to="{path:'/admin/products',query:{q:row.productId}}"><img v-if="row.image" :src="row.image" loading="lazy" alt="">{{ row.name }}</RouterLink></th><td>{{ row.category }}</td><td>{{ row.stock }}개</td><td>{{ money(row.price) }}</td><td><span class="board-status" :data-status="row.stock === 0 ? '품절' : '판매중'">{{ row.selling === false ? '중지' : row.stock === 0 ? '품절' : '판매중' }}</span></td><td><RouterLink :to="{path:'/admin/products',query:{q:row.productId}}" :aria-label="row.name+' 수정'">수정</RouterLink></td></tr>
          <tr v-if="!dashboardRows.products.length"><td class="board-search-empty" colspan="6">{{ dashboardSearch.products.trim() ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-orders">
          <header><h2><AdminIcon name="orders"/>주문 관리</h2><RouterLink to="/admin/orders">전체보기 ›</RouterLink></header>
          <form class="board-search-form" role="search" @submit.prevent="confirmDashboardSearch('orders')"><label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearchDraft.orders" type="search" @input="clearDashboardSearch('orders')" aria-label="대시보드 주문 검색" placeholder="주문번호 · 주문자 · 상품명"></label><button type="submit" class="board-search-confirm">확인</button></form>
          <div class="board-table" tabindex="0" role="region" aria-label="주문 목록"><table><thead><tr><th>주문번호</th><th>주문자</th><th>주문금액</th><th>상태</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.orders" :key="row.orderId"><th scope="row"><RouterLink :to="{path:'/admin/orders',query:{q:row.orderId}}" :title="row.orderId">{{ row.orderId.slice(-12) }}</RouterLink></th><td>{{ row.delivery.recipient }}</td><td>{{ money(row.total) }}</td><td><span class="board-status" :data-status="row.status">{{ row.status }}</span></td><td><RouterLink :to="{path:'/admin/orders',query:{q:row.orderId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.orders.length"><td class="board-search-empty" colspan="5">{{ dashboardSearch.orders.trim() ? '검색 결과가 없습니다.' : '등록된 주문이 없습니다.' }}</td></tr></tbody></table></div>
          <p class="board-help">운송장과 배송 상태는 배송 관리에서 변경할 수 있습니다.</p>
        </article>
        <article class="reference-panel board-members"><header><h2><AdminIcon name="members"/>회원 관리</h2><RouterLink to="/admin/members">전체보기 ›</RouterLink></header>
          <form class="board-search-form" role="search" @submit.prevent="confirmDashboardSearch('members')"><label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearchDraft.members" type="search" @input="clearDashboardSearch('members')" aria-label="대시보드 회원 검색" placeholder="이름 · 이메일 · 회원 ID"></label><button type="submit" class="board-search-confirm">확인</button></form>
          <div class="board-table" tabindex="0" role="region" aria-label="회원 목록"><table><thead><tr><th>회원 ID</th><th>이름</th><th>권한</th><th>상태</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.members" :key="row.userId"><th scope="row">{{ row.username || row.userId }}</th><td>{{ row.name }}</td><td>{{ row.role }}</td><td><span class="board-status" :data-status="row.status || '정상'">{{ row.status || '정상' }}</span></td><td><RouterLink :to="{path:'/admin/members',query:{q:row.userId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.members.length"><td class="board-search-empty" colspan="5">{{ dashboardSearch.members.trim() ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-reviews"><header><h2><AdminIcon name="reviews"/>리뷰 관리</h2><RouterLink to="/admin/reviews">전체보기 ›</RouterLink></header>
          <form class="board-search-form" role="search" @submit.prevent="confirmDashboardSearch('reviews')"><label class="board-search"><AdminIcon name="search"/><input v-model="dashboardSearchDraft.reviews" type="search" @input="clearDashboardSearch('reviews')" aria-label="대시보드 리뷰 검색" placeholder="상품명 · 작성자 · 리뷰 내용"></label><button type="submit" class="board-search-confirm">확인</button></form>
          <div class="board-table" tabindex="0" role="region" aria-label="리뷰 목록"><table><thead><tr><th>상품명</th><th>감정분석</th><th>관리</th></tr></thead><tbody><tr v-for="row in dashboardRows.reviews" :key="row.reviewId"><th scope="row">{{ productName(row.productId) }}</th><td><span v-if="readReviewSentiment(row).label" class="board-status" :data-status="readReviewSentiment(row).label">{{ readReviewSentiment(row).label }}</span></td><td><RouterLink :to="{path:'/admin/reviews',query:{q:row.reviewId}}">상세</RouterLink></td></tr><tr v-if="!dashboardRows.reviews.length"><td class="board-search-empty" colspan="3">{{ dashboardSearch.reviews.trim() ? '검색 결과가 없습니다.' : '등록된 리뷰가 없습니다.' }}</td></tr></tbody></table></div>
        </article>
        <article class="reference-panel board-notices"><header><h2><AdminIcon name="notices"/>공지사항</h2><RouterLink to="/admin/notices">전체보기 ›</RouterLink></header>
          <ul><li v-for="row in data.notices.slice(0,5)" :key="row.noticeId"><RouterLink :to="{path:'/admin/notices',query:{q:row.noticeId}}"><strong>{{ row.title }}</strong><span>{{ row.body }}</span></RouterLink></li></ul><p v-if="!data.notices.length" class="muted">등록된 공지가 없습니다.</p>
          <RouterLink class="board-notice-add" to="/admin/notices">공지사항 관리 →</RouterLink>
        </article>
      </div>

    </section>

    <CustomerAnalysis v-else-if="page === 'customers'" :data="data"/>
    <LiveSentimentReport v-else-if="page === 'sentiment'"/>
    <template v-else>
      <LiveSentimentReport v-if="page==='reviews' && apiMode" :key="analysisRevision" @analyzed="refreshReviews"/>
      <div class="ops-toolbar" :class="'toolbar-'+page"><label v-if="page === 'orders'">주문 상태<select v-model="orderStatusFilter" aria-label="주문 상태 필터"><option value="">전체</option><option v-for="[value,label] in [['PENDING','결제 대기'],['PAID','결제 완료'],['PREPARING','배송 준비'],['SHIPPED','배송 중'],['DELIVERED','배송 완료'],['COMPLETED','구매 확정'],['CANCELLED','취소 완료'],['REFUNDED','환불 완료']]" :key="value" :value="value">{{ label }}</option></select></label>
        <label v-if="page === 'products'">카테고리
          <select v-model="categoryFilter" aria-label="카테고리 필터">
            <option value="">전체 카테고리</option>
            <option v-for="category in data.categories" :key="category">{{ category }}</option>
          </select>
        </label>
        <label v-if="page==='products'">판매 상태<select v-model="productStatusFilter" aria-label="판매 상태 필터"><option value="">전체 상태</option><option value="ACTIVE">판매중</option><option value="SOLD_OUT">품절</option><option value="INACTIVE">판매 중지</option></select></label>
        <label v-if="page==='reviews'">감정분석<select v-model="reviewSentimentFilter" aria-label="감정 필터"><option value="">전체 감정</option><option>긍정</option><option>부정</option></select></label>
        <label v-if="['products','orders','reviews'].includes(page)">정렬<select v-model="recordSort" aria-label="목록 정렬"><option value="newest">최신순</option><option value="oldest">오래된순</option><template v-if="page==='products'"><option value="category">카테고리순</option><option value="name">상품명순</option><option value="price-low">가격 낮은순</option><option value="price-high">가격 높은순</option></template><option v-if="page!=='reviews'" value="status">상태순</option></select></label>
        <form class="ops-search-form" role="search" @submit.prevent="applySearch">
          <label class="ops-search-label">목록 검색<span class="ops-search-input"><AdminIcon name="search"/><input v-model="searchDraft" type="search" :placeholder="recordPage[1]"></span></label>
          <button type="submit" class="button">검색</button>
        </form>
        <button v-if="['products','notices'].includes(page)" class="button gold" :disabled="busy || readingImage" @click="openRecord()">새 {{ page === 'products' ? '상품' : '공지' }} 등록</button>
      </div>
      <div class="ops-split ops-records" :class="{'product-gallery-mode':page==='products','showing-product-detail':page==='products' && selected}">
        <section v-show="page!=='products' || !selected" class="ops-record-list" aria-labelledby="admin-records-title">
          <header class="ops-records-heading"><h2 id="admin-records-title">{{ recordPage[0] }}</h2><span>{{ rows.length.toLocaleString('ko-KR') }}건</span></header>
          <div ref="listPanel" class="ops-panel ops-list" tabindex="0" role="region" :aria-label="recordPage[0] + ' 스크롤'">
            <StatePanel v-if="!rows.length" empty="표시할 항목이 없습니다."/>
            <div v-for="group in rowGroups" :key="group.label" class="ops-list-group" :class="{'is-product-grid':page==='products'}">
              <h3 v-if="group.label">{{ group.label }} <small>{{ group.items.length }}개</small></h3>
              <button v-for="row in group.items" :key="row[keyField]" :class="{'ops-product-row':page === 'products'}" :aria-pressed="selected === row[keyField]" :disabled="busy || readingImage" @click="openRecord(row)">
                <template v-if="page === 'products'">
                  <img v-if="row.image" :src="row.image" alt="" loading="lazy">
                  <span v-else class="ops-thumb-empty">이미지 없음</span>
                </template>
                <div class="ops-row-copy"><strong>{{ titleFor(row) }}</strong><template v-if="page==='products'"><span class="product-card-category">{{ row.category }}</span><span class="product-card-price">{{ money(row.price) }}</span><span class="product-card-stock">재고 {{ row.stock }}개</span></template><span v-else>{{ recordSummary(row) }}</span></div>
                <span v-if="recordStatus(row)" class="ops-status" :data-status="recordStatus(row)">{{ recordStatus(row) }}</span>
                <AdminIcon v-else name="arrow" class="ops-row-arrow"/>
              </button>
            </div>
          </div>
        </section>
        <article v-show="page!=='products' || selected" ref="detailPanel" class="ops-panel ops-record-detail" aria-labelledby="admin-record-title">
          <header v-if="page==='products' && selected" class="product-editor-heading"><div><span>{{ selected==='new' ? '상품 등록' : '상품 상세 편집' }}</span><h2 id="admin-record-title" ref="detailHeading" tabindex="-1">{{ selected==='new' ? '새 상품 등록' : detail ? titleFor(detail) : '상품 상세' }}</h2></div><button type="button" class="button" :disabled="busy || readingImage" @click="returnToProductList">← 상품 목록으로</button></header>
          <h2 v-else id="admin-record-title" ref="detailHeading" tabindex="-1">{{ selected === 'new' ? '신규 등록' : detail ? titleFor(detail) : '항목 상세' }}</h2>
          <div v-if="!selected" class="ops-detail-empty"><AdminIcon :name="pageIcon"/><p>목록에서 항목을 선택해 주세요.</p></div>
          <form v-else-if="page === 'products'" class="stack ops-product-form" @submit.prevent="!readingImage && mutate(() => admin.saveProduct(actor(),form),selected === 'new')">
            <div class="product-edit-fields">
              <label class="product-name-field">상품명<input v-model="form.name" required></label><label v-if="!apiMode">브랜드<input v-model="form.brand" required></label>
              <label class="product-category-field">카테고리<select v-model="form.category"><option v-for="category in data.categories" :key="category">{{ category }}</option></select></label>
              <label>가격 (원)<input v-model.number="form.price" type="number" min="0" required></label><label>재고 수량<input v-model.number="form.stock" type="number" min="0" required></label>
              <label class="product-spec-field">상세 스펙<textarea v-model="form.spec" rows="3" required></textarea></label>
              <label class="product-description-field">상품 설명<textarea v-model="form.description" rows="4" :required="apiMode"></textarea></label>
              <label class="check"><input v-model="form.selling" type="checkbox"> 판매 중</label>
            </div>
            <ProductImagesEditor :key="selected" :model="form" :disabled="busy" @busy="readingImage=$event"/>
            <details v-if="detail?.details" class="product-detail-preview"><summary>기존 상세 스펙과 안내 확인</summary><dl><template v-for="[label,value] in detail.details.specifications" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></template></dl><p>{{ detail.details.description }}</p></details>
            <div class="actions product-editor-actions"><button class="button gold" :disabled="busy || readingImage">저장</button><button v-if="detail" type="button" class="button" :class="{'product-stop-selling':detail.selling!==false}" :disabled="busy" @click="toggleSelling">{{ detail.selling===false ? '판매 재개' : '판매 중지' }}</button></div>
          </form>
          <template v-else-if="detail && ['orders','refunds'].includes(page)">
            <dl class="ops-detail-facts">
              <div><dt>주문 상태</dt><dd><span class="ops-status" :data-status="recordStatus(detail)">{{ recordStatus(detail) }}</span></dd></div>
              <div><dt>주문 금액</dt><dd><strong>{{ money(detail.total) }}</strong></dd></div>
              <div><dt>수령인</dt><dd>{{ detail.delivery?.recipient }} · {{ detail.delivery?.phone || '연락처 미등록' }}</dd></div>
              <div><dt>운송장</dt><dd>{{ detail.tracking || '미등록' }}</dd></div>
              <div class="ops-fact-wide"><dt>배송지</dt><dd>{{ detail.delivery?.address || '미등록' }}</dd></div>
            </dl>
            <h3 class="ops-detail-subtitle">주문 상품</h3>
            <ul class="ops-order-items"><li v-for="item in detail.items" :key="item.productId"><span>{{ item.name }} × {{ item.quantity }}</span><strong>{{ money(item.price * item.quantity) }}</strong></li></ul>
            <template v-if="page === 'refunds' && apiMode">
              <p v-if="detail.returnReason">반품 사유 · {{ detail.returnReason }}</p>
              <p v-if="detail.requestedAt">요청일 · {{ dateLabel(detail.requestedAt) }}</p>
              <form v-if="pending(detail)" class="stack" @submit.prevent="mutate(() => admin.resolveReturn(actor(),detail.returnId,true,form.refundAmount))">
                <label>승인할 환불 금액 (원)<input v-model.number="form.refundAmount" type="number" min="1" :max="detail.total" required></label>
                <div class="actions"><button class="button gold" :disabled="busy">반품 승인</button><button type="button" class="button" :disabled="busy" @click="mutate(() => admin.resolveReturn(actor(),detail.returnId,false,0))">요청 거절</button></div>
              </form>
              <button v-else-if="detail.returnStatus === 'APPROVED'" class="button" :disabled="busy" @click="markRefunded(detail.returnId)">환불 완료 상태 기록</button><p v-else>반품 요청 상태: {{ recordStatus(detail) }}. 승인 처리는 반품 상태 변경이며 실제 결제 취소는 별도 연결이 필요합니다.</p>
            </template>
            <RouterLink class="button gold" :to="'/admin/shipping/'+encodeURIComponent(detail.orderId)">배송 상세 보기 →</RouterLink>
            <form v-if="page === 'orders' && !pending(detail) && ['결제 완료','배송 준비','배송 중'].includes(detail.status)" class="stack" @submit.prevent="mutate(() => admin.advanceOrder(actor(),detail.orderId,form.tracking,detail.status))">
              <label v-if="detail.status === '배송 준비'">운송장 번호<input v-model="form.tracking" required></label>
              <button class="button gold" :disabled="busy">{{ {'결제 완료':'배송 준비 처리','배송 준비':'발송 처리','배송 중':'배송 완료 처리'}[detail.status] }}</button>
            </form>
            <div v-if="page === 'refunds' && !apiMode && pending(detail)" class="actions"><button class="button gold" :disabled="busy" @click="mutate(() => admin.resolveOrder(actor(),detail.orderId,true))">요청 승인</button><button class="button" :disabled="busy" @click="mutate(() => admin.resolveOrder(actor(),detail.orderId,false))">요청 거절</button></div>
            <button v-if="page === 'refunds' && !apiMode && detail.status === '환불 대기'" class="button gold" :disabled="busy" @click="mutate(() => admin.refund(actor(),detail.orderId))">Mock 환불 완료 처리</button>
            <p v-if="detail.refundedAt">환불 완료일 {{ dateLabel(detail.refundedAt) }}</p>
          </template>
          <template v-else-if="detail && page === 'members'">
            <dl class="ops-detail-facts">
              <div><dt>이메일</dt><dd>{{ detail.email }}</dd></div>
              <div><dt>회원 ID</dt><dd>{{ detail.userId }}</dd></div>
              <div><dt>권한</dt><dd>{{ detail.role === 'ADMIN' ? '관리자' : '일반 회원' }}</dd></div>
              <div><dt>계정 상태</dt><dd><span class="ops-status" :data-status="recordStatus(detail)">{{ recordStatus(detail) }}</span></dd></div>
            </dl>
            <form class="stack" @submit.prevent="mutate(() => backendActions.memberRole(detail.userId,form.role))"><label>회원 권한<select v-model="form.role"><option value="USER">일반 회원</option><option value="ADMIN">관리자</option></select></label><button class="button" :disabled="busy || detail.userId===store.user.userId">권한 저장</button><p v-if="detail.userId===store.user.userId" class="muted">현재 로그인한 계정의 권한은 이 화면에서 변경할 수 없습니다.</p></form>
            <form v-if="detail.role !== 'ADMIN'" class="stack" @submit.prevent="mutate(() => admin.memberStatus(actor(),detail.userId,form.status))">
              <label>계정 상태<select v-model="form.status"><option>정상</option><option v-if="!apiMode">정지</option><option>비활성</option><option v-if="apiMode">강퇴</option></select></label><button class="button gold" :disabled="busy">저장</button>
            </form>
          </template>
          <template v-else-if="detail && page === 'reviews'">
            <div class="ops-review-meta"><strong>{{ productName(detail.productId) }}</strong><span v-if="recordStatus(detail)" class="ops-status" :data-status="recordStatus(detail)">{{ recordStatus(detail) }}</span></div>
            <p v-if="detailSentimentScore !== null">분석 신뢰도 {{ (detailSentimentScore * 100).toFixed(1) }}%</p>
            <blockquote class="ops-body ops-review-body">{{ detail.body }}</blockquote><button class="button" :disabled="busy" @click="mutate(() => backendActions.analyzeReview(detail.reviewId))">이 리뷰 AI 분석</button>
            <button class="button" :disabled="busy" @click="mutate(() => admin.reviewVisibility(actor(),detail.reviewId,apiMode ? true : !detail.hidden))">{{ apiMode ? '리뷰 삭제' : detail.hidden ? '다시 공개' : '리뷰 숨기기' }}</button></template>
          <template v-else-if="detail && page === 'inquiries'"><p class="ops-body">{{ detail.body }}</p><form class="stack" @submit.prevent="mutate(() => admin.answer(actor(),detail.inquiryId,form.answer))"><label>관리자 답변<textarea v-model="form.answer" rows="5" required></textarea></label><button class="button gold" :disabled="busy">답변 저장</button></form></template>
          <form v-else-if="page === 'notices' && selected" class="stack" @submit.prevent="mutate(() => admin.saveNotice(actor(),form),selected === 'new')"><label>제목<input v-model="form.title" required></label><label>내용<textarea v-model="form.body" rows="6" required></textarea></label><div class="actions"><button class="button gold" :disabled="busy">저장</button><button v-if="detail" class="button" type="button" :disabled="busy" @click="remove">공지 삭제</button></div></form>

        </article>
      </div>
    </template>
  </template>
</template>
