<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShop } from '../stores/shop'
import { shop } from '../services'
import './auth-dialog.css'
import SocialAuthButtons from './SocialAuthButtons.vue'

const store = useShop()
const router = useRouter()
const dialog = ref(null)
const title = ref(null)
const step = ref(0)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const identity = ref('')
const confirmation = ref('')
const code = ref('')
const socialSelection = ref(null)
const socialConsent = ref(false)
const checkedId = ref('')
const form = reactive({username:'',password:'',name:'',email:'',phone:''})
const stages = ['약관 동의','정보 입력','가입 확인','가입 완료']
const terms = [
  [
    "(필수) 이용약관 동의",
    [
      "서비스 범위 · GT전자에서 상품 조회, 장바구니, 주문 및 리뷰 기능을 이용합니다.",
      "주문과 결제 · 서버에 등록된 상품 가격과 재고를 기준으로 주문하며 결제 승인 후 결제가 완료됩니다.",
      "이용 시 유의사항 · 리뷰에 본인이나 다른 사람의 개인정보를 적지 마세요."
    ]
  ],
  [
    "(필수) 개인정보 수집 및 이용 동의",
    [
      "입력 항목과 목적 · 아이디, 이름, 이메일, 비밀번호, 휴대폰 번호는 회원가입 및 쇼핑 서비스 이용을 위해 서버에 전송합니다.",
      "보관 및 전송 · 회원정보는 서버에 저장합니다. 이메일 인증과 문자 인증은 현재 제공하지 않습니다.",
      "간편 가입 · 선택한 소셜 서비스의 인증을 통해 회원정보를 전달받습니다.",
      "동의 선택 · 필수 항목에 동의하지 않으면 회원가입을 진행할 수 없습니다."
    ]
  ],
  [
    "(필수) 만 14세 이상입니다.",
    [
      "가입자는 본인이 만 14세 이상임을 확인합니다. 이 화면에서는 생년월일이나 신분증을 입력하지 않습니다."
    ]
  ],
  [
    "(선택) 마케팅 정보 수신 동의",
    [
      "상품 소식, 할인 및 이벤트 안내의 수신 여부를 선택하는 항목입니다. 선택하지 않아도 가입과 쇼핑 체험이 가능합니다.",
      "마케팅 수신 동의 저장과 발송 기능은 현재 제공하지 않습니다."
    ]
  ]
]
const consent = reactive([false,false,false,false])
const agreed = computed(() => consent.slice(0,3).every(Boolean))
const allAgreed = computed(() => consent.slice(0,3).every(Boolean))
const signingUp = computed(() => store.authMode === 'signup')
onMounted(() => dialog.value.showModal())

function go(index) {
  step.value = index
  error.value = ''
  notice.value = ''
  nextTick(() => title.value?.focus())
}
function switchMode(mode) {
  socialSelection.value = null
  socialConsent.value = false
  store.openAuth(mode)
  go(0)
}
async function run(operation) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try { await operation() }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}
function nextInfo() {
  if (form.password !== confirmation.value) { error.value = '비밀번호가 일치하지 않습니다.'; return }
  if (!/^[a-z0-9]{4,20}$/.test(form.username)) { error.value = '아이디는 영문 소문자와 숫자 4~20자로 입력해 주세요.'; return }
  checkedId.value = form.username
  if (!/^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{4,30}$/.test(form.password)) { error.value = '비밀번호는 4~30자 영문, 숫자, 특수문자 !@#$%^&*를 포함해야 합니다.'; return }
  go(2)
}
function signup() {
  run(async () => {
    await shop.signup({...form,username:checkedId.value,name:form.name.trim(),email:form.email.trim().toLowerCase(),agreed:agreed.value})
    identity.value = form.username
    form.password = ''
    confirmation.value = ''
    go(3)
  })
}
function chooseSocial(provider) {
  run(async () => {
    const mode = store.authMode
    const preview = await shop.socialPreview(provider)
    if (store.authMode !== mode) return
    socialSelection.value = preview
    socialConsent.value = false
    await nextTick()
    title.value?.focus()
  })
}
function backFromSocial() {
  socialSelection.value = null
  socialConsent.value = false
  error.value = ''
}
function continueSocial() {
  run(() => store.authenticateSocial(socialSelection.value.provider,socialConsent.value))
}
function home() {
  store.closeAuth()
  router.push('/')
  window.scrollTo(0,0)
}
</script>

<template>
  <dialog ref="dialog" class="auth gt-auth" :class="{'gt-auth-login':!signingUp && !socialSelection}" aria-labelledby="auth-title" @cancel.prevent="!busy && store.closeAuth()">
    <button class="close" aria-label="닫기" :disabled="busy" @click="store.closeAuth()">×</button>
    <div v-if="socialSelection" class="gt-auth-content gt-social-confirm">
      <p class="gt-social-kicker">SOCIAL · MOCK</p>
      <h2 ref="title" id="auth-title" tabindex="-1">{{ socialSelection.label }}로 간편 시작</h2>
      <p class="gt-social-description">GT전자에서 사용할 테스트 계정을 확인해 주세요.</p>
      <div class="gt-social-profile"><span aria-hidden="true">{{ socialSelection.label.slice(0,1) }}</span><div><strong>{{ socialSelection.name }}</strong><small>{{ socialSelection.email }}</small></div></div>
      <template v-if="!socialSelection.registered">
        <label class="check gt-social-consent"><input v-model="socialConsent" type="checkbox"> (필수) 이용약관·개인정보 이용 및 만 14세 이상에 동의합니다.</label>
        <details class="gt-social-terms"><summary>필수 약관 내용 보기</summary><section v-for="[label,paragraphs] in terms.slice(0,3)" :key="label" class="gt-term-copy"><strong>{{ label }}</strong><p v-for="paragraph in paragraphs" :key="paragraph">{{ paragraph }}</p></section></details>
      </template>
      <p class="gt-social-mock-note">Mock 체험입니다. 실제 소셜 계정 연결이나 정보 전송은 하지 않습니다.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="gt-auth-actions"><button class="button outline" :disabled="busy" @click="backFromSocial">다른 방법 선택</button><button class="button" :disabled="busy || (!socialSelection.registered && !socialConsent)" @click="continueSocial">{{ busy ? '처리 중…' : socialSelection.registered ? '테스트 계정으로 로그인' : '동의하고 가입·로그인' }}</button></div>
    </div>
    <template v-else-if="!signingUp">
      <div class="gt-auth-brand"><div class="gt-auth-emblem"><img src="/gt-logo-chrome.png" alt="GT전자"></div><p>아직 회원이 아니신가요? <button type="button" class="auth-link" :disabled="busy" @click="switchMode('signup')">회원가입</button></p></div>
      <div class="gt-auth-content">
        <h2 ref="title" id="auth-title" tabindex="-1">로그인</h2>
        <form class="stack" @submit.prevent="run(() => store.authenticate({email:identity.trim(),password:form.password}))">
          <label>아이디<input v-model="identity" required autocomplete="username" placeholder="아이디"></label>
          <label>비밀번호<input v-model="form.password" type="password" required autocomplete="current-password" placeholder="비밀번호"></label>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="button" :disabled="busy">{{ busy ? '로그인 중…' : '로그인' }}</button>
        </form>
        <div class="gt-social-divider"><span>간편 로그인</span></div>
        <SocialAuthButtons :disabled="busy" @select="chooseSocial"/>
        <p class="gt-social-mock-note">소셜 서비스의 인증 화면으로 이동합니다.</p>
      </div>
    </template>

    <div v-else class="gt-auth-content gt-wizard">
      <ol class="gt-auth-steps" aria-label="회원가입 진행 단계">
        <li v-for="(stage,index) in stages" :key="stage" :aria-current="step === index ? 'step' : undefined"><span>{{ index+1 }}</span>{{ stage }}</li>
      </ol>
      <h2 ref="title" id="auth-title" tabindex="-1">{{ step === 1 ? '회원정보 입력' : stages[step] }}</h2>
      <div v-if="step === 0" class="gt-signup-social">
        <p class="gt-social-heading">간편 회원가입</p>
        <SocialAuthButtons mode="signup" :disabled="busy" @select="chooseSocial"/>
        <p class="gt-social-mock-note">소셜 인증 후 필수 약관에 동의하여 가입합니다.</p>
        <div class="gt-social-divider"><span>또는 이메일로 회원가입</span></div>
      </div>
      <form v-if="step === 0" class="stack" @submit.prevent="go(1)">
        <label class="check gt-term"><input type="checkbox" :checked="allAgreed" @change="consent.fill($event.target.checked)"> 모든 약관에 동의합니다.</label>
        <div v-for="([label,paragraphs],index) in terms.slice(0,3)" :key="label" class="gt-term">
          <label class="check"><input v-model="consent[index]" type="checkbox"> {{ label }}</label>
          <details><summary>내용 보기</summary><div class="gt-term-copy"><p v-for="paragraph in paragraphs" :key="paragraph">{{ paragraph }}</p></div></details>
        </div>
        <div class="gt-auth-actions"><button type="button" class="button outline" @click="switchMode('login')">이전</button><button class="button" :disabled="!agreed">다음</button></div>
      </form>
      <form v-else-if="step === 1" class="stack" @submit.prevent="nextInfo">
        <div class="gt-auth-inline"><label>아이디<input v-model="form.username" required pattern="[A-Za-z0-9]{4,20}" autocomplete="username" placeholder="영문·숫자 4~20자"></label></div>
        <label>비밀번호<input v-model="form.password" type="password" required minlength="4" maxlength="30" autocomplete="new-password"></label>
        <label>비밀번호 확인<input v-model="confirmation" type="password" required autocomplete="new-password"></label>
        <label>이름<input v-model="form.name" required autocomplete="name"></label>
        <label>이메일<input v-model="form.email" type="email" required autocomplete="email"></label>
        <label>휴대폰 번호<input v-model="form.phone" type="tel" required pattern="[0-9]{10,11}" placeholder="테스트 번호 · 숫자만 입력"></label>
        <div class="gt-auth-actions"><button type="button" class="button outline" :disabled="busy" @click="go(0)">이전</button><button class="button" :disabled="busy">다음</button></div>
      </form>
      <form v-else-if="step === 2" class="stack" @submit.prevent="signup">
        <p class="gt-term">{{ form.email }}</p>
        <p>입력한 정보로 회원가입합니다. 아이디와 이메일 중복 여부는 가입 시 확인합니다. 이메일 인증은 현재 지원하지 않습니다.</p>
        <div class="gt-auth-actions"><button type="button" class="button outline" :disabled="busy" @click="go(1)">이전</button><button class="button" :disabled="busy">{{ busy ? '가입 중…' : '가입 완료' }}</button></div>
      </form>
      <div v-else class="stack gt-auth-done">
        <span aria-hidden="true">✓</span><strong>회원가입이 완료되었습니다!</strong>
        <button class="button" @click="switchMode('login')">로그인 하기</button>
        <button class="button outline" @click="home">홈으로 이동</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="notice" class="gt-auth-notice" role="status">{{ notice }}</p>
    </div>
  </dialog>
</template>
