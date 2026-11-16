<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { loadKakaoPostcode } from '../services/kakaoPostcode'

const props = defineProps({
  current: {type:Object, default:null},
  memberName: {type:String, default:''},
})
const emit = defineEmits(['close','save'])
const dialog = ref(null)
const searchOpen = ref(false)
const searching = ref(false)
const searchError = ref('')
const searchButton = ref(null)
const searchTitle = ref(null)
const postcodeTarget = ref(null)
const detailInput = ref(null)
const error = ref('')
const draft = reactive({
  recipient:props.memberName, phone:'', address:'', postcode:'', detail:'', memo:'',
  ...props.current,
})
onMounted(() => dialog.value.showModal())

async function closeSearch(focusTarget = searchButton) {
  searchOpen.value = false
  searching.value = false
  await nextTick()
  focusTarget.value?.focus()
}
async function search() {
  if (searchOpen.value) return
  searchOpen.value = true
  searching.value = true
  searchError.value = ''
  await nextTick()
  const target = postcodeTarget.value
  searchTitle.value?.focus()
  try {
    const Postcode = await loadKakaoPostcode()
    if (postcodeTarget.value !== target || !searchOpen.value) return
    new Postcode({
      width:'100%',
      height:'100%',
      oncomplete(data) {
        if (postcodeTarget.value !== target || !searchOpen.value) return
        const address = (data.userSelectedType === 'J' ? data.jibunAddress : data.roadAddress) || data.address
        if (!address || !/^\d{5}$/.test(data.zonecode)) {
          searchError.value = '선택한 주소를 불러오지 못했어요. 배송지를 직접 입력해 주세요.'
          closeSearch()
          return
        }
        if (address !== draft.address || data.zonecode !== draft.postcode) draft.detail = ''
        draft.postcode = data.zonecode
        draft.address = address
        error.value = ''
        closeSearch(detailInput)
      },
    }).embed(target)
    searching.value = false
  } catch {
    if (postcodeTarget.value !== target || !searchOpen.value) return
    searchError.value = '우편번호 검색을 불러오지 못했어요. 다시 시도하거나 배송지를 직접 입력해 주세요.'
    closeSearch()
  }
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
  <dialog ref="dialog" class="checkout-address-dialog" aria-labelledby="checkout-address-title" @cancel.prevent="searchOpen ? closeSearch() : emit('close')">
    <div class="address-heading">
      <h2 id="checkout-address-title">{{ current ? '배송지 변경' : '배송지 추가' }}</h2>
      <button type="button" class="address-close" aria-label="배송지 창 닫기" @click="searchOpen ? closeSearch() : emit('close')">×</button>
    </div>

    <section v-if="searchOpen" class="address-search" aria-labelledby="postcode-search-title">
      <header class="postcode-search-heading">
        <h3 id="postcode-search-title" ref="searchTitle" tabindex="-1">카카오 우편번호 검색</h3>
        <button type="button" class="button" @click="closeSearch()">배송지 입력으로 돌아가기</button>
      </header>
      <p v-if="searching" class="address-hint" role="status">우편번호 검색을 불러오는 중이에요.</p>
      <div ref="postcodeTarget" class="postcode-frame"></div>
    </section>

    <form v-show="!searchOpen" class="address-form" @submit.prevent="save">
      <div class="address-contact">
        <label>받는 사람 이름<input v-model="draft.recipient" required maxlength="80" autocomplete="shipping name"></label>
        <label>전화번호<input v-model="draft.phone" type="tel" required maxlength="20" autocomplete="shipping tel" placeholder="010-1234-5678"></label>
      </div>
      <div class="address-postcode">
        <label>우편번호 <span>(선택)</span><input v-model="draft.postcode" maxlength="5" pattern="[0-9]{5}" inputmode="numeric" autocomplete="shipping postal-code"></label>
        <button ref="searchButton" type="button" class="button" @click="search">주소 찾기</button>
      </div>
      <p v-if="searchError" class="error address-search-error" role="alert">{{ searchError }}</p>
      <label>배송지<input v-model="draft.address" required maxlength="160" autocomplete="shipping address-line1"></label>
      <label>상세 주소 <span>(선택)</span><input ref="detailInput" v-model="draft.detail" maxlength="120" autocomplete="shipping address-line2" placeholder="동·호수 등"></label>
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
.address-search { margin-top:16px; }
.postcode-search-heading { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
.postcode-search-heading h3 { margin:0; font-size:1rem; }
.postcode-search-heading .button { min-height:36px; }
.postcode-frame { width:100%; height:clamp(310px,62dvh,460px); overflow:hidden; }
.address-postcode { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; }
.address-postcode .button { min-height:42px; white-space:nowrap; }
.address-search-error { margin:0; }
.address-form { display:grid; gap:12px; margin-top:16px; }
.address-contact { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
label { display:block; min-width:0; font-weight:650; }
label span,.address-hint { color:var(--ui-muted); font-weight:400; }
:is(input,textarea) { display:block; width:100%; min-width:0; margin-top:5px; border:1px solid var(--ui-border); border-radius:7px; }
textarea { resize:vertical; }
.address-hint { margin:8px 0 0; font-size:.8rem; }
.address-actions { justify-content:flex-end; margin-top:4px; }
.address-actions .address-save { background:#dce5f0; color:#182231; }
@media(max-width:420px) { .address-contact { grid-template-columns:minmax(0,1fr); } }
</style>
