<script setup>
import { onBeforeUnmount,ref,watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '../../components/admin/AdminSidebar.vue'
import AdminHeader from '../../components/admin/AdminHeader.vue'
import './admin-common.css'
import './admin-shell.css'
import './admin-workpages.css'
import './admin-readable.css'
import './admin-refinement.css'
import {useTheme} from '../../stores/theme'
const theme=useTheme(),shopTheme=theme.mode
theme.mode='light';document.documentElement.dataset.theme='light'
onBeforeUnmount(()=>{theme.mode=shopTheme;document.documentElement.dataset.theme=shopTheme})

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


<style>
.admin-data-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none!important;padding:9px 12px;margin-bottom:12px;border:1px solid #dce3eb;border-radius:8px;background:#fff;color:#64748b;font-size:13px}
.admin-data-mode.is-preview{background:#edf3fa;border-color:#d4e0ef;color:#385474}
.admin-data-mode button{border:0;background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap;text-decoration:underline;text-underline-offset:3px}
.preview-review-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0}
.preview-review-summary>div{padding:16px;border:1px solid #dce3eb;background:var(--work-surface,#fff);border-radius:9px}
.preview-review-summary span{display:block;font-size:15px;color:var(--admin-muted,#64748b)}
.preview-review-summary strong{display:block;margin-top:6px;font-size:28px}
.preview-record-detail img{width:160px;height:160px;object-fit:contain}
.preview-record-detail dl{display:grid;grid-template-columns:85px minmax(0,1fr);gap:14px;line-height:1.6}.preview-record-detail dd{margin:0;overflow-wrap:anywhere}.preview-record-detail dt{font-weight:700}
</style>
