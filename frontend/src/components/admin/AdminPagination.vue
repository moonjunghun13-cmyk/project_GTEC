<script setup>
import { computed } from 'vue'
const props=defineProps({page:{type:Number,default:0},pages:{type:Number,default:0},total:{type:Number,default:0},busy:Boolean,label:{type:String,default:'목록'}})
const emit=defineEmits(['change'])
const last=computed(()=>Math.max(0,props.pages-1))
</script>
<template>
  <nav class="admin-pagination" :aria-label="label+' 페이지 이동'">
    <span>{{ total.toLocaleString('ko-KR') }}건</span>
    <div class="admin-pagination-controls">
    <button type="button" :disabled="busy || page<=0" @click="emit('change',0)" :aria-label="label+' 첫 페이지'">처음</button>
    <button type="button" :disabled="busy || page<=0" @click="emit('change',page-1)" :aria-label="label+' 이전 페이지'">이전</button>
    <output aria-live="polite">{{ Math.min(page,last)+1 }} / {{ Math.max(1,pages) }}</output>
    <button type="button" :disabled="busy || page>=last" @click="emit('change',page+1)" :aria-label="label+' 다음 페이지'">다음</button>
    <button type="button" :disabled="busy || page>=last" @click="emit('change',last)" :aria-label="label+' 마지막 페이지'">마지막</button>
    </div>
  </nav>
</template>
<style>
.admin-pagination{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;padding:13px 16px;border-top:1px solid var(--work-border,#dce3ec);flex:none;font-size:15px;white-space:nowrap}
.admin-pagination>span{grid-column:1;margin:0;color:var(--admin-muted,#657388)}
.admin-pagination-controls{grid-column:2;display:flex;align-items:center;justify-content:center;gap:8px}
.admin-pagination button{border:1px solid var(--work-border,#dce3ec);border-radius:6px;background:var(--work-surface,#fff);color:inherit;padding:8px 12px;font:inherit;line-height:1.4;cursor:pointer}
.admin-pagination button:disabled{opacity:.5;cursor:default}
.admin-pagination output{min-width:56px;text-align:center;font-weight:700}
.operations-board .admin-pagination{font-size:14px;padding:12px 0 0;gap:6px}
.operations-board .admin-pagination button{font-size:13px;padding:7px 9px}
.admin-management .ops-record-list:has(>.admin-pagination){grid-template-rows:auto minmax(0,1fr) auto}
@media(max-width:600px){.admin-pagination{grid-template-columns:1fr;gap:7px;padding:10px 6px;font-size:14px}.admin-pagination>span{grid-column:1;text-align:center}.admin-pagination-controls{grid-column:1;gap:5px}.admin-pagination button{padding:7px 9px}}
</style>
