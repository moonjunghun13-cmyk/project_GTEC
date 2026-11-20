<script setup>
import {onMounted,ref} from 'vue'
defineProps({row:{type:Object,required:true},busy:Boolean,error:String})
const emit=defineEmits(['confirm','close']),dialog=ref(null)
onMounted(()=>dialog.value.showModal())
</script>
<template>
 <dialog ref="dialog" class="faq-delete-dialog" aria-labelledby="faq-delete-title" @cancel.prevent="!busy && emit('close')">
  <h2 id="faq-delete-title">FAQ 삭제</h2><p><strong>{{row.title}}</strong></p><p>이 FAQ를 삭제하시겠습니까? 삭제한 내용은 복구할 수 없습니다.</p>
  <p v-if="error" class="error" role="alert">{{error}}</p>
  <footer><button type="button" class="button" :disabled="busy" @click="emit('close')">취소</button><button type="button" class="button faq-delete-confirm" :disabled="busy" @click="emit('confirm')">{{busy ? '삭제 중…' : '삭제'}}</button></footer>
 </dialog>
</template>
<style scoped>
.faq-delete-dialog{width:min(480px,calc(100vw - 32px));margin:auto;padding:24px;border:1px solid var(--work-line,#d6dce5);border-radius:12px;background:var(--work-surface,#fff);color:var(--admin-text,#17202e)}.faq-delete-dialog::backdrop{background:#17202e70}h2{margin:0 0 20px;font-size:22px}p{line-height:1.6;overflow-wrap:anywhere}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.faq-delete-confirm{background:#a53131;color:white}
</style>
