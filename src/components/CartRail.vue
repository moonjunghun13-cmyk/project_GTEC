<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../stores/shop'
import { money } from '../utils'
import CartIcon from './CartIcon.vue'
const store = useShop()
const router = useRouter()
const route = useRoute()
function checkout() {
  store.cartOpen = false
  store.requireUser(() => { store.checkoutIds = null; return router.push('/checkout') })
}
</script>
<template>
  <template v-if="route.meta.role !== 'ADMIN' && store.role !== 'ADMIN' && route.path !== '/cart'">
    <aside v-if="store.cartOpen && route.path !== '/'" class="cart-rail" aria-label="담은 상품 바로 확인">
      <header><div class="cart-rail-heading"><CartIcon/><h2>장바구니 <span>{{ store.cartCount }}</span></h2></div><button aria-label="장바구니 패널 닫기" @click="store.cartOpen = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <p class="cart-rail-notice" role="status">{{ store.cartNotice }}</p>
      <div class="cart-rail-items">
        <p v-if="!store.cartItems.length" class="muted">아직 담은 상품이 없습니다.</p>
        <article v-for="item in store.cartItems" :key="item.productId" :class="{'cart-rail-latest':store.lastAdded === item.productId}">
          <RouterLink :to="'/products/'+item.productId"><img v-if="item.image" :src="item.image" alt=""><span>{{ item.name }}</span></RouterLink>
          <div class="cart-rail-item-controls"><div><button :aria-label="item.name+' 수량 줄이기'" @click="store.quantity(item.productId,item.quantity-1)">−</button><span>{{ item.quantity }}</span><button :disabled="item.quantity >= item.stock" :aria-label="item.name+' 수량 늘리기'" @click="store.quantity(item.productId,item.quantity+1)">+</button></div><strong>{{ money(item.price*item.quantity) }}</strong><button class="cart-rail-remove" :aria-label="item.name+' 삭제'" @click="store.quantity(item.productId,0)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
        </article>
      </div>
      <footer><div><span>상품 합계</span><strong>{{ money(store.total) }}</strong></div><p>담은 상품 {{ store.cartCount }}개</p><RouterLink class="button" to="/cart" @click="store.cartOpen = false">장바구니 보기</RouterLink><button class="button gold" :disabled="!store.cartItems.length" @click="checkout">주문하기</button></footer>
    </aside>
    <button v-else-if="store.cartCount" class="cart-rail-toggle" @click="route.path === '/' ? router.push('/cart') : store.cartOpen = true" :aria-label="route.path === '/' ? '장바구니 보기' : '담은 상품 패널 열기'"><CartIcon/> {{ store.cartCount }} <strong>{{ money(store.total) }}</strong></button>
  </template>
</template>
