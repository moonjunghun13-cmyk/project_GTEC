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
