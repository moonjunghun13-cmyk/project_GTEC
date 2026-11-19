import { api } from '../api'

export const backendActions = {
  requestReturn: async (orderId,orderItemId,quantity,reason) => (await api.post(`/api/orders/${Number(orderId)}/returns`,{orderItemId:Number(orderItemId),quantity:Number(quantity),reason})).data,
  markReturnRefunded: async id => { await api.patch(`/api/admin/returns/${Number(id)}`,{status:'REFUNDED',refundAmount:null}) },
  recommendationStatus: async () => (await api.get('/api/admin/ai/recommendations/status')).data,
  retrainRecommendation: async () => (await api.post('/api/admin/ai/recommendations/retrain',{days:365},{timeout:120000})).data,
  analyzeReview: async id => (await api.post(`/api/admin/ai/reviews/${Number(id)}/analyze`,null,{timeout:120000})).data,
  memberRole: async (id,role) => { await api.patch(`/api/admin/${Number(id)}/role`,{role}) },
  deactivate: async () => { await api.post('/api/members/inactive') },
  myReviews: async () => (await api.get('/api/reviews/me')).data,
  updateReview: async (id,rating,content) => (await api.patch(`/api/reviews/${Number(id)}`,{rating,content})).data,
  deleteReview: async id => { await api.delete(`/api/reviews/${Number(id)}`) },
  faqs: async () => (await api.get('/api/faqs')).data,
}
