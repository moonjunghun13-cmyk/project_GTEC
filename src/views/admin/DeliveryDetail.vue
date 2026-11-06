<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { admin } from '../../services'
import { useShop } from '../../stores/shop'
import { money } from '../../utils'
import AdminIcon from '../../components/admin/AdminIcon.vue'
import StatePanel from '../../components/StatePanel.vue'
import './delivery.css'
import './admin-common.css'
const route = useRoute()
const store = useShop()
const order = ref(null)
const products = ref([])
const busy = ref(false)
const loading = ref(true)
const loadError = ref('')
const error = ref('')
const notice = ref('')
const form = reactive({carrier:'',tracking:'',status:'',dispatchDate:'',memo:''})
const steps = ['결제 완료','배송 준비','배송 중','배송 완료']
const locked = computed(() => !steps.includes(order.value?.status) || order.value?.request?.endsWith('요청'))
const currentStep = computed(() => steps.indexOf(order.value?.status))
const total = computed(() => order.value.items.reduce((sum,item) => sum + item.price*item.quantity,0))
function timestamp(value) {
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(value))
}
function imageFor(item) { return item.image || products.value.find(row => row.productId === item.productId)?.image }
function reset() {
  Object.assign(form,{carrier:order.value.carrier || '',tracking:order.value.tracking || '',status:order.value.status,dispatchDate:order.value.dispatchDate || '',memo:order.value.shippingMemo || ''})
  error.value = ''
  notice.value = ''
}
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  loadError.value = ''
  try {
    const data = await admin.snapshot(store.user.userId)
    if (current !== request) return
    order.value = data.orders.find(row => row.orderId === route.params.orderId)
    products.value = data.products
    if (!order.value) throw new Error('주문을 찾을 수 없습니다.')
    reset()
  } catch(e) { if (current === request) loadError.value = e.message }
  finally { if (current === request) loading.value = false }
}
watch(() => route.params.orderId,load,{immediate:true})
async function save() {
  if (busy.value || locked.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const updated = await admin.saveShipping(store.user.userId,order.value.orderId,{...form})
    order.value = updated
    reset()
    notice.value = '배송 정보를 저장했습니다.'
  } catch(e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <StatePanel v-if="loading || loadError" :busy="loading" :error="loadError" @retry="load"/>
  <section v-else-if="order" class="delivery-page">
    <header class="delivery-title"><div><h1>배송 상세</h1><p>주문의 배송 정보와 수령인 정보를 확인하고 관리하세요.</p></div><div class="actions"><RouterLink class="button" to="/admin/shipping">← 목록으로</RouterLink><button class="button gold" :disabled="busy || locked" @click="save">배송 정보 저장</button></div></header>
    <div class="delivery-summary">
      <div><AdminIcon name="orders"/><span>주문번호<strong>{{ order.orderId }}</strong></span></div>
      <div><AdminIcon name="truck"/><span>배송번호<strong>{{ order.shipmentId || '미배정' }}</strong></span></div>
      <div><AdminIcon name="bolt"/><span>배송 상태<strong class="delivery-state">{{ order.status }}</strong></span></div>
      <div><AdminIcon name="notices"/><span>주문일시<strong>{{ timestamp(order.date) }}</strong></span></div>
      <div><AdminIcon name="reviews"/><span>최종 수정<strong>{{ timestamp(order.shippingUpdatedAt || order.date) }}</strong></span></div>
    </div>
    <div class="delivery-columns">
      <div>
        <article class="delivery-panel"><h2><AdminIcon name="products"/>주문 상품 정보</h2>
          <div class="delivery-table"><table><thead><tr><th>상품정보</th><th>수량</th><th>상품금액</th></tr></thead><tbody><tr v-for="item in order.items" :key="item.productId"><th scope="row"><div><img v-if="imageFor(item)" :src="imageFor(item)" alt=""><span>{{ item.name }}</span></div></th><td>{{ item.quantity }}</td><td>{{ money(item.price*item.quantity) }}</td></tr></tbody></table></div>
          <div class="delivery-totals"><span>상품금액 합계<strong>{{ money(total) }}</strong></span><span>배송비<strong>{{ money(order.shippingFee || 0) }}</strong></span><span>총 결제금액<strong>{{ money(order.total) }}</strong></span></div>
        </article>
        <article class="delivery-panel"><h2><AdminIcon name="truck"/>배송 진행 상태</h2>
          <ol class="delivery-steps"><li v-for="(step,index) in steps" :key="step" :class="{complete:index <= currentStep,active:index === currentStep}"><span>{{ index < currentStep ? '✓' : index+1 }}</span>{{ step === '결제 완료' ? '주문 확인' : step }}</li></ol>
          <p v-if="locked" class="delivery-alert">{{ order.request || order.status }} · 배송 상태를 변경할 수 없습니다.</p>
          <ol class="delivery-history"><li><time>{{ timestamp(order.date) }}</time><strong>주문 생성 · 결제 완료</strong></li><li v-for="(entry,index) in order.shippingHistory || []" :key="index"><time>{{ timestamp(entry.date) }}</time><strong>{{ entry.status }} · {{ entry.message }}</strong></li></ol>
        </article>
      </div>
      <div>
        <article class="delivery-panel"><h2><AdminIcon name="members"/>수령인 / 배송지 정보</h2>
          <dl class="delivery-fields"><div v-for="[label,value] in [['주문자',order.buyerName || order.delivery.recipient],['수령인',order.delivery.recipient],['연락처',order.delivery.phone || '미등록'],['우편번호',order.delivery.postcode || '미등록'],['주소',order.delivery.address],['배송 메모',order.delivery.memo || '없음']]" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></div></dl>
        </article>
        <article class="delivery-panel"><h2><AdminIcon name="products"/>택배 정보 관리</h2>
          <form class="stack" @submit.prevent="save">
            <fieldset :disabled="busy || locked" class="delivery-form">
              <label>택배사<select v-model="form.carrier"><option value="">택배사 선택</option><option>CJ대한통운</option><option>한진택배</option><option>롯데택배</option><option>우체국택배</option><option>로젠택배</option><option>기타</option></select></label>
              <label>운송장번호<input v-model.trim="form.tracking" maxlength="40" placeholder="운송장 번호를 입력하세요"></label>
              <label>배송 상태<select v-model="form.status"><option v-for="(step,index) in steps" :key="step" :disabled="index < currentStep || index > currentStep+1">{{ step }}</option><option v-if="locked">{{ order.status }}</option></select></label>
              <label>발송예정일<input v-model="form.dispatchDate" type="date"></label>
              <label>관리 메모<textarea v-model="form.memo" rows="3" maxlength="1000" placeholder="포장 및 발송 관련 메모"></textarea></label>
            </fieldset>
            <div class="delivery-form-actions"><button class="button" type="button" :disabled="busy" @click="reset">입력 초기화</button><button class="button gold" :disabled="busy || locked">{{ busy ? '저장 중…' : '배송 정보 저장' }}</button></div>
          </form>
          <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="notice" class="delivery-success" role="status">{{ notice }}</p>
        </article>
        <article class="delivery-panel"><h2><AdminIcon name="arrow"/>관련 처리 바로가기</h2><div class="actions"><RouterLink class="button" :to="{path:'/admin/orders',query:{q:order.orderId}}">주문 상세</RouterLink><RouterLink class="button" :to="{path:'/admin/refunds',query:{q:order.orderId}}">취소 · 반품 · 환불</RouterLink></div></article>
      </div>
    </div>
    <p class="delivery-note">배송 상태와 운송장 번호는 Mock 데이터로 관리됩니다.</p>
  </section>
</template>
