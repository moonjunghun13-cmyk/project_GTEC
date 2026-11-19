import { api, setAccessToken } from '../api'
export async function exchangeSocialCode(code) {
  if (!code) throw new Error('소셜 인증 코드가 없습니다. 다시 로그인해 주세요.')
  const {data}=await api.post('/api/members/social-exchange',{code})
  if (data.status==='LOGIN' && data.tokens?.accessToken) {
    setAccessToken(data.tokens.accessToken)
    return {status:'LOGIN',member:(await api.get('/api/members/me')).data}
  }
  if (data.status==='SIGNUP' && data.signupToken) return {status:'SIGNUP',signupToken:data.signupToken}
  throw new Error('소셜 인증 응답을 확인할 수 없습니다. 다시 로그인해 주세요.')
}
export async function completeSocialSignup(signupToken,fields) {
  const {data}=await api.post('/api/members/social-signup',fields,{headers:{Authorization:'Bearer '+signupToken}})
  if (!data.accessToken) throw new Error('로그인 정보를 확인할 수 없습니다.')
  setAccessToken(data.accessToken)
  return (await api.get('/api/members/me')).data
}
export function signupPreview(token) {
  // These claims only prefill display fields. The backend validates the signature and email.
  try {
    const value=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
    const bytes=Uint8Array.from(atob(value),char=>char.charCodeAt(0))
    const payload=JSON.parse(new TextDecoder().decode(bytes))
    return {name:typeof payload.name==='string'?payload.name:'',email:typeof payload.email==='string'?payload.email:''}
  } catch { return {name:'',email:''} }
}
