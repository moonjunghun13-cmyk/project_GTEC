# 백엔드 전체 API 재점검 결과

기준: 2026-11-19. 새 경로의 Java 컨트롤러 14개, 명시적 HTTP API 82개를 다시 대조했습니다. 이 수치는 **코드·화면 연결 검토 범위**이며 82개 모두 실제 업무 데이터로 실행했다는 뜻은 아닙니다.

## 이번에 추가로 발견하여 수정한 누락

- API 모드에서 카카오·네이버·구글 버튼을 숨기던 조건 제거. 정식 OAuth 시작, 일회용 코드 교환, 기존 회원 로그인, 신규 소셜 회원 동의·가입, 실패 복귀 경로를 연결했습니다.
- 소셜 가입 토큰을 일반 로그인 토큰으로 덮어쓰던 Axios 처리와 만료된 일회용 코드를 재시도할 수 있던 인증 갱신 제외 조건을 수정했습니다.
- OAuth 왕복에서 프론트 호스트와 쿠키가 유지되도록 `/oauth2`, `/login/oauth2` 프록시의 Host 처리 수정. 제공자 등록용 콜백 주소는 `http://localhost:5175/login/oauth2/code/kakao`, `.../naver`, `.../google`입니다.
- 상품·수량·사유를 선택하는 개별 반품 요청, 승인된 반품의 환불 완료 상태 기록, 주문 상태 필터를 추가했습니다. 환불 상태 기록은 PG 결제 취소를 실행하지 않으며 화면에서도 이를 명시합니다.
- 본인 주문·배송·결제·반품 상세 조회와 영수증 링크를 추가했습니다.
- 상품 리뷰가 100건을 넘으면 뒤 페이지가 빠지던 조회를 전체 페이지 조회로 수정했습니다. 분석 시각이 없는 리뷰는 분석 완료로 표시하지 않습니다.
- 일반 가입 후 로그인 입력란에 이메일 대신 서버 로그인 아이디가 들어가도록 수정했습니다. 소셜 계정에는 서버가 제공하지 않는 비밀번호 설정 버튼을 표시하지 않습니다.
- 서버 주소록이 없는 배송지 UI를 ‘이번 접속의 배송지’로 명확히 표시했습니다.

## 82개 API별 연결 상태

‘직접 연결’은 서비스의 API 호출과 해당 UI를 확인했다는 뜻입니다. ‘목록으로 제공’은 이미 받아온 전체 목록 데이터로 상세 또는 검색·필터 기능을 구현하여 별도 조회 요청을 중복 실행하지 않는 항목입니다.

| 메서드 | 서버 경로 | 분류 | 프론트 기능 |
| --- | --- | --- | --- |
| GET | `/api/ai/recommendations/me` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| POST | `/api/admin/ai/reviews/{reviewId}/analyze` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/reviews/statistics` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| POST | `/api/admin/ai/reviews/analyze-all` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/customers/repurchase-predictions` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/customers/summary` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/customers/repurchase-summary` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/customers/monthly-retention` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/customers/model-training-status` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| POST | `/api/admin/ai/customers/model-refresh` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/admin/ai/recommendations/status` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| POST | `/api/admin/ai/recommendations/retrain` | 직접 연결 | 상품 추천·리뷰 분석·고객 분석·모델 관리 / Home, RecommendationModelPanel, LiveSentimentReport, CustomerAnalysis |
| GET | `/api/faqs` | 직접 연결 | FAQ 조회·검색·상세 / FaqManagement, Support |
| GET | `/api/faqs/search` | 목록으로 제공 | FAQ 조회·검색·상세 / FaqManagement, Support |
| GET | `/api/faqs/{id}` | 목록으로 제공 | FAQ 조회·검색·상세 / FaqManagement, Support |
| POST | `/api/faqs` | 서버 인증 제약 | FAQ 조회·검색·상세 / FaqManagement, Support |
| PUT | `/api/faqs/{id}` | 서버 인증 제약 | FAQ 조회·검색·상세 / FaqManagement, Support |
| DELETE | `/api/faqs/{id}` | 서버 인증 제약 | FAQ 조회·검색·상세 / FaqManagement, Support |
| GET | `/api/notices` | 직접 연결 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| GET | `/api/notices/search` | 목록으로 제공 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| GET | `/api/notices/{id}` | 목록으로 제공 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| POST | `/api/notices` | 직접 연결 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| PUT | `/api/notices/{id}` | 직접 연결 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| DELETE | `/api/notices/{id}` | 직접 연결 | 공지 조회·검색·상세·등록·수정·삭제 / Support, AdminWorkspace |
| GET | `/api/cart` | 직접 연결 | 장바구니 조회·추가·수량·삭제 / shop store |
| POST | `/api/cart/items` | 직접 연결 | 장바구니 조회·추가·수량·삭제 / shop store |
| PATCH | `/api/cart/items/{cartItemId}` | 직접 연결 | 장바구니 조회·추가·수량·삭제 / shop store |
| DELETE | `/api/cart/items/{cartItemId}` | 직접 연결 | 장바구니 조회·추가·수량·삭제 / shop store |
| GET | `/api/orders/{orderId}/delivery` | 직접 연결 | 사용자 배송 상세 및 관리자 배송 처리 / OrderDetails, DeliveryDetail |
| GET | `/api/admin/orders/{orderId}/delivery` | 직접 연결 | 사용자 배송 상세 및 관리자 배송 처리 / OrderDetails, DeliveryDetail |
| PUT | `/api/admin/orders/{orderId}/delivery` | 직접 연결 | 사용자 배송 상세 및 관리자 배송 처리 / OrderDetails, DeliveryDetail |
| PATCH | `/api/admin/orders/{orderId}/delivery` | 직접 연결 | 사용자 배송 상세 및 관리자 배송 처리 / OrderDetails, DeliveryDetail |
| GET | `/api/admin` | 직접 연결 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| GET | `/api/admin/login-id/{loginId}` | 목록으로 제공 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| PATCH | `/api/admin/{id}/activate` | 직접 연결 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| PATCH | `/api/admin/{id}/inactivate` | 직접 연결 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| PATCH | `/api/admin/{id}/kick` | 직접 연결 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| PATCH | `/api/admin/{id}/role` | 직접 연결 | 관리자 회원 조회·검색·상태·권한 변경 / AdminWorkspace |
| POST | `/api/members/login` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/refresh` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/logout` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/social-exchange` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/social-signup` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/signup` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| GET | `/api/members/me` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| PUT | `/api/members/me` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/members/inactive` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| PUT | `/api/members/password` | 직접 연결 | 로그인·갱신·로그아웃·소셜 교환·소셜 가입·일반 가입·프로필·탈퇴·비밀번호 / AuthDialog, OAuthCallback, MemberProfile |
| POST | `/api/orders` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| GET | `/api/orders` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| GET | `/api/orders/{orderId}` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| PATCH | `/api/orders/{orderId}/complete` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| PATCH | `/api/orders/{orderId}/cancel` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| GET | `/api/admin/orders` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| GET | `/api/admin/orders/status` | 목록으로 제공 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| PATCH | `/api/admin/orders/{orderId}/prepare` | 직접 연결 | 주문 생성·목록·상세·취소·확정·관리자 목록·상태 필터·준비 / Checkout, Account, OrderDetails, AdminWorkspace |
| POST | `/api/payments/ready` | 직접 연결 | 결제 준비·승인·조회·취소 / Checkout, TossCheckoutResult, OrderDetails, Account |
| POST | `/api/payments/confirm` | 직접 연결 | 결제 준비·승인·조회·취소 / Checkout, TossCheckoutResult, OrderDetails, Account |
| GET | `/api/payments/{orderNumber}` | 직접 연결 | 결제 준비·승인·조회·취소 / Checkout, TossCheckoutResult, OrderDetails, Account |
| POST | `/api/payments/{orderNumber}/cancel` | 직접 연결 | 결제 준비·승인·조회·취소 / Checkout, TossCheckoutResult, OrderDetails, Account |
| GET | `/api/admin/products` | 직접 연결 | 관리자 상품 조회·등록·수정·상태·삭제 / AdminWorkspace |
| POST | `/api/admin/products` | 직접 연결 | 관리자 상품 조회·등록·수정·상태·삭제 / AdminWorkspace |
| PATCH | `/api/admin/products/{productId}` | 직접 연결 | 관리자 상품 조회·등록·수정·상태·삭제 / AdminWorkspace |
| PATCH | `/api/admin/products/{productId}/status` | 직접 연결 | 관리자 상품 조회·등록·수정·상태·삭제 / AdminWorkspace |
| DELETE | `/api/admin/products/{productId}` | 직접 연결 | 관리자 상품 조회·등록·수정·상태·삭제 / AdminWorkspace |
| GET | `/api/products` | 직접 연결 | 상품 목록·상세 / Catalog, Product |
| GET | `/api/products/{productId}` | 목록으로 제공 | 상품 목록·상세 / Catalog, Product |
| POST | `/api/orders/{orderId}/returns` | 직접 연결 | 상품별·수량별 반품 요청·내역·관리자 처리 / Account, OrderDetails, AdminWorkspace |
| GET | `/api/orders/{orderId}/returns` | 직접 연결 | 상품별·수량별 반품 요청·내역·관리자 처리 / Account, OrderDetails, AdminWorkspace |
| GET | `/api/admin/returns` | 직접 연결 | 상품별·수량별 반품 요청·내역·관리자 처리 / Account, OrderDetails, AdminWorkspace |
| PATCH | `/api/admin/returns/{returnId}` | 직접 연결 | 상품별·수량별 반품 요청·내역·관리자 처리 / Account, OrderDetails, AdminWorkspace |
| GET | `/api/reviews/me` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| GET | `/api/products/{productId}/reviews` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| POST | `/api/products/{productId}/reviews` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| PATCH | `/api/reviews/{reviewId}` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| DELETE | `/api/reviews/{reviewId}` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| GET | `/api/admin/reviews` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| GET | `/api/admin/reviews/{reviewId}` | 목록으로 제공 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| DELETE | `/api/admin/reviews/{reviewId}` | 직접 연결 | 상품 리뷰·내 리뷰·리뷰 작성·수정·삭제·관리자 관리 / Product, Account, MyReviews, AdminWorkspace |
| GET | `/api/wishlist` | 직접 연결 | 찜 조회·추가·삭제 / shop store, Product, Account |
| POST | `/api/wishlist/{productId}` | 직접 연결 | 찜 조회·추가·삭제 / shop store, Product, Account |
| DELETE | `/api/wishlist/{productId}` | 직접 연결 | 찜 조회·추가·삭제 / shop store, Product, Account |

분류 합계: {'직접 연결': 71, '목록으로 제공': 8, '서버 인증 제약': 3}. 총 82개.

## 검증한 범위

- 세 제공자 인증 시작 요청의 실제 HTTP 302와 제공자 도메인·콜백 주소 확인. 외부 계정 비밀번호 입력·동의·실제 소셜 회원 생성은 수행하지 않았습니다.
- 소셜 계약 테스트: 기존 회원 LOGIN·신규 회원 SIGNUP 분기, 회원가입 토큰 헤더 보존, 필수 동의 요청 본문, 만료 코드 1회 처리, 한글 사용자 정보 미리보기, 소셜 계정 모델 확인.
- 프로덕션 빌드 및 기존 실서버 상품 연동 검증 통과. 120개 상품·12개 카테고리·가격·이미지·상세 스펙·호환성 유지.
- 기존 API 조회·권한·모델 준비도·감정 통계 검증 결과는 INTEGRATION_CHANGES.md와 보조 폴더 api-results.json 참고.
- 실제 결제·환불·회원 권한 변경·탈퇴·리뷰 삭제·완료 상태 기록은 실행하지 않았습니다. 구매 이력이 없는 항목의 화면은 코드·요청 형식·빌드 기준 검증입니다.

## 프론트만으로 해결할 수 없어 남긴 항목

1. FAQ 쓰기 3개 API는 JWT 로그인과 다른 HttpSession 관리자 인증을 요구합니다. 조회 전용으로 제공하며 세션을 위조하거나 인증 검사를 우회하지 않았습니다.
2. 추천 재학습 자료가 없을 때 원본 Java Gateway는 Python의 422를 일반 500으로 전달합니다. 프론트는 서버 학습 준비도를 먼저 검사하고 보류 안내를 표시합니다.
3. 제공자 콘솔에서 현재 콜백 URI가 허용되어 있는지는 외부 관리 권한 없이 확인할 수 없습니다. **확인용 포트라도 소셜 OAuth에는 정확한 콜백 URI 등록이 필요합니다.** 버튼·서버 인증 시작 확인을 실제 계정 로그인 완료로 표현하지 않습니다.
4. 토스 공개 테스트 클라이언트 키가 없어 실제 결제 창 왕복은 수행하지 않았습니다. 소셜 가입과 결제·환불은 사용자 계정·업무 데이터로 별도 검증이 필요합니다.

## 백엔드·AI 원본 확인

작업 전 기록한 원본 190개 파일 SHA-256 대조: 수정·삭제 0개. Java·Python·AI 소스 및 설정은 변경하지 않았습니다.

## 브라우저 재확인

- 로그인과 가입 화면에서 카카오·네이버·구글 버튼 노출 확인.
- 만료된 인증 코드로 콜백 진입 시 오류·재로그인 버튼 표시 및 URL에서 일회용 코드 제거 확인.
- 실제 외부 계정 인증이나 가입 동의는 실행하지 않았습니다.
- `npm run check:social`은 외부 계정 없이 요청·응답·토큰 처리 계약을 검증합니다.
