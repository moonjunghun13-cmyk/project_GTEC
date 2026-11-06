<script setup>
defineProps({busy:Boolean,error:String,empty:String})
defineEmits(['retry'])
</script>
<template>
  <div class="state" role="status">
    <template v-if="error">{{ error }} <button class="button" @click="$emit('retry')">다시 시도</button></template>
    <template v-else>{{ busy ? '불러오는 중입니다…' : empty }}</template>
  </div>
</template>
