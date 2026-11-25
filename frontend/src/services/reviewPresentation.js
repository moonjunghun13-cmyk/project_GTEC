// Format only identifiable generated templates; keep customer-authored text intact.
const topics='게임 프레임|처리 속도|구성품|안정성|파일 전송 속도|용량과 소음|전원 안정성|조립 공간|화질|키감|그립감|음질|제품 성능'
const predicates={
 '기대했던 만큼 잘 작동합니다':'제품이 기대했던 만큼 잘 작동합니다',
 '설치가 간편했고 만족스럽네요':'설치가 간편해서 만족스럽습니다',
 '사용감이 꽤 좋았습니다':'사용감이 꽤 좋았습니다',
 '문제 없이 잘 사용 중입니다':'문제없이 잘 사용 중입니다',
 '기대한 성능이 나옵니다':'기대한 성능이 나옵니다',
 '구매해도 괜찮은 제품입니다':'구매에 만족합니다',
 '아쉬운 점이 많습니다':'아쉬운 점이 많습니다',
 '품질이 조금 아쉽습니다':'제품 품질이 조금 아쉽습니다',
 '사용하면서 문제가 있었습니다':'사용하면서 문제가 있었습니다',
 '다시 구매할 것 같지는 않습니다':'다시 구매할 것 같지는 않습니다',
 '제품 완성도가 아쉽네요':'제품 완성도가 아쉽습니다',
}
const subject=word=>word+(((word.charCodeAt(word.length-1)-0xac00)%28) ? '이' : '가')
export function reviewDisplayText(value){
 const text=String(value??'')
 return text.replace(new RegExp(`(${topics})이\\(가\\) ([^.]+)(?=\\.)`,'g'),(_,topic,predicate)=>predicates[predicate]||subject(topic)+' '+predicate)
}
