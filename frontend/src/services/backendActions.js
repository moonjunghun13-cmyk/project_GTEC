import { api } from '../api'
import { faqPayload } from './adminFaq'

export const backendActions = {
  dashboardSummary: async () => (await api.get('/api/admin/dashboard/summary')).data,
  requestReturn: async (orderId,orderItemId,quantity,reason) => (await api.post(`/api/orders/${Number(orderId)}/returns`,{orderItemId:Number(orderItemId),quantity:Number(quantity),reason})).data,
  markReturnRefunded: async id => { await api.patch(`/api/admin/returns/${Number(id)}`,{status:'REFUNDED',refundAmount:null}) },
  recommendationStatus: async () => (await api.get('/api/admin/ai/recommendations/status')).data,
  retrainRecommendation: async () => (await api.post('/api/admin/ai/recommendations/retrain',{days:365},{timeout:120000})).data,
  generateDummyData: async () => (await api.post('/api/admin/ai/demo-data/append',null,{timeout:120000})).data,
  analyzeReview: async id => (await api.post(`/api/admin/ai/reviews/${Number(id)}/analyze`,null,{timeout:120000})).data,
  memberRole: async (id,role) => { await api.patch(`/api/admin/${Number(id)}/role`,{role}) },
  deactivate: async () => { await api.post('/api/members/inactive') },
  myReviews: async () => (await api.get('/api/reviews/me')).data,
  updateReview: async (id,content,existing) => (await api.patch(`/api/reviews/${Number(id)}`,{content,...(Number.isInteger(existing?.rating) ? {rating:existing.rating} : {})})).data,
  deleteReview: async id => { await api.delete(`/api/reviews/${Number(id)}`) },
  faqs: async () => (await api.get('/api/faqs')).data,
  createFaq: async draft => (await api.post('/api/faqs',faqPayload(draft))).data,
  updateFaq: async (id,draft) => (await api.put(`/api/faqs/${Number(id)}`,faqPayload(draft))).data,
  deleteFaq: async id => { await api.delete(`/api/faqs/${Number(id)}`) },
}
