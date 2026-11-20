<script setup>
import { computed,onMounted,ref } from 'vue'
import { adminFaqList,faqWriteError } from '../../services/adminFaq'
import { backendActions } from '../../services/backendActions'
import FaqEditorDialog from '../../components/admin/FaqEditorDialog.vue'
import FaqDeleteDialog from '../../components/admin/FaqDeleteDialog.vue'
import StatePanel from '../../components/StatePanel.vue'
import AdminIcon from '../../components/admin/AdminIcon.vue'
const serverRows=ref([]),busy=ref(false),error=ref(''),query=ref(''),queryDraft=ref('')
const rows=computed(()=>adminFaqList(serverRows.value))
const filtered=computed(()=>rows.value.filter(row=>(row.title+' '+row.content).toLowerCase().includes(query.value.trim().toLowerCase())))
async function load(){busy.value=true;error.value='';try{serverRows.value=await backendActions.faqs()}catch(e){error.value=e.message}finally{busy.value=false}}
const editor=ref(null),deleting=ref(null),saving=ref(false),writeError=ref(''),notice=ref('')
function edit(row=null){notice.value='';writeError.value='';editor.value=row?{...row,guide:!row.serverId}:{title:'',content:''}}
function confirmDelete(row){notice.value='';writeError.value='';deleting.value=row}
async function save(draft){
 if(saving.value)return
 saving.value=true;writeError.value=''
 try{
  const current=editor.value
  const saved=current.serverId?await backendActions.updateFaq(current.serverId,draft):await backendActions.createFaq(draft)
  serverRows.value=current.serverId?serverRows.value.map(row=>row.id===current.serverId?saved:row):[saved,...serverRows.value]
  editor.value=null;query.value='';queryDraft.value='';notice.value=current.serverId?'FAQ를 수정했습니다.':'FAQ를 등록했습니다.'
 }catch(e){writeError.value=faqWriteError(e)}finally{saving.value=false}
}
async function remove(){
 if(saving.value || !deleting.value?.serverId)return
 saving.value=true;writeError.value=''
 try{await backendActions.deleteFaq(deleting.value.serverId);serverRows.value=serverRows.value.filter(row=>row.id!==deleting.value.serverId);deleting.value=null;notice.value='FAQ를 삭제했습니다.'}
 catch(e){writeError.value=faqWriteError(e)}finally{saving.value=false}
}
function search(){query.value=queryDraft.value.trim()}
onMounted(load)
</script>
<template>
 <header class="ops-page-title admin-page-heading"><span class="admin-page-symbol"><AdminIcon name="inquiries"/></span><h1>FAQ 관리</h1></header>
 <section class="faq-workspace" aria-label="FAQ 목록">
  <header class="faq-heading"><h2>FAQ 목록</h2><span>{{ filtered.length }}건</span></header>
  <form class="faq-toolbar" role="search" @submit.prevent="search">
   <div class="faq-search-group"><label><span class="faq-search"><AdminIcon name="search"/><input v-model="queryDraft" type="search" @input="!queryDraft.trim() && (query='')" placeholder="제목 또는 내용 검색" aria-label="FAQ 검색"></span></label><button type="submit" class="button">검색</button></div>
   <div class="faq-toolbar-actions"><button type="button" class="button" :disabled="busy || saving" @click="load">새로고침</button><button type="button" class="button faq-register" :disabled="saving" @click="edit()">+ FAQ 등록</button></div>
  </form>
  <p class="faq-permissions">고객 FAQ는 등록·수정·삭제할 수 있습니다. 관리자 이용안내는 대시보드의 공통 가이드이며, 고객 FAQ로 복사해 등록할 수 있습니다.</p>
  <p v-if="notice" class="faq-notice" role="status">{{notice}}</p>
  <div class="faq-scroll" tabindex="0" aria-label="FAQ 목록 스크롤">
   <StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/>
   <div v-if="!busy && !error && !filtered.length" class="faq-empty"><AdminIcon name="inquiries"/><h3>{{ query.trim() ? '검색 결과가 없습니다.' : '등록된 FAQ가 없습니다.' }}</h3><p>{{ query.trim() ? '다른 검색어로 찾아보세요.' : '등록된 FAQ는 이곳에서 확인할 수 있습니다.' }}</p></div>
   <template v-if="filtered.length"><details v-for="(row,index) in filtered" :key="row.id" class="faq-item"><summary><span class="faq-number">Q{{ index+1 }}</span><span class="faq-question">{{ row.title }}</span><small class="faq-source">{{ row.source }}</small></summary><p>{{ row.content }}</p><div class="faq-row-actions"><template v-if="row.serverId"><button type="button" class="button" @click="edit(row)">수정</button><button type="button" class="button faq-delete" @click="confirmDelete(row)">삭제</button></template><button v-else type="button" class="button" @click="edit(row)">수정</button></div></details></template>
  </div>
 </section>
 <FaqEditorDialog v-if="editor" :current="editor" :busy="saving" :error="writeError" @save="save" @close="!saving && (editor=null)"/>
 <FaqDeleteDialog v-if="deleting" :row="deleting" :busy="saving" :error="writeError" @confirm="remove" @close="!saving && (deleting=null)"/>
</template>
