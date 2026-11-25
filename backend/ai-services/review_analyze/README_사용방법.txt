추천 시스템용 가상 구매 이력 생성 안내

1. generate_dummy_orders.py를 Python 프로젝트 폴더에 넣으세요.
2. 터미널에서 python generate_dummy_orders.py 를 실행하세요.
3. 같은 폴더에 dummy_products.csv와 dummy_purchase_history.csv가 생성됩니다.

설정 변경(코드 위쪽):
  ORDER_COUNT = 6000   # 주문 건수
  MEMBER_COUNT = 2000  # 가상 회원 수
  SEED = 42            # 같은 설정이면 동일한 데이터가 생성됩니다.

생성 CSV:
  dummy_products.csv: product_id, category (12개 카테고리 x 10개 상품)
  dummy_purchase_history.csv: order_id, member_id, product_id, category, quantity, ordered_at

기본적으로 상품 ID 1~120, 회원 ID 1~2000은 임시 식별자입니다.
실제 DB 상품이 확정되면 코드와 동일한 폴더에 actual_products.csv를 만드세요.
이 파일에 product_id,category라는 헤더와 카테고리별 정확히 10개 상품(총 120개 행)을 넣으세요.
그 상태로 스크립트를 다시 실행하면 실제 상품 ID를 사용하여 데이터를 재생성합니다.

주의:
- 이 코드는 DB에 직접 저장하지 않습니다. 모델 학습/시연용 CSV 생성기입니다.
- DB에 실제 주문을 INSERT할 때는 가상 회원 ID도 실제 회원 ID와 연결되어야 합니다.
- 실제 구매 기록이 아니므로 실서비스 추천 성능을 주장하는 자료로 사용하지 마세요.
- 상품명, 배송지, 전화번호 등 추천 학습에 불필요한 컬럼은 넣지 않았습니다.
- 구매 기록을 1~5점 평점으로 해석하지 마세요. 구매 여부/빈도 기반 추천에 사용합니다.
