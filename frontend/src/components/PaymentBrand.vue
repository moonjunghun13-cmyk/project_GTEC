<script setup>
import { computed } from 'vue'

const props = defineProps({ method:{ type:String, required:true } })
const marks = {
  '네이버페이': 'naver.svg',
  '카카오페이': 'kakao.png',
  '삼성페이': 'samsung.png',
  '토스페이먼츠': 'toss.png',
}
const mark = computed(() => marks[props.method])
</script>

<template>
  <img v-if="mark" :src="'/payment-brands/' + mark" class="payment-brand" :data-mark="mark" alt="">
</template>

<style scoped>
.payment-brand { display:block; width:auto; height:22px; max-width:70px; object-fit:contain; flex:none; }
.payment-brand[data-mark="samsung.png"] { height:26px; border-radius:5px; background:#fff; }
.payment-brand[data-mark="toss.png"] { width:23px; height:23px; }
</style>
