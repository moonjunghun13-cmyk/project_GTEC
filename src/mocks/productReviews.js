import { featuredProductIds } from './catalog'

const examples = {
  '모니터': [
    '게임할 때 화면 전환이 부드럽고 문서의 작은 글씨도 또렷하게 보여요.',
    '화면은 선명한데 기본 스탠드가 책상에서 생각보다 많은 자리를 차지해요.',
  ],
  CPU: [
    '영상 내보내기를 켜 둔 채 다른 작업을 해도 이전보다 끊김이 덜해요.',
    '성능은 괜찮지만 부하가 오래 걸리면 팬 소리가 커져서 쿨러를 다시 맞췄어요.',
  ],
  '메인보드': [
    '케이스에 조립한 뒤 포트와 슬롯 위치가 찾기 쉬웠고 첫 부팅도 잘됐어요.',
    '케이스 배선할 때 아래쪽 커넥터에 손이 잘 닿지 않아 조립이 번거로웠어요.',
  ],
  '메모리': [
    '게임과 브라우저를 같이 켜 둬도 전보다 창 전환이 매끄러워서 만족해요.',
    '처음 끼운 뒤 설정을 몇 번 바꿔야 안정적으로 부팅돼서 시간이 걸렸어요.',
  ],
  '그래픽카드': [
    '해상도를 올려도 자주 하는 게임에서 화면이 전보다 훨씬 부드러워요.',
    '게임을 오래 켜 두면 팬 소리가 더 커져서 조용한 방에서는 신경 쓰여요.',
  ],
  SSD: [
    '자주 쓰는 프로그램과 게임을 옮겨 봤는데 실행 대기 시간이 확실히 줄었어요.',
    '큰 파일을 연달아 옮길 때는 처음보다 속도가 떨어지는 게 체감돼요.',
  ],
  HDD: [
    '사진과 영상 백업용으로 달았는데 작업 파일과 보관 파일을 나누기 좋아요.',
    '조용한 방에서는 파일을 찾을 때 돌아가는 소리가 꽤 들려요.',
  ],
  '파워': [
    '게임을 오래 실행해도 전원이 안정적이고 평소 작업할 때는 소음도 적어요.',
    '제 케이스에서는 케이블을 뒤로 넘기고 닫기가 생각보다 어려웠어요.',
  ],
  '케이스': [
    '앞에서 뒤로 공기가 잘 통하고 패널을 열어 먼지를 청소하기 편해요.',
    '뒤쪽 선 정리 공간이 제 조립 구성에는 좁아서 케이블이 눌렸어요.',
  ],
  '키보드': [
    '키가 가볍게 눌려서 하루 종일 문서를 작성해도 손에 부담이 덜해요.',
    '일반 키는 괜찮은데 제 환경에서는 스페이스바 소리가 유독 크게 들려요.',
  ],
  '마우스': [
    '손에 안정적으로 들어오고 오래 작업해도 손목에 부담이 덜해요.',
    '휠이 조금 뻑뻑하게 느껴져서 문서를 길게 스크롤할 때 불편했어요.',
  ],
  '스피커': [
    '책상에서 가까이 듣기 좋고 볼륨을 낮춰도 영상 속 대사가 또렷해요.',
    '대사는 잘 들리지만 음악을 들을 때 저음이 기대했던 것보다 약해요.',
  ],
}

const reviewers = ['서유진','정하준','최민서','한지후','이수빈','박현우','이지안','김태윤']

const positiveExamples = [
  '받자마자 설치해서 며칠 써봤는데 제 환경에서 안정적으로 동작해요.',
  '전에 쓰던 제품보다 체감이 좋아요. 이번 교체는 만족스럽습니다.',
  '받은 제품에 흠집이 없고 구성품도 모두 들어 있었어요.',
  '일주일째 매일 사용 중인데 불편한 점 없이 잘 쓰고 있어요.',
  '배송 전에 걱정했는데 완충 포장이 꼼꼼해서 깨끗하게 도착했어요.',
]

const negativeExamples = [
  '제품은 작동하지만 설명서가 짧아서 처음 설치할 때 헤맸어요.',
  '박스 모서리가 찌그러져 도착했어요. 포장이 좀 더 튼튼했으면 좋겠어요.',
  '기대만큼 만족스럽지는 않았어요. 다음에는 다른 제품도 비교해 볼 것 같아요.',
]

export function productReviewExamples(products, orders) {
  const completedProducts = new Set(orders
    .filter(order => order.status === '배송 완료' && !order.request)
    .flatMap(order => order.items.map(item => item.productId)))

  return products.flatMap(({productId,category,popularity}, index) => {
    const comments = examples[category]
    if (!comments) return []

    const bestseller = featuredProductIds.includes(productId) || popularity >= 80
    const [praise, complaint] = comments
    const variety = index % 3
    const samples = []
    if (bestseller) {
      const positiveOffset = index % positiveExamples.length
      const negativeOffset = index % negativeExamples.length
      const positives = [praise, ...positiveExamples.slice(positiveOffset), ...positiveExamples.slice(0,positiveOffset)]
      const negatives = [complaint, negativeExamples[negativeOffset]]
      samples.push(...positives.slice(0,4 + variety).map(body => [body,'긍정']))
      samples.push(...negatives.slice(0,1 + index % 2).map(body => [body,'부정']))
    } else if (completedProducts.has(productId) || popularity >= 45) {
      samples.push([praise,'긍정'],[complaint,'부정'])
      if (index % 2) samples.push([positiveExamples[index % positiveExamples.length],'긍정'])
    } else if (variety) {
      samples.push(variety === 1 ? [praise,'긍정'] : [complaint,'부정'])
    }

    return samples.map(([body,sentiment], position) => ({
      reviewId:'DEMO-PRODUCT-' + productId + '-' + position,
      productId,
      author:reviewers[(index + position) % reviewers.length],
      body,
      rating:sentiment === '긍정' ? 4 + (index + position) % 2 : 2 + (index + position) % 2,
      sentiment,
    }))
  })
}
