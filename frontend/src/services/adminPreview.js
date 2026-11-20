import { seed,categories } from '../mocks/catalog'
const key='gt-admin-preview'
export function isAdminPreview(){
  if(typeof window==='undefined')return false
  try{if(new URLSearchParams(window.location.search).get('preview')==='1')sessionStorage.setItem(key,'1');return sessionStorage.getItem(key)==='1'}catch{return false}
}
export function leaveAdminPreview(){sessionStorage.removeItem(key);window.location.assign('/admin')}
export function openAdminPreview(){sessionStorage.setItem(key,'1')}
let cached
export function adminPreviewSnapshot(){
  if(cached)return cached
  const now=Date.now(),date=(days,hours=0)=>new Date(now-days*86400000-hours*3600000).toISOString()
  const names=['김민준','이지우','박서연','최도윤','정하준','강서윤','윤지호','장하린','임시우','한수아']
  const members=Array.from({length:145},(_,i)=>({userId:`PREVIEW-U${i+1}`,username:`sample${String(i+1).padStart(3,'0')}`,name:names[i%names.length],email:`sample${i+1}@example.com`,phone:'010-0000-0000',role:'USER',status:['정상','정상','정상','비활성','강퇴'][i%5],createdAt:date((i*i+3*i)%60)}))
  const products=seed.products.map((p,i)=>({...p,createdAt:date(i%40),stock:i%11===0 ? 0 : 8+(i*7)%50,selling:i%17!==0,backendStatus:i%17===0 ? 'INACTIVE' : i%11===0 ? 'SOLD_OUT' : 'ACTIVE'}))
  const statuses=[['PAID','결제 완료'],['PREPARING','배송 준비'],['SHIPPED','배송 중'],['DELIVERED','배송 완료'],['COMPLETED','구매 확정'],['CANCELLED','취소 완료'],['REFUNDED','환불 완료']]
  const orders=Array.from({length:240},(_,i)=>{const product=products[(i*7)%products.length],member=members[i%members.length],[backendStatus,status]=statuses[i%statuses.length],quantity=i%3+1;return {orderId:`PREVIEW-${2026110000+i+1}`,orderNumber:`GT${2026110000+i+1}`,userId:member.userId,memberId:member.userId,author:member.name,date:date(i%30,i%12),backendStatus,status,total:product.price*quantity,paymentMethod:i%3 ? '카드 결제' : '토스페이',delivery:{recipient:member.name,phone:'010-0000-0000',address:'화면 확인용 배송지'},items:[{productId:product.productId,name:product.name,category:product.category,image:product.image,price:product.price,quantity}],tracking:i%7>1 ? `PREVIEW${i+100000}` : ''}})
  const bodies=['제품이 깔끔하고 배송도 빨라서 만족합니다.','기존 부품과 호환이 잘 되고 안정적으로 작동합니다.','가격 대비 성능이 좋아 다음에도 구매하고 싶습니다.','포장 상태가 아쉬웠고 배송이 예상보다 늦었습니다.','사진과 같은 제품이고 설치도 어렵지 않았습니다.']
  const reviews=Array.from({length:180},(_,i)=>{const p=products[i%products.length],m=members[i%members.length];return {reviewId:`PREVIEW-R${i+1}`,userId:m.userId,author:m.name,productId:p.productId,productName:p.name,productImage:p.image,date:date(i%28),body:bodies[i%bodies.length],sentiment:i%5===3 ? '부정' : '긍정',sentimentSource:'mock',sentiment_score:i%5===3 ? .82 : .94,hidden:false}})
  const notices=Array.from({length:18},(_,i)=>({noticeId:`PREVIEW-N${i+1}`,title:['배송 일정 안내','서비스 점검 안내','신규 상품 입고 안내','교환·반품 이용 안내'][i%4],body:'목록과 페이지 이동을 확인하기 위한 샘플 공지입니다.',author:'관리자',date:date(i*2)}))
  const returns=orders.slice(0,30).map((o,i)=>({...o,returnId:`PREVIEW-T${i+1}`,returnStatus:['REQUESTED','APPROVED','REFUNDED'][i%3],returnReason:'화면 확인용 반품 요청',request:'반품 요청',requestedAt:o.date,refundAmount:o.total}))
  cached={categories,products,members,orders,reviews,notices,returns,inquiries:[],paging:{}}
  return cached
}
