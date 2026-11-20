import { productStatus } from './adminProducts'
import { readReviewSentiment } from './reviewSentiment'
const orderRank={PENDING:0,PAID:1,PREPARING:2,SHIPPED:3,DELIVERED:4,COMPLETED:5,CANCELLED:6,REFUNDED:7}
export function filterAdminRows(source,{page,search='',category='',status='',sort='newest',sentiment=''}) {
  const term=search.trim().toLocaleLowerCase()
  const rows=source.filter(row=>{
    if(page==='products' && ((category && row.category!==category) || (status && productStatus(row)!==status)))return false
    if(page==='orders' && status && row.backendStatus!==status)return false
    if(page==='reviews' && (sentiment && readReviewSentiment(row).label!==sentiment))return false
    const text=page==='reviews' ? [row.reviewId,row.author,row.body,row.productName] : Object.values(row)
    return !term || text.some(value=>typeof value==='string' && !value.startsWith('data:') && value.toLocaleLowerCase().includes(term))
  })
  const dateValue=row=>Date.parse(row.date ?? row.updated_at ?? row.createdAt) || 0
  const byId=(a,b)=>String(b.productId ?? b.orderId ?? b.reviewId).localeCompare(String(a.productId ?? a.orderId ?? a.reviewId),'en',{numeric:true})
  const newest=(a,b)=>dateValue(b)-dateValue(a) || byId(a,b)
  return rows.sort((a,b)=>{
    if(sort==='name')return String(a.name).localeCompare(String(b.name),'ko') || byId(a,b)
    if(sort==='price-low')return a.price-b.price || byId(a,b)
    if(sort==='price-high')return b.price-a.price || byId(a,b)
    if(sort==='oldest')return -newest(a,b)
    if(sort==='status')return (page==='products' ? ({ACTIVE:0,SOLD_OUT:1,INACTIVE:2}[productStatus(a)]-({ACTIVE:0,SOLD_OUT:1,INACTIVE:2}[productStatus(b)]))
      : (orderRank[a.backendStatus]??99)-(orderRank[b.backendStatus]??99)) || newest(a,b)
    return newest(a,b)
  })
}
