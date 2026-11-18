import { api, request, allPages, refreshAccess, setAccessToken } from '../api/backend'
import { categoryNames, categoryCodes, memberModel, productModel, reviewModel, orderModel } from './backendModels'
import { presentProduct, categories, purposes } from './catalogPresentation'

export const checkoutPaymentGroups = [{label:'결제',methods:['토스페이먼츠']}]
export const unsupported = feature => { throw new Error(feature+' 기능은 현재 백엔드에서 지원하지 않습니다.') }
let products = []
const noticeModel = row => ({...row,noticeId:String(row.id),body:row.content,date:row.createdAt})
const me = async () => memberModel(await request('get','/members/me'))
const catalog = async () => {
  products = (await request('get','/products')).map(productModel).map(presentProduct)
  return {products,categories,purposes}
}
async function orders(admin=false) {
  const rows = await allPages(admin ? '/admin/orders' : '/orders')
  return Promise.all(rows.map(async row => {
    const [delivery,returns] = await Promise.all([
      request('get',`${admin ? '/admin' : ''}/orders/${row.orderId}/delivery`),
      admin ? Promise.resolve([]) : request('get',`/orders/${row.orderId}/returns`),
    ])
    return orderModel(row,products,delivery,returns)
  }))
}
export const shop = {
  catalog, me,
  restore: async () => { try { await refreshAccess(); return await me() } catch (error) { if (error.status === 401) return null; throw error } },
  login: async (loginId,password) => { const tokens = await request('post','/members/login',{loginId,password}); setAccessToken(tokens.accessToken); return me() },
  logout: async () => { await request('post','/members/logout',{}, {skipRefresh:true}); setAccessToken('') },
  signup: async fields => memberModel(await request('post','/members/signup',{loginId:fields.username,name:fields.name,email:fields.email,tel:fields.phone,password:fields.password,passwordCheck:fields.password,termsAgreed:fields.agreed,privacyAgreed:fields.agreed})),
  checkUsername: () => unsupported('아이디 중복 사전 확인'),
  socialPreview: provider => { window.location.assign((import.meta.env.VITE_BACKEND_ORIGIN || '')+'/oauth2/authorization/'+provider); return new Promise(() => {}) },
  socialSignIn: () => unsupported('Mock 소셜 로그인'),
  socialExchange: async code => { const result = await request('post','/members/social-exchange',{code}); if (result.tokens) setAccessToken(result.tokens.accessToken); return result },
  socialSignup: async (signupToken,fields) => { const {data} = await api.post('/members/social-signup',fields,{headers:{Authorization:'Bearer '+signupToken}}); setAccessToken(data.accessToken); return me() },
  profile: async (id,fields) => { const current = await me(); if (fields.username !== current.username) throw new Error('아이디는 변경할 수 없습니다.'); return memberModel(await request('put','/members/me',{name:fields.name,email:fields.email})) },
  changePassword: async (id,password,newPassword) => { await request('put','/members/password',{password,newPassword,passwordCheck:newPassword}); return me() },
  support: async () => { const [faqs,notices] = await Promise.all([request('get','/faqs'),request('get','/notices')]); return {faqs:faqs.map(row => ({...row,body:row.content})),notices:notices.map(noticeModel)} },
  inquiries: async () => [], inquiry: () => unsupported('일대일 문의'),
  searchAddresses: () => unsupported('주소 검색 API'),
  recommendations: async () => [],demoRecommendations: async () => [],
  orders: () => orders(),
  orderDetail: id => request('get','/orders/'+id),
  memberSummary: async () => { const [rows,reviews] = await Promise.all([orders(),request('get','/reviews/me')]); return {orders:rows,reviewCount:reviews.length,inquiryCount:null} },
  reviews: async id => (await allPages(`/products/${id}/reviews`)).map(reviewModel),
  review: async (user,id,rating,body,orderItemId) => { if (!orderItemId) throw new Error('구매 상품 번호를 확인해 주세요.'); return reviewModel(await request('post',`/products/${id}/reviews`,{orderItemId,rating,content:body})) },
  requestOrder: async (user,id) => {
    const row = await request('get',`/orders/${id}`)
    if (row.status === 'PENDING') return request('patch',`/orders/${id}/cancel`,{reason:'CHANGE_OF_MIND'})
    if (row.status === 'PAID') return request('post',`/payments/${row.orderNumber}/cancel`,undefined,{params:{cancelReason:'고객 주문 취소'}})
    unsupported('현재 주문 상태에서 취소 또는 주문 전체 반품')
  },
  createOrder: async (items,delivery) => request('post','/orders',{items:items.map(({productId,quantity}) => ({productId:Number(productId),quantity})),shippingName:delivery.recipient,shippingPhone:delivery.phone,shippingZipcode:delivery.postcode,shippingAddress1:delivery.address,shippingAddress2:delivery.detail ?? '',paymentMethod:'TOSS'}),
  preparePayment: orderNumber => request('post','/payments/ready',{orderNumber}),
  confirmPayment: fields => request('post','/payments/confirm',fields),
  payment: orderNumber => request('get','/payments/'+orderNumber),
  order: () => unsupported('모의 결제'),
  cart: () => request('get','/cart'),
  addCart: (productId,quantity) => request('post','/cart/items',{productId:Number(productId),quantity}),
  setCart: (cartId,quantity) => request('patch','/cart/items/'+cartId,{quantity}),
  removeCart: cartId => request('delete','/cart/items/'+cartId),
  wishlist: () => request('get','/wishlist'),
  favorite: (id,add) => request(add ? 'post' : 'delete','/wishlist/'+id),
}
export const admin = {
  snapshot: async () => {
    await catalog()
    const [rows,members,reviews,notices,returns] = await Promise.all([orders(true),request('get','/admin'),allPages('/admin/reviews'),request('get','/notices'),request('get','/admin/returns')])
    for (const row of rows) {
      row.returns = returns.filter(item => String(item.orderId) === row.orderId)
      row.request = row.returns.some(item => item.status === 'REQUESTED') ? '반품 요청' : ''
      row.returnRefundPending = row.returns.some(item => item.status === 'APPROVED')
    }
    return {categories:Object.values(categoryNames),products,orders:rows,members:members.map(memberModel),reviews:reviews.map(reviewModel),inquiries:[],notices:notices.map(noticeModel)}
  },
  saveProduct: async (actor,fields) => {
    if (!categoryCodes[fields.category]) throw new Error('상품 카테고리를 확인해 주세요.')
    if (!fields.image || !/^(https?:\/\/|\/(?!\/))/.test(fields.image) || fields.image.length > 255) throw new Error('대표 이미지 URL은 http 또는 /로 시작하는 255자 이하 주소로 입력해 주세요.')
    const original = products.find(row => row.productId === fields.productId)
    const imageUrls = original?.imageUrls?.length ? original.imageUrls : [fields.image]
    const data = {name:fields.name,category:categoryCodes[fields.category],stock:fields.stock,description:fields.description,specification:fields.spec,price:fields.price,thumbnailUrl:fields.image,images:imageUrls.map(imageUrl => ({imageUrl}))}
    const saved = await request(fields.productId ? 'patch' : 'post','/admin/products'+(fields.productId ? '/'+fields.productId : ''),data)
    if ((saved.status !== 'INACTIVE') !== fields.selling) await request('patch',`/admin/products/${saved.id}/status`,{status:fields.selling ? 'ACTIVE' : 'INACTIVE'})
    return saved
  },
  removeProduct: (actor,id) => request('delete','/admin/products/'+id),
  memberStatus: (actor,id,status) => request('patch',`/admin/${id}/${({정상:'activate',비활성:'inactivate',정지:'kick'})[status]}`),
  saveNotice: (actor,fields) => { if (fields.noticeId) unsupported('JWT 인증 공지 수정'); return request('post','/notices',{title:fields.title,content:fields.body}) },
  removeNotice: () => unsupported('JWT 인증 공지 삭제'),
  reviewVisibility: () => unsupported('리뷰 숨김'),answer: () => unsupported('문의 답변'),
  advanceOrder: async (actor,id,tracking) => {
    const row = (await orders(true)).find(row => row.orderId === id)
    if (row.backendStatus === 'PAID') unsupported('상품 준비 상태 변경')
    if (row.backendStatus === 'PREPARING') throw new Error('배송 상세에서 택배사와 운송장을 등록한 뒤 발송해 주세요.')
    if (row.backendStatus !== 'SHIPPED') throw new Error('변경할 수 없는 배송 상태입니다.')
    return request('patch',`/admin/orders/${id}/delivery`,{status:'COMPLETED'})
  },
  saveShipping: async (actor,id,fields) => {
    const row = (await orders(true)).find(row => row.orderId === id)
    if (row.backendStatus === 'PAID') unsupported('상품 준비 상태 변경')
    if (fields.memo?.trim()) unsupported('관리자 배송 메모 저장')
    if (row.backendStatus === 'PREPARING') await request('put',`/admin/orders/${id}/delivery`,{carrierCode:fields.carrier,carrierName:fields.carrier,invoiceNumber:fields.tracking,estimatedAt:fields.dispatchDate || null})
    if (fields.status === '배송 중' && row.backendStatus === 'PREPARING') return request('patch',`/admin/orders/${id}/delivery`,{status:'DELIVERING',estimatedAt:fields.dispatchDate || null})
    if (fields.status === '배송 완료' && row.backendStatus === 'SHIPPED') return request('patch',`/admin/orders/${id}/delivery`,{status:'COMPLETED'})
  },
  resolveOrder: () => unsupported('주문 단위 승인과 거절 화면'),
  refund: () => unsupported('PG 반품 환불'),
}
