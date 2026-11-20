import { socialProfiles } from '../mocks/socialAuth'
import { seed, categories } from '../mocks/catalog'
import { adminSeed } from '../mocks/admin'
import { productReviewExamples } from '../mocks/productReviews'
import { withProductDetails } from '../mocks/productDetails'
import { purposes, purposeTags } from '../mocks/purposes'
import { faqs } from '../mocks/support'
import { checkoutAddresses } from '../mocks/checkoutAddresses'
import { api, setAccessToken } from '../api'
import { startSocialLogin } from './socialNavigation'
import { presentProduct } from './catalogPresentation'
import { productPayload, imageUrlsFor } from './adminProducts'
import { canShop } from './memberAccess'
import { createAdminReader } from './adminPaging'
const adminReader = createAdminReader((...args) => api.get(...args))
const adminOrderCache = new Map()

const mode = import.meta.env.VITE_DATA_MODE || 'api'
const authMode = import.meta.env.VITE_AUTH_MODE || mode
const demo = adminSeed(seed.products)
const state = structuredClone({...seed,...demo,reviews:[...seed.reviews,...demo.reviews,...productReviewExamples(seed.products,demo.orders)].map(row => ({...row,sentimentSource:'mock'}))})
for (const user of state.users) user.createdAt = new Date().toISOString()
for (const order of state.orders) {
  for (const item of order.items) {
    find(state.products,'productId',item.productId).stock -= item.quantity
  }
}
const id = () => crypto.randomUUID()
const publicUser = ({ password, ...user }) => ({...user,hasPassword:Boolean(password)})

const categoryToApi = {
  '모니터':'MONITOR', CPU:'CPU', '메인보드':'MAINBOARD', '메모리':'RAM',
  '그래픽카드':'GPU', SSD:'SSD', HDD:'HDD', '파워':'POWER', '케이스':'CASE',
  '키보드':'KEYBOARD', '마우스':'MOUSE', '스피커':'SPEAKER',
}
const categoryFromApi = Object.fromEntries(Object.entries(categoryToApi).map(([label,key]) => [key,label]))
const orderStatusLabel = {
  PENDING:'결제 대기', PAID:'결제 완료', PREPARING:'배송 준비', SHIPPED:'배송 중',
  DELIVERED:'배송 완료', COMPLETED:'구매 확정', CANCELLED:'취소 완료', REFUNDED:'환불 완료',
}
const paymentMethodLabel = {
  CREDIT_CARD:'카드', BANK_TRANSFER:'계좌이체', VIRTUAL_ACCOUNT:'가상계좌',
  KAKAO_PAY:'카카오페이', NAVER_PAY:'네이버페이', TOSS:'토스페이먼츠',
}

export function toFrontendUser(member) {
  return {
    userId:String(member.id), username:member.loginId, name:member.name, email:member.email,
    phone:member.tel, role:member.role, status:member.status === 'ACTIVE' ? '정상' : member.status,
    createdAt:member.createdAt,hasPassword:!/^social_(kakao|naver|google)_/.test(member.loginId || ''),socialProvider:member.loginId?.match(/^social_(kakao|naver|google)_/)?.[1],
  }
}

async function fetchAllPages(path) {
  const rows = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const {data} = await api.get(path,{params:{page,size:100}})
    rows.push(...(data.content ?? []))
    totalPages = data.totalPages ?? 1
    page += 1
  }
  return rows
}

function mapOrder(row, productsById = new Map()) {
  return {
    orderId:String(row.orderId), orderNumber:row.orderNumber,backendStatus:row.status,shippingFee:row.shippingFee,paidAt:row.paidAt, status:orderStatusLabel[row.status] ?? row.status,
    date:row.paidAt ?? row.createdAt, total:row.totalAmount ?? 0,
    paymentMethod:paymentMethodLabel[row.paymentMethod] ?? row.paymentMethod,
    delivery:{recipient:row.shippingName ?? '',phone:row.shippingPhone ?? '',postcode:row.shippingZipcode ?? '',
      address:[row.shippingAddress1,row.shippingAddress2].filter(Boolean).join(' ')},
    items:(row.items ?? []).map(item => {
      const product = productsById.get(String(item.productId))
      return {orderItemId:String(item.orderItemId),productId:String(item.productId),name:product?.name ?? `상품 ${item.productId}`,
        category:product?.category ?? '',image:product?.image ?? item.thumbnailUrl ?? '',quantity:item.quantity,
        price:item.unitPrice ?? item.price ?? 0}
    }),
  }
}

export async function restoreSession() {
  if (authMode !== 'api') return null
  try {
    const {data:tokens} = await api.post('/api/members/refresh')
    setAccessToken(tokens.accessToken)
    const {data:member} = await api.get('/api/members/me')
    return toFrontendUser(member)
  } catch (error) {
    setAccessToken(null)
    if (error.response?.status === 401) return null
    throw error
  }
}

export async function logoutSession() {
  adminReader.clear(); adminOrderCache.clear()
  if (authMode !== 'api') return
  try { await api.post('/api/members/logout') }
  finally { setAccessToken(null) }
}

async function apiLogin(loginId,password) {
  const {data:tokens} = await api.post('/api/members/login',{loginId,password})
  setAccessToken(tokens.accessToken)
  try {
    const {data:member} = await api.get('/api/members/me')
    return toFrontendUser(member)
  } catch (error) {
    setAccessToken(null)
    throw error
  }
}

async function apiCatalog() {
  const {data} = await api.get('/api/products')
  const products = (data ?? []).map(row => {
    const product = {productId:String(row.id),brand:'',name:row.name,category:categoryFromApi[row.category] ?? row.category,
      price:row.price,stock:row.status === 'SOLD_OUT' ? 0 : row.stock,spec:row.specification ?? '',image:row.thumbnailUrl ?? row.imageUrls?.[0] ?? '',
      description:row.description ?? '',gallery:(row.imageUrls ?? []).map((image,index) => ({color:index ? `사진 ${index+1}` : '대표',image})),
      selling:row.status !== 'INACTIVE'}
    return presentProduct({...withProductDetails(product),purposes:purposeTags(product)})
  })
  return {products,categories,purposes}
}

async function apiSupport() {
  const [noticeResponse,faqResponse] = await Promise.all([api.get('/api/notices'),api.get('/api/faqs').catch(() => ({data:[]}))])
  return {faqs:(faqResponse.data ?? []).map(row => ({...row,title:row.title,body:row.content ?? row.answer})),
    notices:(noticeResponse.data ?? []).map(row => ({noticeId:String(row.id),title:row.title,body:row.content,date:row.createdAt}))}
}

async function apiCustomerOrders() {
  const rows = await fetchAllPages('/api/orders')
  const catalog = await apiCatalog()
  const productsById = new Map(catalog.products.map(row => [row.productId,row]))
  const orders = rows.map(row => mapOrder(row,productsById))
  await Promise.all(orders.filter(order => order.status === '배송 완료').map(async order => {
    try {
      const {data} = await api.get(`/api/orders/${order.orderId}/returns`)
      const latest = (data ?? [])[0]
      if (latest?.status === 'REQUESTED') order.request = '반품 요청'
    } catch { /* Return history is optional for orders created before the feature was enabled. */ }
  }))
  return orders
}

async function apiCreatePendingOrder(cart,delivery,paymentMethod='TOSS') {
  if (!['CREDIT_CARD','KAKAO_PAY','NAVER_PAY','TOSS'].includes(paymentMethod)) throw new Error('지원하지 않는 결제수단입니다.')
  const postcode = String(delivery.postcode ?? '').trim()
  if (!/^\d{5}$/.test(postcode)) throw new Error('결제 전 배송지 우편번호를 확인해 주세요.')
  const body = {
    items:cart.map(item => ({productId:Number(item.productId),quantity:item.quantity})),
    shippingName:delivery.recipient,shippingPhone:delivery.phone.replace(/[-\s]/g,''),
    shippingZipcode:postcode,shippingAddress1:delivery.address,
    shippingAddress2:delivery.detail || '',paymentMethod,
  }
  const {data:order} = await api.post('/api/orders',body)
  try { await api.post('/api/payments/ready',{orderNumber:order.orderNumber}) }
  catch (error) {
    await api.patch(`/api/orders/${order.orderId}/cancel`,{reason:'CHANGE_OF_MIND'}).catch(() => {})
    throw error
  }
  return {...mapOrder(order),orderNumber:order.orderNumber,total:order.totalAmount,paymentMethod:paymentMethodLabel[paymentMethod]}
}

async function apiConfirmPayment(paymentKey,orderNumber,amount) {
  const {data} = await api.post('/api/payments/confirm',{paymentKey,orderId:orderNumber,amount:Number(amount)})
  return data
}

async function apiWishlist() {
  const {data} = await api.get('/api/wishlist')
  return (data ?? []).map(row => String(row.productId))
}

async function apiSetFavorite(productId,enabled) {
  if (enabled) await api.post(`/api/wishlist/${productId}`)
  else await api.delete(`/api/wishlist/${productId}`)
}

export async function getCustomerInsights() {
  if (authMode !== 'api') throw new Error('API 인증 모드가 설정되지 않았습니다.')
  const [summary,repurchase,retention,predictions,training] = await Promise.all([
    api.get('/api/admin/ai/customers/summary'),
    api.get('/api/admin/ai/customers/repurchase-summary'),
    api.get('/api/admin/ai/customers/monthly-retention'),
    api.get('/api/admin/ai/customers/repurchase-predictions'),
    api.get('/api/admin/ai/customers/model-training-status'),
  ])
  return {summary:summary.data,repurchase:repurchase.data,retention:retention.data,
    predictions:predictions.data,training:training.data}
}

export async function refreshCustomerModel() {
  if (authMode !== 'api') throw new Error('API 인증 모드가 설정되지 않았습니다.')
  const {data} = await api.post('/api/admin/ai/customers/model-refresh',null,{timeout:120000})
  return data
}

async function apiLoadCart() {
  const {data} = await api.get('/api/cart')
  return (data ?? []).map(row => ({cartItemId:String(row.cartId),productId:String(row.productId),quantity:row.quantity}))
}
async function apiAddCart(productId,quantity) {
  const {data} = await api.post('/api/cart/items',{productId:Number(productId),quantity})
  return String(data.cartId)
}
async function apiUpdateCart(cartItemId,quantity) {
  await api.patch(`/api/cart/items/${cartItemId}`,{quantity})
}
async function apiRemoveCart(cartItemId) {
  await api.delete(`/api/cart/items/${cartItemId}`)
}

async function apiAdminSnapshot(options = {}) {
  const {section='dashboard',page=0,size=20,status='',sort='newest',dashboardPages={},force=false,signal} = options
  if(force) adminReader.clear()
  const dashboard=section==='dashboard'
  const needed=(...sections)=>dashboard || sections.includes(section)
  const [productRows,memberRows,orderPage,reviewPage,noticeRows,returnRows] = await Promise.all([
    needed('products','orders','refunds','delivery') ? adminReader.array('/api/admin/products') : [],
    needed('members','customers') ? adminReader.array('/api/admin') : [],
    needed('orders','delivery') ? adminReader.page('/api/admin/orders',{page:dashboard ? dashboardPages.orders ?? 0 : page,size,sort,status,signal}) : null,
    needed('reviews') ? adminReader.page('/api/admin/reviews',{page:dashboard ? dashboardPages.reviews ?? 0 : page,size,sort,signal}) : null,
    needed('notices') ? adminReader.array('/api/notices') : [],
    section==='refunds' ? adminReader.array('/api/admin/returns') : [],
  ])
  const productResponse={data:productRows},memberResponse={data:memberRows},noticeResponse={data:noticeRows},returnResponse={data:returnRows}
  const orderRows=orderPage?.rows ?? [],reviewRows=reviewPage?.rows ?? []
  const products = (productResponse.data ?? []).map(row => {
    const image=row.thumbnailUrl || row.imageUrls?.[0] || ''
    const urls=[...new Set([image,...(row.imageUrls ?? [])].filter(Boolean))]
    const product=presentProduct({productId:String(row.id),name:row.name,brand:'',category:categoryFromApi[row.category] ?? row.category,
      price:row.price,stock:row.stock,spec:row.specification ?? '',image,description:row.description ?? '',
      gallery:urls.map((image,index)=>({image,color:index ? `사진 ${index+1}` : '대표'})),selling:row.status!=='INACTIVE'})
    return {...product,backendStatus:row.status,createdAt:row.createdAt,imageUrls:urls,originalImageUrls:[...urls],originalImage:image}
  })
  const members = (memberResponse.data ?? []).map(row => ({userId:String(row.id),username:row.loginId,name:row.name,email:row.email,
    phone:row.tel,role:row.role,status:{ACTIVE:'정상',INACTIVE:'비활성',KICKED:'강퇴'}[row.status] ?? row.status,createdAt:row.createdAt}))
  const membersById = new Map(members.map(row => [String(row.userId),row]))
  const productsById = new Map(products.map(row => [row.productId,row]))
  const orders = orderRows.map(row => {
    const mapped = mapOrder(row,productsById)
    mapped.memberId = String(row.memberId ?? row.member?.id ?? '')
    mapped.userId = mapped.memberId
    mapped.delivery.address = [row.shippingZipcode,row.shippingAddress1,row.shippingAddress2].filter(Boolean).join(' ')
    mapped.author = membersById.get(mapped.memberId)?.name ?? ''
    return mapped
  })
  for(const order of orders) adminOrderCache.set(order.orderId,order)
  while(adminOrderCache.size>500)adminOrderCache.delete(adminOrderCache.keys().next().value)
  if(options.orderId && !orders.some(row=>row.orderId===String(options.orderId)) && adminOrderCache.has(String(options.orderId))) orders.push(adminOrderCache.get(String(options.orderId)))
  const reviews = reviewRows.map(row => ({reviewId:String(row.id),userId:String(row.memberId),author:membersById.get(String(row.memberId))?.name ?? `회원 ${row.memberId}`,
    productId:String(row.productId),productName:row.productName ?? productsById.get(String(row.productId))?.name ?? '',productImage:row.productImage ?? '',date:row.createdAt,body:row.content,
    sentiment:row.sentiment === 'POSITIVE' ? '긍정' : row.sentiment === 'NEGATIVE' ? '부정' : '',
    sentimentSource:'model',sentiment_score:row.sentimentScore,sentiment_analyzed_at:row.sentimentAnalyzedAt,
    updated_at:row.updatedAt ?? row.createdAt,hidden:false}))
  const notices = (noticeResponse.data ?? []).map(row => ({noticeId:String(row.id),title:row.title,body:row.content,author:row.author,date:row.createdAt}))
  const returns = (returnResponse.data ?? []).map(row => {
    const order = adminOrderCache.get(String(row.orderId))
    const item = order?.items.find(candidate => candidate.orderItemId === String(row.orderItemId))
    return {total:null,date:row.requestedAt,delivery:{recipient:'',address:''},...order,orderId:String(row.orderId),returnId:String(row.id),returnStatus:row.status,
      request:row.status === 'REQUESTED' ? '반품 요청' : `반품 ${row.status}`,
      returnReason:row.reason,refundAmount:row.refundAmount ?? 0,requestedAt:row.requestedAt,
      refundedAt:row.refundedAt,items:item ? [{...item,quantity:row.quantity}] : [{orderItemId:String(row.orderItemId),name:row.productName,quantity:row.quantity,price:null}]}
  })
  return {categories,products,orders,members,reviews,notices,inquiries:[],returns,paging:{orders:orderPage && {...orderPage,rows:undefined},reviews:reviewPage && {...reviewPage,rows:undefined}}}
}

async function apiSaveProduct(fields) {
  const payload=productPayload(fields)
  const path='/api/admin/products'
  let productId=fields.productId
  if(productId) await api.patch(`${path}/${productId}`,payload)
  else {const {data:created}=await api.post(path,payload);productId=created.id;fields.productId=String(productId)}
  try {await api.patch(`${path}/${productId}/status`,{status:fields.selling ? 'ACTIVE' : 'INACTIVE'})}
  catch {throw new Error('상품 정보는 저장됐지만 판매 상태 변경에 실패했습니다. 목록을 새로고침하고 상태를 다시 변경해 주세요.')}
  return String(productId)
}

async function apiSaveNotice({noticeId,title,body}) {
  const payload = {title:title?.trim(),content:body?.trim()}
  if (!payload.title || !payload.content) throw new Error('제목과 내용을 입력해 주세요.')
  if (noticeId) await api.put(`/api/notices/${noticeId}`,payload)
  else await api.post('/api/notices',payload)
}

const carrierCodes = {'CJ대한통운':'CJ','한진택배':'HANJIN','롯데택배':'LOTTE','우체국택배':'EPOST','로젠택배':'LOGEN','기타':'OTHER'}
async function apiGetDelivery(orderId) {
  const {data} = await api.get(`/api/admin/orders/${orderId}/delivery`)
  return data
}
async function apiSaveShipping(orderId,fields) {
  const path = `/api/admin/orders/${orderId}/delivery`
  const currentStatus = fields.currentStatus
  const requestedStatus = fields.status
  let delivery
  if (['결제 완료','배송 준비'].includes(currentStatus)) {
    const carrierName = fields.carrier?.trim()
    const invoiceNumber = fields.tracking?.trim()
    if (carrierName || invoiceNumber) {
      const carrierCode = carrierCodes[carrierName]
      if (!carrierName || !invoiceNumber || !carrierCode) throw new Error('택배사와 운송장 번호를 확인해 주세요.')
      const {data} = await api.put(path,{carrierCode,carrierName,invoiceNumber,estimatedAt:fields.dispatchDate || null})
      delivery = data
    }
  }
  if (currentStatus === '결제 완료' && requestedStatus === '배송 준비') {
    await api.patch(`/api/admin/orders/${orderId}/prepare`)
  } else if (currentStatus === '배송 준비' && requestedStatus === '배송 중') {
    delivery ??= await apiGetDelivery(orderId)
    if (!delivery.carrierCode || !delivery.carrierName || !delivery.invoiceNumber) throw new Error('배송 정보를 먼저 저장해 주세요.')
    const {data} = await api.patch(path,{status:'DELIVERING',estimatedAt:fields.dispatchDate || delivery.estimatedAt || null})
    delivery = data
  } else if (currentStatus === '배송 중' && requestedStatus === '배송 완료') {
    const {data} = await api.patch(path,{status:'COMPLETED',estimatedAt:fields.dispatchDate || null})
    delivery = data
  }
  return delivery
}

async function apiAdvanceOrder(orderId,currentStatus,tracking) {
  const path = `/api/admin/orders/${orderId}/delivery`
  if (currentStatus === '결제 완료') return api.patch(`/api/admin/orders/${orderId}/prepare`)
  if (currentStatus === '배송 준비') {
    const delivery = await apiGetDelivery(orderId)
    const invoiceNumber = tracking?.trim() || delivery.invoiceNumber
    if (!delivery.carrierCode || !delivery.carrierName || !invoiceNumber) throw new Error('배송 상세에서 택배사와 운송장 정보를 먼저 저장해 주세요.')
    if (invoiceNumber !== delivery.invoiceNumber) await api.put(path,{carrierCode:delivery.carrierCode,carrierName:delivery.carrierName,invoiceNumber,estimatedAt:delivery.estimatedAt || null})
    return api.patch(path,{status:'DELIVERING',estimatedAt:delivery.estimatedAt || null})
  }
  if (currentStatus === '배송 중') return api.patch(path,{status:'COMPLETED',estimatedAt:null})
  throw new Error('현재 상태에서는 배송을 변경할 수 없습니다.')
}

// Internal mock objects are temporary UI models, not backend response schemas.
async function mock(operation) {
  if (mode !== 'mock') throw new Error('지원하지 않는 데이터 모드입니다.')
  await new Promise(resolve => setTimeout(resolve, 100))
  return structuredClone(operation())
}
function find(rows, key, value) {
  const row = rows.find(item => item[key] === value)
  if (!row) throw new Error('요청한 항목을 찾을 수 없습니다.')
  return row
}
const available = row => !row.deleted && row.selling !== false
export const checkoutPaymentGroups = [
  {label:'간편결제', methods:['네이버페이','카카오페이','삼성페이']},
  {label:'일반결제', methods:['카드','휴대폰 결제']},
]

export const shop = {
  searchAddresses: query => mock(() => {
    const normalize = value => value.replace(/\s+/g,'').toLowerCase()
    const term = normalize(query)
    if (!term) return []
    return checkoutAddresses.filter(address =>
      [address.road,address.lot,address.postcode].some(value => normalize(value).includes(term)))
  }),
  support: () => authMode === 'api' ? apiSupport() : mock(() => ({faqs,notices:state.notices})),
  cart: () => authMode === 'api' ? apiLoadCart() : Promise.resolve([]),
  addCart: (productId,quantity) => authMode === 'api' ? apiAddCart(productId,quantity) : Promise.resolve(null),
  updateCart: (cartItemId,quantity) => authMode === 'api' ? apiUpdateCart(cartItemId,quantity) : Promise.resolve(),
  removeCart: cartItemId => authMode === 'api' ? apiRemoveCart(cartItemId) : Promise.resolve(),
  wishlist: () => authMode === 'api' ? apiWishlist() : Promise.resolve([]),
  setFavorite: (userId,productId,enabled) => authMode === 'api' ? apiSetFavorite(productId,enabled) : Promise.resolve(),
  inquiries: userId => authMode === 'api' ? Promise.resolve([]) : mock(() => state.inquiries.filter(row => row.userId === userId)),
  inquiry: (userId, {title,body}) => authMode === 'api'
    ? Promise.reject(new Error('고객 문의 저장 API는 아직 백엔드에 연결되지 않았습니다.'))
    : mock(() => {
    const user = find(state.users,'userId',userId)
    if (user.role !== 'USER' || ['정지','비활성'].includes(user.status)) throw new Error('문의를 등록할 수 없는 계정입니다.')
    if (!title.trim() || !body.trim() || title.length > 100 || body.length > 2000) throw new Error('문의 제목과 내용을 확인해 주세요.')
    state.inquiries.unshift({inquiryId:id(),userId,author:user.name,title:title.trim(),body:body.trim(),answer:'',date:new Date().toISOString()})
  }),
  catalog: () => authMode === 'api' ? apiCatalog() : mock(() => ({products:state.products.filter(available).map(row => ({...withProductDetails(row),purposes:purposeTags(row)})),categories,purposes})),
  checkUsername: username => authMode === 'api' ? (async () => {
    if (!/^[a-z0-9]{4,20}$/.test(username)) throw new Error('아이디는 영문과 숫자 4~20자로 입력해 주세요.')
  })() : mock(() => {
    if (!/^[a-z0-9]{4,20}$/.test(username)) throw new Error('아이디는 영문과 숫자 4~20자로 입력해 주세요.')
    if (state.users.some(row => row.username === username)) throw new Error('이미 등록된 아이디입니다.')
  }),
  login: (email,password) => authMode === 'api' ? apiLogin(email,password) : mock(() => {
    const user = state.users.find(row => (row.email === email || row.username === email) && typeof row.password === 'string' && row.password === password)
    if (!user) throw new Error('이메일 또는 비밀번호를 확인해 주세요.')
    if (['정지','비활성'].includes(user.status)) throw new Error('이용이 제한된 계정입니다.')
    return publicUser(user)
  }),
  // API mode uses the backend OAuth redirect; mock profiles are limited to explicit mock mode.
  socialPreview: provider => authMode === 'api'
    ? startSocialLogin(provider)
    : mock(() => {
    const profile = Object.hasOwn(socialProfiles,provider) ? socialProfiles[provider] : null
    if (!profile) throw new Error('지원하지 않는 소셜 로그인입니다.')
    return {...profile,provider,registered:state.users.some(row => row.socialProvider === provider)}
  }),
  socialSignIn: (provider,{agreed=false}={}) => authMode === 'api'
    ? startSocialLogin(provider)
    : mock(() => {
    const profile = Object.hasOwn(socialProfiles,provider) ? socialProfiles[provider] : null
    if (!profile) throw new Error('지원하지 않는 소셜 로그인입니다.')
    let user = state.users.find(row => row.socialProvider === provider)
    if (!user) {
      if (!agreed) throw new Error('필수 약관에 동의해 주세요.')
      if (state.users.some(row => row.email === profile.email)) throw new Error('해당 테스트 이메일이 이미 등록되어 있습니다. 다른 Mock 로그인 방법을 이용해 주세요.')
      user = {userId:id(),role:'USER',name:profile.name,email:profile.email,socialProvider:provider,status:'정상',createdAt:new Date().toISOString()}
      state.users.push(user)
    }
    if (user.role !== 'USER' || ['정지','비활성'].includes(user.status)) throw new Error('이용이 제한된 계정입니다.')
    return publicUser(user)
  }),
  signup: async ({username,name,email,password,phone,agreed}) => {
    if (authMode === 'api') {
      const {data} = await api.post('/api/members/signup',{
        loginId:username,password,passwordCheck:password,name,email,tel:phone,
        termsAgreed:Boolean(agreed),privacyAgreed:Boolean(agreed),
      })
      return toFrontendUser(data)
    }
    return mock(() => {
    if (state.users.some(row => row.email === email)) throw new Error('이미 등록된 이메일입니다.')
    if (!agreed || !name || !email || password.length < 8) throw new Error('가입 정보를 확인해 주세요.')
    if (username && (!/^[a-z0-9]{4,20}$/.test(username) || state.users.some(row => row.username === username))) {
      throw new Error('사용할 수 없는 아이디입니다.')
    }
    const user = {userId:id(), role:'USER', username,name,email,password,createdAt:new Date().toISOString()}
    state.users.push(user)
    return publicUser(user)
  })
  },
  profile: (userId, {name,email,username,phone}) => authMode === 'api'
    ? api.put('/api/members/me',{name,email,tel:phone}).then(({data}) => toFrontendUser(data))
    : mock(() => {
    if (!name || !email) throw new Error('회원정보를 확인해 주세요.')
    if (state.users.some(row => row.email === email && row.userId !== userId)) throw new Error('이미 등록된 이메일입니다.')
    if (username && !/^[a-z0-9]{4,20}$/.test(username)) throw new Error('아이디는 영문과 숫자 4~20자로 입력해 주세요.')
    if (username && state.users.some(row => row.username === username && row.userId !== userId)) throw new Error('이미 등록된 아이디입니다.')
    return publicUser(Object.assign(find(state.users,'userId',userId), {name,email,username}))
  }),
  changePassword: (userId, current, next) => authMode === 'api'
    ? api.put('/api/members/password',{password:current,newPassword:next,passwordCheck:next})
      .then(() => api.get('/api/members/me')).then(({data}) => toFrontendUser(data))
    : mock(() => {
    const user = find(state.users,'userId',userId)
    if (user.role !== 'USER') throw new Error('비밀번호를 변경할 수 없는 계정입니다.')
    if (user.password && user.password !== current) throw new Error('현재 비밀번호가 일치하지 않습니다.')
    if (typeof next !== 'string' || next.length < 8 || next.length > 20) throw new Error('새 비밀번호는 8~20자로 입력해 주세요.')
    user.password = next
    return publicUser(user)
  }),
  createPendingOrder: (userId,cart,delivery,paymentMethod) => authMode === 'api'
    ? apiCreatePendingOrder(cart,delivery,paymentMethod)
    : Promise.reject(new Error('실제 결제 주문은 API 모드에서만 만들 수 있습니다.')),
  confirmPayment: (paymentKey,orderNumber,amount) => authMode === 'api'
    ? apiConfirmPayment(paymentKey,orderNumber,amount)
    : Promise.reject(new Error('실제 결제 승인은 API 모드에서만 처리할 수 있습니다.')),
  cancelPendingOrder: (userId,orderId) => authMode === 'api'
    ? api.patch(`/api/orders/${orderId}/cancel`,{reason:'CHANGE_OF_MIND'})
    : Promise.resolve(),
  completeOrder: (userId,orderId) => authMode === 'api'
    ? api.patch(`/api/orders/${orderId}/complete`)
    : mock(() => {
      const order = find(state.orders.filter(row => row.userId === userId),'orderId',orderId)
      if (order.status !== '배송 완료') throw new Error('배송 완료된 주문만 구매 확정할 수 있습니다.')
      order.status = '구매 확정'
    }),
  order: (userId, cart, delivery, payment) => authMode === 'api'
    ? Promise.reject(new Error('API 모드에서는 토스페이먼츠 테스트 결제를 진행해 주세요.'))
    : mock(() => {
    const buyer = find(state.users,'userId',userId)
    if (!canShop(buyer.role) || ['정지','비활성'].includes(buyer.status)) throw new Error('주문할 수 없는 계정입니다.')
    if (!delivery.recipient || !delivery.address) throw new Error('배송 정보를 입력해 주세요.')
    if (!cart.length) throw new Error('장바구니가 비어 있습니다.')
    if (!checkoutPaymentGroups.some(group => group.methods.includes(payment.method))) throw new Error('결제 수단을 확인해 주세요.')
    if (payment.outcome !== 'approve') throw new Error('모의 결제가 거절되었습니다. 다시 승인하거나 다른 결제수단을 선택해 주세요.')
    const items = cart.map(({productId,quantity}) => {
      const row = find(state.products,'productId',productId)
      if (!Number.isInteger(quantity) || quantity < 1 || row.stock < quantity || !available(row)) throw new Error(row.name + '의 재고를 확인해 주세요.')
      return {productId,quantity,price:row.price,name:row.name,category:row.category,image:row.image}
    })
    const total = items.reduce((sum,row) => sum + row.price * row.quantity,0)
    if (total !== payment.total) throw new Error('결제 금액이 바뀌었습니다. 상품과 금액을 다시 확인해 주세요.')
    const order = {orderId:id(),userId,items,delivery,total,paymentMethod:payment.method,status:'결제 완료',date:new Date().toISOString()}
    for (const row of items) find(state.products,'productId',row.productId).stock -= row.quantity
    state.orders.unshift(order)
    return order
  }),
  orders: (userId) => authMode === 'api' ? apiCustomerOrders() : mock(() => state.orders.filter(row => row.userId === userId)),
  // Temporary member overview model; no backend response contract is implied.
  memberSummary: async userId => authMode === 'api' ? (async () => {
    const [ordersResponse,reviewsResponse] = await Promise.all([apiCustomerOrders(),api.get('/api/reviews/me')])
    return {orders:ordersResponse,reviewCount:Array.isArray(reviewsResponse.data) ? reviewsResponse.data.length : 0,
      reviewedOrderItemIds:(reviewsResponse.data ?? []).map(row => String(row.orderItemId)),inquiryCount:0}
  })() : mock(() => ({
    orders:state.orders.filter(row => row.userId === userId),
    reviewCount:state.reviews.filter(row => row.userId === userId).length,
    inquiryCount:state.inquiries.filter(row => row.userId === userId).length,
  })),
  requestOrder: (userId,orderId,orderItemId) => authMode === 'api' ? (async () => {
    const orders = await apiCustomerOrders()
    const order = find(orders,'orderId',String(orderId))
    if (order.status === '배송 완료') {
      if (!order.items.length) throw new Error('반품 요청할 상품 항목을 확인해 주세요.')
      await Promise.all(order.items.map(item => api.post(`/api/orders/${orderId}/returns`,{
        orderItemId:Number(item.orderItemId),quantity:item.quantity,reason:'사용자 반품 요청',
      })))
    } else if (order.status === '결제 대기') {
      await api.patch(`/api/orders/${orderId}/cancel`,{reason:'CHANGE_OF_MIND'})
    } else if (order.status === '결제 완료') {
      await api.post(`/api/payments/${encodeURIComponent(order.orderNumber)}/cancel`,null,{params:{cancelReason:'CHANGE_OF_MIND'}})
    } else throw new Error('현재 주문 상태에서는 온라인 취소를 할 수 없습니다.')
  })() : mock(() => {
    const row = state.orders.find(order => order.userId === userId && order.orderId === orderId)
    if (!row || row.request || !['결제 완료','배송 준비','배송 완료'].includes(row.status)) throw new Error('현재 주문은 요청할 수 없습니다.')
    row.request = row.status === '배송 완료' ? '반품 요청' : '취소 요청'
  }),
  reviews: async productId => authMode === 'api' ? (async () => {
    const rows = await fetchAllPages(`/api/products/${productId}/reviews`)
    return rows.map(row => ({reviewId:String(row.id),orderItemId:String(row.orderItemId),productId:String(row.productId),author:row.memberName ?? '구매 회원',
      body:row.content,sentiment:row.sentiment === 'POSITIVE' ? '긍정' : row.sentiment === 'NEGATIVE' ? '부정' : '',
      sentimentSource:'model',sentiment_score:row.sentimentScore,sentiment_analyzed_at:row.sentimentAnalyzedAt,updated_at:row.updatedAt}))
  })() : mock(() => state.reviews.filter(row => row.productId === productId && !row.hidden)),
  myReviews: userId => authMode === 'api'
    ? api.get('/api/reviews/me').then(({data}) => (data ?? []).map(row => ({...row,orderItemId:String(row.orderItemId)})))
    : mock(() => state.reviews.filter(row => row.userId === userId)),
  review: (user, productId, body, orderItemId) => authMode === 'api'
    ? api.post(`/api/products/${productId}/reviews`,{orderItemId:Number(orderItemId),content:body}).then(({data}) => ({
      reviewId:String(data.id),orderItemId:String(data.orderItemId),productId:String(data.productId),author:user.name,body:data.content,
      sentiment:data.sentiment === 'POSITIVE' ? '긍정' : data.sentiment === 'NEGATIVE' ? '부정' : '',
      sentimentSource:'model',sentiment_score:data.sentimentScore,sentiment_analyzed_at:data.sentimentAnalyzedAt,updated_at:data.updatedAt,
    }))
    : mock(() => {
    find(state.products,'productId',productId)
    if (!state.orders.some(order => order.userId === user.userId && !['환불 대기','환불 완료'].includes(order.status) && order.items.some(item => item.productId === productId))) throw new Error('구매한 상품만 리뷰를 작성할 수 있습니다.')
    if (!body || body.length > 1000) throw new Error('리뷰 내용을 확인해 주세요.')
    const sentiment = /불량|별로|실망|나쁘|느려/.test(body) ? '부정' : /좋|추천|만족|빠르/.test(body) ? '긍정' : ''
    const review = {reviewId:id(),userId:user.userId,author:user.name,productId,body,sentiment,sentimentSource:'mock'}
    state.reviews.unshift(review)
    return review
  }),
  demoRecommendations: () => authMode === 'api' ? Promise.resolve([]) : mock(() => {
    const reasons = ['interest','personal','category','interest']
    return [...state.products].filter(row => available(row) && row.stock > 0).sort((a,b) => b.popularity - a.popularity)
      .slice(0,reasons.length).map((row,index) => ({...row,recommendationReason:reasons[index]}))
  }),
  recommendations: (favorites, recentlyViewed = []) => authMode === 'api' ? (async () => {
    const [{data},catalog] = await Promise.all([api.get('/api/ai/recommendations/me',{params:{topN:8}}),apiCatalog()])
    const rows = Array.isArray(data) ? data : data.recommendations ?? []
    const byId = new Map(catalog.products.map(product => [product.productId,product]))
    const reason = data.recommend_type === 'POPULAR' ? 'popular' : 'personal'
    return rows.map(row => {
      const product = byId.get(String(row.product_id ?? row.productId))
      return product?.stock > 0 ? {...product,recommendationReason:reason} : null
    }).filter(Boolean)
  })() : mock(() => {
    if (!state.recommendation.enabled) return []
    const categoriesFor = ids => new Set(state.products.filter(row => ids.includes(row.productId)).map(row => row.category))
    const favoriteCategories = categoriesFor(favorites)
    const viewedCategories = categoriesFor(recentlyViewed)
    const scores = {personal:3, category:2, interest:1, popular:0}
    return state.products.filter(row => available(row) && row.stock > 0 && !favorites.includes(row.productId)).map(row => {
      const favorite = favoriteCategories.has(row.category)
      const viewed = viewedCategories.has(row.category)
      const reason = favorite && viewed ? 'personal' : favorite ? 'category' : viewed ? 'interest' : 'popular'
      return {...row,recommendationReason:reason}
    }).sort((a,b) => scores[b.recommendationReason] - scores[a.recommendationReason] || b.popularity - a.popularity).slice(0,4)
  }),
}

// Mock operator actions share the storefront's in-memory records.
function operate(actorId, operation) {
  return mock(() => {
    const actor = find(state.users,'userId',actorId)
    if (actor.role !== 'ADMIN' || ['정지','비활성'].includes(actor.status)) throw new Error('관리자 권한이 필요합니다.')
    return operation()
  })
}
const orderStages = ['결제 완료','배송 준비','배송 중','배송 완료']
export const admin = {
  snapshot: (actor,options) => authMode === 'api' ? apiAdminSnapshot(options) : operate(actor,() => ({
    categories,products:state.products.filter(row => !row.deleted),orders:state.orders,
    members:state.users.map(publicUser),reviews:state.reviews,inquiries:state.inquiries,notices:state.notices,
  })),
  saveProduct: (actor, fields) => authMode === 'api' ? apiSaveProduct(fields) : operate(actor,() => {
    const {productId,name,category,brand,price,stock,spec,image,description,selling} = fields
    if (!name.trim() || !brand.trim() || !spec.trim() || !categories.includes(category)
      || !Number.isSafeInteger(price) || price <= 0 || !Number.isSafeInteger(stock) || stock < 0
      || (image && !/^\/(?!\/)[^\\]+$/.test(image)
        && !(image.length <= 7_000_000 && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(image)))) {
      throw new Error('상품 정보 또는 이미지 형식을 확인해 주세요.')
    }
    const data = {name:name.trim(),brand:brand.trim(),spec:spec.trim(),category,price,stock,image,description,selling}
    if (productId) {
      const row = find(state.products,'productId',productId)
      // Keep existing alternate views when the representative image changes.
      Object.assign(row,data)
    } else state.products.push({...data,productId:id(),popularity:0})
  }),
  setProductSelling: (actor,productId,selling) => authMode==='api' ? api.patch(`/api/admin/products/${productId}/status`,{status:selling ? 'ACTIVE' : 'INACTIVE'}) : operate(actor,()=>{find(state.products,'productId',productId).selling=selling}),
  removeProduct: (actor, productId) => authMode === 'api' ? api.delete(`/api/admin/products/${productId}`) : operate(actor,() => {
    find(state.products,'productId',productId).deleted = true
  }),
  getDelivery: (actor,orderId) => authMode === 'api' ? apiGetDelivery(orderId) : operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    return {deliveryId:row.shipmentId,carrierCode:carrierCodes[row.carrier] ?? '',carrierName:row.carrier ?? '',
      invoiceNumber:row.tracking ?? '',estimatedAt:row.dispatchDate ?? null,deliveryMemo:row.shippingMemo ?? ''}
  }),
  saveShipping: (actor, orderId, fields) => authMode === 'api' ? apiSaveShipping(orderId,fields) : operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    const current = orderStages.indexOf(row.status)
    const target = orderStages.indexOf(fields.status)
    if (current < 0 || row.request?.endsWith('요청') || target < current || target > current+1) {
      throw new Error('현재 주문에서 변경할 수 없는 배송 상태입니다.')
    }
    const carrier = fields.carrier.trim()
    const tracking = fields.tracking.trim()
    if (tracking.length > 40 || fields.memo.length > 1000) throw new Error('배송 정보의 입력 길이를 확인해 주세요.')
    if (target >= 2 && (!carrier || !tracking)) throw new Error('발송 시 택배사와 운송장 번호를 입력해 주세요.')
    if (fields.dispatchDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.dispatchDate)) throw new Error('발송예정일을 확인해 주세요.')
    const date = new Date().toISOString()
    row.shippingHistory ??= []
    row.shippingHistory.push({date,status:fields.status,message:target === current ? '배송 정보 수정' : '배송 상태 변경'})
    Object.assign(row,{
      carrier,tracking,status:fields.status,dispatchDate:fields.dispatchDate,shippingMemo:fields.memo.trim(),
      shippingUpdatedAt:date,shipmentId:row.shipmentId || 'SHIP-' + row.orderId,
    })
    return row
  }),
  advanceOrder: (actor, orderId, tracking, currentStatus) => authMode === 'api'
  ? apiAdvanceOrder(orderId,currentStatus,tracking)
  : operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    const next = orderStages[orderStages.indexOf(row.status) + 1]
    if (!orderStages.includes(row.status) || !next || row.request?.endsWith('요청')) throw new Error('현재 상태에서는 배송을 변경할 수 없습니다.')
    if (next === '배송 중' && !tracking.trim()) throw new Error('운송장 번호를 입력해 주세요.')
    if (next === '배송 중') row.tracking = tracking.trim()
    row.status = next
    row.shippingUpdatedAt = new Date().toISOString()
    row.shipmentId ||= 'SHIP-' + row.orderId
    row.shippingHistory ??= []
    row.shippingHistory.push({date:row.shippingUpdatedAt,status:next,message:'배송 상태 변경'})
  }),
  resolveOrder: (actor, orderId, approve) => authMode === 'api'
  ? Promise.reject(new Error('주문 취소 요청의 관리자 처리 API는 아직 제공되지 않습니다.'))
  : operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    if (!['취소 요청','반품 요청'].includes(row.request)) throw new Error('처리할 요청이 없습니다.')
    const cancellation = row.request === '취소 요청'
    if (approve) {
      row.status = '환불 대기'
      row.refundType = cancellation ? '취소' : '반품'
    }
    row.request = (cancellation ? '취소' : '반품') + (approve ? ' 승인' : ' 거절')
  }),
  refund: (actor, orderId) => authMode === 'api'
  ? Promise.reject(new Error('실제 결제 환불은 결제 취소 API와 연결되지 않았습니다.'))
  : operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    if (row.status !== '환불 대기') throw new Error('환불 대기 주문만 처리할 수 있습니다.')
    for (const item of row.items) {
      const product = state.products.find(candidate => candidate.productId === item.productId)
      if (product) product.stock += item.quantity
    }
    row.status = '환불 완료'
    row.refundedAt = new Date().toISOString()
  }),
  memberStatus: (actor, userId, status) => authMode === 'api' ? (() => {
    const action = {정상:'activate',비활성:'inactivate',강퇴:'kick'}[status]
    if (!action) return Promise.reject(new Error('변경할 수 없는 계정 상태입니다.'))
    return api.patch(`/api/admin/${userId}/${action}`)
  })() : operate(actor,() => {
    const row = find(state.users,'userId',userId)
    if (row.role === 'ADMIN' || !['정상','정지','비활성'].includes(status)) throw new Error('변경할 수 없는 계정 상태입니다.')
    row.status = status
  }),
  reviewVisibility: (actor, reviewId, hidden) => authMode === 'api'
  ? hidden ? api.delete(`/api/admin/reviews/${reviewId}`) : Promise.reject(new Error('삭제된 리뷰는 복구할 수 없습니다.'))
  : operate(actor,() => {
    find(state.reviews,'reviewId',reviewId).hidden = hidden
  }),
  answer: (actor, inquiryId, answer) => authMode === 'api'
  ? Promise.reject(new Error('문의 답변 API가 아직 백엔드에 제공되지 않습니다.'))
  : operate(actor,() => {
    if (!answer.trim()) throw new Error('답변을 입력해 주세요.')
    find(state.inquiries,'inquiryId',inquiryId).answer = answer.trim()
  }),
  saveNotice: (actor, fields) => authMode === 'api' ? apiSaveNotice(fields) : operate(actor,() => {
    const {noticeId,title,body} = fields
    if (!title.trim() || !body.trim()) throw new Error('제목과 내용을 입력해 주세요.')
    const fields = {title:title.trim(),body:body.trim(),date:new Date().toISOString()}
    if (noticeId) Object.assign(find(state.notices,'noticeId',noticeId),fields)
    else state.notices.unshift({noticeId:id(),...fields})
  }),
  removeNotice: (actor, noticeId) => authMode === 'api' ? api.delete(`/api/notices/${noticeId}`) : operate(actor,() => {
    state.notices = state.notices.filter(row => row.noticeId !== noticeId)
  }),
  resolveReturn: (actor,returnId,approve,refundAmount) => authMode === 'api'
    ? api.patch(`/api/admin/returns/${returnId}`,{status:approve ? 'APPROVED' : 'REJECTED',refundAmount:approve ? Number(refundAmount) : 0})
    : Promise.reject(new Error('반품 요청 Mock 처리는 관리자 페이지의 기본 요청 처리 기능을 이용해 주세요.')),
}


