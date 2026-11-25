import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {buildPreviewCustomerReport,buildLiveCustomerReport} from '../src/services/customerAnalytics.js'
const members=[{userId:'1',role:'USER',name:'가'},{userId:'2',role:'USER',name:'나'},{userId:'3',role:'USER',name:'미구매'},{userId:'9',role:'ADMIN'}]
const order=(id,user,date,status='PAID')=>({orderId:id,userId:user,date,backendStatus:status,total:250,items:[{productId:'p1',name:'상품',category:'CPU',price:100,quantity:2}]})
const orders=[order('a','1','2026-09-10T00:00:00Z'),order('b','1','2026-10-10T00:00:00Z'),order('c','2','2026-10-31T15:00:00Z'),order('d','1','2026-11-10T00:00:00Z'),order('e','9','2026-11-10T00:00:00Z'),order('f','2','2026-10-10T00:00:00Z','REFUNDED'),order('g','2','2026-10-10T00:00:00Z','CANCELLED'),order('h','2','2026-12-01T00:00:00Z')]
orders.push({...orders[0]})
const preview=buildPreviewCustomerReport({members,orders},new Date('2026-11-21T03:00:00Z'))
assert.equal(preview.summary.orderCount,4,'exclude admin, duplicate, cancelled, refunded and future')
assert.equal(preview.summary.orderAmount,1000,'final payment includes fees')
assert.equal(preview.customers.find(r=>r.id==='1').itemAmount,600,'item subtotal excludes fees')
assert.equal(preview.customers.find(r=>r.id==='1').itemQuantity,6)
assert.equal(preview.repurchase.rate,50,'repeat / buying customers, excludes non-buyers')
assert.deepEqual(preview.retention.months.map(r=>[r.month,r.previous,r.current,r.retained,r.rate]),[['2026-10',1,1,1,100],['2026-11',1,2,1,100]],'KST month boundary and intersection')
assert.equal(preview.retention.months.at(-1).partial,true)
assert.equal(preview.predictions.rows.length,1,'current-month-only buyer must not leak into prior-month prediction')
assert.equal(preview.predictions.rows[0].purchaseCount,2)
const gap=buildPreviewCustomerReport({members,orders:[orders[0],orders[3]]},new Date('2026-11-21T03:00:00Z'))
assert.equal(gap.retention.months.at(-1).rate,null,'no previous-month buyers is undefined, not zero percent')
assert.equal(buildPreviewCustomerReport({members,orders:[]}).repurchase.rate,null)
const live=buildLiveCustomerReport({summary:{registered_user_count:3},predictions:{base_month:'2026-10',prediction_month:'2026-11',decision_threshold:.7,predictions:[{member_id:1,purchase_count:2,total_spent:200,model_probability:.65,predicted_buy:false,attention_candidate:true},{member_id:2,model_probability:2,predicted_buy:true,attention_candidate:false}]}},members)
assert.equal(live.customers.find(r=>r.id==='3').purchaseCount,null,'missing aggregation must not be represented as non-buyer')
assert(live.customers.every(r=>!r.productsAvailable&&!r.items.length),'do not invent product details')
assert.equal(live.predictions.rows[0].predictedBuy,false,'respect actual server decision threshold')
assert.equal(live.predictions.rows[1].score,null,'reject invalid score')
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {api}=await server.ssrLoadModule('/src/api/index.js')
 const services=await server.ssrLoadModule('/src/services/index.js')
 const calls=[]
 api.defaults.adapter=async config=>{calls.push(config.url);if(config.url.endsWith('monthly-retention'))throw new Error('retention unavailable');return {data:{as_of:'2026-11-21'},status:200,statusText:'OK',headers:{},config}}
 const report=await services.getCustomerInsights()
 assert.equal(calls.length,4);assert(report.summary);assert(report.errors.retention)
 assert(!calls.some(url=>url.includes('training')),'optional model state must not delay initial analysis')
 await services.getCustomerModelStatus();assert.equal(calls.length,5);assert(calls.at(-1).endsWith('model-training-status'))
 api.defaults.adapter=async()=>{throw new Error('offline')}
 await assert.rejects(services.getCustomerInsights(),/연결하지 못했습니다/)
 const {adminPreviewSnapshot}=await server.ssrLoadModule('/src/services/adminPreview.js')
 const fixture=buildPreviewCustomerReport(adminPreviewSnapshot())
 assert(fixture.customers.length>0);assert(fixture.summary.orderCount>0);assert(fixture.customers.some(r=>r.items.length))
 console.log('Customer analytics passed: purchase totals, KST retention, prediction cutoff, null semantics, partial API failure and lazy model status.')
}finally{await server.close()}
