import { api } from '../api'

export const sentimentApiConfigured = (import.meta.env.VITE_AUTH_MODE || 'api') === 'api'

export async function getSentimentStatistics(signal) {
  if (!sentimentApiConfigured) throw new Error('API 인증 모드가 설정되지 않았습니다.')
  const { data } = await api.get('/api/admin/ai/reviews/statistics', { signal })
  const { total, positive, negative } = data ?? {}
  if (![total, positive, negative].every(count => Number.isSafeInteger(count) && count >= 0) || positive + negative > total) {
    throw new Error('감정분석 통계의 응답 형식이 올바르지 않습니다.')
  }
  return { total, positive, negative, pending:total - positive - negative }
}

export async function analyzeAllReviews(signal) {
  if (!sentimentApiConfigured) throw new Error('API 인증 모드가 설정되지 않았습니다.')
  const {data} = await api.post('/api/admin/ai/reviews/analyze-all',null,{signal,timeout:120000})
  return data
}

const labels = {
  POSITIVE:'긍정',
  NEGATIVE:'부정',
  긍정:'긍정',
  부정:'부정',
}
export function readReviewSentiment(review) {
  const source = review.sentimentSource === 'mock' ? 'mock' : 'model'
  const analyzedAt = Date.parse(review.sentiment_analyzed_at)
  const updatedAt = Date.parse(review.updated_at)
  const label = Object.hasOwn(labels,review.sentiment) ? labels[review.sentiment] : null
  if (!label || (source !== 'mock' && !Number.isFinite(analyzedAt)) || updatedAt > analyzedAt) {
    return { label:'분석 대기', score:null, source }
  }

  const rawScore = review.sentiment_score
  const score = typeof rawScore === 'number' || (typeof rawScore === 'string' && rawScore.trim()) ? Number(rawScore) : NaN
  return { label, score:Number.isFinite(score) && score >= 0 && score <= 1 ? score : null, source }
}
export function reviewSentimentLabel(review) {
  const result = readReviewSentiment(review)
  return result.source === 'mock' ? '감정분석 예시 · ' + result.label : 'AI 감정분석 · ' + result.label
}
