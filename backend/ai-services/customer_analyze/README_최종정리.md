# GTEC 고객 분석 — 실행용 정리본

이 폴더는 2026-11-18에 사용자가 올린 최신 `customer_analyze(1).zip`을 기준으로 정리했습니다.
**기존 모델의 학습 내용, 임계값 0.20, SQL 집계 로직 및 여섯 API의 응답 형식은 바꾸지 않았습니다.**

## 실행에 필요한 파일

- `main.py` — FastAPI 실행 시작점
- `app/controllers/customer_controller.py` — 여섯 API 경로
- `app/services/customer_service.py` — 통계·예측·수동/주간 재학습 검사
- `app/repositories/customer_repository.py` — DB 읽기 및 DB 연결 설정
- `customer_model_active.pkl` — **현재 사용 중인** 2개 입력 로지스틱 회귀 모델 (파일명만 변경, 내용 동일)
- `customer_model_settings.json` — 모델 입력 순서 및 임계값 `0.20` (활성 모델 파일명만 변경)
- `customer_weekly_refresh_last.json` — 마지막 주간 점검 결과; 이후 자동 갱신
- `setup_weekly_task.ps1` — Windows 예약 작업을 다시 등록할 때 사용
- `app/**/__init__.py` — Python 패키지 경로
- `requirements.txt` — 필요할 때 개발 환경을 구성하기 위한 의존성 목록

`inspect_customer_db.py`는 **그대로 삭제할 수 없던 파일**이었습니다. Repository가 그 안의 `get_db_url()`을 import하고 있었기 때문입니다. 그 함수만 Repository로 옮겨 기존 환경 변수/`.env` 탐색 순서를 동일하게 유지했습니다. 이제 실행 폴더에는 이 점검용 파일이 필요 없습니다.

## 기존 PC에서 정리본 적용하기

1. **FastAPI 서버를 종료**합니다. 혹시 주간 작업이 실행 중이라면 끝난 다음 진행합니다.
2. 기존 `D:\kim\deep\customer_analyze` 폴더를 별도로 **백업**합니다. (기존 폴더 삭제 전에 백업을 확실히 확인하세요.)
3. 이 정리본의 **내용물**을 동일한 `D:\kim\deep\customer_analyze` 경로에 넣습니다. ZIP을 통째로 그 경로의 하위 폴더로 풀지 마세요.
4. 기존 프로젝트 루트에 개인 `.env` 파일을 사용했다면, 백업 폴더의 `.env`만 직접 복원합니다. **`.env`는 ZIP에 포함되지 않았습니다.** 또는 기존 `D:\kim\deep\ai_chat_bot\.env`를 그대로 이용할 수 있습니다.
5. 기존 `(dl)` 가상환경과 PostgreSQL 연결을 유지하고 아래 명령을 실행합니다.

```bat
cd /d D:\kim\deep\customer_analyze
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

6. 브라우저에서 `http://127.0.0.1:8001/docs`에 접속해 다음 여섯 API를 하나씩 실행합니다.
   - GET `/api/ai/customers/summary`
   - GET `/api/ai/customers/repurchase-summary`
   - GET `/api/ai/customers/monthly-retention`
   - GET `/api/ai/customers/repurchase-predictions`
   - GET `/api/ai/customers/model-training-status`
   - POST `/api/ai/customers/model-refresh` (현재는 로컬 요청에서만 허용)

7. 서버를 종료한 후 다음 명령으로 예약 작업용 코드도 확인합니다.

```bat
python -m app.services.customer_service --weekly-refresh
```

8. Windows 작업 스케줄러에서 이미 등록한 작업 `GTEC_Customer_Weekly_Refresh`는 **프로젝트 폴더와 Python 경로를 이전과 동일하게 유지하면 재등록할 필요가 없습니다.** 다만 `Get-ScheduledTaskInfo -TaskName "GTEC_Customer_Weekly_Refresh"`로 실제 실행 결과를 다시 확인하세요. 경로를 옮겼다면 `setup_weekly_task.ps1`의 Python 경로를 수정한 뒤 작업을 다시 등록해야 합니다.

## 주의사항

- 모델의 합성 데이터 ROC-AUC는 약 0.83이며 **실제 고객 정확도 83%라는 뜻이 아닙니다.** 합성 데이터의 최종 테스트 정확도는 78.70%였습니다.
- 현재 API의 학습 모델은 여전히 합성 데이터로 학습했습니다. DB 재학습은 조건을 충족할 때만 **별도 후보**를 저장합니다. 자동으로 활성 모델로 교체하지 않습니다.
- 부분 환불 금액은 현재 매출 합계에서 차감하지 않습니다. 과거 주문 상태도 소급 복원하지 않습니다.
- 예측 API는 구매 이력이 있는 기존 고객만 포함합니다. 가입했지만 구매 기록이 없는 회원은 포함되지 않습니다.
- POST `/model-refresh`의 `localhost` 제한은 관리자 인증을 대신하지 않습니다. 외부 서비스 연동 전 인증/권한 검토가 필요합니다.
- Windows 예약 실행은 해당 PC/사용자 로그인 및 DB 접근에 의존합니다.
- PostgreSQL, Spring Boot, Vue 앱은 이 ZIP에 포함되지 않습니다.
- 활성 모델은 scikit-learn **1.6.1**로 저장됐습니다. 현재 작동 중인 `(dl)` 환경을 유지하고 임의로 업그레이드하지 마세요.
- 본 정리본은 로컬 DB가 연결되지 않은 환경에서 **문법, 모델 로딩, 모의 주문 API 테스트**를 수행했습니다. 실제 DB 연동 테스트는 사용자 PC에서 위 절차로 완료해야 합니다.

## 원본 대비 무엇을 정리했나

- `__pycache__`/`.pyc`: 재생성되는 캐시이므로 제외
- 단계별 Python 실험 7개 이상, 초기 CSV 분석/노트북: 런타임 미사용 → 별도 보관 ZIP
- `data/`의 합성 구매 CSV, `customer_svm_training*.csv`: 현재 API 및 DB 재학습에 미사용 → 별도 보관 ZIP
- 과거 `.pkl` 및 실험용 `.json`: 현재 로딩하지 않음 → 별도 보관 ZIP
- `inspect_customer_db.py`: 실제 import를 Repository 내부로 옮긴 다음 별도 보관 ZIP

**원본 파일은 삭제하지 않았습니다.** 함께 제공하는 별도 보관 ZIP과 원래 백업을 확인한 뒤, 이 정리본을 사용하는 것이 안전합니다.
