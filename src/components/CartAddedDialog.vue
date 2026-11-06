<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { money } from '../utils'
defineProps({product:{type:Object,required:true},quantity:{type:Number,required:true}})
const emit = defineEmits(['close'])
const dialog = ref(null)
const router = useRouter()
onMounted(() => dialog.value.showModal())
function cart() {
  emit('close')
  router.push('/cart')
}
</script>
<template>
  <dialog ref="dialog" class="cart-added-dialog" aria-labelledby="cart-added-title" @cancel.prevent="emit('close')">
    <button class="cart-added-close" aria-label="닫기" @click="emit('close')">×</button>
    <span class="cart-added-check" aria-hidden="true">✓</span>
    <h2 id="cart-added-title">장바구니에 담았습니다</h2>
    <div class="cart-added-product">
      <img v-if="product.image" :src="product.image" alt="">
      <div><small>{{ product.category }} · {{ product.brand }}</small><strong>{{ product.name }}</strong><p>{{ quantity }}개 · {{ money(product.price * quantity) }}</p></div>
    </div>
    <div class="cart-added-actions"><button class="button" @click="emit('close')">계속 쇼핑</button><button class="button gold" @click="cart">장바구니 보기</button></div>
  </dialog>
</template>
