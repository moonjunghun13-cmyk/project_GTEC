import models from './monitorModels.json' with { type: 'json' }
// Fictional GT Select display models and AI concept assets, frontend Mock only.
// IDs, prices, color variants and specification fields are temporary UI rules, not API schemas.
export const monitorProducts = models.map((model,index) => ({
  productId:model.id,category:'모니터',brand:'GT Select',name:model.name,
  price:model.price,stock:12+index*3,popularity:98-index*3,
  spec:[model.size,model.resolution,model.hz+'Hz',model.panel,model.ratio].join(' · '),
  visualDesign:model.design,headline:model.headline,monitorPurposes:model.usage,
  description:model.size+' '+model.ratio+' 화면과 '+model.hz+'Hz 주사율을 갖춘 '+model.name+'입니다. '+model.headline,
  image:'/storefront/monitors/'+model.id+'-black.png',
  gallery:['black','white'].map(color=>({color:color==='black'?'검정':'흰색',image:'/storefront/monitors/'+model.id+'-'+color+'.png'})),
  lifestyle:['black','white'].map(color=>({label:color==='black'?'검정 연출컷':'흰색 연출컷',image:'/storefront/monitor-scenes/'+model.id+'-'+color+'.png'})),
  storyColorManaged:true,
  displaySpecifications:[['화면 크기',model.size],['해상도',model.resolution],['주사율',model.hz+'Hz'],['패널',model.panel],['화면 비율',model.ratio],['연결 단자',model.ports],['색상 구성','검정 / 흰색'],['상품 안내','프론트엔드 Mock 콘셉트 상품 · 실제 제조사 확정 사양 아님']],
}))
