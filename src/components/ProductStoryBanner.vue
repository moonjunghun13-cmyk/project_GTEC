<script setup>
import { computed, useId } from 'vue'
const props = defineProps({product:{type:Object,required:true}})
// Presentation themes only. Product copy and image URLs arrive through the service UI model.
const themes = {
  '모니터':{mood:'flare',accent:'#e6edf8',glow:'137,151,173',base:'#090d15'},
  CPU:{mood:'orbit',accent:'#e4e8ed',glow:'112,120,132',base:'#0b0d10'},
  '메인보드':{mood:'circuit',accent:'#cbd2da',glow:'90,102,114',base:'#0c1013'},
  '메모리':{mood:'light',accent:'#e1e5e8',glow:'112,120,126',base:'#0d1012'},
  '그래픽카드':{mood:'flare',accent:'#eff0f3',glow:'130,133,142',base:'#101014'},
  'SSD':{mood:'tracks',accent:'#d6dce1',glow:'101,110,118',base:'#0b0e10'},
  'HDD':{mood:'orbit',accent:'#e0e5ea',glow:'108,116,124',base:'#0c0e11'},
  '파워':{mood:'energy',accent:'#e7ebef',glow:'123,128,136',base:'#0d0f12'},
  '케이스':{mood:'arch',accent:'#d9dfe6',glow:'108,115,126',base:'#0e1014'},
  '키보드':{mood:'keys',accent:'#eceef0',glow:'119,122,128',base:'#111214'},
  '마우스':{mood:'motion',accent:'#d7dee5',glow:'102,113,126',base:'#0b0e13'},
  '스피커':{mood:'sound',accent:'#dfe3e7',glow:'111,119,125',base:'#0d1012'},
}
// Scoped presentation filter: neutralize warm set lighting while retaining other image colors.
const silverLightId = 'story-silver-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
const theme = computed(() => themes[props.product.category] || themes.CPU)
const photos = computed(() => {
  const styled = props.product.lifestyle || []
  return [
    {color:'BLACK',image:styled.find(row => row.label === '검정 연출컷')?.image || props.product.gallery?.[0]?.image || props.product.image},
    {color:'WHITE',image:styled.find(row => row.label === '흰색 연출컷')?.image || props.product.gallery?.[1]?.image},
  ].filter(row => row.image)
})
</script>
<template>
  <div class="story-banner" :data-mood="theme.mood" :style="{'--story-accent':theme.accent,'--story-glow':theme.glow,'--story-base':theme.base}">
    <!-- Warm lighting mask only: RGB lighting outside this mask stays intact. -->
    <svg class="story-light-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter :id="silverLightId" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  16 0 -16 0 -.02" result="warmRed"/>
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 16 -16 0 -.01" result="warmGreen"/>
          <feComposite in="warmRed" in2="warmGreen" operator="in" result="warmMask"/>
          <feColorMatrix in="SourceGraphic" type="matrix" values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0" result="silverLight"/>
          <feComposite in="silverLight" in2="warmMask" operator="in" result="silverLighting"/>
          <feComposite in="SourceGraphic" in2="warmMask" operator="out" result="originalColors"/>
          <feComposite in="silverLighting" in2="originalColors" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
        </filter>
      </defs>
    </svg>
    <div class="story-banner-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="story-banner-topline">
      <span>{{ product.brand }} <b>/</b> {{ product.category }}</span>
      <img src="/gt-logo-chrome.png" alt="GT전자" width="88" height="48">
    </div>
    <div class="story-banner-copy">
      <h2 id="product-story-title">{{ product.details?.headline || product.name }}</h2>
      <strong>{{ product.name }}</strong>
      <p>{{ product.details?.description }}</p>
    </div>
    <div class="story-banner-visual" :aria-label="product.name + ' 검정·흰색 연출컷'">
      <figure v-for="photo in photos" :key="photo.color" :class="photo.color.toLowerCase()">
        <img :src="photo.image" :style="product.storyColorManaged ? undefined : {filter:`url(#${silverLightId})`}" :alt="product.name + ' ' + (photo.color === 'BLACK' ? '검정' : '흰색') + ' 연출컷'" loading="lazy" decoding="async">
      </figure>
    </div>
    <div class="story-banner-colors" aria-hidden="true"><span><i></i> BLACK</span><em>{{ product.spec }}</em><span><i></i> WHITE</span></div>
  </div>
</template>
<style scoped src="./product-story-banner.css"></style>


