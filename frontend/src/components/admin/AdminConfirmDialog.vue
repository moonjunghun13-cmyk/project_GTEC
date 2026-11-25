<script setup>
import {onMounted,ref} from 'vue'
const props=defineProps({title:String,message:String,confirmText:{type:String,default:'확인'},danger:Boolean})
const emit=defineEmits(['confirm','cancel'])
const dialog=ref(null)
onMounted(()=>dialog.value.showModal())
</script>
<template><dialog ref="dialog" class="admin-confirm-dialog" aria-labelledby="admin-confirm-title" @cancel="emit('cancel')"><h2 id="admin-confirm-title">{{ title }}</h2><p>{{ message }}</p><footer><button type="button" class="button" @click="emit('cancel')">취소</button><button type="button" class="button" :class="danger ? 'confirm-danger' : 'gold'" @click="emit('confirm')">{{ confirmText }}</button></footer></dialog></template>
<style>
.admin-confirm-dialog{width:min(480px,calc(100vw - 32px));padding:28px;border:1px solid #dce3ec;border-radius:15px;background:#fff;color:#26364a;box-shadow:0 24px 90px #14243c30}.admin-confirm-dialog::backdrop{background:#15213575;backdrop-filter:blur(3px)}.admin-confirm-dialog h2{font-size:24px;margin:0 0 16px}.admin-confirm-dialog p{font-size:17px;line-height:1.75;white-space:pre-line;margin:0 0 26px}.admin-confirm-dialog footer{display:flex;justify-content:flex-end;gap:10px}.admin-confirm-dialog .button{font-size:16px;min-height:44px;padding:10px 18px}.admin-confirm-dialog .confirm-danger{background:#c74c4b;color:#fff;border-color:#c74c4b}
</style>
