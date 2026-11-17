<script setup>
import { computed, ref, watch } from 'vue'
import { useShop } from '../stores/shop'

const store = useShop()
const compatibilityDialog = ref(null)
const compatibilityGroups = computed(() => {
  const groups = new Map()
  for (const warning of store.cartWarnings) {
    const products = [warning.part, warning.fit]
    if (warning.fit.productId === store.lastAdded) products.reverse()
    const id = products.map(product => product.productId).join(':')
    if (!groups.has(id)) groups.set(id, { id, products, warnings: [] })
    groups.get(id).warnings.push(warning)
  }
  return [...groups.values()]
})

watch(() => store.cartWarnings, warnings => {
  const dialog = compatibilityDialog.value
  if (warnings.length && !dialog.open) dialog.showModal()
  if (!warnings.length && dialog.open) dialog.close()
}, { flush: 'post' })

function closeCompatibilityDialog() {
  store.cartWarnings = []
}
</script>

<template>
  <dialog ref="compatibilityDialog" class="cart-compatibility-dialog" aria-labelledby="compatibility-dialog-title" aria-describedby="compatibility-dialog-summary" @cancel.prevent="closeCompatibilityDialog">
    <header class="cart-compatibility-heading">
      <span class="cart-warning-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.3 4.8a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3z"/>
          <path d="M12 9v4.5m0 3.1h.01"/>
        </svg>
      </span>
      <div>
        <h2 id="compatibility-dialog-title">부품 호환성 확인</h2>
        <p id="compatibility-dialog-summary">상품을 담았어요. 함께 담긴 부품의 호환성 경고 {{ store.cartWarnings.length }}건을 확인해 주세요.</p>
      </div>
    </header>
    <ul class="cart-compatibility-list" aria-label="호환성 경고 목록" tabindex="0">
      <li v-for="group in compatibilityGroups" :key="group.id" class="cart-compatibility-group">
        <div class="cart-compatibility-products">
          <div v-for="product in group.products" :key="product.productId" class="cart-compatibility-product">
            <img v-if="product.image" :src="product.image" alt="" width="64" height="64" class="cart-compatibility-photo">
            <div>
              <span class="cart-compatibility-product-label">
                {{ product.productId === store.lastAdded ? '방금 담은 상품' : '이미 담긴 상품' }} · {{ product.category }}
              </span>
              <strong>{{ product.name }}</strong>
            </div>
          </div>
        </div>
        <ul class="cart-compatibility-reasons" aria-label="충돌 사유">
          <li v-for="warning in group.warnings" :key="warning.key">{{ warning.reason }}</li>
        </ul>
      </li>
    </ul>
    <footer class="cart-compatibility-actions">
      <button type="button" class="button" autofocus @click="closeCompatibilityDialog">닫기</button>
    </footer>
  </dialog>
</template>

<style scoped>
.cart-compatibility-dialog {
  --compatibility-warning:#9c3044;
  width:min(800px,calc(100% - 40px));
  max-height:min(720px,calc(100dvh - 40px));
  margin:auto;
  padding:0;
  overflow:hidden;
  border:1px solid var(--ui-border);
  border-radius:18px;
  background:var(--ui-surface);
  color:var(--ui-text);
  box-shadow:0 20px 72px #080d1759;
}
:global(:root[data-theme=dark] .cart-compatibility-dialog) { --compatibility-warning:#ffabb9; }
.cart-compatibility-dialog[open] { display:grid; grid-template-rows:auto minmax(0,1fr) auto; }
.cart-compatibility-dialog::backdrop { background:#080c15a0; backdrop-filter:blur(4px); }
.cart-compatibility-heading { display:flex; align-items:center; gap:16px; padding:26px 28px 22px; }
.cart-warning-icon {
  display:grid;
  place-items:center;
  flex:none;
  width:48px;
  height:48px;
  border-radius:13px;
  background:color-mix(in srgb,var(--compatibility-warning) 13%,var(--ui-surface));
  color:var(--compatibility-warning);
}
.cart-warning-icon svg { width:27px; height:27px; }
.cart-compatibility-heading h2 { margin:0; font-size:1.45rem; line-height:1.3; letter-spacing:-.02em; }
.cart-compatibility-heading p { margin:6px 0 0; font-size:.95rem; line-height:1.6; color:var(--ui-muted); word-break:keep-all; }
.cart-compatibility-list {
  min-height:0;
  overflow:auto;
  overscroll-behavior:contain;
  scrollbar-width:thin;
  scrollbar-gutter:stable;
  margin:0;
  padding:0 28px;
  list-style:none;
}
.cart-compatibility-group { padding:18px 0; border-top:1px solid var(--ui-border); }
.cart-compatibility-products { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.cart-compatibility-product { display:flex; align-items:center; gap:12px; min-width:0; }
.cart-compatibility-photo { display:block; flex:none; width:64px; height:64px; padding:4px; background:#fff; object-fit:contain; border-radius:9px; }
.cart-compatibility-product-label { display:block; margin-bottom:4px; color:var(--ui-muted); font-size:.8rem; font-weight:600; line-height:1.45; }
.cart-compatibility-product strong { display:block; font-size:1rem; line-height:1.45; overflow-wrap:anywhere; word-break:keep-all; }
.cart-compatibility-reasons { display:grid; gap:6px; margin:14px 0 0; padding:0 0 0 20px; list-style:disc; }
.cart-compatibility-reasons li { padding-left:3px; font-size:.95rem; line-height:1.75; word-break:keep-all; overflow-wrap:anywhere; }
.cart-compatibility-reasons li::marker { color:var(--compatibility-warning); }
.cart-compatibility-actions { display:flex; justify-content:flex-end; padding:14px 28px 18px; border-top:1px solid var(--ui-border); }
.cart-compatibility-actions .button { min-width:100px; min-height:44px; }

@media(max-width:540px) {
  .cart-compatibility-dialog { width:calc(100% - 24px); max-height:calc(100dvh - 24px); }
  .cart-compatibility-heading { gap:12px; padding-block:16px; }
  .cart-warning-icon { width:40px; height:40px; }
  .cart-compatibility-heading h2 { font-size:1.25rem; }
  .cart-compatibility-heading,.cart-compatibility-actions,.cart-compatibility-list { padding-inline:16px; }
  .cart-compatibility-products { grid-template-columns:minmax(0,1fr); gap:12px; }
  .cart-compatibility-photo { width:52px; height:52px; }
  .cart-compatibility-actions { padding-block:10px; }
}
</style>
