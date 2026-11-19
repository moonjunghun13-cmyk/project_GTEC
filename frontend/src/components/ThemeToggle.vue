<script setup>
import { useTheme } from '../stores/theme'
const theme = useTheme()
</script>
<template>
  <button type="button" class="theme-toggle" :aria-pressed="theme.mode === 'dark'" :aria-label="theme.mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'" :title="theme.mode === 'dark' ? '라이트 모드' : '다크 모드'" @click="theme.toggle()">
    <svg v-if="theme.mode === 'dark'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 14.2A9 9 0 0 1 9.8 3.2 9 9 0 1 0 20.8 14.2Z"/></svg>
  </button>
</template>
