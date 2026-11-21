import { seed,categories } from '../mocks/catalog'
const key='gt-admin-preview'
export function isAdminPreview(){
  if(typeof window==='undefined')return false
  try{if(new URLSearchParams(window.location.search).get('preview')==='1')sessionStorage.setItem(key,'1');return sessionStorage.getItem(key)==='1'}catch{return false}
}
export function leaveAdminPreview(){sessionStorage.removeItem(key)}
export function openAdminPreview(){sessionStorage.setItem(key,'1')}
const dataKey='gt-admin-preview-data-v2'
const copy=value=>JSON.parse(JSON.stringify(value))
let cached=restorePreview()
export function adminPreviewSnapshot(){
  if(cached){completeProductPresentation(cached.products);return copy(cached)}
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
  cached={version:2,sequence:0,batches:0,categories,products,members,orders,reviews,notices,returns,faqs:Array.from({length:12},(_,i)=>({id:`PREVIEW-FAQ${i}`,title:['배송 기간은 얼마나 걸리나요?','제품 호환성은 어떻게 확인하나요?','교환 및 반품은 어떻게 신청하나요?','결제 수단을 변경할 수 있나요?'][i%4]+' '+(Math.floor(i/4)+1),content:'더미 FAQ입니다. 질문과 답변을 수정해서 저장할 수 있습니다.'})),inquiries:[],paging:{}}
  completeProductPresentation(cached.products)
  persistPreview()
  return copy(cached)
}

function restorePreview(){
  if(typeof window==='undefined')return null
  try{const value=JSON.parse(sessionStorage.getItem(dataKey)||'null');if(value?.version===2 && ['products','members','orders','reviews','returns','notices','faqs'].every(k=>Array.isArray(value[k])))return value}catch{}
  return null
}
function persistPreview(){
  if(typeof window==='undefined')return
  try{sessionStorage.setItem(dataKey,JSON.stringify(cached))}catch{throw new Error('브라우저 저장 공간이 부족해 저장하지 못했습니다. 이미지 파일 크기를 줄여 주세요.')}
}
function id(prefix){return `PREVIEW-${prefix}-${++cached.sequence}`}
function find(section,key,value){const row=cached[section].find(r=>String(r[key])===String(value));if(!row)throw new Error('더미 데이터에서 항목을 찾을 수 없습니다.');return row}
export function appendAdminPreviewBatch(){
  adminPreviewSnapshot()
  const before=copy(cached),batch=++cached.batches,now=new Date().toISOString()
  try{
    const newProducts=categories.map((category,i)=>{const p=cached.products.find(r=>r.category===category);return {...copy(p),productId:id('PRODUCT'),name:`${p.name.replace(/ \(더미.*\)$/,'')} (더미 ${batch})`,createdAt:now,stock:15+((batch+i)*7)%70,selling:true,backendStatus:'ACTIVE'}})
    cached.products.push(...newProducts)
    const names=['김민준','이지우','박서연','최도윤','정하준','강서윤','윤지호','장하린','임시우','한수아']
    const members=Array.from({length:30},(_,i)=>{const userId=id('MEMBER');return {userId,username:`dummy${batch}_${i+1}`,name:names[(batch+i)%names.length],email:`dummy${batch}_${i+1}@example.com`,phone:'010-0000-0000',role:'USER',status:i%12===0 ? '비활성' : '정상',createdAt:new Date(Date.now()-((i*7+batch)%14)*86400000).toISOString()}})
    cached.members.push(...members)
    const stages=[['PAID','결제 완료'],['PREPARING','배송 준비'],['SHIPPED','배송 중'],['DELIVERED','배송 완료'],['COMPLETED','구매 확정'],['CANCELLED','취소 완료'],['REFUNDED','환불 완료']]
    const orders=Array.from({length:60},(_,i)=>{const p=cached.products[(i*11+batch)%cached.products.length],m=members[i%members.length],[backendStatus,status]=stages[(i+batch)%stages.length],quantity=i%3+1;return {orderId:id('ORDER'),orderNumber:`DUMMY-${batch}-${i+1}`,userId:m.userId,memberId:m.userId,author:m.name,date:new Date(Date.now()-((i*5+batch)%21)*86400000-i*60000).toISOString(),backendStatus,status,total:p.price*quantity,shippingFee:0,paymentMethod:i%3 ? '카드 결제' : '토스페이',delivery:{recipient:m.name,phone:m.phone,address:'더미 배송지',postcode:'00000'},items:[{orderItemId:id('ITEM'),productId:p.productId,name:p.name,category:p.category,image:p.image,price:p.price,quantity}],carrier:['SHIPPED','DELIVERED','COMPLETED'].includes(backendStatus) ? 'CJ대한통운' : '',tracking:['SHIPPED','DELIVERED','COMPLETED'].includes(backendStatus) ? `DUMMY${batch}${i+100000}` : ''}})
    cached.orders.push(...orders)
    const bodies=['배송이 빠르고 제품도 만족스럽습니다.','호환이 잘 되고 안정적으로 작동합니다.','설치가 쉽고 가격 대비 성능이 좋습니다.','배송이 늦고 포장 상태가 아쉬웠습니다.','상품 설명과 같고 잘 사용하고 있습니다.']
    const reviews=Array.from({length:45},(_,i)=>{const p=cached.products[(i*7+batch)%cached.products.length],m=members[i%members.length];return {reviewId:id('REVIEW'),userId:m.userId,author:m.name,productId:p.productId,productName:p.name,productImage:p.image,date:new Date(Date.now()-((i+batch)%14)*86400000).toISOString(),body:bodies[(i+batch)%bodies.length],sentiment:(i+batch)%5===3 ? '부정' : '긍정',sentimentSource:'mock',sentiment_score:.9,hidden:false}})
    cached.reviews.push(...reviews)
    const returns=orders.filter(o=>['DELIVERED','COMPLETED'].includes(o.backendStatus)).slice(0,10).map((o,i)=>({...copy(o),returnId:id('RETURN'),returnStatus:['REQUESTED','APPROVED','REFUNDED'][i%3],request:'반품 요청',returnReason:'더미 반품 요청',requestedAt:now,refundAmount:o.total}))
    cached.returns.push(...returns)
    cached.notices.push(...Array.from({length:3},(_,i)=>({noticeId:id('NOTICE'),title:['배송 일정 안내','신규 상품 입고 안내','서비스 점검 안내'][i]+` · 더미 ${batch}`,body:'등록·수정·삭제와 페이지 이동을 확인하기 위한 더미 공지입니다.',author:'관리자',date:now})))
    cached.lastGeneration={batch,date:now,products:12,members:30,orders:60,reviews:45,returns:returns.length,notices:3,totals:{products:cached.products.length,members:cached.members.length,orders:cached.orders.length,reviews:cached.reviews.length}}
    persistPreview()
    if(typeof window!=='undefined')sessionStorage.setItem(key,'1')
    return copy(cached.lastGeneration)
  }catch(e){cached=before;throw e}
}
export function applyAdminPreviewAction(method,args=[]){
  adminPreviewSnapshot()
  if(method==='snapshot')return adminPreviewSnapshot()
  if(method==='getDelivery'){const row=find('orders','orderId',args[1]);return {carrierName:row.carrier,invoiceNumber:row.tracking,estimatedAt:row.dispatchDate,deliveryMemo:row.shippingMemo}}
  const before=copy(cached),now=new Date().toISOString()
  let result
  try{
    const value=args[1]
    if(method==='saveProduct'){
      const fields=copy(value)
      if(!fields.name?.trim() || !categories.includes(fields.category) || !Number.isSafeInteger(fields.price) || fields.price<=0 || !Number.isSafeInteger(fields.stock) || fields.stock<0)throw new Error('상품명·카테고리·가격·재고를 확인해 주세요.')
      const row=fields.productId ? find('products','productId',fields.productId) : {productId:id('PRODUCT'),createdAt:now}
      Object.assign(row,fields,{productId:row.productId,backendStatus:fields.selling===false ? 'INACTIVE' : fields.stock===0 ? 'SOLD_OUT' : 'ACTIVE'})
      row.imageUrls=[...new Set([fields.image,...(fields.imageUrls||[])].filter(Boolean))];row.gallery=row.imageUrls.map((image,i)=>({image,color:i ? `사진 ${i+1}` : '대표'}))
      if(!fields.productId)cached.products.unshift(row)
      result=row.productId
    }else if(method==='setProductSelling'){const row=find('products','productId',value);row.selling=Boolean(args[2]);row.backendStatus=row.selling ? row.stock===0 ? 'SOLD_OUT' : 'ACTIVE' : 'INACTIVE'}
    else if(method==='removeProduct')cached.products=cached.products.filter(r=>r.productId!==value)
    else if(method==='saveShipping' || method==='advanceOrder'){
      const row=find('orders','orderId',value),stages=['결제 완료','배송 준비','배송 중','배송 완료'],codes=['PAID','PREPARING','SHIPPED','DELIVERED'],current=stages.indexOf(row.status)
      const fields=method==='saveShipping' ? copy(args[2]) : {status:stages[current+1],tracking:args[2] || row.tracking,carrier:row.carrier || 'CJ대한통운'}
      const target=stages.indexOf(fields.status)
      if(current<0 || target<current || target>current+1 || row.request?.endsWith('요청'))throw new Error('현재 주문 상태에서는 변경할 수 없습니다.')
      if(target>=2 && (!fields.carrier?.trim() || !fields.tracking?.trim()))throw new Error('택배사와 운송장 번호를 입력해 주세요.')
      Object.assign(row,{status:fields.status,backendStatus:codes[target],carrier:fields.carrier || '',tracking:fields.tracking || '',dispatchDate:fields.dispatchDate || '',shippingMemo:fields.memo || '',shippingUpdatedAt:now,shipmentId:row.shipmentId || id('SHIP')})
      row.shippingHistory ??=[];row.shippingHistory.push({date:now,status:row.status,message:'더미 배송 정보 저장'});result=copy(row)
    }else if(method==='memberStatus')find('members','userId',value).status=args[2]
    else if(method==='memberUpdate'){if(!['USER','ADMIN'].includes(args[1].role) || !['정상','비활성','강퇴'].includes(args[1].status))throw new Error('회원 권한과 상태를 확인해 주세요.');Object.assign(find('members','userId',args[0]),copy(args[1]))}
    else if(method==='reviewVisibility')cached.reviews=cached.reviews.filter(r=>r.reviewId!==value)
    else if(method==='reviewSentiment'){
      if(!['긍정','부정'].includes(args[1]))throw new Error('감정 표시를 선택해 주세요.')
      Object.assign(find('reviews','reviewId',args[0]),{sentiment:args[1],sentimentSource:'mock',sentiment_score:null,sentimentManuallySet:true})
    }else if(method==='resolveReturn'){
      const row=find('returns','returnId',value)
      if(row.returnStatus!=='REQUESTED')throw new Error('요청 상태인 반품만 처리할 수 있습니다.')
      const amount=Number(args[3]);if(args[2] && (!Number.isSafeInteger(amount) || amount<=0 || amount>row.total))throw new Error('환불 금액을 확인해 주세요.')
      Object.assign(row,{returnStatus:args[2] ? 'APPROVED' : 'REJECTED',refundAmount:args[2] ? amount : 0,processedAt:now})
    }else if(method==='markReturnRefunded'){
      const row=find('returns','returnId',args[0]);if(row.returnStatus!=='APPROVED')throw new Error('승인된 반품만 완료 처리할 수 있습니다.')
      row.returnStatus='REFUNDED';row.refundedAt=now
      const order=cached.orders.find(o=>o.orderId===row.orderId);if(order)Object.assign(order,{status:'환불 완료',backendStatus:'REFUNDED',refundedAt:now})
    }else if(method==='saveNotice'){
      const f=copy(value);if(!f.title?.trim() || !f.body?.trim())throw new Error('제목과 내용을 입력해 주세요.')
      const row=f.noticeId ? find('notices','noticeId',f.noticeId) : {noticeId:id('NOTICE')},noticeId=row.noticeId;Object.assign(row,f,{noticeId,date:now,author:'관리자'});if(!f.noticeId)cached.notices.unshift(row);result=copy(row)
    }else if(method==='removeNotice')cached.notices=cached.notices.filter(r=>r.noticeId!==value)
    else if(method==='saveFaq'){
      const [faqId,fields]=args;if(!fields.title?.trim() || !fields.content?.trim())throw new Error('질문과 답변을 입력해 주세요.')
      const row=faqId ? find('faqs','id',faqId) : {id:id('FAQ')};Object.assign(row,copy(fields));if(!faqId)cached.faqs.unshift(row);result=copy(row)
    }else if(method==='removeFaq')cached.faqs=cached.faqs.filter(r=>r.id!==args[0])
    else throw new Error('이 더미 작업은 아직 지원하지 않습니다.')
    persistPreview();if(method==='saveProduct')args[1].productId=result;return result
  }catch(e){cached=before;throw e}
}

export const adminPreviewEvent='gt-admin-preview-updated'

function completeProductPresentation(products){
 for(const product of products){
  if(!product.spec?.trim())product.spec=product.displaySpecifications?.map?.(row=>Array.isArray(row) ? row.join(': ') : String(row)).join(' · ') || product.name
  if(!product.description?.trim())product.description=product.details?.description || `${product.name} 상품입니다.\n${product.spec}`
  if(!Array.isArray(product.imageUrls))product.imageUrls=[...new Set([product.image,...(product.gallery||[]).map(row=>row.image)].filter(Boolean))]
 }
}
