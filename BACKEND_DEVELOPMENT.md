# 백엔드 저장소 구분

- 프론트엔드 운영 소스: `Kimdonggyu26/investome`, Vercel.
- 백엔드 운영 소스: `Kimdonggyu26/investome-backend`, Render.
- 이 저장소의 `backend/`는 모의투자 초기 개발 사본이며 운영 백엔드 전체가 아니다. Render 소스를 이 폴더로 바꾸면 안 된다.
- 2026-10-01 모의투자를 기존 운영 백엔드에 통합한 커밋: `f1c6ae4` (investome-backend).
- 현재 PC의 운영 백엔드 작업 폴더: `C:/workspaces/investome/work/investome-backend`. 별도 Git 저장소이며 상위 저장소의 work/ 제외 규칙으로 프론트에 중복 업로드하지 않는다.
- 백엔드 수정은 위 별도 저장소에서 수행하고 `git remote -v`로 investome-backend 대상인지 확인한다.
- 다른 PC에서는 investome-backend 저장소를 별도로 clone한다. 이 저장소의 backend/ 변경만으로 Render에 반영되지 않는다.
- Render: Source=investome-backend, Branch=main, Root Directory=빈 값, Dockerfile=Dockerfile, Build Context=기존 값.

통합 테스트 46개: 모의투자, 기존 로그인/refresh 토큰 연동, 관심종목/알림 조회 포함.
로컬 H2 모의계좌/테스트 계정은 운영 PostgreSQL로 옮기지 않았다.
