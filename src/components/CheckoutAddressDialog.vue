<script setup>
import { onMounted, reactive, ref } from 'vue'
import { shop } from '../services'

const props = defineProps({
  current: {type:Object, default:null},
  memberName: {type:String, default:''},
})
const emit = defineEmits(['close','save'])
const dialog = ref(null)
const query = ref('')
const results = ref([])
const searched = ref(false)
const searching = ref(false)
const searchError = ref('')
const error = ref('')
const draft = reactive({
  recipient:props.memberName, phone:'', address:'', postcode:'', detail:'', memo:'',
  ...props.current,
})
onMounted(() => dialog.value.showModal())

async function search() {
  if (searching.value || !query.value.trim()) return
  searching.value = true
  searchError.value = ''
  try {
    results.value = await shop.searchAddresses(query.value)
    searched.value = true
  } catch (e) {
    searchError.value = e.message
  } finally {
    searching.value = false
  }
}
function choose(result, kind) {
  draft.postcode = result.postcode
  draft.address = result[kind]
  results.value = []
  searched.value = false
}
function save() {
  const delivery = Object.fromEntries(Object.entries(draft).map(([key,value]) => [key,value.trim()]))
  if (!delivery.recipient || !delivery.address || !/^\d{10,11}$/.test(delivery.phone.replace(/[- ]/g,''))) {
    error.value = '받는 사람, 전화번호, 배송지를 확인해 주세요.'
    return
  }
  emit('save', delivery)
}
</script>

<template>
  <dialog ref="dialog" class="checkout-address-dialog" aria-labelledby="checkout-address-title" @cancel.prevent="emit('close')">
    <div class="address-heading">
      <h2 id="checkout-address-title">{{ current ? '배송지 변경' : '배송지 추가' }}</h2>
      <button type="button" class="address-close" aria-label="배송지 창 닫기" @click="emit('close')">×</button>
    </div>

    <form class="address-search" role="search" aria-label="주소 찾기" @submit.prevent="search">
      <label>주소 검색<input v-model="query" type="search" placeholder="도로명, 지번 또는 우편번호" maxlength="100" required></label>
      <button class="button" :disabled="searching">{{ searching ? '검색 중…' : '검색' }}</button>
    </form>
    <p class="address-hint">테스트 주소를 검색하거나 아래에 직접 입력해 주세요. 예: 세종대로, 삼성동</p>
    <p v-if="searchError" class="error" role="alert">{{ searchError }}</p>
    <ul v-if="results.length" class="address-results" aria-label="주소 검색 결과">
      <li v-for="result in results" :key="result.postcode">
        <small>{{ result.postcode }}</small>
        <button type="button" @click="choose(result,'road')"><span>도로명</span> {{ result.road }}</button>
        <button type="button" @click="choose(result,'lot')"><span>지번</span> {{ result.lot }}</button>
      </li>
    </ul>
    <p v-else-if="searched && !searching" class="address-hint" role="status">검색 결과가 없습니다. 배송지를 직접 입력할 수 있습니다.</p>

    <form class="address-form" @submit.prevent="save">
      <div class="address-contact">
        <label>받는 사람 이름<input v-model="draft.recipient" required maxlength="80" autocomplete="shipping name"></label>
        <label>전화번호<input v-model="draft.phone" type="tel" required maxlength="20" autocomplete="shipping tel" placeholder="010-1234-5678"></label>
      </div>
      <label>우편번호 <span>(선택)</span><input v-model="draft.postcode" maxlength="5" pattern="[0-9]{5}" inputmode="numeric" autocomplete="shipping postal-code"></label>
      <label>배송지<input v-model="draft.address" required maxlength="160" autocomplete="shipping address-line1"></label>
      <label>상세 주소 <span>(선택)</span><input v-model="draft.detail" maxlength="120" autocomplete="shipping address-line2" placeholder="동·호수 등"></label>
      <label>배송 메모 <span>(선택)</span><textarea v-model="draft.memo" rows="2" maxlength="200" placeholder="배송 시 참고할 사항"></textarea></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="address-actions">
        <button type="button" class="button" @click="emit('close')">취소</button>
        <button type="submit" class="button address-save">배송지 저장</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.checkout-address-dialog { width:min(560px,calc(100% - 28px)); max-height:calc(100dvh - 28px); margin:auto; padding:clamp(16px,4vw,26px); border:1px solid var(--ui-border); border-radius:14px; background:var(--ui-surface); color:var(--ui-text); }
.checkout-address-dialog::backdrop { background:#0b111973; }
.address-heading,.address-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.address-heading h2 { margin:0; font-size:1.35rem; }
.address-close { width:40px; height:40px; font-size:1.5rem; }
.address-search { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; margin-top:16px; }
.address-form { display:grid; gap:12px; margin-top:16px; }
.address-contact { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
label { display:block; min-width:0; font-weight:650; }
label span,.address-hint { color:var(--ui-muted); font-weight:400; }
:is(input,textarea) { display:block; width:100%; min-width:0; margin-top:5px; border:1px solid var(--ui-border); border-radius:7px; }
textarea { resize:vertical; }
.address-hint { margin:8px 0 0; font-size:.8rem; }
.address-results { max-height:180px; overflow:auto; padding:0; margin:12px 0 0; list-style:none; border-top:1px solid var(--ui-border); }
.address-results li { padding:8px 0; border-bottom:1px solid var(--ui-border); }
.address-results small { color:var(--ui-muted); }
.address-results button { display:block; width:100%; text-align:left; padding:7px 4px; overflow-wrap:anywhere; }
.address-results button:hover { background:var(--ui-raised); }
.address-results span { display:inline-block; min-width:42px; color:var(--ui-muted); font-size:.75rem; }
.address-actions { justify-content:flex-end; margin-top:4px; }
.address-actions .address-save { background:#dce5f0; color:#182231; }
@media(max-width:420px) { .address-contact { grid-template-columns:minmax(0,1fr); } }
</style>
