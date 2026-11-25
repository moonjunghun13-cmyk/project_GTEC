import catalog from './realCatalog.json'

export const categories = ['모니터','CPU','메인보드','메모리','그래픽카드','SSD','HDD','파워','케이스','키보드','마우스','스피커']
export const featuredProductIds = ['case-north-xl','case-lancool-216','speaker-r1280db','mouse-g304']

const tierRank = {HIGH:3,MID:2,LOW:1}
const overviewCategories = [...categories.slice(1),categories[0]]
const byCategory = new Map(overviewCategories.map(category => [category,catalog.filter(row => row.category === category)]))
export const products = Array.from({length:10},(_,position) => overviewCategories.map(category => byCategory.get(category)[position])).flat().map((product,index) => ({
  ...product,
  stock:8 + (index * 7) % 23,
  popularity:30 + tierRank[product.tier] * 16 + (index * 3) % 15,
}))

export const seed = {
  products,
  users: [
    { userId:'U1', role:'USER', name:'김지우', email:'user@gt.demo', password:'demo1234' },
    { userId:'U2', role:'ADMIN', name:'GT 운영팀', email:'admin@gt.demo', password:'demo1234' },
  ],
  orders: [],
  reviews: [{ reviewId:'R1', productId:'cpu-9700x', userId:'U1', author:'김지우', rating:5, body:'게임 프레임이 안정적이고 성능이 좋아요.', sentiment:'긍정' }],
  recommendation: { enabled:true, strategy:'관심 카테고리' },
}
