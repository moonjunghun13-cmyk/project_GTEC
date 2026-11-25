<script setup>
import RecommendationModelPanel from '../../components/admin/RecommendationModelPanel.vue'
import AdminIcon from '../../components/admin/AdminIcon.vue'
</script>
<template><section class="recommendation-system-page">
 <header><div><AdminIcon name="products"/><h1>추천시스템</h1></div><RouterLink class="button" to="/admin/customers">고객분석으로</RouterLink></header>
 <p>추천 모델의 학습 상태와 구매 데이터를 확인하고 모델을 최신화합니다.</p>
 <RecommendationModelPanel :show-system-link="false"/>
</section></template>
<style scoped>
.recommendation-system-page{display:grid;gap:20px;align-content:start;width:100%;min-width:0}
header,header>div{display:flex;align-items:center;gap:12px;flex-wrap:wrap}header{justify-content:space-between}
h1{font-size:30px;margin:0}header svg{width:32px;height:32px}p{font-size:17px;margin:0;color:#65738a;line-height:1.7}
</style>
