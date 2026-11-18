export const categoryNames = {GPU:'그래픽카드',CASE:'케이스',CPU:'CPU',KEYBOARD:'키보드',MOUSE:'마우스',SSD:'SSD',SPEAKER:'스피커',HDD:'HDD',POWER:'파워',RAM:'메모리',MONITOR:'모니터',MAINBOARD:'메인보드'}
export const categoryCodes = Object.fromEntries(Object.entries(categoryNames).map(([key,value]) => [value,key]))
export const orderStatuses = {PENDING:'결제 대기',PAID:'결제 완료',PREPARING:'배송 준비',SHIPPED:'배송 중',DELIVERED:'배송 완료',COMPLETED:'구매 확정',CANCELLED:'주문 취소',REFUNDED:'환불 완료'}
export function memberModel(row) {
  return {...row,userId:String(row.id),username:row.loginId ?? '',hasPassword:Boolean(row.loginId),status:({ACTIVE:'정상',INACTIVE:'비활성',KICKED:'정지'})[row.status] ?? row.status}
}
export function productModel(row) {
  const category = categoryNames[row.category] ?? row.category
  return {...row,productId:String(row.id),category,brand:'',spec:row.specification ?? '',image:row.thumbnailUrl ?? '',gallery:(row.imageUrls ?? []).map((image,index) => ({image,color:'상품 이미지 '+(index+1)})),selling:row.status !== 'INACTIVE',stock:row.status === 'SOLD_OUT' ? 0 : row.stock,popularity:0,purposes:[],details:{overview:row.description ?? '',headline:row.name,description:row.description ?? '',features:[],sections:[],usage:[],checks:[],specifications:[['상품명',row.name],['카테고리',category],['사양',row.specification ?? '']]}}
}
export function reviewModel(row) {
  return {...row,reviewId:String(row.id),userId:row.memberId == null ? null : String(row.memberId),productId:String(row.productId),author:row.memberId == null ? '구매 회원' : '회원 '+row.memberId,body:row.content,date:row.createdAt,sentiment:null,hidden:false}
}
export function orderModel(row,products=[],delivery=null,returns=[]) {
  const pending = returns.filter(item => item.status === 'REQUESTED')
  const approved = returns.filter(item => item.status === 'APPROVED')
  return {...row,orderId:String(row.orderId),backendStatus:row.status,status:orderStatuses[row.status] ?? row.status,date:row.createdAt,total:row.totalAmount,items:row.items.map(item => {
    const product = products.find(product => product.productId === String(item.productId))
    return {...item,productId:String(item.productId),price:item.unitPrice,name:item.productName ?? product?.name ?? '상품 '+item.productId,category:product?.category ?? '',image:product?.image ?? ''}
  }),delivery:{recipient:row.shippingName,phone:row.shippingPhone,postcode:row.shippingZipcode,address:[row.shippingAddress1,row.shippingAddress2].filter(Boolean).join(' ')},carrier:delivery?.carrierName ?? '',tracking:delivery?.invoiceNumber ?? '',dispatchDate:delivery?.estimatedAt ?? '',shippingMemo:delivery?.deliveryMemo ?? '',shippingHistory:[],returns,request:pending.length ? '반품 요청' : approved.length ? '반품 승인' : '',returnRefundPending:approved.length > 0}
}
