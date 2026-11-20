import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createAdminReader} from '../src/services/adminPaging.js'
let calls=[]
const reader=createAdminReader(async(path,config)=>{calls.push({path,config});return path==='/members' ? {data:Array.from({length:10000},(_,id)=>({id}))} : {data:{content:[{id:1}],number:config.params.page,totalElements:200000,totalPages:10000}}})
await reader.page('/orders',{page:4,size:20,status:'PREPARING'})
assert.equal(calls.length,1,'A 10,000-page response must trigger only one request')
assert.equal(calls[0].path,'/orders/status');assert.equal(calls[0].config.params.page,4)
assert.equal(calls[0].config.params.status,'PREPARING')
await Promise.all([reader.array('/members'),reader.array('/members')]);await reader.array('/members')
assert.equal(calls.filter(row=>row.path==='/members').length,1,'Array requests must share a cache')
reader.clear();await reader.array('/members');assert.equal(calls.filter(row=>row.path==='/members').length,2)
const controller=new AbortController();let forwarded
await createAdminReader(async(_,config)=>{forwarded=config.signal;return {data:{content:[],number:0,totalPages:0,totalElements:0}}}).page('/orders',{signal:controller.signal})
assert.equal(forwarded,controller.signal)
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {adminPreviewSnapshot}=await server.ssrLoadModule('/src/services/adminPreview.js')
 const preview=adminPreviewSnapshot()
 for(const [section,count,id] of [['products',120,'productId'],['orders',240,'orderId'],['members',145,'userId'],['reviews',180,'reviewId']]){
   assert.equal(preview[section].length,count)
   assert.equal(new Set(preview[section].map(row=>row[id])).size,count)
 }
 assert.equal(preview.categories.length,12)
 assert(preview.orders.every(row=>preview.members.some(m=>m.userId===row.userId)))
 assert(preview.reviews.every(row=>!('rating' in row) && preview.products.some(p=>p.productId===row.productId)))
 for(const columns of [2,3,4,5,6,7]){
   const size=columns*3
   const first=preview.products.slice(0,size),second=preview.products.slice(size,size*2)
   assert.equal(first.length%columns,0)
   assert(!first.some(a=>second.some(b=>a.productId===b.productId)))
 }
 const {filterAdminRows}=await server.ssrLoadModule('/src/services/adminRecords.js')
 const returnRows=[{returnId:'1',returnStatus:'REQUESTED'},{returnId:'2',returnStatus:'REFUNDED'},{returnId:'3',returnStatus:'APPROVED'}]
 assert.deepEqual(filterAdminRows(returnRows,{page:'refunds',status:'APPROVED'}).map(r=>r.returnId),['3'])
 assert.deepEqual(filterAdminRows(returnRows,{page:'refunds',sort:'status'}).map(r=>r.returnStatus),['REQUESTED','APPROVED','REFUNDED'])
 const members=[{userId:'1',status:'강퇴'},{userId:'2',status:'정상'},{userId:'3',status:'비활성'}]
 assert.deepEqual(filterAdminRows(members,{page:'members',status:'비활성'}).map(r=>r.userId),['3'])
 assert.deepEqual(filterAdminRows(members,{page:'members',sort:'status'}).map(r=>r.status),['정상','비활성','강퇴'])
 const {api}=await server.ssrLoadModule('/src/api/index.js')
 const {admin}=await server.ssrLoadModule('/src/services/index.js')
 let requests=[]
 api.defaults.adapter=async config=>{
   requests.push({url:config.url,params:config.params})
   const isPage=['/api/admin/orders','/api/admin/orders/status','/api/admin/reviews'].includes(config.url)
   const data=isPage ? {content:[],number:config.params.page,totalPages:10000,totalElements:200000} : []
   return {data,status:200,statusText:'OK',headers:{},config}
 }
 await admin.snapshot('1',{section:'dashboard'})
 assert.equal(requests.length,5,'Dashboard only loads its five datasets once')
 assert.equal(requests.filter(r=>r.url==='/api/admin/orders').length,1)
 assert.equal(requests.filter(r=>r.url==='/api/admin/reviews').length,1)
 requests=[]
 await admin.snapshot('1',{section:'members'})
 assert.equal(requests.length,0,'Member screen reuses the loaded member array')
 await admin.snapshot('1',{section:'reviews',page:8})
 assert.deepEqual(requests.map(r=>r.url),['/api/admin/reviews'])
 assert.equal(requests[0].params.page,8)
 requests=[]
 await admin.snapshot('1',{section:'orders',page:2,status:'PREPARING'})
 assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/admin/orders/status')
 console.log('Passed: 200k-record paging without a full scan, request cache, abort signal, section loading, member status filter/sort.')
}finally{await server.close()}
