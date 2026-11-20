<script setup>
import { onMounted, onBeforeUnmount, ref, useId, watch } from 'vue'
import { createCheckoutWidget, tossTestConfigured } from '../services/tossCheckout'
const props = defineProps({memberId:{required:true},total:{type:Number,required:true},disabled:Boolean})
const emit = defineEmits(['ready','change'])
const id = 'checkout-payment-' + useId().replace(/[^a-zA-Z0-9_-]/g,'')
const loading = ref(true)
const error = ref('')
let widget,alive=true
async function load() {
  loading.value=true;error.value='';emit('ready',false)
  try {
    widget=await createCheckoutWidget({memberId:props.memberId,total:props.total,
      methodsSelector:'#'+id,agreementSelector:'#'+id+'-agreement',active:()=>alive,
      onChange:value=>emit('change',value)})
    if(alive) emit('ready',Boolean(widget))
  } catch(e) { if(alive) error.value='결제수단을 불러오지 못했습니다. '+e.message }
  finally { if(alive) loading.value=false }
}
onMounted(load)
onBeforeUnmount(()=>{alive=false;widget?.destroy()})
watch(()=>props.total,value=>{widget?.setAmount(value).catch(e=>{error.value=e.message;emit('ready',false)})})
defineExpose({selection:()=>widget?.selection(),agreed:()=>widget?.agreed(),request:options=>{
  if(!widget) throw new Error('결제수단을 불러온 뒤 다시 시도해 주세요.')
  return widget.request(options)
}})
</script>
<template>
  <section class="checkout-toss-methods" aria-labelledby="card-payment-title" :aria-busy="loading" :inert="disabled || undefined">
    <h2 id="card-payment-title">결제수단</h2>
    <p class="payment-help">신용·체크카드 또는 간편결제를 선택해 주세요.</p>
    <p v-if="loading" role="status">카드 및 간편결제 수단을 불러오는 중입니다…</p>
    <p v-if="!tossTestConfigured" class="error">테스트 결제 키 설정이 필요합니다.</p>
    <div :id="id" class="payment-method-widget"></div>
    <div :id="id+'-agreement'"></div>
    <template v-if="error"><p class="error" role="alert">{{error}}</p><button type="button" class="button" @click="load">다시 불러오기</button></template>
  </section>
</template>
<style scoped>
.checkout-toss-methods { min-width:0; padding-top:4px; }
.checkout-toss-methods h2 { margin:0 0 8px; font-size:1.2rem; }
.payment-help { margin:0 0 12px; color:var(--ui-muted); font-size:.9rem; }
.payment-method-widget { border:1px solid var(--ui-border); border-radius:10px; overflow:hidden; background:#fff; }
</style>
