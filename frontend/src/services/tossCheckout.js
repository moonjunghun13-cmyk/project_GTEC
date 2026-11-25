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

export async function openTossTestWindow({memberId,orderId,cancelOrderId=null,total,orderName,items=[],active,cancel,report}) {
  if (!tossTestConfigured) throw new Error('토스페이먼츠 테스트 클라이언트 키를 설정해 주세요.')
  if (!memberId || !orderId || !Number.isSafeInteger(total) || total < 1) throw new Error('회원, 주문 번호, 결제 금액을 확인해 주세요.')
  const customerKey = customerKeyFor(memberId)
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
      report('이 주문에서는 계좌이체나 가상계좌를 선택할 수 없습니다.',false)
      return
    }
    requesting = true
    try {
      sessionStorage.setItem(attemptKey,JSON.stringify({orderId,cancelOrderId,total,items}))
      await widgets.requestPayment({
        orderId,orderName,
        successUrl:new URL('/checkout/toss/success',window.location.origin).href,
        failUrl:new URL('/checkout/toss/fail',window.location.origin).href,
      })
    } catch (error) {
      requesting = false
      sessionStorage.removeItem(attemptKey)
      report(error?.code === 'USER_CANCEL' ? '결제를 취소했습니다.' : '토스 테스트 결제 요청을 완료하지 못했습니다.',true)
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
    return {status:['PAY_PROCESS_CANCELED','USER_CANCEL'].includes(query.code) ? 'cancelled' : 'failed',orderId:attempt.cancelOrderId}
  }
  if (query.orderId !== attempt.orderId || typeof query.paymentKey !== 'string' || !query.paymentKey ||
      typeof query.amount !== 'string' || !/^\d+$/.test(query.amount) || Number(query.amount) !== attempt.total) {
    return {status:'invalid'}
  }
  return {status:'authenticated',orderId:attempt.orderId,total:attempt.total,paymentKey:query.paymentKey,items:attempt.items ?? []}
}

// The same server confirmation API handles card and wallet authorizations.
export function checkoutMethod(selected) {
  const method = selected?.method ?? selected?.code
  const wallet = selected?.card?.easyPay
  if (method === 'CARD' && !wallet) return {server:'CREDIT_CARD',label:'신용·체크카드'}
  if (wallet === 'KAKAOPAY' || method === '카카오페이') return {server:'KAKAO_PAY',label:'카카오페이'}
  if (wallet === 'NAVERPAY' || method === '네이버페이') return {server:'NAVER_PAY',label:'네이버페이'}
  if ((method === 'CARD' && wallet) || ['토스페이','TOSSPAY','삼성페이','PAYCO','페이코'].includes(method)) return {server:'TOSS',label:'간편결제'}
  return null
}

export async function createCheckoutWidget({memberId,total,methodsSelector,agreementSelector,active,onChange}) {
  if (!tossTestConfigured) throw new Error('테스트 결제 키가 설정되지 않았습니다.')
  const TossPayments = await loadSdk()
  if (!active()) return null
  const widgets = TossPayments(clientKey).widgets({customerKey:customerKeyFor(memberId)})
  // The SDK emits changes but does not report the initial agreement state.
  // Until it changes, let requestPayment validate the widget's actual state.
  let methods,agreement,agreedRequiredTerms=null
  const destroy = () => { methods?.destroy(); agreement?.destroy() }
  try {
    await widgets.setAmount({currency:'KRW',value:total})
    if (!active()) return null
    methods = await widgets.renderPaymentMethods({selector:methodsSelector,variantKey:paymentMethodVariant})
    if (!active()) { destroy(); return null }
    agreement = await widgets.renderAgreement({selector:agreementSelector,variantKey:agreementVariant})
    if (!active()) { destroy(); return null }
    agreement.on('agreementStatusChange', status => { agreedRequiredTerms = status.agreedRequiredTerms === true })
    const selection = () => methods.getSelectedPaymentMethod()
    const update = async () => {
      try { const selected=await selection();if(active()) onChange(checkoutMethod(selected)) }
      catch { if(active()) onChange(null) }
    }
    methods.on('paymentMethodSelect',update)
    await update()
    return {
      destroy,
      selection:async () => checkoutMethod(await selection()),
      agreed:async () => agreedRequiredTerms !== false,
      setAmount:value => widgets.setAmount({currency:'KRW',value}),
      async request({orderId,cancelOrderId,total,orderName,items}) {
        if (!checkoutMethod(await selection())) throw new Error('신용·체크카드 또는 간편결제를 선택해 주세요.')
        if (agreedRequiredTerms === false) throw new Error('결제 이용약관에 동의해 주세요.')
        await widgets.setAmount({currency:'KRW',value:total})
        if (!active()) return
        sessionStorage.setItem(attemptKey,JSON.stringify({orderId,cancelOrderId,total,items}))
        try {
          await widgets.requestPayment({orderId,orderName,
            successUrl:new URL('/checkout/toss/success',window.location.origin).href,
            failUrl:new URL('/checkout/toss/fail',window.location.origin).href})
        } catch (error) {
          sessionStorage.removeItem(attemptKey)
          throw error
        }
      },
    }
  } catch (error) { destroy(); throw error }
}
