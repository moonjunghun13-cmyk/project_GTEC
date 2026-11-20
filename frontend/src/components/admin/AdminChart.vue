<script setup>
import {onMounted,onUnmounted,ref,watch} from 'vue'
import Chart from 'chart.js/auto'
import {useTheme} from '../../stores/theme'
const theme=useTheme()
const props=defineProps({type:{type:String,default:'bar'},labels:Array,values:Array,label:String,dark:Boolean,hideLegend:Boolean,large:Boolean,horizontal:Boolean})
const canvas=ref(null)
let chart
function render(){
 chart?.destroy()
 const line=props.type==='line',donut=props.type==='doughnut',dark=props.dark || theme.mode==='dark'
 const palette=props.large ? ['#566fed','#29aa90','#f2b45d','#b0bfd8','#8c78d7','#65a8d3'] : ['#8f9bad','#292f39','#d0d6e0','#68778f','#e5e9ef','#515d70']
 const color=props.large ? '#566fed' : dark ? '#b7c8e0' : '#596b87'
 const axisColor=dark ? '#b4c0d1' : '#7b8ba0',gridColor=dark ? '#ffffff15' : '#edf1f7'
 const gradient=canvas.value.getContext('2d').createLinearGradient(0,0,0,props.large ? 350 : 220)
 gradient.addColorStop(0,props.large ? '#637df538' : '#aeb9cc40');gradient.addColorStop(1,'#637df500')
 const font={size:props.large ? 14 : 12,family:'Pretendard, Arial, sans-serif'}
 const numericAxis={beginAtZero:true,border:{display:false},grid:{color:gridColor,drawTicks:false},ticks:{color:axisColor,font,padding:12,maxTicksLimit:5,precision:0,callback:value=>props.label.includes('(원)') && Math.abs(value)>=10000 ? (value/10000).toLocaleString('ko-KR')+'만' : value}}
 const categoryAxis={border:{display:false},grid:{display:false},ticks:{color:axisColor,font,padding:12,maxRotation:0}}
 const centerLabel={id:'customerTotal',afterDraw(chart){if(!donut || !props.large)return;const arc=chart.getDatasetMeta(0).data[0];if(!arc)return;const ctx=chart.ctx,total=props.values.reduce((sum,n)=>sum+n,0);ctx.save();ctx.textAlign='center';ctx.fillStyle=axisColor;ctx.font='500 14px Arial';ctx.fillText('전체 고객',arc.x,arc.y-17);ctx.fillStyle=dark ? '#e8eef8' : '#25364d';ctx.font='700 32px Arial';ctx.fillText(total.toLocaleString('ko-KR')+'명',arc.x,arc.y+25);ctx.restore()}}
 chart=new Chart(canvas.value,{type:props.type,data:{labels:props.labels,datasets:[{label:props.label,data:props.values,backgroundColor:line ? gradient : donut ? palette : props.large ? props.horizontal ? props.values.map((_,i)=>i<3 ? '#657eeb' : '#a7b5ed') : '#7287ef' : '#a7b2c4',borderColor:donut ? (dark ? '#202a38' : '#fff') : color,borderWidth:donut ? 4 : line ? 3 : 0,borderRadius:donut ? 6 : props.large ? 8 : 5,borderSkipped:false,fill:line,tension:.32,pointRadius:line ? props.large ? 4 : 3 : undefined,pointHoverRadius:6,pointBackgroundColor:color,pointBorderColor:'#fff',pointBorderWidth:2,maxBarThickness:props.large ? 42 : undefined}]},plugins:[centerLabel],options:{responsive:true,maintainAspectRatio:false,indexAxis:props.horizontal ? 'y' : 'x',animation:false,cutout:donut ? props.large ? '76%' : '62%' : undefined,layout:{padding:props.large ? 8 : 0},plugins:{legend:{display:donut && !props.hideLegend,position:props.large ? 'right' : 'bottom',labels:{boxWidth:11,boxHeight:11,usePointStyle:true,pointStyle:'circle',padding:props.large ? 20 : 12,color:axisColor,font:{...font,size:props.large ? 16 : 11}}},tooltip:{backgroundColor:'#24344b',titleColor:'#fff',bodyColor:'#ecf1f8',padding:14,cornerRadius:9,displayColors:false,titleFont:{size:14},bodyFont:{size:15},callbacks:{label:context=>`${context.dataset.label}: ${Number(context.raw).toLocaleString('ko-KR')}`}}},scales:donut ? {} : props.horizontal ? {x:numericAxis,y:categoryAxis} : {x:categoryAxis,y:numericAxis}}})
}
onMounted(render)
watch(()=>[props.labels,props.values,props.type,props.dark,props.horizontal,theme.mode],render)
onUnmounted(()=>chart?.destroy())
</script>
<template><div class="admin-chart" :class="{'chart-large':large,'chart-doughnut':type==='doughnut'}"><canvas ref="canvas" role="img" :aria-label="label+' · '+labels.map((item,index)=>item+' '+values[index]).join(', ')"></canvas></div></template>
