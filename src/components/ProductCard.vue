<script setup>
import { useShop } from '../stores/shop'
import { money } from '../utils'
import CartIcon from './CartIcon.vue'
import ProductArt from './ProductArt.vue'
defineProps({product:{type:Object,required:true},ribbon:String,ribbonTone:String})
const store = useShop()
</script>
<template>
  <article class="product-card">
    <RouterLink :to="'/products/'+product.productId"><ProductArt :category="product.category" :brand="product.brand" :photo="product.image" :ribbon="ribbon" :ribbon-tone="ribbonTone" /></RouterLink>
    <div class="card-body">
      <div class="card-meta"><span>{{ product.category }} / {{ product.brand }}</span><button :disabled="store.role === 'ADMIN'" :aria-label="store.favorites.includes(product.productId) ? '찜 해제' : '찜하기'" :aria-pressed="store.favorites.includes(product.productId)" @click="store.requireUser(() => store.favorite(product.productId))">{{ store.favorites.includes(product.productId) ? '♥' : '♡' }}</button></div>
      <RouterLink class="product-name" :to="'/products/'+product.productId">{{ product.name }}</RouterLink>
      <p class="muted">{{ product.spec }}</p>
      <div class="card-buy-row"><strong>{{ money(product.price) }}</strong><button class="card-add-button" :disabled="!product.stock || store.role === 'ADMIN' || (store.cart.find(row => row.productId === product.productId)?.quantity ?? 0) >= product.stock" :aria-label="product.name+' 장바구니 담기'" @click="store.addAndShow(product.productId)"><CartIcon/></button></div>
    </div>
  </article>
</template>

