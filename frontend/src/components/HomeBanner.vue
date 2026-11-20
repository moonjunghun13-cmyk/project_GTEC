<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import CyberAtmosphere from './CyberAtmosphere.vue'

const slides = [
  { image:'memory', query:{category:'메모리'}, label:'더 빠른 속도, 더 넓은 가능성 · 메모리 보기' },
  { image:'gaming', query:{category:'케이스'}, label:'몰입감 넘치는 게이밍 셋업 · 케이스 보기' },
  { image:'mouse-banner', query:{category:'마우스'}, label:'무중력의 속도 · 마우스 보기' },
  { image:'premium-gaming', query:{category:'케이스'}, label:'프리미엄 게이밍 몰입감 · 케이스 보기' },
  { image:'performance-orbit', query:{sort:'new'}, label:'차세대 PC 퍼포먼스의 궤도 · 신상품 보기' },
  { image:'fast-ddr5', query:{category:'메모리'}, label:'더 빠른 속도, 강력한 퍼포먼스 · 메모리 보기' },
]
const interval = 3500
const banner = ref(null)
const active = ref(0)
const paused = ref(false)
const visible = ref(false)
const hovered = ref(false)
const focused = ref(false)
const pageVisible = ref(true)
const playing = computed(() => visible.value && pageVisible.value && !paused.value && !hovered.value && !focused.value)

let observer
let timer
// Decode incoming artwork before switching so the outgoing banner never exposes a blank frame.
const prepared = new Map()
let desired = 0
let selection = 0
let disposed = false
function prepare(index) {
  if (!prepared.has(index)) {
    const image = new Image()
    image.decoding = 'async'
    const ready = new Promise((resolve,reject) => {
      image.onload = async () => {
        try { await image.decode() } catch {}
        resolve()
      }
      image.onerror = () => { prepared.delete(index); reject(new Error('Banner image unavailable')) }
      image.src = '/storefront/' + slides[index].image + '.png'
    })
    prepared.set(index,ready)
  }
  return prepared.get(index)
}
async function select(index) {
  desired = index
  const current = ++selection
  try { await prepare(index) }
  catch { if (current === selection) desired = active.value; return }
  if (!disposed && current === selection) active.value = index
}
function move(offset) { select((desired + offset + slides.length) % slides.length) }
function updatePageVisibility() { pageVisible.value = !document.hidden }
watch([playing, active], () => {
  clearTimeout(timer)
  if (playing.value) timer = setTimeout(() => move(1), interval)
})
function preloadNext() {
  prepare((active.value + 1) % slides.length).catch(() => {})
}
watch(active,preloadNext)
onMounted(() => {
  preloadNext()
  paused.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  updatePageVisibility()
  document.addEventListener('visibilitychange', updatePageVisibility)
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting }, {threshold:.35})
  observer.observe(banner.value)
})
onUnmounted(() => {
  disposed = true
  selection++
  observer?.disconnect()
  clearTimeout(timer)
  document.removeEventListener('visibilitychange', updatePageVisibility)
})
function focusOut(event) {
  focused.value = banner.value.contains(event.relatedTarget)
}
</script>
<template>
  <section ref="banner" class="home-banner" aria-label="기획 배너"
    @pointerenter="hovered = $event.pointerType === 'mouse'" @pointerleave="hovered = false"
    @focusin="focused = true" @focusout="focusOut">
    <CyberAtmosphere/>
    <h1 class="sr-only">GT전자 컴퓨터 부품 쇼핑몰</h1>
    <RouterLink :to="{path:'/products',query:slides[active].query}">
      <div class="banner-frame">
        <Transition name="banner-fade">
          <img :key="slides[active].image" :src="'/storefront/'+slides[active].image+'.png'" :alt="slides[active].label">
        </Transition>
      </div>
    </RouterLink>
    <button class="banner-arrow previous" aria-label="이전 배너" @click="move(-1)">‹</button>
    <button class="banner-arrow next" aria-label="다음 배너" @click="move(1)">›</button>
    <div class="banner-dots">
      <button v-for="(slide,index) in slides" :key="slide.image" :aria-label="slide.label" :aria-pressed="active === index" @click="select(index)"></button>
      <button class="banner-playback" :aria-label="paused ? '자동 재생 켜기' : '자동 재생 일시정지'" @click="paused = !paused">{{ paused ? '▶' : 'Ⅱ' }}</button>
    </div>
  </section>
</template>
