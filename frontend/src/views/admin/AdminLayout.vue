<script setup>
import { onBeforeUnmount,onMounted,ref,watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '../../components/admin/AdminSidebar.vue'
import AdminHeader from '../../components/admin/AdminHeader.vue'
import './admin-common.css'
import './admin-shell.css'
import './admin-workpages.css'
import './admin-readable.css'
import './admin-refinement.css'
import {adminPreviewEvent,isAdminPreview} from '../../services/adminPreview'
import {useTheme} from '../../stores/theme'
const theme=useTheme(),shopTheme=theme.mode
theme.mode='light';document.documentElement.dataset.theme='light'
onBeforeUnmount(()=>{theme.mode=shopTheme;document.documentElement.dataset.theme=shopTheme})

const route = useRoute()
const content = ref(null)
const previewRevision=ref(0),generationNotice=ref(''),generationError=ref(false)
let toastTimer,activePreview=isAdminPreview()
function onPreviewUpdate(event){
 const result=event.detail || {}
 generationError.value=Boolean(result.error)
 if(result.error)generationNotice.value=result.error
 else if(result.live)generationNotice.value='실제 서버 데이터로 전환했습니다.'
 else generationNotice.value=`더미 데이터 추가 완료 · 상품 +${result.products} · 회원 +${result.members} · 주문 +${result.orders} · 리뷰 +${result.reviews}`
 if(!result.error){const nextPreview=isAdminPreview();if(nextPreview!==activePreview)previewRevision.value++;activePreview=nextPreview}
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{generationNotice.value=''},7000)
}
onMounted(()=>window.addEventListener(adminPreviewEvent,onPreviewUpdate))
onBeforeUnmount(()=>{window.removeEventListener(adminPreviewEvent,onPreviewUpdate);clearTimeout(toastTimer)})

watch([() => route.path, () => route.query.tab], () => {
  content.value?.scrollTo({top:0,left:0})
}, {flush:'post'})
</script>
<template>
  <div class="admin-layout" :class="{'admin-management': route.path.replace(/\/$/,'') !== '/admin'}">
    <AdminSidebar/>
    <div class="admin-main">
      <AdminHeader :key="'header-'+previewRevision"/>
      <main ref="content" class="admin-content" :class="{'admin-workspace': route.meta.section !== ''}" tabindex="0" aria-label="관리자 본문">
        <RouterView :key="previewRevision"/>
        <p v-if="generationNotice" class="admin-generation-toast" :class="{'is-error':generationError}" role="status">{{ generationNotice }}<button type="button" aria-label="생성 안내 닫기" @click="generationNotice=''">×</button></p>
      </main>
    </div>
  </div>
</template>


<style>
.admin-generation-toast{position:fixed;right:24px;bottom:24px;z-index:1100;width:min(530px,calc(100vw - 32px));margin:0;padding:16px 42px 16px 20px;border:1px solid #b6dccc;border-radius:12px;background:#f1fbf6;color:#236c4e;box-shadow:0 10px 35px #14243c20;font-size:16px;line-height:1.6}
.admin-generation-toast.is-error{border-color:#edc4c0;background:#fff5f4;color:#ae4141}.admin-generation-toast>button{position:absolute;right:10px;top:9px;border:0;background:transparent;color:inherit;font-size:26px;cursor:pointer}

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
