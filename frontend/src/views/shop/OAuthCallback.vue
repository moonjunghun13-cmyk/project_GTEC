<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShop } from '../../stores/shop'
import { toFrontendUser } from '../../services'
import { exchangeSocialCode, completeSocialSignup, signupPreview } from '../../services/socialAuth'
import { startSocialLogin, socialReturnPath } from '../../services/socialNavigation'
import SocialAuthButtons from '../../components/SocialAuthButtons.vue'
const route=useRoute(),router=useRouter(),store=useShop()
const busy=ref(true),error=ref(''),signupToken=ref('')
const form=reactive({name:'',email:'',termsAgreed:false,privacyAgreed:false})
let started=false,active=true
onBeforeUnmount(()=>{active=false;signupToken.value=''})
async function finish(member){if(!active)return;const user=toFrontendUser(member);await store.finishAuthentication(user);if(active)await router.replace(socialReturnPath(user.role))}
async function exchange(){
  const code=typeof route.query.code==='string'?route.query.code:''
  window.history.replaceState(window.history.state,'',window.location.pathname)
  try{const result=await exchangeSocialCode(code);if(!active)return;if(result.status==='LOGIN')await finish(result.member);else{signupToken.value=result.signupToken;Object.assign(form,signupPreview(result.signupToken))}}
  catch(e){if(active)error.value=e.message}
  finally{if(active)busy.value=false}
}
watch(()=>store.busy,value=>{if(!value&&!started){started=true;exchange()}},{immediate:true})
async function signup(){if(busy.value)return;busy.value=true;error.value='';try{await finish(await completeSocialSignup(signupToken.value,{name:form.name.trim(),email:form.email,termsAgreed:form.termsAgreed,privacyAgreed:form.privacyAgreed}))}catch(e){error.value=e.message}finally{busy.value=false}}
</script>
<template><section class="wrap section oauth-callback"><h1>{{ signupToken ? '소셜 회원가입' : '소셜 로그인' }}</h1><p v-if="busy" role="status">인증 정보를 확인하고 있습니다…</p><p v-if="error" class="error" role="alert">{{ error }}</p><form v-if="signupToken" class="stack" @submit.prevent="signup"><p>소셜 계정 정보를 확인하고 필수 항목에 동의해 주세요.</p><label>이메일<input v-model="form.email" type="email" readonly required autocomplete="email"></label><label>이름<input v-model="form.name" required maxlength="50" autocomplete="name"></label><label class="check"><input v-model="form.termsAgreed" type="checkbox" required>이용약관에 동의합니다.</label><label class="check"><input v-model="form.privacyAgreed" type="checkbox" required>개인정보 수집·이용에 동의합니다.</label><p>계정 식별 정보와 이름·이메일은 회원가입 및 로그인 처리를 위해 프로젝트 서버에 저장됩니다.</p><button class="button" :disabled="busy || !form.termsAgreed || !form.privacyAgreed">동의하고 가입하기</button></form><template v-else-if="!busy"><p>인증이 만료되거나 취소됐다면 다시 로그인해 주세요.</p><SocialAuthButtons @select="startSocialLogin"/><RouterLink to="/">홈으로</RouterLink></template></section></template>
<style scoped>.oauth-callback{max-width:640px}.oauth-callback form{margin:20px 0}.oauth-callback p{line-height:1.7}</style>
