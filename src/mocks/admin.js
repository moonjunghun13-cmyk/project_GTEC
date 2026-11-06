export function adminSeed(products) {
  const order = (number, index, status, days, request = '') => {
    const product = products[index]
    const date = new Date(Date.now() - days * 86400000).toISOString()
    return {
      orderId:'GT-DEMO-' + number,userId:'U1',date,status,request,
      tracking:status === '배송 완료' ? 'DEMO-002' : '',carrier:status === '배송 완료' ? 'CJ대한통운' : '',shipmentId:'SHIP-DEMO-'+number,
      delivery:{recipient:'김지우',phone:'01000000000',address:'테스트 배송지'},
      items:[{productId:product.productId,name:product.name,image:product.image,category:product.category,price:product.price,quantity:1}],total:product.price,
    }
  }
  // Deterministic demo activity makes the overview charts readable before API integration.
  const history = Array.from({length:30}, (_,index) => {
    const row = order('H' + index,index + 15,'배송 완료',index % 6 + 1)
    if (index >= 10) {
      const date = new Date()
      date.setUTCDate(2)
      date.setUTCMonth(date.getUTCMonth() - (1 + index % 5))
      row.date = date.toISOString()
    }
    return row
  })
  const reviews = history.slice(0,12).map((row,index) => ({
    reviewId:'DEMO-R' + index,userId:'U1',author:'김지우',productId:row.items[0].productId,
    rating:index % 6 === 0 ? 2 : index % 4 === 0 ? 3 : 5,
    sentiment:index % 6 === 0 ? '부정' : index % 4 === 0 ? '중립' : '긍정',
    body:index % 6 === 0 ? '테스트 리뷰 · 포장 상태가 아쉬워요.' : index % 4 === 0 ? '테스트 리뷰 · 무난하게 사용 중입니다.' : '테스트 리뷰 · 제품과 배송이 만족스러워요.',
  }))
  return {
    reviews,
    orders:[order('001',1,'결제 완료',0),order('002',2,'배송 완료',2,'반품 요청'),order('003',3,'배송 준비',1,'취소 요청'),...history],
    inquiries:[{inquiryId:'Q1',userId:'U1',title:'메모리 호환 문의',body:'AM5 메인보드와 함께 사용할 수 있나요?',author:'김지우',answer:''}],
    notices:[{noticeId:'N1',title:'GT전자 Mock 스토어 안내',body:'테스트 주문과 모의 결제를 체험할 수 있습니다.'}],
  }
}
