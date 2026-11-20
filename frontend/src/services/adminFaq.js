export const adminFaq = [
  ['환불은 어떻게 하나요?','배송 관리의 취소·반품·환불 탭에서 요청을 확인하고 승인한 뒤 실제 환불 여부를 확인해 환불 완료 상태를 기록합니다. 결제 취소는 별도 처리입니다.'],
  ['배송 처리는 어디서 하나요?','주문·배송에서 주문을 선택하고 배송 준비, 운송장 입력, 발송 순서로 진행합니다.'],
  ['상품 이미지 변경은 어떻게 하나요?','상품 관리에서 상품을 선택하고 대표 이미지 파일을 추가한 뒤 저장해 주세요.'],
  ['재고는 어디서 수정하나요?','상품 관리에서 상품을 선택하고 재고 수량을 변경한 뒤 저장합니다.'],
]

export const adminFaqRows = adminFaq.map(([title,content],index) => ({
  id:'guide-'+(index+1),title,content,source:'관리자 이용안내',
}))

export function adminFaqList(serverRows=[]) {
  return [...adminFaqRows,...serverRows.map(row=>({
    ...row,serverId:row.id,id:'server-'+row.id,content:row.content ?? row.answer ?? row.body ?? '',source:'고객 FAQ',
  }))]
}

export function faqPayload(draft) {
  const title=String(draft.title ?? '').trim(),content=String(draft.content ?? '').trim()
  if(!title || !content) throw new Error('질문과 답변을 모두 입력해 주세요.')
  if(title.length>100) throw new Error('질문은 100자 이내로 입력해 주세요.')
  return {title,content}
}
export function faqWriteError(error) {
  if([401,403].includes(error.response?.status)) return '저장하지 못했습니다. 현재 FAQ API가 관리자 세션 인증을 요구해 관리자 로그인 토큰만으로는 등록·수정·삭제가 거부됩니다. 입력 내용은 유지됩니다.'
  return error.message || 'FAQ 저장에 실패했습니다. 다시 시도해 주세요.'
}
