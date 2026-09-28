# 노트북에서 이어서 작업하기 (Windows)

작업 브랜치: `codex/paper-trading-handoff`
필수: Git, Node.js 22.12 이상, JDK 17 (`java -version`으로 확인).

## 처음 가져오기

```powershell
git clone --branch codex/paper-trading-handoff https://github.com/Kimdonggyu26/investome.git
cd investome
npm ci
```

기존 clone이 있으면 작업 중인 변경을 먼저 커밋/보관한 후:

```powershell
git fetch origin
git switch codex/paper-trading-handoff
git pull --ff-only
npm ci
```

## 로컬 키 설정

프로젝트 루트에 `.env.local`을 만들고 한투 키를 로컬에서 입력하세요.
키는 현재 PC의 `.env.local`에서 개인적으로 옮기거나 발급받은 설정을 사용합니다.
키를 GitHub나 채팅에 올리지 마세요. `VITE_` 접두사로 한투 키를 만들지 않습니다.

```dotenv
KIS_APP_KEY=본인의_키
KIS_APP_SECRET=본인의_시크릿
```

## 실행 (터미널 두 개)

첫 번째 터미널, 프로젝트 루트에서:

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\start-paper-preview.ps1
```

두 번째 터미널:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-paper-frontend.ps1
```

화면: http://127.0.0.1:5176/paper
서버: http://localhost:18081

모의투자와 인증을 위한 로컬 실행 구성입니다. 다른 화면의 뉴스·시세는 별도 Vercel API 구성이 필요할 수 있습니다.
노트북은 별도 DB이므로 새 테스트 계정을 만들어 주세요. 이 PC의 계정과 거래내역은 GitHub에 포함하지 않습니다.
노트북에서 만든 계정은 `backend/.local`에 저장되어 재시작해도 유지됩니다.

## 현재 구현

- 가상 현금 1,000만 원, 매수·매도, 거래 기록, 중복 체결 방지와 트랜잭션 롤백.
- 일별 코스피 TOP30 검색·신규 매수, 순위 밖 보유종목 조회·매도 유지.
- 한투 웹소켓 30종목 구독 → Spring → 인증 SSE → 현재가·수익률·당일 캔들 갱신.
- 수정주가 20/60/100봉, 거래량, 가격축 평단가 표시, 보유종목/거래내역 탭.
- 지정가 대기·취소, 수수료·세금·장 운영시간 제한은 미구현.

## 검증

```powershell
npm run build
cd backend
.\mvnw.cmd '-Dtest=Paper*Tests' test
```

추가 설명은 `backend/PAPER_TRADING_GUIDE.md` 참고.
`tmp/paper-ui-tools`, `work`, API 키, 로컬 DB, 로그는 이번 업로드에 포함하지 않습니다.
