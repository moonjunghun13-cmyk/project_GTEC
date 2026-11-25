import axios from 'axios'

let accessToken = null
let refreshPromise = null

// The HttpOnly refresh cookie is shared by tabs and rotated after every use.
// Web Locks serialize cookie-changing requests across tabs without storing tokens.
export function withAuthCookieLock(operation) {
  const locks = globalThis.navigator?.locks
  return locks?.request ? locks.request('gtec-auth-cookie',operation) : Promise.resolve().then(operation)
}

export function refreshAccessToken() {
  refreshPromise ??= withAuthCookieLock(async () => {
    const {data} = await api.post('/api/members/refresh')
    setAccessToken(data.accessToken)
    return data.accessToken
  }).finally(() => { refreshPromise = null })
  return refreshPromise
}

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
        await refreshAccessToken()
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
