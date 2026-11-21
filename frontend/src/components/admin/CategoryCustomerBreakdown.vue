<script setup>
import {computed,ref} from 'vue'
import AdminChart from './AdminChart.vue'
import AdminIcon from './AdminIcon.vue'
const props=defineProps({rows:{type:Array,default:()=>[]},products:{type:Array,default:()=>[]},categoryOrder:{type:Array,default:()=>[]}})
const view=ref('line')
const lineRows=computed(()=>{const counts=new Map(props.rows);const order=props.categoryOrder.length ? props.categoryOrder : props.rows.map(row=>row[0]);return order.filter(name=>counts.has(name)).map(name=>[name,counts.get(name)])})
const items=computed(()=>props.rows.map(([name,count])=>({name,count,image:props.products.find(product=>product.category===name)?.image || ''})))
</script>
<template>
 <div class="category-customer-panel">
  <div class="category-view-controls"><span>카테고리별 고객 수 비교</span><div role="group" aria-label="카테고리 분석 표시 방법"><button type="button" :aria-pressed="view==='line'" @click="view='line'">선 그래프</button><button type="button" :aria-pressed="view==='cards'" @click="view='cards'">카드 보기</button></div></div>
  <AdminChart v-if="view==='line'" large comparison type="line" :labels="lineRows.map(row=>row[0])" :values="lineRows.map(row=>row[1])" label="카테고리별 구매 고객 (명)"/>
  <ul v-else class="category-customer-grid" aria-label="카테고리별 구매 고객 목록">
   <li v-for="item in items" :key="item.name">
    <span class="category-customer-image"><img v-if="item.image" :src="item.image" alt="" loading="lazy"><AdminIcon v-else name="products"/></span>
    <div><span class="category-customer-name">{{ item.name }}</span><strong>{{ item.count.toLocaleString('ko-KR') }}<small>명</small></strong></div>
   </li>
  </ul>
  <p>동일한 고객이 여러 카테고리에 포함될 수 있습니다.</p>
 </div>
</template>
<style scoped>
.category-view-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;flex:none;flex-wrap:wrap}.category-view-controls>span{font-size:13px;color:#8a97a8}.category-view-controls>div{display:flex;padding:3px;gap:3px;background:#f0f3f8;border-radius:8px}.category-view-controls button{border:0;border-radius:6px;background:transparent;color:#718096;padding:7px 12px;font:inherit;font-size:14px;font-weight:650;cursor:pointer}.category-view-controls button[aria-pressed=true]{background:#fff;color:#4464ba;box-shadow:0 1px 4px #24344b0d}.category-customer-panel :deep(.admin-chart){height:330px;min-height:330px;flex:1}
.category-customer-panel{display:flex;flex-direction:column;flex:1;min-width:0;container-type:inline-size}
.category-customer-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;list-style:none;padding:0;margin:0;flex:1}
.category-customer-grid>li{display:flex;align-items:center;gap:10px;min-width:0;min-height:94px;padding:14px 12px;border:1px solid #e7edf5;border-radius:11px;background:#f8fafc}
.category-customer-image{display:grid;place-items:center;width:38px;height:45px;flex:none;background:#fff;border-radius:8px}
.category-customer-image img{width:34px;height:40px;object-fit:contain;mix-blend-mode:multiply}
.category-customer-image svg{width:27px;height:27px;color:#8b9bb0}
.category-customer-grid>li>div{display:grid;gap:6px;min-width:0}
.category-customer-name{font-size:15px;font-weight:600;line-height:1.4;white-space:nowrap;color:#60738b}
.category-customer-grid strong{display:flex;align-items:baseline;gap:4px;font-size:25px;line-height:1.2;font-weight:750;letter-spacing:-.5px;color:#243b59}
.category-customer-grid small{font-size:14px;font-weight:500;letter-spacing:0;color:#8996a8}
.category-customer-panel>p{margin:14px 0 0;font-size:13px;line-height:1.6;color:#8a97a8}
@container(max-width:430px){.category-customer-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.category-customer-grid>li{min-height:86px}}
@media(prefers-reduced-motion:no-preference){.category-customer-grid>li{transition:border-color .15s,background .15s}.category-customer-grid>li:hover{border-color:#ccd8e9;background:#f2f6fc}}
</style>
