<script setup>
import { onMounted, ref } from 'vue'
import { useRoute,useRouter } from 'vue-router'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'
const route=useRoute(),router=useRouter(),store=useShop()
const error=ref(''),busy=ref(true),signupToken=ref(''),email=ref(''),name=ref(''),agreed=ref(false)
onMounted(async () => {
  const code=route.query.code
  window.history.replaceState({},'',route.path)
  try {
    if (typeof code !== 'string') throw new Error('소셜 인증 코드가 없습니다.')
    const result=await shop.socialExchange(code)
    if (result.status === 'LOGIN') {
      await store.finishAuthentication(await shop.me())
      await router.replace('/')
    } else if (result.status === 'SIGNUP') signupToken.value=result.signupToken
    else throw new Error('소셜 인증 응답을 확인해 주세요.')
  } catch(e) { error.value=e.message }
  finally { busy.value=false }
})
async function signup() {
  busy.value=true;error.value=''
  try {
    const user=await shop.socialSignup(signupToken.value,{email:email.value,name:name.value,termsAgreed:agreed.value,privacyAgreed:agreed.value})
    signupToken.value=''
    await store.finishAuthentication(user)
    await router.replace('/')
  } catch(e) { error.value=e.message }
  finally { busy.value=false }
}
</script>
<template>
  <section class="wrap section">
    <h1>소셜 로그인</h1><p v-if="busy" role="status">인증 정보를 확인하고 있습니다.</p>
    <form v-if="signupToken" class="stack" @submit.prevent="signup">
      <p>처음 가입하는 회원입니다. 소셜 계정의 이메일과 사용할 이름을 입력해 주세요.</p>
      <label>이메일<input v-model="email" type="email" required></label>
      <label>이름<input v-model="name" required></label>
      <p>회원정보는 서버에 저장되며 쇼핑 서비스 제공에 사용합니다.</p>
      <label class="check"><input v-model="agreed" type="checkbox" required>이용약관 및 개인정보 수집과 이용에 동의합니다.</label>
      <button class="button" :disabled="busy || !agreed">가입 완료</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p><RouterLink to="/">홈으로</RouterLink>
  </section>
</template>
