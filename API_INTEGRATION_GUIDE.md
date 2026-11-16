# GT전자 Mock 프론트엔드와 API 연동

## 실행

Node.js 24 환경에서 `npm ci` 후 `npm run dev`를 실행합니다. `npm run build`로 프로덕션 빌드를 확인합니다. `.env`의 `VITE_DATA_MODE=mock`이 기본이며, 다른 모드는 명세 확정 후 구현합니다.

## 수동 테스트

- GUEST로 전체 상품에서 Ryzen을 검색한 뒤 카테고리와 가격을 필터링하고 베스트·신상품 정렬을 확인합니다.
- 상품 상세에서 리뷰를 조회하고 장바구니에 담습니다. 새로고침 후에도 같은 탭에서 수량이 유지되는지 확인합니다.
- 구매하기, 찜하기 또는 리뷰 쓰기를 눌러 로그인 모달을 확인합니다. 로그인 성공 후 시작한 동작이 이어지는지 확인합니다.
- 일반 회원은 `user@gt.demo`, 관리자는 `admin@gt.demo`를 사용합니다. 공통 비밀번호는 `demo1234`입니다. 테스트용 Mock 로그인입니다.
- 회원가입 모달에서 약관 동의 후 테스트 계정을 생성하거나 일반 회원으로 로그인합니다. 임시 장바구니로 모의 결제하고 주문 내역에서 구매한 상품의 리뷰를 작성합니다. 상품 상세에서 감정분석 배지를 확인합니다.
- 찜한 상품, 홈의 관심 카테고리 추천, 마이페이지 회원정보 수정을 확인합니다.
- 쇼핑몰 헤더에서 관리자로 로그인하고 관리자 메뉴를 엽니다. 대시보드의 지표를 확인하고 주문 · 배송에서 테스트 주문을 처리합니다. 취소 · 반품 · 환불에서 요청을 승인하고 환불 완료 처리 후 재고와 매출 변화를 확인합니다. 로그아웃 후 `/admin` 직접 접근과 일반 회원의 접근이 제한되는지 확인합니다.

비회원 장바구니는 탭의 sessionStorage에 임시 저장합니다. 나머지 데이터는 메모리에서만 유지되므로 새로고침 시 초기화됩니다.

## API 설계 초안과 프론트엔드 대응

출처는 첨부 문서 `API 리스트.docx`의 GTEC API 리스트입니다. 아래는 설계서의 **경로 예시와 메서드**입니다. 기능과 경로는 이후 추가·변경·축소될 수 있습니다. 현재 프론트엔드는 Mock 모드로 실행하며, 확정된 항목부터 서비스 계층에 연결합니다.

| 프론트 기능 | REST API 초안 |
| --- | --- |
| 회원가입, 로그인 | `POST /api/members`, `POST /api/auth/login` |
| 내 정보 조회·수정 | `GET /api/members/me`, `PATCH /api/members/me` |
| 상품 목록·검색, 상세 | `GET /api/products`, `GET /api/products/{productId}` |
| 관리자 상품 등록·수정·삭제 | `POST /api/admin/products`, `PATCH /api/admin/products/{productId}`, `DELETE /api/admin/products/{productId}` |
| 관리자 상품 이미지 등록·삭제·순서 변경 | `POST /api/admin/products/{productId}/images`, `DELETE /api/admin/products/{productId}/images/{imageId}`, `PATCH /api/admin/products/{productId}/images/{imageId}` |
| 장바구니 조회·추가 | `GET /api/cart`, `POST /api/cart/items` |
| 장바구니 수량 변경·삭제 | `PATCH /api/cart/items/{cartItemId}`, `DELETE /api/cart/items/{cartItemId}` |
| 찜 목록 조회·추가·삭제 | 설계서에 `GET / POST / DELETE`와 `/api/wishlist`, `/api/wishlist/{productId}`가 함께 기재되어 있습니다. 추가 요청의 경로와 본문은 확정이 필요합니다. |
| 주문 생성·내 주문 목록·상세·취소 | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{orderId}`, `PATCH /api/orders/{orderId}/cancel` |
| 관리자 주문 목록·상태 변경 | `GET /api/admin/orders`, `PATCH /api/admin/orders/{orderId}/status` |
| 결제 요청·결과 조회 | `POST /api/orders/{orderId}/payment`, `GET /api/orders/{orderId}/payment` |
| 배송 조회, 관리자 운송장·배송 상태 등록 및 수정 | `GET /api/orders/{orderId}/delivery`, `PUT /api/admin/orders/{orderId}/delivery`, `PATCH /api/admin/orders/{orderId}/delivery` |
| 상품 리뷰 조회·작성, 리뷰 수정·삭제 | `GET /api/products/{productId}/reviews`, `POST /api/products/{productId}/reviews`, `PATCH /api/reviews/{reviewId}`, `DELETE /api/reviews/{reviewId}` |
| 반품 신청·내역 조회, 관리자 반품 처리 | `POST /api/orders/{orderId}/returns`, `GET /api/orders/{orderId}/returns`, `PATCH /api/admin/returns/{returnId}` |
| 공지사항 목록·상세 | `GET /api/notices`, `GET /api/notices/{noticeId}` |

| 프론트 기능 | FastAPI 초안 |
| --- | --- |
| 리뷰 감정분석 실행·결과 조회 | `POST /ai/sentiment/analyze`, `GET /ai/sentiment/reviews/{reviewId}` |
| 상품별 감정분석 요약 | `GET /ai/sentiment/products/{productId}/summary` |
| 회원별 고객분석 실행·결과 조회 | `POST /ai/customers/{memberId}/analyze`, `GET /ai/customers/{memberId}/analysis` |
| 회원별 추천 · 유사 상품 추천 | `GET /ai/recommendations/members/{memberId}`, `GET /ai/recommendations/products/{productId}` |

연결 전에 확인할 사항입니다.

- **인증과 회원** — 서버 주소, 토큰 또는 세션 방식, 로그인 유지·만료·로그아웃, 본인·관리자 권한과 오류 형식이 필요합니다. 소셜 인증과 가입 이메일 인증은 이번 표에 없습니다.
- **장바구니와 결제** — Mock 장바구니는 `productId`를 쓰며, 서버 수량 변경·삭제에는 `cartItemId`가 필요합니다. 로그인 시 비회원 장바구니의 이전 규칙, 주문 생성 이후 결제 요청·결과 조회 순서, 실패 시 처리 기준을 확인합니다. 주문 화면은 회원 전용입니다.
- **배송·반품·환불** — 프론트 관리자 화면의 배송 관리 탭에 배송과 취소·반품·환불이 모여 있습니다. 서비스 계층에서 주문·배송·반품 응답을 연결하며, 관리자 반품 목록의 조회 경로, `returnId` 취득 방법, 승인·거절·환불 상태값을 확인합니다.
- **상품과 리뷰** — 검색·정렬·페이지 쿼리, 이미지 업로드 형식과 순서 필드, 구매 리뷰 작성 자격·수정·삭제 시 권한과 UX를 확정합니다. 현재 고객 화면에는 구매 리뷰 조회와 주문 내역에서 작성하는 흐름이 구현되어 있습니다.
- **관리자와 AI** — 관리자 회원 관리, 리뷰 숨김, 공지 등록·수정·삭제, 관리자 문의 관리, 대시보드 집계의 전용 API는 초안에 없습니다. 회원별 고객분석 API는 현 관리자 고객분석 화면의 집계와 범위가 다릅니다. AI 요청을 프론트에서 직접 호출할지 REST 서버를 통해 호출할지도 확인합니다.

## 명세 확정 후 수정 위치

| 위치 | 연동 작업 |
| --- | --- |
| `src/api/index.js` | 확정된 API 주소와 전송 설정으로 Axios 클라이언트를 구성합니다. |
| `src/services/index.js` | Mock 구현과 실제 API 어댑터를 모드별로 선택합니다. 인증, 회원가입, 회원정보, 상품, 재고, 주문, 결제, 리뷰, 감정분석, 추천 응답과 오류를 현재 UI 모델로 변환합니다. 장바구니 및 찜을 서버에서 저장해야 한다면 여기에 서비스 인터페이스를 추가합니다. |
| `src/mocks/catalog.js` | 개발 및 데모 데이터입니다. 실제 서비스와 독립적으로 유지합니다. |
| `src/stores/shop.js`, `src/router/index.js` | 로그인 복원·만료·로그아웃 정책이 확정되면 서비스 인터페이스를 호출해 상태 및 권한 가드를 갱신합니다. 현재 가드는 Mock 화면 접근 제어용입니다. |

`productId`, `userId`, `orderId`, `reviewId` 및 서비스 반환 객체는 프론트 내부의 임시 구조입니다. API URL, 인증 방식, 백엔드 요청·응답 스키마는 명세 확정 후 결정합니다. 관리자 화면은 같은 파일의 admin 서비스 객체를 사용합니다. 실제 연동 시 상품, 주문·배송, 환불, 계정 상태, 리뷰 공개 여부, QnA 답변, 공지 및 분석 조회를 권한이 검증된 API로 연결합니다.

추천 카드에는 서비스 내부의 임시 필드 `recommendationReason`을 사용합니다. `interest`, `personal`, `category`, `popular`를 화면에서 각각 관심 추천, 맞춤 추천, 관심 카테고리 기반, 인기 추천으로 표시합니다. 실제 명세가 정해지면 서비스 계층에서 추천 사유를 이 UI 모델로 변환합니다. 비회원은 Mock 추천 예시를 봅니다.

## 상품 이미지 갤러리

- `src/components/ProductGallery.vue`: 4초 자동 전환, 이전·다음, 전체 사진 썸네일 선택, 일시정지. 마우스 또는 키보드로 갤러리를 조작하는 동안과 화면 밖/비활성 탭에서는 전환을 멈춥니다. OS의 동작 줄이기 설정에서는 자동 재생을 기본 정지합니다.
- `src/components/product-gallery.css`: 정사각형 메인 사진, 골드 선택 테두리, 상세 로고, 모바일 썸네일 가로 스크롤 및 구매 정보 하단 정렬.
- `src/mocks/lifestyle.json`: 상품 ID별 연출컷 경로와 표시 이름을 연결하는 임시 UI 데이터입니다. `src/mocks/productDetails.js`에서 상품 정보에 합칩니다. Vue 화면에서 Mock 파일을 직접 참조하지 않습니다.
- `public/storefront/lifestyle/`: 상품별 AI 생성 연출 이미지. `prompts.json`은 사용한 입력 이미지와 프롬프트를 추적하기 위한 생성 기록입니다. 실제 제조사 사진이나 실물 규격 검증 자료가 아닙니다.
- API 확정 시 서비스 계층에서 실제 이미지 목록을 갤러리 UI 모델로 변환합니다. 이미지 업로드 API나 인증 방식을 현재 단계에서 가정하지 않습니다.

확인 방법: 상품 상세에서 정사각형 사진 하단의 썸네일을 눌러 선택 테두리와 큰 사진이 함께 바뀌는지 확인합니다. 갤러리 밖으로 마우스를 옮겨 약 4초 뒤 다음 사진으로 전환되는지 확인하고, 일시정지 버튼 및 다른 상품으로 이동했을 때 첫 사진으로 초기화되는지도 확인합니다.


완성된 상품 연출컷은 100개 상품 × 검정 1장·흰색 1장, 총 200장을 갤러리에 연결합니다. 기존 상품 원본·검정/흰색 비교 사진도 유지합니다. 생성 도구는 내장 image_gen이며, 최종 선택 이미지별 원본 경로와 실제 생성 프롬프트는 `public/storefront/lifestyle/prompts.json`에 기록했습니다.


## 소셜 로그인 / 가입 Mock
- 로그인 화면과 가입 첫 단계에서 카카오·네이버·구글 버튼을 선택할 수 있습니다.
- 처음 선택한 제공자는 필수 약관 확인 후 USER 테스트 계정을 메모리에 생성합니다. 로그아웃 후 같은 제공자로 재진입하면 같은 Mock 회원을 이용하며, 새로고침 시 초기화됩니다.
- 서비스별 테스트 이름·이메일은 `src/mocks/socialAuth.js`에 있습니다. 실제 소셜 프로필, 인증 토큰, 비밀번호를 수집하지 않습니다.
- `src/services/index.js`의 `socialPreview`, `socialSignIn`은 임시 UI 인터페이스입니다. 실제 API 엔드포인트나 제공자 응답 형식을 정의한 것이 아닙니다. 실제 소셜 인증 방식, 회원 연결, 신규 가입 약관 정책과 API 명세가 확정되면 이 서비스 구현을 교체합니다.
- `src/stores/shop.js`의 `authenticateSocial`은 일반 로그인과 같은 상태 확정 흐름을 사용합니다. 비회원 장바구니를 유지하고, 로그인 전 시작한 찜·구매 동작으로 복귀합니다. 소셜 Mock은 ADMIN 권한을 제공하지 않습니다.
- `src/components/SocialAuthButtons.vue`는 공통 버튼, `AuthDialog.vue`는 선택·약관 확인 UI를 담당합니다. Vue 컴포넌트가 Mock 계정 파일이나 실제 인증 토큰을 직접 다루지 않습니다.

수동 확인: 로그인 → 제공자 선택 → Mock 계정 확인 → 필수 약관 동의 → 가입·로그인 → 로그아웃 → 같은 제공자로 재로그인합니다. 회원가입 첫 단계에서도 세 제공자를 선택할 수 있으며, 기존 이메일 회원가입과 일반/관리자 Mock 로그인도 유지됩니다.


## SSD / HDD Mock 카테고리 분리
- `src/mocks/storageCatalog.js`: 내장 SSD 10개와 내장 HDD 10개. 용량별 GT Select 상품은 UI용 임시 상품이며 제조사 확정 사양·가격이 아닙니다.
- `storageType`, `connection`, `formFactor`, `interface`, `imageAssetType`는 프론트 내부 임시 필드입니다. API 필드명이 아닙니다.
- 내장 M.2 NVMe / 2.5인치 SATA SSD와 내장 3.5인치 / 2.5인치 SATA HDD 이미지만 연결합니다. 외장 USB 저장장치 이미지는 제외합니다.
- 기존 다른 카테고리의 ID와 `P5`, `P12`, `GT-5-*` ID를 유지합니다. 신규 HDD는 `GT-HDD-*`를 사용합니다.
- 상품 썸네일·갤러리·연출컷·설명은 같은 저장장치 종류를 사용해야 합니다. `npm run check:storage`로 개수·중복 ID·내장 분류·이미지 경로를 검사합니다.
- 실제 API 연동 시 서비스 계층에서 백엔드 카테고리를 SSD와 HDD로 각각 매핑하고, 제조사 모델과 일치하는 실제 이미지·사양으로 치환해야 합니다.
## 저장장치 모델 이미지 개정
SSD/HDD는 이제 제조사 실물 사진을 표방하지 않는 GT Select Mock 모델 20종으로 구성됩니다. 각 제품은 storageModels.json의 고유 외형과 storage-v2 폴더의 전용 이미지 2장을 사용합니다. 이전의 공용 이미지 슬롯 방식은 사용하지 않습니다. 자세한 생성 규칙은 STORAGE_ASSETS.md를 참고하세요.

### Product styled images
Storage mock models now expose `lifestyle: [{label,image}]` separately from original `gallery` images, via `src/mocks/storageCatalog.js`. Future service adapters should preserve this presentation distinction for the five-slide gallery and large detail story banner; no backend API schema is assumed. Assets and generation prompts are documented in STORAGE_ASSETS.md / STORAGE_SCENE_PROMPTS.json.

## Monitor Mock category
- `src/mocks/monitorModels.json` and `monitorCatalog.js` define ten fictional GT Select monitors. Sizes, prices, ports and color variants are temporary frontend UI data, not manufacturer-verified listings or an API schema.
- `categories` in `src/mocks/catalog.js` places 모니터 before CPU. Existing product IDs, image bindings and ordering are preserved; ten monitor products are appended.
- Gallery photos: `public/storefront/monitors/` (black/white). Styled campaign images: `public/storefront/monitor-scenes/` (black/white). The existing five-slide detail gallery and paired story banner consume these same service-level fields.
- Monitor copy/specifications are provided by `productDetails.js` and `productGuides.js`. Future API adapters should map verified screen size, resolution, refresh rate, panel, ports and color/image data into this UI model. No endpoint or authentication contract has been assumed.
- `npm run check:monitors` checks count, unique designs, black/white gallery pairs and all forty distinct local image files. `npm run check:storage` also checks ten products in every category.

## 토스페이먼츠 결제창형 테스트

- 프론트엔드 `.env.local`에 `VITE_TOSS_WIDGET_CLIENT_KEY=test_gck_...`를 설정하고 Vite를 다시 시작합니다. 회원 주문서에서 배송지를 저장한 뒤 **결제 요약 → 토스페이먼츠 테스트 결제**를 누릅니다. 키를 설정하지 않으면 토스페이먼츠 버튼이 비활성화되며 기존 Mock 결제를 사용할 수 있습니다.
- 테스트 상점에서 결제수단과 약관 UI 키를 따로 설정한 경우 `VITE_TOSS_PAYMENT_VARIANT`, `VITE_TOSS_AGREEMENT_VARIANT`를 지정합니다. 기본값은 `DEFAULT`, `AGREEMENT`입니다. 토스 결제창에 표시하는 결제수단은 해당 variant 설정에서 관리합니다. 결제창에서 계좌이체 항목도 숨기려면 variant에서 제외합니다.
- SDK는 결제창을 열 때 로드합니다. 성공·실패 콜백은 `/checkout/toss/success`, `/checkout/toss/fail`입니다. 콜백에서 브라우저의 테스트 요청 번호와 금액을 확인해 인증 결과를 표시합니다. 서버에서 주문과 금액을 검증하고 결제를 승인하는 단계가 완료될 때까지 주문을 확정하지 않습니다.
- `VITE_*`에는 공개 테스트 클라이언트 키만 사용합니다. 승인용 시크릿 키는 서버의 환경 변수에서 관리합니다. [토스페이먼츠 결제창형 가이드](https://docs.tosspayments.com/guides/v2/payment-widget/integration-window)
