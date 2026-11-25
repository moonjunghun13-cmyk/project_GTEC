<script setup>
import { onMounted,reactive,ref } from 'vue'
import { faqPayload } from '../../services/adminFaq'
const props=defineProps({current:{type:Object,required:true},busy:Boolean,error:String})
const emit=defineEmits(['save','close'])
const dialog=ref(null),titleInput=ref(null),validation=ref('')
const draft=reactive({title:props.current.title || '',content:props.current.content || ''})
onMounted(()=>{dialog.value.showModal();titleInput.value.focus()})
function submit(){validation.value='';try{emit('save',faqPayload(draft))}catch(e){validation.value=e.message}}
</script>
<template>
 <dialog ref="dialog" class="faq-editor-dialog" aria-labelledby="faq-editor-title" @cancel.prevent="!busy && emit('close')">
  <header><h2 id="faq-editor-title">{{(current.serverId || current.guide) ? 'FAQ 수정' : 'FAQ 등록'}}</h2><button type="button" class="button" :disabled="busy" aria-label="FAQ 편집 닫기" @click="emit('close')">닫기</button></header>
  <p v-if="current.guide" class="faq-editor-note">관리자 이용안내를 편집합니다. 수정본은 고객 FAQ로 새로 저장을 요청하며, 대시보드 이용안내 원문은 유지됩니다.</p>
  <form @submit.prevent="submit">
   <fieldset :disabled="busy">
    <label>질문<input ref="titleInput" v-model="draft.title" required maxlength="100" placeholder="질문을 입력하세요"><small>{{draft.title.length}} / 100</small></label>
    <label>답변<textarea v-model="draft.content" required rows="8" placeholder="답변을 입력하세요"></textarea></label>
   </fieldset>
   <p v-if="validation || error" class="error" role="alert">{{validation || error}}</p>
   <footer><button type="button" class="button" :disabled="busy" @click="emit('close')">취소</button><button type="submit" class="button faq-save" :disabled="busy">{{busy ? '저장 중…' : (current.serverId || current.guide) ? '수정 저장' : '등록'}}</button></footer>
  </form>
 </dialog>
</template>
<style scoped>
.faq-editor-dialog{width:min(680px,calc(100vw - 32px));max-height:calc(100dvh - 48px);overflow:auto;margin:auto;padding:24px;border:1px solid var(--work-line,#d6dce5);border-radius:12px;background:var(--work-surface,#fff);color:var(--admin-text,#17202e);box-shadow:0 20px 70px #17202e33}
.faq-editor-dialog::backdrop{background:#17202e70}
header,footer{display:flex;align-items:center;justify-content:space-between;gap:12px}
header{padding-bottom:16px;border-bottom:1px solid var(--work-line,#d6dce5)}
h2{margin:0;font-size:23px}fieldset{display:grid;gap:18px;min-width:0;margin:20px 0;padding:0;border:0}
label{display:grid;gap:8px;font-size:16px;font-weight:650}input,textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--work-line,#d6dce5);border-radius:6px;background:var(--work-surface,#fff);color:inherit;font:inherit;font-weight:400}textarea{resize:vertical;min-height:170px;line-height:1.6}
label small{justify-self:end;color:var(--admin-muted,#617086);font-size:12px;font-weight:400}footer{justify-content:flex-end;padding-top:16px;border-top:1px solid var(--work-line,#d6dce5)}.faq-save{background:#263f62;color:white}.error{line-height:1.6;overflow-wrap:anywhere}.faq-editor-note{font-size:14px;line-height:1.6;color:var(--admin-muted,#617086)}
</style>
