<script setup>
defineProps({category:String,brand:String,photo:String,ribbon:String,ribbonTone:String})
</script>
<template>
  <div class="product-art" :class="{'has-photo':photo}" aria-hidden="true"><img class="product-watermark" src="/gt-logo-chrome.png" alt="">
    <img v-if="photo" :src="photo" alt="" loading="lazy">
    <svg v-else viewBox="0 0 240 150" fill="none">
      <g v-if="category === '그래픽카드' || category === '스피커'">
        <path d="M18 44h204v65H18z" fill="#24252a" stroke="#9e8352" stroke-width="2"/>
        <g v-for="x in [55,120,185]" :key="x" :transform="'translate('+x+' 76)'"><circle r="25" fill="#111215" stroke="#68696b"/><circle r="8" fill="#a98c59"/><path v-for="n in 7" :key="n" :transform="'rotate('+n*360/7+')'" d="M0 -9 Q-19 -28 -21 -12 Q-12 -8 0 -9" fill="#68696b"/></g>
      </g>
      <g v-else-if="category === '마우스'"><rect x="87" y="21" width="66" height="108" rx="33" fill="#27282b" stroke="#b39864" stroke-width="2"/><path d="M120 22v43M88 65h64" stroke="#737477"/><rect x="116" y="35" width="8" height="19" rx="4" fill="#b39864"/></g>
      <g v-else-if="['메모리','SSD','HDD','키보드'].includes(category)">
        <rect x="27" y="50" width="186" height="55" rx="5" fill="#26272a" stroke="#b39864" stroke-width="2"/>
        <rect v-for="i in 12" :key="i" :x="33+i*13" y="61" width="9" height="29" rx="2" fill="#64666b"/><path d="M42 103h154" stroke="#b39864" stroke-width="4"/>
      </g>
      <g v-else>
        <rect x="67" y="22" width="106" height="106" rx="9" fill="#28292d" stroke="#a98c59" stroke-width="2"/>
        <rect x="82" y="37" width="76" height="76" rx="5" fill="#4e5055" stroke="#919295"/>
        <path d="M95 50h50v50H95z" fill="#25262a" stroke="#b39864"/>
        <text x="120" y="80" fill="#f1dbad" text-anchor="middle" font-size="12" font-family="sans-serif">GT</text>
      </g>
    </svg>
    <span v-if="ribbon" class="photo-ribbon" :data-tone="ribbonTone"><span aria-hidden="true">✦</span> {{ ribbon }}</span><span v-else-if="!photo">{{ brand }}</span>
  </div>
</template>
