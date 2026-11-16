<script setup>
import { computed, reactive, ref } from 'vue'
import { shop } from '../../services'
import { useShop } from '../../stores/shop'
import CheckoutAddressDialog from '../../components/CheckoutAddressDialog.vue'

const emit = defineEmits(['close'])
const store = useShop()
const profile = reactive({name:store.user.name,email:store.user.email,username:store.user.username ?? ''})
const password = reactive({current:'',next:'',confirm:''})
const addressOpen = ref(false)
const passwordOpen = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const delivery = computed(() => store.deliveryAddresses[store.user?.userId] ?? null)

async function update(operation, message) {
  if (busy.value) return
  const userId = store.user?.userId
  if (!userId) return
  busy.value = true
  notice.value = ''
  error.value = ''
  try {
    const updated = await operation(userId)
    if (store.user?.userId !== userId) return
    store.user = updated
    notice.value = message
    return true
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
async function saveProfile() {
  const saved = await update(id => shop.profile(id,{
    name:profile.name.trim(),
    email:profile.email.trim().toLowerCase(),
    username:profile.username.trim().toLowerCase(),
  }), '회원정보를 저장했습니다.')
  if (saved) Object.assign(profile,{name:store.user.name,email:store.user.email,username:store.user.username ?? ''})
}
async function savePassword() {
  if (password.next !== password.confirm) {
    notice.value = ''
    error.value = '새 비밀번호와 확인 값이 일치하지 않습니다.'
    return
  }
  const saved = await update(id => shop.changePassword(id,password.current,password.next), '비밀번호를 저장했습니다.')
  if (saved) {
    Object.assign(password,{current:'',next:'',confirm:''})
    passwordOpen.value = false
  }
}
function saveAddress(value) {
  store.deliveryAddresses[store.user.userId] = value
  addressOpen.value = false
  error.value = ''
  notice.value = '기본 배송지를 저장했습니다.'
}
</script>

<template>
  <section id="member-profile" class="member-profile" aria-labelledby="member-profile-title">
    <div class="member-section-head">
      <h2 id="member-profile-title">회원정보</h2>
      <button type="button" @click="emit('close')" aria-label="회원정보 닫기">닫기 ×</button>
    </div>
    <form class="profile-fields" @submit.prevent="saveProfile">
      <label>이름<input v-model="profile.name" required maxlength="50" autocomplete="name"></label>
      <label>이메일<input v-model="profile.email" type="email" required autocomplete="email"></label>
      <label>아이디<input v-model="profile.username" pattern="[A-Za-z0-9]{4,20}" maxlength="20" autocomplete="username" placeholder="미설정 · 영문·숫자 4~20자"></label>
      <button type="submit" class="button gold" :disabled="busy">회원정보 저장</button>
    </form>

    <section class="profile-row">
      <div><h3>비밀번호</h3><p>{{ store.user.hasPassword ? '설정됨' : '미설정' }}</p></div>
      <button type="button" class="button" :aria-expanded="passwordOpen" :disabled="busy" @click="passwordOpen = !passwordOpen">{{ store.user.hasPassword ? '비밀번호 변경' : '비밀번호 설정' }}</button>
      <form v-if="passwordOpen" class="profile-fields profile-password" @submit.prevent="savePassword">
        <label v-if="store.user.hasPassword">현재 비밀번호<input v-model="password.current" type="password" required autocomplete="current-password"></label>
        <label>새 비밀번호<input v-model="password.next" type="password" required minlength="8" maxlength="20" autocomplete="new-password"></label>
        <label>새 비밀번호 확인<input v-model="password.confirm" type="password" required minlength="8" maxlength="20" autocomplete="new-password"></label>
        <button type="submit" class="button gold" :disabled="busy">비밀번호 저장</button>
      </form>
    </section>

    <section class="profile-row">
      <div>
        <h3>기본 배송지</h3>
        <template v-if="delivery">
          <p><span v-if="delivery.postcode">({{ delivery.postcode }}) </span>{{ delivery.address }} {{ delivery.detail }}</p>
          <p>{{ delivery.recipient }} · {{ delivery.phone }}</p>
        </template>
        <p v-else>등록된 배송지가 없습니다.</p>
      </div>
      <button type="button" class="button" :disabled="busy" @click="addressOpen = true">{{ delivery ? '배송지 변경' : '배송지 추가' }}</button>
    </section>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="profile-notice" role="status">{{ notice }}</p>
    <CheckoutAddressDialog v-if="addressOpen" :current="delivery" :member-name="store.user.name" @close="addressOpen=false" @save="saveAddress"/>
  </section>
</template>

<style scoped>
.profile-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) auto; align-items:end; gap:12px; }
.profile-fields label { display:grid; gap:6px; min-width:0; }
.profile-fields input { width:100%; min-width:0; border-color:var(--ui-border); }
.profile-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:12px; padding-top:16px; margin-top:16px; border-top:1px solid var(--ui-border); }
.profile-row h3 { font-size:.95rem; margin:0 0 5px; }
.profile-row p,.profile-notice { font-size:.85rem; margin:0; overflow-wrap:anywhere; }
.profile-password { grid-column:1/-1; }
.profile-notice { margin-top:12px; }
@media(max-width:850px) { .profile-fields { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:500px) { .profile-fields { grid-template-columns:minmax(0,1fr); } }
</style>
