<script setup>
import { computed,ref } from 'vue'
import { imageUrlsFor,validateImageUrl } from '../../services/adminProducts'
const props=defineProps({model:Object,disabled:Boolean})
const emit=defineEmits(['busy'])
const draft=ref(''),error=ref(''),uploading=ref(false)
const fileLabel=ref('선택된 파일 없음')
const urls=computed(()=>imageUrlsFor(props.model))
function add(url){url=validateImageUrl(url);props.model.imageUrls=[...new Set([...urls.value,url])];props.model.image ||= url}
function addUrl(){try{error.value='';add(draft.value);draft.value=''}catch(e){error.value=e.message}}
function primary(url){props.model.image=url;props.model.imageUrls=[url,...urls.value.filter(value=>value!==url)]}
function remove(url){const remaining=urls.value.filter(value=>value!==url);props.model.imageUrls=remaining;if(props.model.image===url)props.model.image=remaining[0] || ''}
async function upload(event){
 const files=[...(event.target.files ?? [])];event.target.value=''
 if(!files.length)return
 fileLabel.value=files.length===1 ? files[0].name : files[0].name+' 외 '+(files.length-1)+'개'
 error.value='';uploading.value=true;emit('busy',true)
 try{for(const file of files){
   if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024)throw new Error('PNG·JPG·WebP 형식의 5MB 이하 파일을 선택해 주세요.')
   const response=await fetch('/__frontend/product-images',{method:'POST',headers:{'Content-Type':file.type},body:file})
   if(response.status!==201)throw new Error(response.status===404 || response.status===200 ? '현재 배포 환경에는 이미지 파일 저장 기능이 없습니다. 이미지 URL로 등록해 주세요.' : '이미지 파일 저장에 실패했습니다.')
   add((await response.json()).url)
 }}catch(e){error.value=e.message}finally{uploading.value=false;emit('busy',false)}
}
</script>
<template>
 <section class="product-images-editor" aria-label="상품 이미지 관리">
  <h3>썸네일과 상세 이미지</h3><p>대표로 선택한 이미지가 상품 썸네일로 사용됩니다. 변경 후 상품 저장을 눌러 주세요.</p>
  <div class="image-upload-field"><span>이미지 파일 추가</span><label class="image-upload-control" :class="{'is-disabled':disabled || uploading}"><input type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="이미지 파일 추가" :disabled="disabled || uploading" @change="upload"><span class="image-upload-trigger">파일 선택</span><span class="image-upload-filename" aria-live="polite">{{ fileLabel }}</span></label></div>
  <p v-if="uploading" role="status">이미지를 저장하고 있습니다…</p>
  <div class="image-url-entry"><label>이미지 URL<input v-model="draft" maxlength="255" placeholder="/storefront/... 또는 https://..." :disabled="disabled || uploading" @keydown.enter.prevent="addUrl"></label><button type="button" class="button" :disabled="disabled || uploading || !draft.trim()" @click="addUrl">URL 추가</button></div>
  <ul class="product-image-grid"><li v-for="url in urls" :key="url"><img :src="url" alt="등록된 상품 이미지"><strong v-if="url===model.image">대표 이미지</strong><button v-else type="button" class="button" :disabled="disabled || uploading" @click="primary(url)">대표로 선택</button><button type="button" class="button" :disabled="disabled || uploading" @click="remove(url)">이미지 제거</button></li></ul>
  <p v-if="!urls.length">이미지를 한 장 이상 추가해 주세요.</p><p v-if="error" class="error" role="alert">{{ error }}</p>
 </section>
</template>
