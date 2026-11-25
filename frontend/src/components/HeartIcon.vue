<script setup>
defineProps({ active:Boolean })
</script>

<template>
  <svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 20C10.8 19.2 3 14.2 3 8.9 3 5.8 5.1 4 7.7 4c2 0 3.5 1.1 4.3 2.6C12.8 5.1 14.3 4 16.3 4 18.9 4 21 5.8 21 8.9c0 5.3-7.8 10.3-9 11.1Z" :fill="active ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>

<style scoped>
.heart-icon{display:inline-block;width:20px;height:20px;vertical-align:-3px;flex:none}
</style>
