<script setup>
import { onMounted, ref } from 'vue'
import { money } from '../utils'

defineProps({method:String,total:Number,busy:Boolean,error:String})
const emit = defineEmits(['approve','close'])
const dialog = ref(null)
onMounted(() => dialog.value.showModal())
</script>

<template>
  <dialog ref="dialog" class="mock-payment" aria-labelledby="mock-payment-title" @cancel.prevent="!busy && emit('close')">
    <h2 id="mock-payment-title">{{ method }} 결제 확인</h2>
    <dl>
      <div><dt>결제 수단</dt><dd>{{ method }}</dd></div>
      <div><dt>결제 금액</dt><dd>{{ money(total) }}</dd></div>
    </dl>
    <p>테스트 결제입니다. 결제 정보를 입력할 필요가 없습니다.</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="mock-payment-actions">
      <button type="button" class="button" :disabled="busy" @click="emit('close')">결제 취소</button>
      <button type="button" class="button gold" :disabled="busy" @click="emit('approve','approve')">{{ busy ? '처리 중…' : '모의 승인' }}</button>
    </div>
    <button type="button" class="mock-payment-decline" :disabled="busy" @click="emit('approve','decline')">결제 실패 테스트</button>
  </dialog>
</template>

<style scoped>
.mock-payment { width:min(440px,calc(100% - 28px)); max-height:calc(100dvh - 28px); margin:auto; padding:clamp(18px,4vw,28px); border:1px solid var(--ui-border); border-radius:14px; background:var(--ui-surface); color:var(--ui-text); }
.mock-payment::backdrop { background:#0b111980; }
.mock-payment h2 { font-size:1.3rem; margin-bottom:16px; }
.mock-payment dl { margin:0 0 12px; padding:12px 0; border-block:1px solid var(--ui-border); }
.mock-payment dl div { display:flex; justify-content:space-between; gap:12px; }
.mock-payment dl div + div { margin-top:8px; }
.mock-payment dt { color:var(--ui-muted); }
.mock-payment dd { margin:0; font-weight:750; }
.mock-payment p { margin-bottom:12px; font-size:.85rem; }
.mock-payment-actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
.mock-payment-decline { display:block; margin:12px 0 0 auto; padding:4px; color:var(--ui-muted); text-decoration:underline; font-size:.8rem; }
</style>
