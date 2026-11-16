import { socialProfiles } from '../mocks/socialAuth'
import { seed, categories } from '../mocks/catalog'
import { adminSeed } from '../mocks/admin'
import { withProductDetails } from '../mocks/productDetails'
import { purposes, purposeTags } from '../mocks/purposes'
import { faqs } from '../mocks/support'

const mode = import.meta.env.VITE_DATA_MODE || 'mock'
const demo = adminSeed(seed.products)
const state = structuredClone({...seed,...demo,reviews:[...seed.reviews,...demo.reviews]})
for (const user of state.users) user.createdAt = new Date().toISOString()
for (const order of state.orders) {
  for (const item of order.items) {
    find(state.products,'productId',item.productId).stock -= item.quantity
  }
}
const id = () => crypto.randomUUID()
const publicUser = ({ password, ...user }) => user

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
export const shop = {
  support: () => mock(() => ({faqs,notices:state.notices})),
  inquiries: userId => mock(() => state.inquiries.filter(row => row.userId === userId)),
  inquiry: (userId, {title,body}) => mock(() => {
    const user = find(state.users,'userId',userId)
    if (user.role !== 'USER' || ['정지','비활성'].includes(user.status)) throw new Error('문의를 등록할 수 없는 계정입니다.')
    if (!title.trim() || !body.trim() || title.length > 100 || body.length > 2000) throw new Error('문의 제목과 내용을 확인해 주세요.')
    state.inquiries.unshift({inquiryId:id(),userId,author:user.name,title:title.trim(),body:body.trim(),answer:'',date:new Date().toISOString()})
  }),
  catalog: () => mock(() => ({products:state.products.filter(available).map(row => ({...withProductDetails(row),purposes:purposeTags(row)})),categories,purposes})),
  checkUsername: (username) => mock(() => {
    if (!/^[a-z0-9]{4,20}$/.test(username)) throw new Error('아이디는 영문과 숫자 4~20자로 입력해 주세요.')
    if (state.users.some(row => row.username === username)) throw new Error('이미 등록된 아이디입니다.')
  }),
  login: (email,password) => mock(() => {
    const user = state.users.find(row => (row.email === email || row.username === email) && typeof row.password === 'string' && row.password === password)
    if (!user) throw new Error('이메일 또는 비밀번호를 확인해 주세요.')
    if (['정지','비활성'].includes(user.status)) throw new Error('이용이 제한된 계정입니다.')
    return publicUser(user)
  }),
  // Temporary frontend flow: no OAuth redirects, tokens, credentials, or network calls.
  socialPreview: provider => mock(() => {
    const profile = Object.hasOwn(socialProfiles,provider) ? socialProfiles[provider] : null
    if (!profile) throw new Error('지원하지 않는 소셜 로그인입니다.')
    return {...profile,provider,registered:state.users.some(row => row.socialProvider === provider)}
  }),
  socialSignIn: (provider,{agreed=false}={}) => mock(() => {
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
  signup: ({username,name,email,password,agreed}) => mock(() => {
    if (state.users.some(row => row.email === email)) throw new Error('이미 등록된 이메일입니다.')
    if (!agreed || !name || !email || password.length < 8) throw new Error('가입 정보를 확인해 주세요.')
    if (username && (!/^[a-z0-9]{4,20}$/.test(username) || state.users.some(row => row.username === username))) {
      throw new Error('사용할 수 없는 아이디입니다.')
    }
    const user = {userId:id(), role:'USER', username,name,email,password,createdAt:new Date().toISOString()}
    state.users.push(user)
    return publicUser(user)
  }),
  profile: (userId, {name,email}) => mock(() => {
    if (!name || !email) throw new Error('회원정보를 확인해 주세요.')
    if (state.users.some(row => row.email === email && row.userId !== userId)) throw new Error('이미 등록된 이메일입니다.')
    return publicUser(Object.assign(find(state.users,'userId',userId), {name,email}))
  }),
  order: (userId, cart, delivery) => mock(() => {
    const buyer = find(state.users,'userId',userId)
    if (buyer.role !== 'USER' || ['정지','비활성'].includes(buyer.status)) throw new Error('주문할 수 없는 계정입니다.')
    if (!delivery.recipient || !delivery.address) throw new Error('배송 정보를 입력해 주세요.')
    if (!cart.length) throw new Error('장바구니가 비어 있습니다.')
    const items = cart.map(({productId,quantity}) => {
      const row = find(state.products,'productId',productId)
      if (!Number.isInteger(quantity) || quantity < 1 || row.stock < quantity || !available(row)) throw new Error(row.name + '의 재고를 확인해 주세요.')
      return {productId,quantity,price:row.price,name:row.name,category:row.category,image:row.image}
    })
    const order = {orderId:id(),userId,items,delivery,status:'결제 완료',date:new Date().toISOString(),
      total:items.reduce((sum,row) => sum + row.price * row.quantity,0)}
    for (const row of items) find(state.products,'productId',row.productId).stock -= row.quantity
    state.orders.unshift(order)
    return order
  }),
  orders: (userId) => mock(() => state.orders.filter(row => row.userId === userId)),
  // Temporary member overview model; no backend response contract is implied.
  memberSummary: userId => mock(() => ({
    orders:state.orders.filter(row => row.userId === userId),
    reviewCount:state.reviews.filter(row => row.userId === userId).length,
    inquiryCount:state.inquiries.filter(row => row.userId === userId).length,
  })),
  requestOrder: (userId,orderId) => mock(() => {
    const row = state.orders.find(order => order.userId === userId && order.orderId === orderId)
    if (!row || row.request || !['결제 완료','배송 준비','배송 완료'].includes(row.status)) throw new Error('현재 주문은 요청할 수 없습니다.')
    row.request = row.status === '배송 완료' ? '반품 요청' : '취소 요청'
  }),
  reviews: (productId) => mock(() => state.reviews.filter(row => row.productId === productId && !row.hidden)),
  review: (user, productId, rating, body) => mock(() => {
    find(state.products,'productId',productId)
    if (!state.orders.some(order => order.userId === user.userId && !['환불 대기','환불 완료'].includes(order.status) && order.items.some(item => item.productId === productId))) throw new Error('구매한 상품만 리뷰를 작성할 수 있습니다.')
    if (!body || body.length > 1000 || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('리뷰 내용을 확인해 주세요.')
    const sentiment = /불량|별로|실망|나쁘|느려/.test(body) ? '부정' : /좋|추천|만족|빠르/.test(body) ? '긍정' : rating >= 4 ? '긍정' : rating <= 2 ? '부정' : '중립'
    const review = {reviewId:id(),userId:user.userId,author:user.name,productId,rating,body,sentiment}
    state.reviews.unshift(review)
    return review
  }),
  demoRecommendations: () => mock(() => {
    const reasons = ['interest','personal','category','interest']
    return [...state.products].filter(row => available(row) && row.stock > 0).sort((a,b) => b.popularity - a.popularity)
      .slice(0,reasons.length).map((row,index) => ({...row,recommendationReason:reasons[index]}))
  }),
  recommendations: (favorites, recentlyViewed = []) => mock(() => {
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
  snapshot: actor => operate(actor,() => ({
    categories,products:state.products.filter(row => !row.deleted),orders:state.orders,
    members:state.users.map(publicUser),reviews:state.reviews,inquiries:state.inquiries,notices:state.notices,
  })),
  saveProduct: (actor, fields) => operate(actor,() => {
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
  removeProduct: (actor, productId) => operate(actor,() => {
    find(state.products,'productId',productId).deleted = true
  }),
  saveShipping: (actor, orderId, fields) => operate(actor,() => {
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
  advanceOrder: (actor, orderId, tracking) => operate(actor,() => {
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
  resolveOrder: (actor, orderId, approve) => operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    if (!['취소 요청','반품 요청'].includes(row.request)) throw new Error('처리할 요청이 없습니다.')
    const cancellation = row.request === '취소 요청'
    if (approve) {
      row.status = '환불 대기'
      row.refundType = cancellation ? '취소' : '반품'
    }
    row.request = (cancellation ? '취소' : '반품') + (approve ? ' 승인' : ' 거절')
  }),
  refund: (actor, orderId) => operate(actor,() => {
    const row = find(state.orders,'orderId',orderId)
    if (row.status !== '환불 대기') throw new Error('환불 대기 주문만 처리할 수 있습니다.')
    for (const item of row.items) {
      const product = state.products.find(candidate => candidate.productId === item.productId)
      if (product) product.stock += item.quantity
    }
    row.status = '환불 완료'
    row.refundedAt = new Date().toISOString()
  }),
  memberStatus: (actor, userId, status) => operate(actor,() => {
    const row = find(state.users,'userId',userId)
    if (row.role === 'ADMIN' || !['정상','정지','비활성'].includes(status)) throw new Error('변경할 수 없는 계정 상태입니다.')
    row.status = status
  }),
  reviewVisibility: (actor, reviewId, hidden) => operate(actor,() => {
    find(state.reviews,'reviewId',reviewId).hidden = hidden
  }),
  answer: (actor, inquiryId, answer) => operate(actor,() => {
    if (!answer.trim()) throw new Error('답변을 입력해 주세요.')
    find(state.inquiries,'inquiryId',inquiryId).answer = answer.trim()
  }),
  saveNotice: (actor, {noticeId,title,body}) => operate(actor,() => {
    if (!title.trim() || !body.trim()) throw new Error('제목과 내용을 입력해 주세요.')
    const fields = {title:title.trim(),body:body.trim(),date:new Date().toISOString()}
    if (noticeId) Object.assign(find(state.notices,'noticeId',noticeId),fields)
    else state.notices.unshift({noticeId:id(),...fields})
  }),
  removeNotice: (actor, noticeId) => operate(actor,() => {
    state.notices = state.notices.filter(row => row.noticeId !== noticeId)
  }),
}


