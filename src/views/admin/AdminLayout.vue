<script setup>
import AdminSidebar from '../../components/admin/AdminSidebar.vue'
import AdminHeader from '../../components/admin/AdminHeader.vue'
import './admin-common.css'
import './admin-shell.css'
</script>
<template>
  <div class="admin-layout"><AdminSidebar/><div class="admin-main"><AdminHeader/><main class="admin-content"><RouterView/></main></div></div>
</template>

