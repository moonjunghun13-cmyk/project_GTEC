const sdkUrl = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
let loading

export function loadKakaoPostcode() {
  if (window.kakao?.Postcode) return Promise.resolve(window.kakao.Postcode)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = sdkUrl
      script.async = true

      function fail() {
        clearTimeout(timeout)
        script.remove()
        reject(new Error('우편번호 검색을 불러오지 못했어요. 다시 시도하거나 배송지를 직접 입력해 주세요.'))
      }

      const timeout = setTimeout(fail, 12000)
      script.addEventListener('error', fail, { once:true })
      script.addEventListener('load', () => {
        if (!window.kakao?.Postcode) return fail()
        clearTimeout(timeout)
        resolve(window.kakao.Postcode)
      }, { once:true })
      document.head.append(script)
    }).catch(error => {
      loading = undefined
      throw error
    })
  }
  return loading
}
