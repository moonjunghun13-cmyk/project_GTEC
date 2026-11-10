import { monitorProducts } from './monitorCatalog.js'
import { ssdProducts, hddProducts } from './storageCatalog.js'
const baseCategories = ['CPU', '메인보드', '메모리', '그래픽카드', 'SSD', '파워', '케이스', '키보드', '마우스', '스피커']
export const categories = ['모니터',...baseCategories.flatMap(category => category === 'SSD' ? ['SSD','HDD'] : [category])]
const rows = [
  ['AMD','Ryzen 7 9800X3D',689000,'8코어 16스레드 · AM5'],
  ['MSI','MAG B650 TOMAHAWK WIFI',259000,'ATX · DDR5 · Wi-Fi 6E'],
  ['G.SKILL','Trident Z5 Neo 32GB',179000,'DDR5-6000 · 16GB × 2'],
  ['ASUS','TUF GeForce RTX 5070 Ti',1399000,'16GB GDDR7 · 트리플 팬'],
  ['Samsung','990 PRO 2TB',239000,'PCIe 4.0 NVMe · M.2'],
  ['Corsair','RM850x',189000,'850W · 80 PLUS Gold'],
  ['Fractal Design','North Charcoal',199000,'미들타워 · 메시 패널'],
  ['Keychron','Q1 Max',269000,'75% 배열 · 무선 기계식'],
  ['Logitech','PRO X SUPERLIGHT 2',189000,'60g · 무선 게이밍'],
  ['Edifier','MR4',109000,'42W · 스튜디오 모니터'],
  ['Intel','Core Ultra 7 265K',459000,'20코어 · LGA1851',0],
  ['WD','Black SN850X 1TB',129000,'PCIe 4.0 NVMe · M.2',4],
  ['Sapphire','Pulse Radeon RX 9070 XT',999000,'16GB GDDR6 · 트리플 팬',3],
]
const variants = [
  ['프로세서',['4코어 · 8스레드','6코어 · 12스레드','8코어 · 16스레드','12코어 · 24스레드','16코어 · 32스레드'],109000,45000],
  ['메인보드',['Micro ATX · DDR4','Micro ATX · DDR5','ATX · DDR5','ATX · DDR5 · Wi-Fi 6','ATX · DDR5 · Wi-Fi 7'],99000,24000],
  ['메모리 키트',['DDR4-3200 · 16GB','DDR4-3600 · 32GB','DDR5-5600 · 32GB','DDR5-6000 · 32GB','DDR5-6400 · 64GB'],49000,19000],
  ['그래픽카드',['8GB · 듀얼 팬','12GB · 듀얼 팬','12GB · 트리플 팬','16GB · 트리플 팬','20GB · 트리플 팬'],279000,84000],
  ['SSD',[],0,0],
  ['파워서플라이',['550W · Bronze','650W · Bronze','750W · Gold','850W · Gold','1000W · Platinum'],59000,17000],
  ['PC 케이스',['미니타워 · 메시','미들타워 · 강화유리','미들타워 · 듀얼 챔버','미들타워 · ARGB 팬','풀타워 · 강화유리'],49000,14000],
  ['키보드',['텐키리스 · 유선','75% 배열 · 무선','풀배열 · 저소음','65% 배열 · 기계식','풀배열 · RGB'],39000,15000],
  ['마우스',['유선 · 78g','무선 · 74g','무선 · 68g','무선 · 62g','무선 · 56g'],29000,14000],
  ['스피커',['2채널 · USB','2채널 · 12W','사운드바 · 블루투스','2채널 · 30W','2.1채널 · 45W'],29000,16000],
]
const modelNames = ['Core','Edge','Prime','Pulse','Nova','Vector','Apex','Forge','Elite','Ultra']
const imageKey = (categoryIndex, slot) =>
  String(categoryIndex + 1).padStart(2,'0') + '-' + String(slot).padStart(2,'0')

const featuredProducts = rows.map(([brand,name,price,spec,index], i) => ({
  productId:'P' + (i + 1), category:baseCategories[index ?? i], brand, name, price, spec,
  stock:12 + i * 3, popularity:100 - i * 4,
}))
const catalogProducts = baseCategories.flatMap((category, categoryIndex) => {
  if (category === 'SSD') return [...ssdProducts,...hddProducts]
  const [label,specs,base,increment] = variants[categoryIndex]
  const existing = featuredProducts.filter(product => product.category === category)
  return Array.from({length:10}, (_,index) => {
    const slot = index + 1
    const key = imageKey(categoryIndex,slot)
    const gallery = [
      {color:'검정',image:'/storefront/gallery/' + key + '-black.png'},
      {color:'흰색',image:'/storefront/gallery/' + key + '-white.png'},
    ]
    const image = gallery[0].image
    if (existing[index]) return {...existing[index],image,gallery}
    return {
      productId:'GT-' + (categoryIndex + 1) + '-' + slot,
      category, brand:'GT Select', name:modelNames[index] + ' ' + label,
      price:base + index * increment, spec:specs[index % specs.length],
      stock:8 + (index * 7 + categoryIndex) % 29, popularity:30 + (index * 3 + categoryIndex) % 17,
      image, gallery,
    }
  })
})
export const products = [
  ...featuredProducts.map(({productId}) => catalogProducts.find(product => product.productId === productId)),
  ...catalogProducts.filter(product => product.productId.startsWith('GT-')),
  ...monitorProducts,
]

export const seed = {
  products,
  users: [
    { userId:'U1', role:'USER', name:'김지우', email:'user@gt.demo', password:'demo1234' },
    { userId:'U2', role:'ADMIN', name:'GT 운영팀', email:'admin@gt.demo', password:'demo1234' },
  ],
  orders: [],
  reviews: [{ reviewId:'R1', productId:'P1', userId:'U1', author:'김지우', rating:5, body:'게임 프레임이 안정적이고 성능이 좋아요.', sentiment:'긍정' }],
  recommendation: { enabled:true, strategy:'관심 카테고리' },
}
