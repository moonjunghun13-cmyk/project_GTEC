import axios from 'axios'

let accessToken = null
let refreshPromise = null

export function setAccessToken(token) {
  accessToken = token || null
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/'
    ,timeout:15000,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

api.interceptors.request.use(config => {
  if (accessToken && !config.headers.Authorization) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const request = error.config
    const url = request?.url ?? ''
    const excluded = ['/api/members/login','/api/members/refresh','/api/members/logout','/api/members/signup','/api/members/social-exchange','/api/members/social-signup']
    if (error.response?.status === 401 && request && !request.__retried
      && !excluded.some(path => url.includes(path))) {
      request.__retried = true
      try {
        refreshPromise ??= api.post('/api/members/refresh').then(({data}) => setAccessToken(data.accessToken))
          .finally(() => { refreshPromise = null })
        await refreshPromise
        return api.request(request)
      } catch {
        setAccessToken(null)
      }
    }
    const body = error.response?.data
    const message = body?.message || body?.detail
    if (message) error.message = message
    return Promise.reject(error)
  },
)

export const createApiClient = config => axios.create(config)
