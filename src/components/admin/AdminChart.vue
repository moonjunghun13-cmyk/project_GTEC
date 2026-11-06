<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
const props = defineProps({type:{type:String,default:'bar'},labels:Array,values:Array,label:String,dark:Boolean,hideLegend:Boolean})
const canvas = ref(null)
let chart
function render() {
  chart?.destroy()
  const line = props.type === 'line'
  const axisColor = props.dark ? '#aaa298' : '#655e54'
  const gridColor = props.dark ? '#ffffff12' : '#24201a12'
  const gradient = canvas.value.getContext('2d').createLinearGradient(0,0,0,220)
  gradient.addColorStop(0,'#aeb9cc40')
  gradient.addColorStop(1,'#aeb9cc00')
  chart = new Chart(canvas.value,{
    type:props.type,
    data:{labels:props.labels,datasets:[{label:props.label,data:props.values,
      backgroundColor:line ? gradient : props.type === 'doughnut' ? ['#8f9bad','#292f39','#d0d6e0','#68778f','#e5e9ef','#515d70','#adb8c9','#7c889c','#bec8d7','#66748b'] : '#a7b2c4',
      borderColor:line ? '#596b87' : '#7e8ba0',borderWidth:line ? 2 : 1,borderRadius:5,fill:line,tension:.25,pointRadius:line ? 3 : undefined,pointBackgroundColor:'#596b87'}]},
    options:{responsive:true,maintainAspectRatio:false,animation:false,cutout:props.type === 'doughnut' ? '62%' : undefined,
      plugins:{legend:{display:props.type === 'doughnut' && !props.hideLegend,position:'bottom',labels:{boxWidth:9,boxHeight:9,padding:12,color:axisColor,font:{size:11}}}},
      scales:props.type === 'doughnut' ? {} : {
        x:{grid:{display:false},border:{display:false},ticks:{color:axisColor}},
        y:{beginAtZero:true,grid:{color:gridColor},border:{display:false},ticks:{color:axisColor,maxTicksLimit:4,precision:0,callback:value => props.label.includes('(원)') && Math.abs(value) >= 10000 ? (value / 10000).toLocaleString('ko-KR') + '만' : value}},
      }},
  })
}
onMounted(render)
watch(() => [props.labels,props.values,props.type],render)
onUnmounted(() => chart?.destroy())
</script>
<template>
  <div class="admin-chart"><canvas ref="canvas" role="img" :aria-label="label+' · '+labels.map((item,index) => item+' '+values[index]).join(', ')"></canvas></div>
</template>
