import axios from 'axios'

// The refresh credential stays in the backend's HttpOnly cookie.
export const api = axios.create({baseURL:import.meta.env.VITE_API_BASE_URL || '/api',withCredentials:true,timeout:15000,headers:{'X-Requested-With':'XMLHttpRequest'}})
let accessToken = ''
let refreshing
export function setAccessToken(value) { accessToken = value || '' }
export async function refreshAccess() {
  if (!refreshing) refreshing = api.post('/members/refresh',{}, {skipRefresh:true}).then(({data}) => { setAccessToken(data.accessToken); return data }).finally(() => { refreshing = null })
  return refreshing
}
api.interceptors.request.use(config => {
  if (accessToken && !config.headers.Authorization) config.headers.Authorization = 'Bearer '+accessToken
  return config
})
api.interceptors.response.use(response => response, async error => {
  const config = error.config
  if (error.response?.status === 401 && config && !config.skipRefresh && !config.retried && !/\/members\/(login|signup|social-)/.test(config.url)) {
    config.retried = true
    try {
      await refreshAccess()
      config.headers.Authorization = 'Bearer '+accessToken
      return await api(config)
    } catch { setAccessToken(''); window.dispatchEvent(new Event('gt-auth-expired')) }
  }
  const message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? '서버 응답 시간이 초과되었습니다.' : error.response ? '요청을 처리하지 못했습니다. 입력값과 서버 상태를 확인해 주세요.' : '백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.')
  return Promise.reject(Object.assign(new Error(message),{status:error.response?.status}))
})
export const request = async (method,url,data,config={}) => (await api({method,url,data,...config})).data
export async function allPages(url) {
  const result = []
  for (let page=0;;page++) {
    const data = await request('get',url,undefined,{params:{page,size:100}})
    if (Array.isArray(data)) return data
    result.push(...data.content)
    if (data.last || page+1 >= data.totalPages) return result
  }
}
