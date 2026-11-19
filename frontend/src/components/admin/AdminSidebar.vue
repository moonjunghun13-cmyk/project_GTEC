<script setup>
import { adminMenu } from '../../router/adminMenu'
import AdminIcon from './AdminIcon.vue'
</script>
<template>
  <aside class="admin-sidebar">
    <RouterLink to="/" class="admin-brand" aria-label="GT전자 홈 인트로로 이동"><img src="/gt-logo-chrome.png" alt=""> <span>GT전자 <small>ADMIN</small></span></RouterLink>
    <nav aria-label="관리자 메뉴"><RouterLink v-for="[path,title] in adminMenu" :key="path" :to="path ? '/admin/'+path : '/admin'"><AdminIcon :name="path || 'home'"/><span>{{ title }}</span><AdminIcon name="arrow" class="sidebar-chevron"/></RouterLink></nav>
  </aside>
</template>
