<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { backendActions } from '../../services/backendActions'
import { useShop } from '../../stores/shop'
import { reviewDisplayText } from '../../services/reviewPresentation'
import AdminPagination from '../../components/admin/AdminPagination.vue'

const store=useShop()
const rows=ref([]),loading=ref(true),loadError=ref(''),notice=ref(''),actionError=ref(''),pending=ref(false)
const page=ref(0),pageSize=20,editing=ref(null),deleting=ref(null),content=ref('')
const editDialog=ref(null),deleteDialog=ref(null),editor=ref(null)
const products=computed(()=>new Map(store.products.map(p=>[String(p.productId),p])))
const reviews=computed(()=>[...rows.value].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)).map(row=>{
 const product=products.value.get(String(row.productId))
 return {...row,name:row.productName||product?.name||'구매한 상품',image:row.productImage||product?.image||'',category:product?.category||'',productLink:product?'/products/'+product.productId:'/orders'}
}))
const visible=computed(()=>reviews.value.slice(page.value*pageSize,(page.value+1)*pageSize))
const pages=computed(()=>Math.ceil(reviews.value.length/pageSize))
watch(pages,value=>{page.value=Math.min(page.value,Math.max(0,value-1))})
const date=value=>{const time=Date.parse(value);return Number.isFinite(time)?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium'}).format(time):''}
async function load(){
 loading.value=true;loadError.value=''
 try{const data=await backendActions.myReviews();if(!Array.isArray(data))throw new Error('리뷰 목록을 불러오지 못했습니다.');rows.value=data}
 catch(e){loadError.value=e.message||'리뷰 목록을 불러오지 못했습니다.'}
 finally{loading.value=false}
}
async function edit(row){editing.value=row;content.value=row.content;actionError.value='';editDialog.value.showModal();await nextTick();editor.value?.focus()}
function closeEdit(){if(pending.value)return;editDialog.value.close();editing.value=null;actionError.value=''}
async function save(){
 const text=content.value.trim()
 if(pending.value||!editing.value)return
 if(!text||text.length>1000){actionError.value='리뷰를 1~1,000자 이내로 작성해 주세요.';return}
 pending.value=true;actionError.value='';notice.value=''
 try{
  const original=rows.value.find(row=>row.id===editing.value.id)
  // The current DTO still validates rating although the entity ignores it; no stars are shown or stored.
  const legacy={...original,rating:Number.isInteger(original?.rating)?original.rating:3}
  const result=await backendActions.updateReview(editing.value.id,text,legacy)
  rows.value=rows.value.map(row=>row.id===editing.value.id?{...row,...result,content:text}:row)
  editDialog.value.close();editing.value=null;notice.value='리뷰를 수정했습니다.'
 }catch(e){actionError.value=e.message||'리뷰를 저장하지 못했습니다. 다시 시도해 주세요.'}
 finally{pending.value=false}
}
function askRemove(row){deleting.value=row;actionError.value='';deleteDialog.value.showModal()}
function closeDelete(){if(pending.value)return;deleteDialog.value.close();deleting.value=null;actionError.value=''}
async function remove(){
 if(pending.value||!deleting.value)return
 pending.value=true;actionError.value='';notice.value=''
 try{await backendActions.deleteReview(deleting.value.id);rows.value=rows.value.filter(row=>row.id!==deleting.value.id);deleteDialog.value.close();deleting.value=null;notice.value='리뷰를 삭제했습니다.'}
 catch(e){actionError.value=e.message||'리뷰를 삭제하지 못했습니다. 다시 시도해 주세요.'}
 finally{pending.value=false}
}
onMounted(load)
</script>

<template>
 <section class="my-reviews-page" aria-labelledby="my-reviews-title">
  <RouterLink class="reviews-back" to="/account"><span aria-hidden="true">←</span> 마이페이지</RouterLink>
  <header class="reviews-heading"><div><p class="reviews-eyebrow">MY REVIEWS</p><h1 id="my-reviews-title">내 리뷰 관리</h1><p class="reviews-description">직접 사용한 경험을 나누고, 작성한 후기를 한곳에서 관리하세요.</p></div><RouterLink class="reviews-button reviews-button-outline" to="/orders">주문 내역 보기 <span aria-hidden="true">↗</span></RouterLink></header>
  <nav class="reviews-tabs" aria-label="나의 쇼핑 메뉴"><RouterLink to="/account">쇼핑 현황</RouterLink><RouterLink to="/orders">주문 내역</RouterLink><RouterLink to="/my-reviews" aria-current="page">내 리뷰</RouterLink><RouterLink to="/favorites">찜한 상품</RouterLink></nav>
  <p v-if="notice" class="reviews-notice" role="status"><span aria-hidden="true">✓</span> {{ notice }}</p>
  <section class="reviews-panel" aria-labelledby="written-reviews-title">
   <header class="reviews-panel-heading"><h2 id="written-reviews-title">작성한 리뷰 <span v-if="!loading&&!loadError">{{ rows.length.toLocaleString('ko-KR') }}</span></h2><p>나의 구매 경험</p></header>
   <div v-if="loading" class="reviews-feedback" role="status"><span class="reviews-spinner" aria-hidden="true"/><h3>리뷰를 불러오고 있어요</h3><p>작성한 후기를 확인하고 있습니다.</p></div>
   <div v-else-if="loadError" class="reviews-feedback" role="alert"><h3>리뷰를 불러오지 못했어요</h3><p>{{ loadError }}</p><button type="button" class="reviews-button reviews-button-primary" @click="load">다시 불러오기</button></div>
   <div v-else-if="!rows.length" class="reviews-empty">
    <div class="reviews-empty-icon" aria-hidden="true"><svg viewBox="0 0 72 72" fill="none"><rect x="13" y="12" width="46" height="39" rx="10"/><path d="m24 51-4 11 17-11M24 25h24M24 35h15"/><circle cx="53" cy="52" r="12"/><path d="m48 52 4 4 7-8"/></svg></div>
    <h3>아직 남긴 리뷰가 없어요</h3><p>사용해 본 상품은 어떠셨나요?<br>나의 경험이 다른 고객의 선택에 도움이 됩니다.</p>
    <RouterLink class="reviews-button reviews-button-primary" to="/orders">구매한 상품 확인하기 <span aria-hidden="true">→</span></RouterLink>
   </div>
   <div v-else class="reviews-list">
    <article v-for="row in visible" :key="row.id" class="my-review-card">
     <RouterLink class="my-review-product" :to="row.productLink"><div class="my-review-image"><img v-if="row.image" :src="row.image" :alt="row.name" loading="lazy"><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9v9M4 7.5l8 4.5 8-4.5M8 5.3l8 4.5"/></svg></div><div><small>{{ row.category||'구매 상품' }}</small><h3>{{ row.name }}</h3><span>상품 보기 <span aria-hidden="true">↗</span></span></div></RouterLink>
     <div class="my-review-copy"><div class="my-review-meta"><span class="review-written-label">작성 완료</span><time v-if="date(row.createdAt)" :datetime="row.createdAt">{{ date(row.createdAt) }}</time></div><p>{{ reviewDisplayText(row.content) }}</p><footer><span v-if="row.updatedAt&&row.updatedAt!==row.createdAt">{{ date(row.updatedAt) }} 수정</span><div><button type="button" @click="edit(row)">수정</button><button type="button" class="review-delete-action" @click="askRemove(row)">삭제</button></div></footer></div>
    </article>
   </div>
   <AdminPagination v-if="!loading&&!loadError&&rows.length" :page="page" :pages="pages" :total="rows.length" :size="pageSize" label="내 리뷰" @change="page=$event"/>
  </section>
  <aside class="reviews-guidance"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg><div><h2>리뷰 작성 안내</h2><p>주문 내역에서 리뷰를 작성할 수 있는 상품을 확인하세요. 작성한 리뷰는 이 화면에서 수정하거나 삭제할 수 있습니다.</p></div><RouterLink to="/orders">주문 내역 <span aria-hidden="true">→</span></RouterLink></aside>
 </section>
 <dialog ref="editDialog" class="my-review-dialog" aria-labelledby="review-edit-title" @cancel.prevent="closeEdit" @click="event=>{if(event.target===editDialog)closeEdit()}"><form @submit.prevent="save"><header><div><p class="reviews-eyebrow">MY REVIEW</p><h2 id="review-edit-title">리뷰 수정</h2></div><button type="button" class="review-dialog-close" aria-label="리뷰 수정 닫기" :disabled="pending" @click="closeEdit">×</button></header><p class="review-dialog-product">{{ editing?.name }}</p><label for="my-review-content">사용 후기를 들려주세요</label><textarea id="my-review-content" ref="editor" v-model="content" :disabled="pending" maxlength="1000" required rows="7"/><small class="review-character-count">{{ content.length.toLocaleString('ko-KR') }} / 1,000</small><p v-if="actionError" class="review-action-error" role="alert">{{ actionError }}</p><footer><button type="button" class="reviews-button reviews-button-outline" :disabled="pending" @click="closeEdit">취소</button><button class="reviews-button reviews-button-primary" :disabled="pending||!content.trim()">{{ pending?'저장 중…':'수정 저장' }}</button></footer></form></dialog>
 <dialog ref="deleteDialog" class="my-review-dialog review-delete-dialog" aria-labelledby="review-delete-title" @cancel.prevent="closeDelete"><div><header><h2 id="review-delete-title">리뷰를 삭제할까요?</h2></header><p class="review-dialog-product">{{ deleting?.name }}</p><p>삭제한 리뷰는 복구할 수 없습니다.</p><p v-if="actionError" class="review-action-error" role="alert">{{ actionError }}</p><footer><button type="button" class="reviews-button reviews-button-outline" :disabled="pending" @click="closeDelete">취소</button><button type="button" class="reviews-button reviews-button-danger" :disabled="pending" @click="remove">{{ pending?'삭제 중…':'삭제' }}</button></footer></div></dialog>
</template>

<style scoped>
.my-reviews-page{width:min(1180px,90%);margin-inline:auto;padding:32px 0 56px;color:var(--ui-text);font-size:16px;line-height:1.6}
.reviews-back{display:inline-flex;align-items:center;gap:9px;color:var(--ui-muted);font-size:15px;margin-bottom:26px}.reviews-back:hover{color:var(--ui-text)}
.reviews-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:30px}.reviews-eyebrow{font-size:11px;letter-spacing:2px;font-weight:750;color:var(--ui-muted);margin:0 0 7px}.reviews-heading h1{font-size:clamp(28px,2.4vw,36px);line-height:1.3;letter-spacing:-1.3px;margin:0 0 12px}.reviews-description{font-size:16px;color:var(--ui-muted);margin:0}
.reviews-button{display:inline-flex;justify-content:center;align-items:center;gap:16px;min-height:46px;padding:11px 20px;border:1px solid transparent;border-radius:8px;font:inherit;font-size:15px;font-weight:650;line-height:1.4;cursor:pointer;box-sizing:border-box;white-space:nowrap}.reviews-button-primary{background:var(--ui-text);color:var(--ui-bg)}.reviews-button-primary:hover{opacity:.84}.reviews-button-outline{background:var(--ui-surface);border-color:var(--ui-border);color:var(--ui-text)}.reviews-button-outline:hover{background:var(--ui-raised)}.reviews-button:disabled{opacity:.5;cursor:default}
.reviews-tabs{display:flex;gap:32px;border-bottom:1px solid var(--ui-border);margin-bottom:28px}.reviews-tabs a{padding:12px 2px 16px;color:var(--ui-muted);font-size:16px;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}.reviews-tabs a[aria-current=page]{border-color:var(--ui-text);color:var(--ui-text);font-weight:750}
.reviews-panel{border:1px solid var(--ui-border);border-radius:14px;overflow:hidden;background:var(--ui-surface)}.reviews-panel-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 26px;border-bottom:1px solid var(--ui-border)}.reviews-panel-heading h2{font-size:19px;margin:0;letter-spacing:-.5px}.reviews-panel-heading h2 span{font-size:20px;margin-left:8px;color:var(--ui-muted);font-variant-numeric:tabular-nums}.reviews-panel-heading>p{font-size:14px;color:var(--ui-muted);margin:0}
.reviews-empty,.reviews-feedback{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;padding:34px 24px 38px;text-align:center;box-sizing:border-box;background:linear-gradient(180deg,var(--ui-surface),var(--ui-raised))}.reviews-empty-icon{width:78px;height:78px;display:grid;place-items:center;margin-bottom:15px;border-radius:24px;background:var(--ui-surface);color:var(--ui-muted);border:1px solid var(--ui-border)}.reviews-empty-icon svg{width:57px;height:57px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.reviews-empty-icon circle{fill:var(--ui-surface)}.reviews-empty h3,.reviews-feedback h3{font-size:22px;font-weight:700;margin:0 0 10px;letter-spacing:-.7px}.reviews-empty>p,.reviews-feedback>p{font-size:16px;line-height:1.8;color:var(--ui-muted);margin:0 0 23px}.reviews-notice{padding:13px 18px;border:1px solid var(--ui-border);border-radius:8px;background:var(--ui-raised);margin:0 0 20px}.reviews-notice>span{margin-right:8px}
.reviews-guidance{display:flex;align-items:flex-start;gap:13px;padding:24px 4px 0;color:var(--ui-muted)}.reviews-guidance>svg{width:21px;height:21px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;margin-top:3px}.reviews-guidance h2{font-size:15px;margin:0 0 6px;font-weight:700;color:var(--ui-text)}.reviews-guidance p{font-size:14px;margin:0;line-height:1.8}.reviews-guidance>a{margin-left:auto;white-space:nowrap;font-size:14px;align-self:center;color:var(--ui-text)}
.my-review-card{display:grid;grid-template-columns:minmax(230px,.8fr) minmax(0,1.7fr);gap:30px;padding:26px;border-bottom:1px solid var(--ui-border)}.my-review-card:last-child{border-bottom:0}.my-review-product{display:flex;align-items:flex-start;gap:16px;min-width:0}.my-review-image{width:90px;height:90px;flex:none;display:grid;place-items:center;background:#fff;border:1px solid var(--ui-border);border-radius:10px;overflow:hidden}.my-review-image img{width:100%;height:100%;object-fit:contain;padding:7px;box-sizing:border-box}.my-review-image>svg{width:36px;height:36px;fill:none;stroke:#84909f;stroke-width:1.3}.my-review-product small{font-size:13px;color:var(--ui-muted)}.my-review-product h3{font-size:16px;font-weight:700;line-height:1.6;margin:5px 0 8px;overflow-wrap:anywhere}.my-review-product>div>span{font-size:13px;color:var(--ui-muted)}.my-review-meta{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--ui-muted)}.review-written-label{padding:4px 9px;background:var(--ui-raised);border:1px solid var(--ui-border);border-radius:5px;font-size:12px;color:var(--ui-text)}.my-review-copy>p{font-size:17px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere;margin:15px 0 20px}.my-review-copy footer{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--ui-muted)}.my-review-copy footer>div{display:flex;gap:8px;margin-left:auto}.my-review-copy footer button{font:inherit;font-size:14px;color:var(--ui-text);border:1px solid var(--ui-border);padding:6px 13px;border-radius:6px;background:var(--ui-surface);cursor:pointer}.my-review-copy footer button:hover{background:var(--ui-raised)}.my-review-copy footer .review-delete-action{color:var(--ui-muted)}
.my-review-dialog{width:min(620px,calc(100vw - 32px));max-height:88dvh;overflow:auto;border:1px solid var(--ui-border);border-radius:16px;padding:0;color:var(--ui-text);background:var(--ui-surface);box-sizing:border-box}.my-review-dialog::backdrop{background:#0a111b88;backdrop-filter:blur(3px)}.my-review-dialog>form,.my-review-dialog>div{padding:28px}.my-review-dialog header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:20px}.my-review-dialog h2{font-size:24px;letter-spacing:-.7px;margin:0}.review-dialog-close{font-size:30px;line-height:1;border:0;background:transparent;color:var(--ui-muted);padding:0 4px;cursor:pointer}.review-dialog-product{font-size:16px;font-weight:650;padding:15px 17px;border-radius:8px;background:var(--ui-raised);margin:0 0 23px;overflow-wrap:anywhere}.my-review-dialog label{display:block;font-size:16px;font-weight:650;margin-bottom:10px}.my-review-dialog textarea{width:100%;box-sizing:border-box;border:1px solid var(--ui-border);border-radius:8px;background:var(--ui-bg);color:var(--ui-text);padding:14px;resize:vertical;font:inherit;font-size:16px;line-height:1.8;min-height:180px}.review-character-count{display:block;text-align:right;font-size:13px;color:var(--ui-muted);margin-top:6px}.my-review-dialog footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.review-action-error{color:#c74747;font-size:15px;line-height:1.6}.review-delete-dialog{width:min(470px,calc(100vw - 32px))}.reviews-button-danger{background:#b73a42;color:#fff}.reviews-spinner{width:28px;height:28px;border:2px solid var(--ui-border);border-top-color:var(--ui-text);border-radius:50%;margin-bottom:17px;animation:review-spin .8s linear infinite}@keyframes review-spin{to{transform:rotate(360deg)}}
.my-reviews-page :is(a,button):focus-visible,.my-review-dialog :is(button,textarea):focus-visible{outline:2px solid #8194ac;outline-offset:4px}
@media(max-width:800px){.my-review-card{grid-template-columns:1fr;gap:20px}.my-review-product{align-items:center}.my-review-image{width:72px;height:72px}.reviews-heading{align-items:flex-start}.reviews-heading>.reviews-button{font-size:14px;padding:10px 14px}.reviews-description{max-width:400px}}
@media(max-width:540px){.my-reviews-page{width:92%;padding-top:22px}.reviews-back{margin-bottom:20px}.reviews-heading{flex-wrap:wrap;gap:18px;margin-bottom:20px}.reviews-heading h1{font-size:29px}.reviews-heading>.reviews-button{min-height:40px}.reviews-tabs{gap:0;justify-content:space-between}.reviews-tabs a{font-size:14px}.reviews-panel-heading{padding:18px}.reviews-panel-heading>p{display:none}.reviews-empty{padding:32px 16px;min-height:320px}.reviews-empty h3{font-size:21px}.reviews-empty>p{font-size:15px}.reviews-guidance{flex-wrap:wrap}.reviews-guidance>div{flex:1}.reviews-guidance>a{margin-left:34px}.my-review-card{padding:20px}.my-review-copy>p{font-size:16px}.my-review-dialog>form,.my-review-dialog>div{padding:22px}}
@media(prefers-reduced-motion:reduce){.reviews-spinner{animation:none}}
</style>
