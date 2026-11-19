<template>
  <footer class="store-footer">
    <div class="store-footer-inner">
      <div><RouterLink to="/"><img src="/gt-logo-chrome.png" alt=""> <strong>GT전자</strong></RouterLink><p>프리미엄 PC 부품 전문 쇼핑몰</p></div>
      <div><h2>상품 둘러보기</h2><RouterLink to="/products">전체 상품</RouterLink><RouterLink to="/products?sort=popular">베스트 상품</RouterLink><RouterLink to="/products?sort=new">신상품</RouterLink></div>
      <div><h2>쇼핑 안내</h2><RouterLink to="/cart">장바구니</RouterLink><RouterLink to="/orders">주문 내역</RouterLink><RouterLink to="/account">마이페이지</RouterLink></div>
      <div><h2>고객센터</h2><RouterLink to="/support?tab=faq">자주 묻는 질문</RouterLink><RouterLink to="/support?tab=notices">공지사항</RouterLink></div>
    </div>
  </footer>
</template>
