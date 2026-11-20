<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '../../components/admin/AdminSidebar.vue'
import AdminHeader from '../../components/admin/AdminHeader.vue'
import './admin-common.css'
import './admin-shell.css'
import './admin-workpages.css'
import './admin-readable.css'

const route = useRoute()
const content = ref(null)

watch([() => route.path, () => route.query.tab], () => {
  content.value?.scrollTo({top:0,left:0})
}, {flush:'post'})
</script>
<template>
  <div class="admin-layout" :class="{'admin-management': route.path.replace(/\/$/,'') !== '/admin'}">
    <AdminSidebar/>
    <div class="admin-main">
      <AdminHeader/>
      <main ref="content" class="admin-content" :class="{'admin-workspace': route.meta.section !== ''}" tabindex="0" aria-label="관리자 본문">
        <RouterView/>
      </main>
    </div>
  </div>
</template>

