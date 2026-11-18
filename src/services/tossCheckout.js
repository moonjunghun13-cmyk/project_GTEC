const sdkUrl = 'https://js.tosspayments.com/v2/standard'
const attemptKey = 'gt-toss-test-attempt'
const clientKey = import.meta.env.VITE_TOSS_WIDGET_CLIENT_KEY?.trim() ?? ''
const paymentMethodVariant = import.meta.env.VITE_TOSS_PAYMENT_VARIANT?.trim() || 'DEFAULT'
const agreementVariant = import.meta.env.VITE_TOSS_AGREEMENT_VARIANT?.trim() || 'AGREEMENT'
export const tossTestConfigured = /^test_gck_[A-Za-z0-9_-]+$/.test(clientKey)
let sdkPromise

function loadSdk() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments)
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script')
      script.src = sdkUrl
      script.async = true
      script.onload = () => {
        if (typeof window.TossPayments === 'function') resolve(window.TossPayments)
        else reject(new Error('토스페이먼츠 SDK를 초기화하지 못했습니다.'))
      }
      script.onerror = () => reject(new Error('토스페이먼츠 SDK를 불러오지 못했습니다.'))
      document.head.append(script)
    }).catch(error => {
      sdkPromise = undefined
      throw error
    })
  }
  return sdkPromise
}

function customerKeyFor(memberId) {
  const key = 'gt-toss-test-member-' + memberId
  let token = sessionStorage.getItem(key)
  if (!token) {
    token = crypto.randomUUID()
    sessionStorage.setItem(key,token)
  }
  return token
}

export async function openTossTestWindow({memberId,total,orderName,orderId,active,cancel,report}) {
  if (!tossTestConfigured) throw new Error('토스페이먼츠 테스트 클라이언트 키를 설정해 주세요.')
  if (!memberId || !Number.isSafeInteger(total) || total < 1) throw new Error('회원과 주문 금액을 확인해 주세요.')
  const customerKey = customerKeyFor(memberId)
  if (!orderId) throw new Error('서버 주문번호가 필요합니다.')
  const TossPayments = await loadSdk()
  if (!active()) return

  const widgets = TossPayments(clientKey).widgets({customerKey})
  await widgets.setAmount({value:total,currency:'KRW'})
  if (!active()) return
  const paymentWindow = await widgets.renderPaymentWindow({
    orderName,
    variantKey:{paymentMethod:paymentMethodVariant,agreement:agreementVariant},
  })
  const destroy = () => paymentWindow.destroy()
  if (!active()) {
    destroy()
    return
  }

  let requesting = false
  paymentWindow.on('cancel', () => {
    cancel()
  })
  paymentWindow.on('paymentRequest', async ({paymentMethod}) => {
    if (requesting || !active()) return
    if (['TRANSFER','VIRTUAL_ACCOUNT'].includes(paymentMethod?.method)) {
      report('이 주문에서는 계좌이체나 가상계좌를 선택할 수 없습니다.')
      return
    }
    requesting = true
    try {
      sessionStorage.setItem(attemptKey,JSON.stringify({orderId,total}))
      await widgets.requestPayment({
        orderId,orderName,
        successUrl:new URL('/checkout/toss/success',window.location.origin).href,
        failUrl:new URL('/checkout/toss/fail',window.location.origin).href,
      })
    } catch (error) {
      requesting = false
      sessionStorage.removeItem(attemptKey)
      report(error?.code === 'USER_CANCEL' ? '결제를 취소했습니다.' : '토스 테스트 결제 요청을 완료하지 못했습니다.')
    }
  })
  return destroy
}

export function readTossTestResult(result,query) {
  let attempt
  try {
    attempt = JSON.parse(sessionStorage.getItem(attemptKey) || 'null')
    sessionStorage.removeItem(attemptKey)
  } catch { return {status:'invalid'} }
  if (!attempt) return {status:'invalid'}
  if (result === 'fail') {
    return {status:['PAY_PROCESS_CANCELED','USER_CANCEL'].includes(query.code) ? 'cancelled' : 'failed'}
  }
  if (query.orderId !== attempt.orderId || typeof query.paymentKey !== 'string' || !query.paymentKey ||
      typeof query.amount !== 'string' || !/^\d+$/.test(query.amount) || Number(query.amount) !== attempt.total) {
    return {status:'invalid'}
  }
  return {status:'authenticated',orderId:attempt.orderId,total:attempt.total,paymentKey:query.paymentKey}
}
