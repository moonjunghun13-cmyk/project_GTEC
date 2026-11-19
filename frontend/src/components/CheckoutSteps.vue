<script setup>
defineProps({step:{type:Number,default:1}})
</script>
<template>
  <ol class="checkout-steps" aria-label="주문 진행 단계">
    <li v-for="(label,index) in ['장바구니','주문 / 결제','주문 완료']" :key="label" :class="{current:step === index+1,done:step > index+1}" :aria-current="step === index+1 ? 'step' : undefined"><small>STEP {{ String(index+1).padStart(2,'0') }}</small><strong>{{ label }}</strong></li>
  </ol>
</template>

<style scoped>
.checkout-steps {
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  width:min(100%,390px);
  gap:clamp(12px,3vw,30px);
  padding:0;
  margin:0 0 1rem;
  list-style:none;
}
.cart-page-heading .checkout-steps { margin:0; }
.checkout-steps li { position:relative; padding:5px 0 9px; color:var(--ui-muted); }
.checkout-steps li:not(:last-child)::after {
  content:"";
  position:absolute;
  top:calc(50% - 4px);
  right:calc(clamp(12px,3vw,30px) / -2);
  width:6px;
  height:6px;
  border:solid currentColor;
  border-width:1px 1px 0 0;
  transform:rotate(45deg);
}
.checkout-steps small { display:block; font-size:.66rem; letter-spacing:.08em; }
.checkout-steps strong { font-size:clamp(.78rem,2.5vw,.92rem); white-space:nowrap; }
.checkout-steps .current { color:var(--ui-text); }
.checkout-steps .current strong { text-decoration:underline; text-underline-offset:6px; text-decoration-thickness:2px; }
.checkout-steps .done { color:var(--ui-text); }
</style>
