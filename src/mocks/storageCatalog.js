import storageModels from './storageModels.json' with { type: 'json' }
// GT Select concept products for frontend UI only. These are not actual manufacturer models or API schemas.
// Every model has its own geometry/label, black image, and matching light image; no shared image slots.
function internalDrive(model,index) {
  const {whiteImage,...fields} = model
  const interfaceLabel = model.interface === 'NVMe' ? 'PCIe NVMe' : 'SATA 6Gb/s'
  const spec = [model.capacity,model.formFactor,interfaceLabel,...(model.category === 'HDD' ? [model.rpm+'RPM'] : [])].join(' · ')
  const gallery = [{color:'검정',image:model.image},{color:'흰색',image:whiteImage}]
  return {
    ...fields,brand:'GT Select',spec,
    storageType:model.category,connection:'internal',imageAssetType:model.category,
    storyColorManaged:true,
    description:model.visualDesign+'을 적용한 '+model.formFactor+' 내장 '+model.category+'입니다. '+(model.interface === 'NVMe'
      ? 'M.2 NVMe 지원 규격과 방열판 장착 공간을 확인하세요.'
      : 'SATA 데이터·전원 연결과 '+model.formFactor+' 내부 장착 공간을 확인하세요.'),
    stock:model.productId === 'P5' ? 24 : model.productId === 'P12' ? 45 : 12+(index%10)*2,
    popularity:95-(index%10)*4,
    gallery,
    lifestyle:[{label:'검정 연출컷',image:'/storefront/storage-scenes/'+model.productId+'-black.png'},{label:'흰색 연출컷',image:'/storefront/storage-scenes/'+model.productId+'-white.png'}],
  }
}
const storageProducts = storageModels.map(internalDrive)
export const ssdProducts = storageProducts.filter(row => row.category === 'SSD')
export const hddProducts = storageProducts.filter(row => row.category === 'HDD')
