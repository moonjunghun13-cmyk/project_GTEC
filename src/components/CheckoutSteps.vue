<script setup>
defineProps({step:{type:Number,default:1}})
</script>
<template>
  <ol class="checkout-steps" aria-label="주문 진행 단계">
    <li v-for="(label,index) in ['장바구니','주문 / 결제','주문 완료']" :key="label" :class="{current:step === index+1,done:step > index+1}" :aria-current="step === index+1 ? 'step' : undefined"><small>STEP {{ String(index+1).padStart(2,'0') }}</small><strong>{{ label }}</strong></li>
  </ol>
</template>
