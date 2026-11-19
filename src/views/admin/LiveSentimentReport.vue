<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import StatePanel from '../../components/StatePanel.vue'
import { analyzeAllReviews, getSentimentStatistics } from '../../services/reviewSentiment'

const statistics = ref(null)
const busy = ref(false)
const analyzing = ref(false)
const error = ref('')
const notice = ref('')
let request
const metrics = computed(() => statistics.value ? [
  { label:'긍정', count:statistics.value.positive, tone:'sentiment-tone-0' },
  { label:'분석 대기', count:statistics.value.pending, tone:'sentiment-tone-1' },
  { label:'부정', count:statistics.value.negative, tone:'sentiment-tone-2' },
] : [])
const percent = count => statistics.value.total ? Math.round(count / statistics.value.total * 100) : 0

async function load() {
  if (busy.value) return
  const current = new AbortController()
  request = current
  busy.value = true
  error.value = ''
  notice.value = ''
  statistics.value = null
  try {
    statistics.value = await getSentimentStatistics(current.signal)
  } catch {
    if (!current.signal.aborted) error.value = 'AI 서버의 감정분석 통계를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.'
  } finally {
    busy.value = false
  }
}
async function analyzeAll() {
  if (analyzing.value) return
  const current = new AbortController()
  request = current
  analyzing.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await analyzeAllReviews(current.signal)
    await load()
    notice.value = `리뷰 ${result.total ?? 0}건 · 분석 성공 ${result.success ?? 0}건 · 실패 ${result.failed ?? 0}건`
  } catch {
    if (!current.signal.aborted) error.value = '전체 리뷰 분석을 완료하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.'
  } finally { analyzing.value = false }
}
load()
onBeforeUnmount(() => request?.abort())
</script>

<template>
  <section class="sentiment-report" aria-label="리뷰 분석 보고서">
    <div class="sentiment-overview">
      <header>
        <div>
          <h2>고객 반응 요약</h2>
          <p class="sentiment-summary-note">AI 서버의 전체 리뷰 기준</p>
        </div>
        <div class="actions"><button type="button" class="button" :disabled="analyzing || busy" @click="load">새로고침</button><button type="button" class="button" :disabled="analyzing || busy" @click="analyzeAll">{{ analyzing ? '분석 중…' : '전체 리뷰 분석' }}</button></div>
      </header>
      <StatePanel v-if="busy || error" :busy="busy" :error="error" @retry="load"/>
      <template v-else-if="statistics">
        <p v-if="notice" role="status">{{ notice }}</p>
        <p class="sentiment-summary-total">전체 {{ statistics.total.toLocaleString('ko-KR') }}건 · 분석 완료 {{ (statistics.positive + statistics.negative).toLocaleString('ko-KR') }}건</p>
        <div class="sentiment-metrics">
          <article v-for="metric in metrics" :key="metric.label" :class="metric.tone">
            <h3>{{ metric.label }}</h3>
            <strong>{{ percent(metric.count) }}%</strong>
            <span>{{ metric.count.toLocaleString('ko-KR') }}건</span>
          </article>
        </div>
        <div v-if="statistics.total" class="sentiment-distribution" aria-hidden="true">
          <span v-for="metric in metrics" :key="metric.label" :class="metric.tone" :style="{flexGrow:metric.count}"></span>
        </div>
        <p v-else class="sentiment-empty">분석할 리뷰가 없습니다.</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.sentiment-summary-note { margin:4px 0 0; color:var(--ui-muted); font-size:.82rem; }
.sentiment-summary-total { margin:0 0 10px; font-size:.85rem; font-weight:650; }
</style>
