<script setup>
defineProps({mode:{type:String,default:'login'},disabled:Boolean})
defineEmits(['select'])
const providers = [{id:'kakao',label:'카카오'},{id:'naver',label:'네이버'},{id:'google',label:'구글'}]
</script>
<template>
  <div class="gt-social-options" :aria-label="mode === 'signup' ? '소셜 회원가입' : '소셜 로그인'">
    <button v-for="provider in providers" :key="provider.id" type="button" class="gt-social-button" :aria-label="provider.label + (mode === 'signup' ? '로 가입하기' : '로 로그인')" :disabled="disabled" @click="$emit('select',provider.id)">
      <span class="gt-social-mark" :data-provider="provider.id" aria-hidden="true">
        <svg v-if="provider.id === 'kakao'" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4C6.5 4 2 7.3 2 11.3c0 2.6 1.9 4.9 4.8 6.2L5.6 22l5.1-3.5H12c5.5 0 10-3.2 10-7.2S17.5 4 12 4Z"/></svg>
        <b v-else>{{ provider.id === 'naver' ? 'N' : 'G' }}</b>
      </span>
      <span>{{ provider.label }}로 {{ mode === 'signup' ? '가입하기' : '로그인' }}</span>
      <span class="gt-social-arrow" aria-hidden="true">→</span>
    </button>
  </div>
</template>

