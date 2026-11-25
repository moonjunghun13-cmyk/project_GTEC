const validStatuses=new Set(['PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'])
const validLabels=new Set(['결제 완료','배송 준비','배송 중','배송 완료','구매 확정'])
const dateFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'})
const finite=value=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value)) ? Number(value) : null
const monthIndex=month=>Number(month.slice(0,4))*12+Number(month.slice(5,7))-1
const monthName=index=>`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`
const day=value=>dateFormat.format(new Date(value))
const percent=(part,total)=>total ? Math.round(part/total*10000)/100 : null
export function buildPreviewCustomerReport(data,asOf=new Date()){
 const now=new Date(asOf),today=day(now),thisMonth=today.slice(0,7),members=(data.members||[]).filter(row=>row.role==='USER')
 const memberIds=new Set(members.map(row=>String(row.userId))),seen=new Set()
 const orders=(data.orders||[]).filter(row=>{
  const id=String(row.orderId),date=Date.parse(row.paidAt || row.date || row.createdAt),memberId=String(row.userId ?? row.memberId)
  if(seen.has(id) || !memberIds.has(memberId) || !(row.backendStatus ? validStatuses.has(row.backendStatus) : validLabels.has(row.status)) || !Number.isFinite(date) || date>now.getTime())return false
  seen.add(id);return true
 })
 const groups=new Map(),monthSets=new Map(),categorySets=new Map()
 for(const order of orders){
  const id=String(order.userId ?? order.memberId),rows=groups.get(id)||[];rows.push(order);groups.set(id,rows)
  const month=day(order.paidAt || order.date || order.createdAt).slice(0,7),buyers=monthSets.get(month)||new Set();buyers.add(id);monthSets.set(month,buyers)
  for(const item of order.items||[]){const name=item.category||'기타',buyers=categorySets.get(name)||new Set();buyers.add(id);categorySets.set(name,buyers)}
 }
 const customers=members.map(member=>{
  const rows=groups.get(String(member.userId))||[],products=new Map()
  for(const order of rows)for(const item of order.items||[]){const key=String(item.productId ?? item.name),product=products.get(key)||{id:key,name:item.name||'상품',image:item.image||'',quantity:0,amount:0};product.quantity+=finite(item.quantity)||0;product.amount+=(finite(item.price ?? item.unitPrice)||0)*(finite(item.quantity)||0);products.set(key,product)}
  const last=rows.length ? Math.max(...rows.map(row=>Date.parse(row.paidAt || row.date || row.createdAt))) : null
  return {id:String(member.userId),name:member.name||member.username||'회원',email:member.email||'',username:member.username||'',purchaseCount:rows.length,itemQuantity:[...products.values()].reduce((s,p)=>s+p.quantity,0),itemAmount:[...products.values()].reduce((s,p)=>s+p.amount,0),recencyDays:last===null ? null : Math.max(0,Math.floor((Date.parse(today+'T00:00:00+09:00')-Date.parse(day(last)+'T00:00:00+09:00'))/86400000)),items:[...products.values()],orders:rows,known:true,productsAvailable:true}
 })
 const buyers=customers.filter(row=>row.purchaseCount>0),repeat=buyers.filter(row=>row.purchaseCount>=2).length
 const retention=[]
 if(monthSets.size){const first=Math.min(...[...monthSets.keys()].map(monthIndex)),current=monthIndex(thisMonth);for(let i=Math.max(first+1,current-11);i<=current;i++){const before=monthSets.get(monthName(i-1))||new Set(),currentSet=monthSets.get(monthName(i))||new Set(),retained=[...before].filter(id=>currentSet.has(id)).length;retention.push({month:monthName(i),previous:before.size,current:currentSet.size,retained,rate:percent(retained,before.size),partial:monthName(i)===thisMonth})}}
 const baseMonth=monthName(monthIndex(thisMonth)-1),scores=[.86,.73,.61,.48,.35,.22]
 const predictions=customers.flatMap((customer,index)=>{const past=customer.orders.filter(order=>day(order.paidAt||order.date||order.createdAt).slice(0,7)<thisMonth);if(!past.length)return [];const last=Math.max(...past.map(order=>Date.parse(order.paidAt||order.date||order.createdAt))),score=scores[index%scores.length];return [{id:customer.id,name:customer.name,email:customer.email,purchaseCount:past.length,itemAmount:past.reduce((sum,row)=>sum+(row.items||[]).reduce((s,item)=>s+(finite(item.price ?? item.unitPrice)||0)*(finite(item.quantity)||0),0),0),recencyDays:Math.max(0,Math.floor((Date.parse(thisMonth+'-01T00:00:00+09:00')-last)/86400000)),score,predictedBuy:score>=.5,attention:score<.5}]})
 return {mode:'preview',asOf:today,summary:{registered:members.length,buyers:buyers.length,orderCount:orders.length,orderAmount:orders.reduce((sum,row)=>sum+(finite(row.total)||0),0)},customers,overviewPeriod:'전체 더미 구매 이력',overviewNote:'일반 회원의 정상 구매 기준 · 취소·환불 완료·결제 대기 제외',repurchase:{buyers:buyers.length,once:buyers.length-repeat,repeat,rate:percent(repeat,buyers.length),definition:'재구매율 = 2회 이상 구매한 고객 ÷ 전체 구매 고객 × 100'},retention:{months:retention,definition:'지난달 구매 고객 중 이번 달에도 구매한 고객의 비율입니다.'},predictions:{rows:predictions,baseMonth,month:thisMonth,threshold:.5,demo:true,note:'화면 확인을 위한 더미 예시 점수입니다. 실제 AI 예측 결과가 아닙니다.'},categories:[...categorySets].map(([name,ids])=>[name,ids.size]).sort((a,b)=>b[1]-a[1]),errors:{}}
}
export function buildLiveCustomerReport(insights,members=[]){
 const data=insights||{},summary=data.summary||{},repurchase=data.repurchase||{},predictions=data.predictions||{},registry=new Map(members.filter(row=>row.role==='USER').map(row=>[String(row.userId),row]))
 const predictionRows=(predictions.predictions||[]).map(row=>{
  const id=String(row.member_id),member=registry.get(id),score=finite(row.model_probability)
  return {id,name:member?.name||`회원 ${id}`,email:member?.email||'',purchaseCount:finite(row.purchase_count),itemAmount:finite(row.total_spent),recencyDays:finite(row.recency_days),score:score!==null && score>=0 && score<=1 ? score : null,predictedBuy:typeof row.predicted_buy==='boolean' ? row.predicted_buy : null,attention:typeof row.attention_candidate==='boolean' ? row.attention_candidate : null}
 })
 const byId=new Map(predictionRows.map(row=>[row.id,row]))
 const ids=new Set([...registry.keys(),...byId.keys()])
 const customers=[...ids].map(id=>{const member=registry.get(id),row=byId.get(id);return {id,name:member?.name||row?.name||`회원 ${id}`,email:member?.email||'',username:member?.username||'',purchaseCount:row?.purchaseCount ?? null,itemAmount:row?.itemAmount ?? null,itemQuantity:null,recencyDays:row?.recencyDays ?? null,items:[],orders:[],known:Boolean(row),productsAvailable:false}})
 return {mode:'api',asOf:summary.as_of||'',summary:{registered:finite(summary.registered_user_count),buyers:finite(summary.purchasing_customer_count),orderCount:finite(summary.order_count),orderAmount:finite(summary.total_order_amount)},customers,overviewPeriod:predictions.base_month ? `${predictions.base_month} 말 기준` : '고객별 집계 기준 확인 중',overviewNote:'회원별 구매 횟수·상품 구매액은 예측 기준월 말까지의 이력입니다. 현재 API에는 상품명·수량 상세가 포함되지 않습니다.',repurchase:{buyers:finite(repurchase.purchasing_customer_count),once:finite(repurchase.one_time_customer_count),repeat:finite(repurchase.repeat_customer_count),rate:finite(repurchase.repurchase_rate_percent),definition:repurchase.definition||'재구매율 = 2회 이상 구매한 고객 ÷ 전체 구매 고객 × 100'},retention:{months:(data.retention?.months||[]).map(row=>({month:row.month,previous:finite(row.previous_month_customers),current:finite(row.current_month_customers),retained:finite(row.retained_customers),rate:finite(row.retention_rate_percent),partial:Boolean(row.is_partial_month)})),definition:data.retention?.definition||'지난달 구매 고객 중 이번 달에도 구매한 고객의 비율입니다.'},predictions:{rows:predictionRows,baseMonth:predictions.base_month||'',month:predictions.prediction_month||'',threshold:finite(predictions.decision_threshold),demo:false,note:predictions.note||'모델 점수는 검증된 실제 구매 확률을 의미하지 않습니다.'},categories:[],errors:data.errors||{}}
}
