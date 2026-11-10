export const purposes = [
  {id:'gaming',label:'게이밍',caption:'게임을 위한 퍼포먼스',description:'그래픽카드와 프로세서 중심으로 게이밍 부품을 살펴보세요.',image:'/storefront/gaming.png'},
  {id:'office',label:'사무용',caption:'일상을 채우는 효율적인 선택',description:'문서 작업과 일상적인 사용을 위한 부품과 주변기기입니다.',image:'/storefront/arrivals.png'},
  {id:'editing',label:'편집용',caption:'창작의 흐름을 이어주는 구성',description:'영상과 이미지 작업에 필요한 메모리·저장 공간을 중심으로 골랐습니다.',image:'/storefront/memory.png'},
  {id:'development',label:'개발용',caption:'더 넓게 펼치는 작업 환경',description:'개발 작업을 위한 프로세서·메모리와 입력 장치를 살펴보세요.',image:'/storefront/performance-orbit.png'},
]
// Temporary front-end merchandising rules. These are individual component recommendations.
export function purposeTags(product) {
  if (product.category === '모니터') return product.monitorPurposes ?? []
  const rules = {
    gaming:['CPU','그래픽카드','메모리','케이스','마우스','키보드'],
    office:['CPU','메모리','SSD','HDD','키보드','마우스','스피커'],
    editing:['CPU','메모리','그래픽카드','SSD','HDD'],
    development:['CPU','메모리','SSD','HDD','키보드'],
  }
  return Object.keys(rules).filter(key => rules[key].includes(product.category)
    && (key !== 'office' || product.price <= 200000))
}
