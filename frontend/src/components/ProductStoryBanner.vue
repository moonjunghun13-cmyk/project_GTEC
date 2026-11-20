<script setup>
import { computed } from 'vue'
const props = defineProps({product:{type:Object,required:true}})
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
const theme = computed(() => themes[props.product.category] || themes.CPU)
const alternate = computed(() => props.product.gallery?.find(photo => photo.image !== props.product.image))
</script>

<template>
  <div class="story-banner" :data-mood="theme.mood" :style="{'--story-accent':theme.accent,'--story-glow':theme.glow,'--story-base':theme.base}">
    <div class="story-banner-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="story-banner-topline">
      <span>{{ product.brand ? `${product.brand} / ` : '' }}{{ product.category }}</span>
      <img src="/gt-logo-chrome.png" alt="GT전자" width="88" height="48">
    </div>
    <div class="story-banner-copy">
      <h2 id="product-story-title">{{ product.details?.headline || product.name }}</h2>
      <strong>{{ product.name }}</strong>
      <p>{{ product.details?.description }}</p>
    </div>
    <div v-if="product.image" class="story-product-set" :class="{'with-alternate':alternate}">
      <figure class="story-product-photo">
        <img :src="product.image" :alt="product.name" loading="lazy" decoding="async">
      </figure>
      <figure v-if="alternate" class="story-product-photo alternate">
        <img :src="alternate.image" :alt="product.name + ' 다른 각도'" loading="lazy" decoding="async">
      </figure>
    </div>
    <p class="story-product-spec">{{ product.spec }}</p>
  </div>
</template>
<style scoped src="./product-story-banner.css"></style>
