import { createApiClient } from '../api'

const baseURL = import.meta.env.VITE_SENTIMENT_API_BASE_URL?.trim()
const client = baseURL ? createApiClient({ baseURL, timeout:10000 }) : null
export const sentimentApiConfigured = Boolean(client)

export async function getSentimentStatistics(signal) {
  if (!client) throw new Error('감정분석 서버 주소를 설정해 주세요.')
  const { data } = await client.get('/api/ai/reviews/statistics', { signal })
  const { total, positive, negative } = data ?? {}
  if (![total, positive, negative].every(count => Number.isSafeInteger(count) && count >= 0) || positive + negative > total) {
    throw new Error('감정분석 통계의 응답 형식이 올바르지 않습니다.')
  }
  return { total, positive, negative, pending:total - positive - negative }
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
  if (!label || updatedAt > analyzedAt) {
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
