<script setup>
defineProps({product:{type:Object,required:true}})
</script>
<template>
  <div v-if="product.details" class="product-editorial">
    <div class="editorial-highlights" aria-label="상품 핵심 구성">
      <article v-for="(feature,index) in product.details.features" :key="feature">
        <div class="highlight-top"><span>{{ String(index+1).padStart(2,'0') }}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <template v-if="index === 0"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 5 8-5M12 12.5V21"/></template>
            <template v-else-if="index === 1"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/><rect x="10" y="10" width="4" height="4" rx="1"/></template>
            <template v-else><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></template>
          </svg>
        </div>
        <h3>{{ feature }}</h3>
        <p>{{ product.spec.split(' · ')[index] || '상세 스펙을 확인해 주세요.' }}</p>
      </article>
    </div>
    <section class="editorial-overview">
      <div><p class="editorial-eyebrow">ABOUT THIS PRODUCT</p><h3>{{ product.name }}<span>살펴보기</span></h3></div>
      <p class="editorial-overview-body">{{ product.details.overview }}</p>
    </section>
    <div class="editorial-chapters">
      <article v-for="([title,body],index) in product.details.sections" :key="title">
        <span class="editorial-number" aria-hidden="true">{{ String(index+1).padStart(2,'0') }}</span>
        <div class="editorial-chapter-body">
          <div class="editorial-chapter-heading"><h3>{{ title }}</h3><small v-if="product.spec.split(' · ')[index]"><span aria-hidden="true">✦</span> 등록 사양 · {{ product.spec.split(' · ')[index] }}</small></div>
          <p>{{ body }}</p>
        </div>
      </article>
    </div>
    <section class="editorial-usage">
      <div><p class="editorial-eyebrow">FIND YOUR SETUP</p><h3>이럴 때<br>살펴보세요<span aria-hidden="true">↗</span></h3></div>
      <ul><li v-for="usage in product.details.usage" :key="usage">{{ usage }}</li></ul>
    </section>
  </div>
</template>
<style scoped src="./product-editorial.css"></style>

