# GTEC 쇼핑몰

상품 검색·주문·결제를 제공하는 Vue 쇼핑몰과 Spring Boot API입니다. 관리자 화면에서 상품과 이미지를 관리할 수 있으며, Python 서비스가 고객 분석, 상품 추천, 리뷰 감성 분석을 담당합니다. PostgreSQL과 Redis는 Docker Compose로 함께 실행합니다.

## Docker Hub 릴리스

배포 버전은 `v1.0.1`입니다.

| Compose 서비스 | 이미지 | 역할 |
| --- | --- | --- |
| `web` | `moonjunghun13cmyk/gtec-web:v1.0.1` | Vue 화면 및 Nginx |
| `backend` | `moonjunghun13cmyk/gtec-backend:v1.0.1` | Spring Boot API |
| `customer-ai` | `moonjunghun13cmyk/gtec-customer-ai:v1.0.1` | 고객 분석 |
| `recommend-ai` | `moonjunghun13cmyk/gtec-recommend-ai:v1.0.1` | 상품 추천 |
| `review-ai` | `moonjunghun13cmyk/gtec-review-ai:v1.0.1` | 리뷰 감성 분석 |

AI 릴리스 이미지에는 서비스 소스와 배포에 필요한 모델 파일이 포함됩니다. 아래 설정은 세 서비스의 소스 마운트를 해제하고 이미지 내부의 `/app`에서 실행합니다.

## Docker Hub 이미지로 실행

1. GitHub 저장소를 받아 프로젝트 루트에서 실행합니다. Docker Desktop의 Linux 엔진과 Docker Compose가 필요합니다.

   ```cmd
   git clone https://github.com/moonjunghun13-cmyk/project_GTEC.git
   cd project_GTEC
   ```

2. 프로젝트 루트에 로컬 배포용 `.env.docker.local`을 만들고 운영 환경에 해당하는 값을 설정합니다.

   - DB 및 인증 변수는 `USER_NAME`, `PASSWORD`, `JWT_SECRET`입니다.
   - 소셜 로그인 변수는 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`입니다.
   - 결제에 `TOSS_SECRET_KEY`를 사용합니다. 프런트엔드 결제 위젯 키 `VITE_TOSS_WIDGET_CLIENT_KEY`는 웹 이미지 빌드 시 지정됩니다.
   - 추천 서비스의 내부 호출에 `AI_INTERNAL_KEY`를 사용할 경우 백엔드와 추천 서비스에 동일한 값이 전달됩니다.

   환경 파일과 비밀 값은 Git에 커밋하지 않습니다.

3. 다음 내용을 루트의 `compose.hub.yaml`에 저장합니다.

   ```yaml
   services:
     web:
       image: moonjunghun13cmyk/gtec-web:v1.0.1
       build: !reset null

     backend:
       image: moonjunghun13cmyk/gtec-backend:v1.0.1
       build: !reset null

     customer-ai:
       image: moonjunghun13cmyk/gtec-customer-ai:v1.0.1
       build: !reset null
       volumes: !reset []

     recommend-ai:
       image: moonjunghun13cmyk/gtec-recommend-ai:v1.0.1
       build: !reset null
       volumes: !reset []

     review-ai:
       image: moonjunghun13cmyk/gtec-review-ai:v1.0.1
       build: !reset null
       volumes: !reset []
   ```

4. CMD에서 아래 명령을 실행한 뒤 브라우저에서 `http://127.0.0.1:5173`에 접속합니다. 저장소가 비공개라면 이미지 다운로드 전에 `docker login`을 실행합니다.

   ```cmd
   docker compose --env-file .env.docker.local -f compose.yaml -f compose.hub.yaml config --quiet
   docker compose --env-file .env.docker.local -f compose.yaml -f compose.hub.yaml up -d --no-build --pull always
   docker compose --env-file .env.docker.local -f compose.yaml -f compose.hub.yaml ps
   ```

### Cloudflare Quick Tunnel

CMD에서 `cloudflared tunnel --url http://127.0.0.1:5173`을 실행합니다. 발급된 HTTPS 기본 주소를 `.env.docker.local`의 `PUBLIC_APP_URL`에 넣고, 소셜 로그인 제공자 콘솔에 `https://<터널 주소>/login/oauth2/code/kakao` 같은 콜백 URI를 등록합니다. Google과 Naver를 사용하는 경우 각각 `/login/oauth2/code/google`, `/login/oauth2/code/naver`를 등록합니다.

Cloudflare용 Nginx 설정과 보안 쿠키를 적용해 서비스를 올립니다.

```cmd
docker compose --env-file .env.docker.local -f compose.yaml -f compose.hub.yaml -f compose.cloudflare.yaml up -d --no-build --pull always
```

Quick Tunnel 주소가 바뀌면 `PUBLIC_APP_URL`과 OAuth 콜백 URI를 함께 갱신한 뒤 같은 명령으로 배포 설정을 적용합니다.

## 관리자 상품 이미지

관리자는 PNG·JPEG·WebP 파일을 선택하거나 `/storefront/...` 및 외부 HTTP(S) 이미지 URL을 추가할 수 있습니다. 파일 업로드는 관리자 전용 `POST /api/admin/product-images`에서 파일당 5MB 제한과 파일 형식 시그니처를 검사합니다. 업로드한 이미지가 미리보기에 나타나면 대표 이미지를 선택하고 **상품 저장**을 누릅니다.

상품에는 `/media/product-images/...` 상대 경로가 저장됩니다. 이미지 파일은 `product-images` 볼륨에 보관되며, DB와 Redis는 각각 `postgres-data`, `redis-data` 볼륨을 사용합니다. 배포 데이터를 백업할 때는 상품 DB와 업로드 이미지 볼륨을 함께 보관합니다.

## 소스 개발

| 경로 | 구성 |
| --- | --- |
| `frontend/` | Vue 프런트엔드와 상품 카탈로그 이미지 |
| `backend/` | Spring Boot 백엔드 |
| `backend/ai-services/` | 고객 분석, 상품 추천, 리뷰 감성 분석 |

소스를 변경해 Compose로 실행할 때는 `compose.hub.yaml` 없이 빌드합니다. AI 모델을 소스로 실행하기 전에 Git LFS로 모델 파일을 내려받습니다.

```cmd
git lfs pull
docker compose --env-file .env.docker.local -f compose.yaml up -d --build
```

프런트엔드만 개발할 때는 `frontend`에서 `npm ci`와 `npm run dev`를 실행합니다. 로컬 환경 설정은 `frontend/.env.example`을 참고하고, 백엔드 주소가 기본값과 다르면 `BACKEND_PROXY_TARGET`을 지정합니다.

관리자 화면의 **더미 데이터 생성**은 CSV를 생성합니다. DB 반영은 저장소의 [더미 데이터 생성 방법](더미%20데이터%20생성%20방법.txt)에 따라 별도로 진행합니다. 시연 점검 항목은 [테스트 결과 문서](GTEC_TEST_PLAN_RESULTS.md)를 참고하세요.
