<script setup>
import { computed } from 'vue'
const props = defineProps({name:String})
const paths = {
  home:'M3 10 12 3l9 7v10H15v-6H9v6H3z',
  products:'m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V8M12 13v10',
  orders:'M2 3h3l2.5 12h11L22 6H6M9 19h.01M18 19h.01',
  refunds:'M8 4 3 9l5 5M3 9h12a6 6 0 0 1 0 12H9',
  customers:'M4 20V11h4v9M10 20V4h4v16M16 20V8h4v12',
  members:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',
  reviews:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  inquiries:'M4 4h16v13H9l-5 4V4M8 8h8M8 12h5',
  notices:'M3 10v5h4l12 5V5L7 10H3M7 15l2 6',
  sales:'M4 20V11h4v9M10 20V4h4v16M16 20V8h4v12',
  sentiment:'M4 4h16v16H4zM7 14l3-4 4 3 3-5',
  arrow:'m9 5 7 7-7 7',
  search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
  coin:'M3 6c0-4 18-4 18 0s-18 4-18 0Zm0 0v12c0 4 18 4 18 0V6M3 12c0 4 18 4 18 0',
  shipping:'M2 5h12v13H2zM14 10h4l4 4v4h-8M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  truck:'M2 5h12v13H2zM14 10h4l4 4v4h-8M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  bolt:'m13 2-9 12h7l-1 8 10-13h-8z',
}
const path = computed(() => paths[props.name] ?? paths.home)
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="path"/></svg></template>
