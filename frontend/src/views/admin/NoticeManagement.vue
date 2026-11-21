<script setup>
import {computed,nextTick,reactive,ref,watch} from 'vue'
import {admin} from '../../services'
import {useShop} from '../../stores/shop'
import {dateLabel} from '../../utils'
import AdminPagination from '../../components/admin/AdminPagination.vue'
import AdminIcon from '../../components/admin/AdminIcon.vue'
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog.vue'
const confirmDelete=ref(false)
const props=defineProps({initialRows:{type:Array,default:()=>[]},preview:Boolean})
const store=useShop(),rows=ref([...props.initialRows]),query=ref(''),draft=ref(''),page=ref(0),busy=ref(false),error=ref(''),notice=ref('')
const dialog=ref(null),titleInput=ref(null),form=reactive({noticeId:'',title:'',body:''})
const filtered=computed(()=>rows.value.filter(r=>(r.title+' '+r.body+' '+(r.author||'')).toLowerCase().includes(query.value.toLowerCase())))
const visible=computed(()=>filtered.value.slice(page.value*10,(page.value+1)*10))
watch(()=>props.initialRows,value=>{rows.value=[...value];page.value=Math.min(page.value,Math.max(0,Math.ceil(filtered.value.length/10)-1))})
function search(){query.value=draft.value.trim();page.value=0}
async function open(row){error.value='';Object.assign(form,{noticeId:'',title:'',body:'',...row});dialog.value.showModal();await nextTick();titleInput.value?.focus()}
function close(){if(!busy.value)dialog.value.close()}
async function save(){
 if(busy.value)return
 const title=form.title.trim(),body=form.body.trim()
 if(!title || !body){error.value='제목과 내용을 입력해 주세요.';return}
 busy.value=true;error.value=''
 try{
  await admin.saveNotice(store.user.userId,{...form,title,body});rows.value=(await admin.snapshot(store.user.userId,{section:'notices',force:true})).notices
  notice.value=props.preview ? '확인용 공지를 저장했습니다. 실제 DB에는 반영되지 않습니다.' : '공지사항을 저장했습니다.'
  query.value='';draft.value='';page.value=0;dialog.value.close()
 }catch(e){error.value=e.message}finally{busy.value=false}
}
async function remove(){
 if(!form.noticeId || busy.value)return
 busy.value=true;error.value=''
 try{await admin.removeNotice(store.user.userId,form.noticeId);rows.value=rows.value.filter(r=>r.noticeId!==form.noticeId);page.value=Math.min(page.value,Math.max(0,Math.ceil(filtered.value.length/10)-1));notice.value='공지를 삭제했습니다.';dialog.value.close()}catch(e){error.value=e.message}finally{busy.value=false}
}
</script>
<template>
 <section class="notice-management" aria-label="공지사항 목록">
  <div class="notice-toolbar"><form role="search" @submit.prevent="search"><label><AdminIcon name="search"/><input v-model="draft" type="search" placeholder="공지 제목 또는 내용 검색" aria-label="공지 검색"></label><button class="button" type="submit">검색</button></form><button class="button gold" type="button" @click="open()">+ 새 공지 등록</button></div>
  <p v-if="notice" class="notice-feedback" role="status">{{ notice }}</p>
  <div class="notice-list"><header><h2>공지 목록 <span>{{ filtered.length }}건</span></h2><span>제목을 누르면 공지를 확인하고 수정할 수 있습니다.</span></header>
   <div class="notice-table-scroll"><table><thead><tr><th class="notice-number">번호</th><th>제목</th><th class="notice-author">작성자</th><th class="notice-date">등록일</th><th class="notice-action">관리</th></tr></thead><tbody><tr v-for="(row,index) in visible" :key="row.noticeId"><td class="notice-number">{{ filtered.length-page*10-index }}</td><td><button class="notice-title" type="button" @click="open(row)"><strong>{{ row.title }}</strong><span>{{ row.body }}</span></button></td><td class="notice-author">{{ row.author || '관리자' }}</td><td class="notice-date">{{ dateLabel(row.date) }}</td><td class="notice-action"><button class="button" type="button" @click="open(row)">수정</button></td></tr><tr v-if="!visible.length"><td colspan="5" class="notice-empty">{{ query ? '검색 결과가 없습니다.' : '등록된 공지가 없습니다.' }}</td></tr></tbody></table></div>
   <AdminPagination :page="page" :pages="Math.ceil(filtered.length/10)" :total="filtered.length" label="공지 목록" @change="page=$event"/>
  </div>
 </section>
 <dialog ref="dialog" class="notice-dialog" aria-labelledby="notice-dialog-title" @cancel="busy && $event.preventDefault()"><form @submit.prevent="save"><header><div><span>공지사항</span><h2 id="notice-dialog-title">{{ form.noticeId ? '공지 수정' : '새 공지 등록' }}</h2></div><button type="button" class="notice-dialog-close" aria-label="공지 팝업 닫기" :disabled="busy" @click="close">×</button></header><p v-if="preview" class="notice-preview-note">확인용 데이터입니다. 이 팝업의 변경은 실제 DB에 저장되지 않습니다.</p><label>제목<input ref="titleInput" v-model="form.title" required maxlength="200" placeholder="공지 제목을 입력하세요"></label><label>내용<textarea v-model="form.body" required rows="10" placeholder="공지 내용을 입력하세요"></textarea></label><p v-if="error" class="error" role="alert">{{ error }}</p><footer><button v-if="form.noticeId" class="button notice-delete" type="button" :disabled="busy" @click="confirmDelete=true">삭제</button><div><button class="button" type="button" :disabled="busy" @click="close">취소</button><button class="button gold" type="submit" :disabled="busy">{{ busy ? '저장 중…' : '저장' }}</button></div></footer></form></dialog>
 <AdminConfirmDialog v-if="confirmDelete" title="공지 삭제" message="선택한 공지를 삭제할까요?" confirm-text="삭제" danger @cancel="confirmDelete=false" @confirm="confirmDelete=false;remove()"/>
</template>
<style>
.notice-management{display:flex;flex:1!important;flex-direction:column;gap:16px;min-height:0;font-size:17px}
.notice-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex:none}
.notice-toolbar form{display:flex;align-items:center;gap:8px;width:min(600px,75%)}
.notice-toolbar label{display:flex;align-items:center;gap:9px;min-width:0;flex:1;border:1px solid var(--work-line,#dce3eb);border-radius:7px;background:var(--work-surface,#fff);padding:0 12px}
.notice-toolbar label svg{width:18px;height:18px;color:#6b7c93;flex:none}
.notice-toolbar label input{border:0!important;background:transparent!important;min-width:0;width:100%;padding-inline:0;box-shadow:none!important}
.notice-list{display:flex;flex:1;flex-direction:column;min-height:0;background:var(--work-surface,#fff);border:1px solid var(--work-line,#dce3eb);border-radius:12px;overflow:hidden}
.notice-list>header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:20px 22px;border-bottom:1px solid var(--work-line,#dce3eb)}
.notice-list h2{margin:0;font-size:21px}.notice-list h2 span{font-size:16px;color:var(--admin-muted,#718096);margin-left:9px;font-weight:500}.notice-list>header>span{font-size:14px;color:var(--admin-muted,#718096)}
.notice-table-scroll{flex:1;min-height:0;overflow:auto}
.notice-list table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:16px}
.notice-list th,.notice-list td{text-align:left;padding:16px 20px;border-bottom:1px solid var(--work-line,#e6ebf1);vertical-align:middle}
.notice-list thead{background:var(--work-tint,#f5f7fa);position:sticky;top:0;z-index:1;font-size:14px;color:var(--admin-muted,#718096)}
.notice-list .notice-number{width:80px;text-align:center;color:var(--admin-muted,#718096)}.notice-author{width:130px}.notice-date{width:175px}.notice-action{width:110px;text-align:center!important}
.notice-title{display:grid;gap:7px;text-align:left;border:0;background:transparent;color:inherit;padding:0;width:100%;cursor:pointer;line-height:1.5}
.notice-title strong{font-size:18px;font-weight:700}.notice-title span{font-size:15px;color:var(--admin-muted,#718096);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.notice-title:hover strong{color:#446489}.notice-feedback{margin:0;font-size:15px;color:#317253}.notice-empty{height:180px;text-align:center!important;color:var(--admin-muted,#718096)}
.notice-dialog{width:min(760px,calc(100vw - 32px));max-height:90dvh;padding:0;border:1px solid var(--work-line,#dce3eb);border-radius:16px;background:var(--work-surface,#fff);color:var(--admin-text,#243244);box-shadow:0 24px 90px #14243c30;overflow:auto}
.notice-dialog::backdrop{background:#18233680;backdrop-filter:blur(3px)}
.notice-dialog form{padding:28px;display:grid;gap:22px}.notice-dialog header{display:flex;align-items:center;justify-content:space-between;gap:16px}.notice-dialog header span{font-size:14px;color:#718096}.notice-dialog h2{font-size:26px;margin:4px 0 0}.notice-dialog-close{border:0;background:transparent;color:inherit;font-size:32px;padding:0 4px;cursor:pointer}.notice-dialog label{display:grid;gap:9px;font-size:17px;font-weight:650}.notice-dialog input,.notice-dialog textarea{width:100%;font:inherit;line-height:1.6;border:1px solid #d6deea;border-radius:8px;padding:12px;background:var(--work-surface,#fff);color:inherit}.notice-dialog textarea{min-height:240px;resize:vertical}.notice-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:18px;border-top:1px solid #e3e9f0}.notice-dialog footer>div{display:flex;gap:10px;margin-left:auto}.notice-dialog .button{font-size:16px;min-height:44px;padding:10px 20px}.notice-delete{color:#b54040!important;border-color:#e7bbbb!important}.notice-preview-note{font-size:14px;color:#627b9a;margin:0}
@media(max-width:750px){.notice-list>header{padding:16px}.notice-list>header>span{display:none}.notice-author,.notice-date{display:none}.notice-list th,.notice-list td{padding:14px 10px}.notice-list .notice-number{width:45px}.notice-action{width:80px}.notice-title strong{font-size:16px}.notice-toolbar form{width:auto;flex:1}.notice-toolbar{flex-wrap:wrap}.notice-dialog form{padding:20px}.notice-dialog h2{font-size:23px}}
</style>
