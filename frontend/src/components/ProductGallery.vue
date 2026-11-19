<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ProductArt from './ProductArt.vue'
const props = defineProps({product:{type:Object,required:true},slides:{type:Array,required:true}})
const root = ref(null)
const active = ref(0)
const paused = ref(false)
const hovered = ref(false)
const focused = ref(false)
const visible = ref(false)
const pageVisible = ref(true)
const slide = computed(() => props.slides[active.value])
const playing = computed(() => props.slides.length > 1 && visible.value && pageVisible.value && !paused.value && !hovered.value && !focused.value)
let timer
let observer
function move(offset) { active.value = (active.value + offset + props.slides.length) % props.slides.length }
function togglePlayback() { paused.value = !paused.value; if (!paused.value) { focused.value = false; hovered.value = false } }
function pageVisibility() { pageVisible.value = !document.hidden }
function leaveFocus(event) { focused.value = root.value.contains(event.relatedTarget) }
watch([playing,active],() => {
  clearTimeout(timer)
  if (playing.value) timer = setTimeout(() => move(1),4000)
})
watch(() => props.slides.length,() => { if (active.value >= props.slides.length) active.value = 0 })
onMounted(() => {
  paused.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  pageVisibility()
  document.addEventListener('visibilitychange',pageVisibility)
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting },{threshold:.25})
  observer.observe(root.value)
})
onUnmounted(() => {
  clearTimeout(timer)
  observer?.disconnect()
  document.removeEventListener('visibilitychange',pageVisibility)
})
</script>
<template>
  <section ref="root" class="detail-gallery" :class="{'storage-gallery': ['SSD','HDD'].includes(product.category)}" aria-label="상품 이미지 갤러리" @pointerenter="hovered = $event.pointerType === 'mouse'" @pointerleave="hovered = false" @focusin="focused = true" @focusout="leaveFocus">
    <div class="detail-gallery-stage product-gallery-stage">
      <img class="gallery-brand-mark" src="/gt-logo-chrome.png" alt="GT전자">
      <Transition name="product-image">
        <div :key="active" class="product-gallery-slide" :class="{'styled-scene': slide?.color?.includes('연출컷')}">
          <div v-if="slide?.comparison" class="detail-gallery-comparison">
            <img v-for="item in slide.comparison" :key="item.image" :src="item.image" :alt="product.name+' · '+item.color">
          </div>
          <ProductArt v-else :category="product.category" :brand="product.brand" :photo="slide?.image || product.image"/>
        </div>
      </Transition>
      <template v-if="slides.length > 1">
        <button type="button" class="button gallery-previous" aria-label="이전 상품 이미지" @click="move(-1)">‹</button>
        <button type="button" class="button gallery-next" aria-label="다음 상품 이미지" @click="move(1)">›</button>
      </template>
    </div>
    <div v-if="slides.length > 1" class="product-gallery-thumbnails" aria-label="상품 사진 선택">
      <button v-for="(item,index) in slides" :key="index" type="button" :aria-label="(item.color || '상품 사진')+' 보기'" :aria-pressed="active === index" @click="active = index">
        <span v-if="item.comparison" class="gallery-thumb-comparison"><img v-for="photo in item.comparison" :key="photo.image" :src="photo.image" alt=""></span>
        <img v-else :src="item.image || product.image" :alt="item.color || '상품 사진'" loading="lazy">
      </button>
    </div>
    <div v-if="slides.length > 1" class="product-gallery-toolbar">
      <div class="product-gallery-dots"><button v-for="(item,index) in slides" :key="index" :aria-label="(item.color || '상품 이미지')+' 보기'" :aria-pressed="active === index" @click="active = index"></button></div>
      <span>{{ active+1 }} / {{ slides.length }}</span><button type="button" class="gallery-play" :aria-label="paused ? '상품 이미지 자동 재생' : '상품 이미지 일시정지'" @click="togglePlayback">{{ paused ? '▶' : 'Ⅱ' }}</button>
    </div>
  </section>
</template>
<style src="./product-gallery.css"></style>


