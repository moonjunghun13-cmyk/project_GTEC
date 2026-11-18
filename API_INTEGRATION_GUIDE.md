# GT 백엔드 연동 안내

현재 프론트는 Mock 서비스 대신 백엔드 API를 사용합니다. 기존 Mock 시연용 설명은 현재 실행 방식에 적용되지 않습니다.

실행 방법, API 연결 범위, 미지원 기능과 알려진 서버 제약은 [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)를 확인하세요.

주요 설정은 VITE_API_BASE_URL=/api이며 개발 서버가 localhost:8090으로 요청을 전달합니다. AI는 연결하지 않습니다.

상세 양방향 기능 차이와 변경 내역은 D:/GT의 DOCX 보고서에 정리했습니다.
