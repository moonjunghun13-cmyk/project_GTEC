<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
const props = defineProps({ interactive: { type: Boolean, default: true }, ambient: { type: Boolean, default: true } })
const canvas = ref(null)
let frame, observer, resize, surface, ctx, motion
let width=0,height=0,visible=true,last=0,elapsed=0,particles=[]
const pointer={x:.5,y:.5,targetX:.5,targetY:.5}
function move(e){const r=surface.getBoundingClientRect();pointer.targetX=(e.clientX-r.left)/r.width;pointer.targetY=(e.clientY-r.top)/r.height}
function leave(){pointer.targetX=.5;pointer.targetY=.5}
function size(){
  const r=surface.getBoundingClientRect();width=r.width;height=r.height
  const ratio=Math.min(window.devicePixelRatio || 1,1.5)
  canvas.value.width=Math.round(width*ratio);canvas.value.height=Math.round(height*ratio)
  ctx.setTransform(ratio,0,0,ratio,0,0)
  particles=Array.from({length:Math.min(110,Math.round(width/11))},()=>({x:Math.random()*width,y:Math.random()*height,r:.5+Math.random()*1.8,s:8+Math.random()*22,phase:Math.random()*Math.PI*2}))
  draw(0)
}
function glow(x,y,r,alpha){const light=ctx.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,`rgba(242,246,255,${alpha})`);light.addColorStop(.28,`rgba(211,220,234,${alpha*.38})`);light.addColorStop(1,'rgba(211,220,234,0)');ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2)}
function draw(dt){
  ctx.clearRect(0,0,width,height)
  pointer.x+=(pointer.targetX-pointer.x)*.055;pointer.y+=(pointer.targetY-pointer.y)*.055
  const t=elapsed/1000
  ctx.globalCompositeOperation='screen'
  if(props.ambient){
  glow(width*(.13+.10*Math.sin(t*.25)),height*.28,width*.33,.16)
  glow(width*(.85+.07*Math.cos(t*.21)),height*.7,width*.26,.14)
  }
  if(props.interactive)glow(pointer.x*width,pointer.y*height,Math.max(150,width*.19),.20)
  for(const p of particles){
    p.x+=dt*p.s*.35;p.y-=dt*p.s
    if(p.y < -10){p.y=height+10;p.x=Math.random()*width}if(p.x>width+10)p.x=-10
    const a=.25+.55*Math.pow((Math.sin(t*1.2+p.phase)+1)/2,3)
    ctx.beginPath();ctx.fillStyle=`rgba(237,243,255,${a})`;ctx.arc(p.x+Math.sin(t*.4+p.phase)*14,p.y,p.r,0,Math.PI*2);ctx.fill()
    if(p.r>1.8)glow(p.x,p.y,10,a*.45)
  }
  ctx.globalCompositeOperation='source-over'
}
function tick(time){
  frame=requestAnimationFrame(tick)
  if(!visible || document.hidden || motion.matches){last=time;return}
  if(time-last<32)return
  const dt=Math.min((time-last)/1000,.05);last=time;elapsed+=dt*1000;draw(dt)
}
onMounted(()=>{
  surface=canvas.value.parentElement.parentElement;ctx=canvas.value.getContext('2d');if(!ctx)return
  motion=window.matchMedia('(prefers-reduced-motion: reduce)')
  resize=new ResizeObserver(size);resize.observe(surface)
  observer=new IntersectionObserver(([entry])=>visible=entry.isIntersecting);observer.observe(surface)
  if(props.interactive){surface.addEventListener('pointermove',move,{passive:true});surface.addEventListener('pointerleave',leave)}
  frame=requestAnimationFrame(tick)
})
onUnmounted(()=>{cancelAnimationFrame(frame);resize?.disconnect();observer?.disconnect();surface?.removeEventListener('pointermove',move);surface?.removeEventListener('pointerleave',leave)})
</script>
<template><div class="cyber-atmosphere" aria-hidden="true"><canvas ref="canvas"/><div v-if="ambient" class="cyber-light-cloud"/></div></template>
<style scoped>
.cyber-atmosphere{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;isolation:isolate;mix-blend-mode:screen}.cyber-atmosphere canvas{width:100%;height:100%;display:block}.cyber-light-cloud{position:absolute;inset:-60%;background:radial-gradient(ellipse at center,#ffffff13,transparent 48%);transform:translate(-25%,-15%) rotate(-25deg);animation:cyber-cloud-drift 12s ease-in-out infinite alternate;will-change:transform;filter:blur(25px)}@keyframes cyber-cloud-drift{to{transform:translate(28%,20%) rotate(15deg)}}@media(prefers-reduced-motion:reduce){.cyber-light-cloud{animation:none;will-change:auto;opacity:.4}}
</style>
