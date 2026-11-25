import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
const previousWindow=globalThis.window,previousStorage=globalThis.sessionStorage
try{
 const {api}=await server.ssrLoadModule('/src/api/index.js')
 const {admin}=await server.ssrLoadModule('/src/services/index.js')
 const engine=await server.ssrLoadModule('/src/services/adminPreview.js')
 const base=engine.adminPreviewSnapshot(),ids=base.products.map(p=>p.productId)
 const values=new Map()
 globalThis.window={location:{search:''}}
 globalThis.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}
 let apiRequests=0
 api.defaults.adapter=async()=>{apiRequests++;throw new Error('Dummy IDs must not be sent to the backend')}
 const first=engine.appendAdminPreviewBatch(),second=engine.appendAdminPreviewBatch()
 assert.equal(first.batch,1);assert.equal(second.batch,2)
 let data=await admin.snapshot('admin')
 for(const [section,added,key] of [['products',24,'productId'],['members',60,'userId'],['orders',120,'orderId'],['reviews',90,'reviewId'],['returns',20,'returnId'],['notices',6,'noticeId']]){
  assert.equal(data[section].length,base[section].length+added,section)
  assert.equal(new Set(data[section].map(row=>row[key])).size,data[section].length,section+' IDs')
 }
 assert(ids.every(id=>data.products.some(p=>p.productId===id)))
 assert(engine.isAdminPreview())
 assert(data.products.every(p=>p.spec && p.description),'Existing dummy products must have valid required edit fields')
 const product={...data.products[0],price:data.products[0].price+1000,stock:25,selling:true}
 await admin.saveProduct('admin',product)
 await admin.setProductSelling('admin',product.productId,false)
 data=await admin.snapshot('admin');assert.equal(data.products.find(p=>p.productId===product.productId).price,product.price);assert.equal(data.products.find(p=>p.productId===product.productId).selling,false)
 assert.throws(()=>admin.saveProduct('admin',{...product,price:-1}))
 const newProduct={...product,productId:'',name:'더미 등록 테스트'}
 await admin.saveProduct('admin',newProduct);assert(newProduct.productId)
 await admin.removeProduct('admin',newProduct.productId)
 const member=data.members[0]
 engine.applyAdminPreviewAction('memberUpdate',[member.userId,{role:'USER',status:'비활성'}])
 assert.equal((await admin.snapshot('admin')).members.find(r=>r.userId===member.userId).status,'비활성')
 const order=data.orders.find(r=>r.backendStatus==='PAID'&&!r.request)
 await admin.advanceOrder('admin',order.orderId,'',order.status)
 await admin.saveShipping('admin',order.orderId,{status:'배송 중',carrier:'CJ대한통운',tracking:'DUMMY-TEST-123',memo:'더미 저장 검증',dispatchDate:''})
 assert.equal((await admin.snapshot('admin')).orders.find(r=>r.orderId===order.orderId).backendStatus,'SHIPPED')
 assert.throws(()=>admin.saveShipping('admin',order.orderId,{status:'결제 완료',carrier:'',tracking:''}))
 const requested=data.returns.find(r=>r.returnStatus==='REQUESTED')
 await admin.resolveReturn('admin',requested.returnId,true,requested.total)
 engine.applyAdminPreviewAction('markReturnRefunded',[requested.returnId])
 assert.equal((await admin.snapshot('admin')).returns.find(r=>r.returnId===requested.returnId).returnStatus,'REFUNDED')
 assert.throws(()=>engine.applyAdminPreviewAction('markReturnRefunded',[requested.returnId]))
 const review=data.reviews[0]
 engine.applyAdminPreviewAction('reviewSentiment',[review.reviewId,'부정'])
 assert.equal((await admin.snapshot('admin')).reviews.find(r=>r.reviewId===review.reviewId).sentiment,'부정')
 await admin.reviewVisibility('admin',review.reviewId,true)
 assert(!(await admin.snapshot('admin')).reviews.some(r=>r.reviewId===review.reviewId))
 await admin.saveNotice('admin',{noticeId:'',title:'더미 공지 저장 검증',body:'브라우저 데이터에 저장'})
 const notice=(await admin.snapshot('admin')).notices.find(r=>r.title==='더미 공지 저장 검증');assert(notice.noticeId)
 await admin.saveNotice('admin',{...notice,title:'더미 공지 수정 검증'})
 await admin.removeNotice('admin',notice.noticeId)
 const faq=engine.applyAdminPreviewAction('saveFaq',[null,{title:'더미 FAQ 질문',content:'더미 FAQ 답변'}])
 engine.applyAdminPreviewAction('saveFaq',[faq.id,{title:'질문 수정',content:'답변 수정'}])
 assert.equal(engine.adminPreviewSnapshot().faqs.find(r=>r.id===faq.id).title,'질문 수정')
 engine.applyAdminPreviewAction('removeFaq',[faq.id])
 assert(!engine.adminPreviewSnapshot().faqs.some(r=>r.id===faq.id))
 const persisted=JSON.parse(values.get('gt-admin-preview-data-v2'))
 assert.equal(persisted.batches,2);assert.equal(persisted.orders.find(r=>r.orderId===order.orderId).tracking,'DUMMY-TEST-123')
 const reloaded=await server.ssrLoadModule('/src/services/adminPreview.js?storage-restore-test')
 assert.equal(reloaded.adminPreviewSnapshot().batches,2)
 assert.equal(reloaded.adminPreviewSnapshot().orders.find(r=>r.orderId===order.orderId).tracking,'DUMMY-TEST-123')
 const beforeFailure=engine.adminPreviewSnapshot(),setItem=globalThis.sessionStorage.setItem
 globalThis.sessionStorage.setItem=()=>{throw new Error('quota')}
 assert.throws(()=>engine.appendAdminPreviewBatch(),/저장 공간/)
 assert.deepEqual(engine.adminPreviewSnapshot(),beforeFailure)
 globalThis.sessionStorage.setItem=setItem
 assert.equal(apiRequests,0,'Every dummy mutation must stay local')
 engine.leaveAdminPreview();assert.equal(engine.isAdminPreview(),false)
 console.log('Passed: repeat generation, unique IDs, browser persistence, product/member/review/notice/FAQ CRUD, shipping/returns, rollback, and zero backend writes.')
}finally{
 if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow
 if(previousStorage===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previousStorage
 await server.close()
}
