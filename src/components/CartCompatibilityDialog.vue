<script setup>
import { computed, ref, watch } from 'vue'
import { useShop } from '../stores/shop'

const store = useShop()
const compatibilityDialog = ref(null)
const compatibilityGroups = computed(() => {
  const groups = new Map()
  for (const warning of store.cartWarnings) {
    const id = warning.part.productId + ':' + warning.fit.productId
    if (!groups.has(id)) groups.set(id,{ id, part:warning.part.name, fit:warning.fit.name, warnings:[] })
    groups.get(id).warnings.push(warning)
  }
  return [...groups.values()]
})

watch(() => store.cartWarnings, warnings => {
  const dialog = compatibilityDialog.value
  if (warnings.length && !dialog.open) dialog.showModal()
  if (!warnings.length && dialog.open) dialog.close()
}, {flush:'post'})

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
        <p id="compatibility-dialog-summary">상품을 담았습니다. 함께 담긴 부품과의 호환성 경고 {{ store.cartWarnings.length }}건을 확인해 주세요.</p>
      </div>
    </header>
    <ul class="cart-compatibility-list" aria-label="호환성 경고 목록" tabindex="0">
      <li v-for="group in compatibilityGroups" :key="group.id">
        <strong>{{ group.part }} · {{ group.fit }}</strong>
        <p v-for="warning in group.warnings" :key="warning.key">{{ warning.reason }}</p>
      </li>
    </ul>
    <footer class="cart-compatibility-actions">
      <button type="button" class="button" autofocus @click="closeCompatibilityDialog">닫기</button>
    </footer>
  </dialog>
</template>

<style scoped>
.cart-compatibility-dialog {
  width:min(520px,calc(100% - 28px));
  max-height:min(640px,calc(100dvh - 36px));
  margin:auto;
  padding:0;
  overflow:hidden;
  border:1px solid var(--ui-border);
  border-radius:18px;
  background:var(--ui-surface);
  color:var(--ui-text);
  box-shadow:0 20px 72px #080d1759;
}
.cart-compatibility-dialog[open] { display:grid; grid-template-rows:auto minmax(0,1fr) auto; }
.cart-compatibility-dialog::backdrop { background:#080c15a0; backdrop-filter:blur(4px); }
.cart-compatibility-heading { display:flex; align-items:center; gap:14px; padding:20px 22px 16px; }
.cart-warning-icon {
  display:grid;
  place-items:center;
  flex:none;
  width:46px;
  height:46px;
  border-radius:13px;
  background:color-mix(in srgb,var(--cart-warning,#a33649) 15%,var(--ui-surface));
  color:var(--cart-warning,#a33649);
}
:global(:root[data-theme=dark]) .cart-warning-icon { --cart-warning:#ffabb9; }
.cart-warning-icon svg { width:26px; height:26px; }
.cart-compatibility-heading h2 { margin:0; font-size:1.22rem; letter-spacing:-.02em; }
.cart-compatibility-dialog p { margin:4px 0 0; font-size:.85rem; line-height:1.55; color:var(--ui-muted); }
.cart-compatibility-list { min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; margin:0 22px; padding:0; list-style:none; }
.cart-compatibility-list li { padding:12px 4px; border-top:1px solid var(--ui-border); word-break:keep-all; overflow-wrap:anywhere; }
.cart-compatibility-actions { display:flex; justify-content:flex-end; padding:14px 22px 18px; border-top:1px solid var(--ui-border); }
.cart-compatibility-actions .button { min-width:92px; min-height:42px; }
@media(max-width:520px) {
  .cart-compatibility-heading,.cart-compatibility-actions { padding-inline:16px; }
  .cart-compatibility-list { margin-inline:16px; }
}
</style>
