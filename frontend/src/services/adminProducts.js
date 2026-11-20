export const categoryToApi = {
  '모니터':'MONITOR',CPU:'CPU','메인보드':'MAINBOARD','메모리':'RAM','그래픽카드':'GPU',
  SSD:'SSD',HDD:'HDD','파워':'POWER','케이스':'CASE','키보드':'KEYBOARD','마우스':'MOUSE','스피커':'SPEAKER',
}
export const productStatus = row => row.backendStatus === 'INACTIVE' || row.selling === false ? 'INACTIVE'
  : row.backendStatus === 'SOLD_OUT' || row.stock === 0 ? 'SOLD_OUT' : 'ACTIVE'
export const productStatusLabel = row => ({ACTIVE:'판매중',INACTIVE:'판매 중지',SOLD_OUT:'품절'})[productStatus(row)]
export function imageUrlsFor(fields) {
  return [...new Set([fields.image,...(fields.imageUrls ?? [])].map(url=>String(url ?? '').trim()).filter(Boolean))]
}
export function validateImageUrl(value) {
  const url=String(value ?? '').trim()
  if (!url || url.length>255 || /[\s\\]/.test(url)
    || !(/^(https?:\/\/)[^/]+/i.test(url) || /^\/(?!\/)/.test(url))) {
    throw new Error('이미지는 255자 이내의 /로 시작하는 경로 또는 http(s) URL을 입력해 주세요.')
  }
  return url
}
export function productPayload(fields) {
  const category=categoryToApi[fields.category]
  if (!fields.name?.trim() || !category || !fields.spec?.trim() || !fields.description?.trim()
    || !Number.isSafeInteger(fields.price) || fields.price<0 || !Number.isSafeInteger(fields.stock) || fields.stock<0) {
    throw new Error('상품명, 카테고리, 가격, 재고, 사양, 설명을 확인해 주세요.')
  }
  const urls=imageUrlsFor(fields).map(validateImageUrl)
  if (!urls.length) throw new Error('대표 이미지를 한 장 이상 등록해 주세요.')
  const payload={name:fields.name.trim(),category,stock:fields.stock,description:fields.description.trim(),
    specification:fields.spec.trim(),price:fields.price,thumbnailUrl:validateImageUrl(fields.image)}
  // Do not replace the server gallery on ordinary text/price edits.
  if (!fields.productId || JSON.stringify(urls)!==JSON.stringify(fields.originalImageUrls ?? [])) {
    payload.images=urls.map(imageUrl=>({imageUrl}))
  }
  return payload
}
