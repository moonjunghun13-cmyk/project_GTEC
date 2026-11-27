# GTEC integrated project

## Project layout

- `frontend/`: Vue frontend, existing catalog images and detailed specifications.
- `backend/`: Spring Boot backend.
- `backend/ai-services/`: recommendation, review sentiment and customer analysis services.
- The supplied setup documents are included at the repository root.

The duplicate root `src/` and `public/` folders were removed after byte-for-byte comparison with `frontend/src/` and `frontend/public/`. The uploaded backend and AI source code was not edited.

## Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Run `npm run build` in `frontend/` to build. Keep local values in `.env.local`; configure `BACKEND_PROXY_TARGET` for the actual Java port. Use `.env.example` as a reference.

The dashboard button **더미 데이터 생성** calls the supplied endpoint `POST /api/admin/ai/demo-data/append` to generate a CSV batch. It does not import the batch into the database. Initial CSV creation is required before append; see the supplied dummy-data instructions. Data generation was not executed during this frontend merge.

## Backend and AI

Follow the supplied backend and AI setup instructions. Environment files, secret values, dependency folders, caches and build output are excluded from Git.

The sentiment model files use Git LFS. Clone with Git LFS installed and run `git lfs pull`; a source ZIP may contain pointer files rather than model weights.

## 관리자 상품 이미지 업로드

관리자가 파일을 선택하면 프런트엔드가 관리자 전용 `POST /api/admin/product-images`로 전송합니다. 백엔드는 파일당 5MB 제한과 PNG·JPEG·WebP의 파일 시그니처를 확인한 뒤 Docker의 `product-images` 볼륨에 저장합니다. 업로드가 끝나면 반환된 `/media/product-images/...` 상대 경로가 상품 이미지 목록에 추가됩니다. 상품 저장 시 기존 이미지 URL 필드를 사용합니다. 기존 `/storefront/...` 및 외부 HTTP(S) URL도 입력할 수 있습니다.

Cloudflare 배포는 프로젝트 루트에서 웹과 백엔드 이미지를 다시 빌드합니다.

```powershell
docker compose --env-file .env.docker.local -f compose.yaml -f compose.cloudflare.yaml up -d --build backend web
```

관리자로 접속해 상품에 PNG 또는 JPEG를 업로드하고, 미리보기에서 대표 이미지를 선택해 상품을 저장합니다. 새로고침한 뒤 편집 화면과 상품 상세에서 이미지가 표시되는지 확인합니다. 컨테이너를 재생성해도 업로드한 이미지는 볼륨에 남습니다. 배포 데이터를 백업할 때는 DB와 함께 `product-images` 볼륨도 백업합니다.
