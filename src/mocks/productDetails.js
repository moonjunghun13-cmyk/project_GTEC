import lifestyle from './lifestyle.json'
import { productGuides } from './productGuides'
// Temporary editorial content for the mock catalog. Confirm manufacturer specifications before API integration.
const categoryCopy = {
  'CPU': ['시스템의 중심을 선택하세요.','프로세서의 코어 구성과 소켓을 확인하고, 사용하는 프로그램에 맞는 시스템을 구성해 보세요.',['프로세서 구성','소켓 호환성','시스템 구성']],
  '메인보드': ['모든 부품을 하나로 연결합니다.','폼팩터와 메모리 규격을 확인하고, 케이스와 주변 부품에 맞는 메인보드를 선택하세요.',['폼팩터 확인','메모리 규격','확장 구성']],
  '메모리': ['작업 흐름에 맞는 메모리.','메모리 용량과 동작 규격을 확인하고, 메인보드가 지원하는 조합으로 구성하세요.',['메모리 용량','동작 규격','플랫폼 호환성']],
  '그래픽카드': ['화면 속 경험을 완성하세요.','그래픽 메모리와 냉각 구성을 살펴보고, 파워 용량과 케이스 장착 공간을 함께 확인하세요.',['그래픽 메모리','냉각 구성','장착 공간']],
  'SSD': ['빠른 일상을 위한 내장 SSD.','M.2 NVMe와 2.5인치 SATA 규격을 구분하고, 메인보드와 케이스에 맞는 SSD를 선택하세요.',['SSD 용량','연결 규격','장착 방식']],
  'HDD': ['자료를 담는 여유, 내장 HDD.','3.5인치 데스크톱과 2.5인치 노트북 규격을 구분하고, SATA 연결과 드라이브 베이를 확인하세요.',['HDD 용량','드라이브 규격','연결 규격']],
  '파워': ['빌드에 맞는 전원 구성.','정격 출력과 효율 등급을 확인하고, 연결할 부품의 소비전력과 케이블 구성을 함께 검토하세요.',['정격 출력','효율 등급','전원 구성']],
  '케이스': ['내 취향으로 완성하는 빌드.','케이스 형태와 패널 구성을 살펴보고, 메인보드 크기와 그래픽카드 장착 공간을 확인하세요.',['케이스 형태','패널 구성','부품 배치']],
  '키보드': ['손끝에서 시작되는 데스크.','키 배열과 연결 방식을 확인하고, 일상 작업과 게임에 맞는 키보드를 골라보세요.',['키 배열','연결 방식','데스크 구성']],
  '마우스': ['내 손에 맞는 움직임.','무게와 연결 방식을 살펴보고, 사용하는 공간과 그립에 맞는 마우스를 선택하세요.',['제품 무게','연결 방식','사용 환경']],
  '스피커': ['데스크에 더하는 사운드.','채널 구성과 출력을 확인하고, 설치 공간과 연결 환경에 맞는 스피커를 선택하세요.',['채널 구성','출력 사양','설치 공간']],
}
export function withProductDetails(product) {
  const [headline,description,features] = categoryCopy[product.category] ?? ['나만의 시스템을 완성하세요.','상품 규격과 사용 환경을 확인해 주세요.',['주요 사양','제품 구성','사용 환경']]
  const guide = productGuides[product.category] ?? {
    overview:description,sections:[],usage:['상품 규격에 맞는 시스템 구성'],checks:['사용 환경과 제품 호환성'],
  }
  return {...product,lifestyle:product.lifestyle ?? lifestyle[product.productId] ?? [],details:{
    overview:product.brand + ' ' + product.name + '은(는) ' + product.spec + ' 구성의 ' + product.category + ' 상품입니다. ' + guide.overview,
    sections:guide.sections,
    usage:guide.usage,
    checks:guide.checks,
    headline,description:product.description || description,
    features,
    specifications:[
      ['상품명',product.name],['브랜드',product.brand],['카테고리',product.category],
      ...product.spec.split(' · ').map((value,index) => ['주요 사양 '+(index+1),value]),
    ],
  }}
}

