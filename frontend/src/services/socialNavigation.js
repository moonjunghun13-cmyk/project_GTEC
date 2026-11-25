const providers = new Set(['kakao','naver','google'])
export function startSocialLogin(provider, returnTo=window.location.pathname+window.location.search) {
  if (!providers.has(provider)) throw new Error('지원하지 않는 소셜 로그인입니다.')
  if (returnTo.startsWith('/') && !returnTo.startsWith('//') && !/^\/(oauth|login)/.test(returnTo)) {
    try { sessionStorage.setItem('gt-oauth-return',returnTo) } catch { /* Login remains available without storage. */ }
  }
  window.location.assign('/oauth2/authorization/'+provider)
  return new Promise(()=>{})
}
export function socialReturnPath(role) {
  let path=''
  try { path=sessionStorage.getItem('gt-oauth-return') || ''; sessionStorage.removeItem('gt-oauth-return') } catch { /* Use the default destination. */ }
  if (path.startsWith('/') && !path.startsWith('//') && !/^\/(oauth|login)/.test(path)
    && (role==='ADMIN' || !path.startsWith('/admin'))) return path
  return role==='ADMIN' ? '/admin' : '/account'
}
