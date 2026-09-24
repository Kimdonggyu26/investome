# Investome 모의투자 학습 가이드

## 구현 범위

Java 17 / Spring Boot 기반 모의 매수·매도 API입니다. 한국투자증권 현재가 조회 API만 호출하며 실제 주문은 전송하지 않습니다.
서버에 포함된 코스피·코스닥 종목 목록의 KRX 조회 현재가로 전량 모의 체결합니다. 웹소켓 실시간 스트리밍이나 실제 시장가의 호가별 체결을 재현하지 않습니다.
수수료·세금·장 운영시간·결제일·부분체결은 반영하지 않고 즉시 전량 체결합니다.
매도와 React 모의투자 화면(/paper)을 포함합니다. 헤더의 모의투자 메뉴에서 접근합니다.

## API

모든 주소는 검증된 JWT의 사용자 ID를 사용하며 Authorization: Bearer <token>이 필요합니다.

| 메서드 | 주소 | 역할 |
|---|---|---|
| POST | /api/paper/account | 없으면 가상 현금 1,000만 원으로 계좌 생성, 있으면 유지 |
| GET | /api/paper/account | 현재 계좌·현금 조회 |
| GET | /api/paper/quotes | 현재가·출처·서버 조회 시각 목록 |
| POST | /api/paper/orders/buy | 모의 매수 |
| POST | /api/paper/orders/sell | 모의 매도 |
| GET | /api/paper/holdings | 내 보유 종목 |
| GET | /api/paper/orders | 내 최근 성공 주문 최대 100개 |

매수 요청:

```json
{"requestId":"buy-001","symbol":"005930","quantity":3}
```

requestId는 새 주문마다 새 값(UUID 등)을 만들고, 통신 오류로 동일 주문을 재시도할 때 유지합니다.
종목은 지원 목록 중 선택하며 수량은 JSON 정수 1~1,000,000입니다. 금액과 사용자 ID는 보내지 않습니다.
같은 계좌·요청 ID에 매수·매도 방향/종목/수량까지 같으면 원래 결과를 반환합니다. 내용이 다르면 409입니다.
다른 계좌는 같은 요청 ID를 사용할 수 있습니다.
재시도 응답의 cashBalanceAfter는 해당 거래 직후의 기록입니다. 현재 잔액은 GET /account로 확인합니다.
실패한 요청은 주문 기록을 남기지 않으므로 같은 ID로 다시 시도하면 재검증합니다.
정상 응답 200, 입력·잔액 오류 400, 인증 오류 401, 계좌 없음 404, 요청 ID 내용 충돌 409, 시세 조회 실패 503입니다.

## 리뷰 순서

1. BuyOrderRequest: 요청 필드, Bean Validation, 정수가 아닌 수량 차단.
2. PaperTradingController: 인증 사용자와 요청을 Service로 전달.
3. PaperTradingService.buy/sell: 기존 주문 조회 → 외부 시세 조회 → TransactionTemplate의 쓰기 트랜잭션.
4. PaperAccountRepository.findByUserIdForUpdate: 계좌 행의 비관적 쓰기 잠금.
5. PaperOrderRepository: 동일 계좌·요청 ID 처리 이력 확인.
6. PaperQuoteProvider: StockMarketService의 KIS 현재가 조회, 오류 시 체결 차단.
7. PaperAccount.debit: 현금 차감 및 잔액 검증.
8. PaperHolding: 신규 보유 저장 또는 buyMore로 수량·평균 단가 변경.
9. PaperOrder: 변경 불가능한 체결 기록 및 계좌·요청 ID 복합 UNIQUE.
10. PaperOrderResponse: 클라이언트에 전달하는 체결 결과.

기존 체결이 있으면 시세 조회 없이 저장된 결과를 반환합니다. 새 주문은 DB 잠금 밖에서 현재가를 조회합니다.
이후 계좌 잠금 → 중복 재확인 → 조회 후 10초 경과 여부 검사 → 현금·보유 변경 → 주문 저장을 한 트랜잭션으로 처리합니다.
이 10초는 서버가 시세를 받은 뒤 경과한 시간이며 거래소의 마지막 체결 시각을 의미하지 않습니다. 장외에는 마지막 시세로 연습합니다.
주문에는 KIS_KRX 출처와 quoteFetchedAt을 저장하며 기존 고정가 기록은 출처를 그대로 유지합니다.
평균 단가는 소수 4자리 반올림으로 저장하므로 장기간 반복 매수의 원가 정밀도 개선은 별도 과제입니다.

## 직접 실행할 테스트

STS에서 프로젝트 새로고침(F5) 후 src/test/java/com.investome.api.paper의 테스트를 Run As → JUnit Test로 실행합니다.
CLI는 backend 폴더에서:

```powershell
.\mvnw.cmd '-Dtest=PaperTradingTests,PaperAccountApiTests,PaperHoldingTests' test
```

H2 메모리 DB와 테스트용 JWT 키를 명시한 테스트이며 실제 서비스 DB를 사용하지 않습니다.
33개 테스트 통과: 계좌 API 4개, 보유 계산 6개, 매수·매도 통합 21개, 시세·차트 단위 테스트 2개.
통합 테스트는 KIS 응답을 대체해 가격 변동, 외부 호출 시 트랜잭션 부재, 조회 실패 시 자산 불변, 장애 중 완료 주문 재시도를 검증합니다.

먼저 볼 테스트:
- buyAndReadViaAuthenticatedApi: HTTP 요청부터 인증 필터·DB 반영·조회까지.
- additionalBuysUpdateOneHoldingAndRetryReturnsOriginalSnapshot: 재시도와 추가 매수의 차이.
- orderInsertFailureRollsBackCashAndNewHolding: DB 제약조건으로 주문 저장을 실패시켜 롤백 검증.
- simultaneousDuplicateOrdersExecuteOnce: 같은 요청을 두 스레드에서 시작해 한 번만 체결 확인.
- simultaneousDifferentOrdersCannotOverspend: 현금 10만 원에 7만 원 주문 두 건, 한 건만 성공.

동시 시작 테스트가 모든 가능한 스케줄을 검증하는 것은 아닙니다. 실제 PostgreSQL의 잠금·제약조건 동작과
배포 환경의 타임아웃은 별도 검증이 필요합니다. 이번 작업에서 실제 DB 마이그레이션이나 배포는 하지 않았습니다.
현재 application.yml의 ddl-auto=update는 일반 서버 시작 시 연결된 DB 스키마를 변경할 수 있으므로,
수동 서버 실행 전에 개발용 DB 연결을 확인하세요. 기존 DB에 UNIQUE/FK가 실제 반영됐는지도 확인해야 합니다.

## 리뷰 연습

1. 매수 3주 후 같은 requestId로 재요청할 때 현금이 다시 줄지 않는 분기를 찾기.
2. 계좌 잠금을 중복 검사보다 먼저 하는 이유를 코드로 설명하기.
3. saveAndFlush에서 오류가 나면 앞의 debit과 buyMore가 왜 롤백되는지 설명하기.
4. 테스트 DB에서 수량이나 잔액을 바꿔 기대 결과를 먼저 예측한 뒤 테스트하기.
## 화면 사용

프론트엔드의 /paper에서 로그인 → 무료 모의계좌 개설 → 종목·매수/매도·수량 선택 → 주문 순서입니다.
보유 종목, 현금, 조회 가격 기준 평가자산, 최근 체결 내역을 표시합니다.
새로고침은 시세와 잔고를 함께 갱신합니다. 주문할 때 가격을 다시 조회하므로 예상 금액과 체결 금액은 다를 수 있습니다.
시세 실패 시 주문과 평가금액 표시를 막고 현금·보유·거래내역 조회는 유지합니다. 매도 후 현금은 즉시 반영하는 학습용 규칙입니다.
전량 매도하면 보유 행을 제거하지만 주문 기록은 유지합니다.

프론트엔드 개발 프록시에 /api/paper → localhost:8080을 추가했습니다.
VITE_API_BASE_URL이 있으면 그 서버를 사용하므로 프론트·백엔드를 함께 배포해야 합니다.
기존 DB의 enum CHECK 제약조건이 BUY만 허용하는지 확인하고, 필요한 경우 검토한 마이그레이션으로 SELL을 허용하세요.
운영 DB를 수정하거나 서비스를 배포하지 않았습니다.

주문이 전송되기 전에 사용자별 sessionStorage에 요청 ID·내용을 저장합니다.
통신 오류가 나면 새 주문을 차단하고 같은 요청으로 재시도할 수 있습니다. 이 정보는 같은 탭의 새로고침 후에도 유지됩니다.
탭 종료 후까지의 복구는 지원하지 않습니다. 로그인 만료 시에도 저장된 주문은 유지하며 재로그인 후 확인합니다.
새 주문과 재시도는 다릅니다. 같은 주문 재시도 버튼은 미처리 주문을 실제 모의 체결할 수 있다는 문구를 표시합니다.

브라우저 검증: 실제 Chrome + 임시 H2 서버에서 로그인 전 화면, 개설, 매수, 매도, 체결 후 응답 유실,
새로고침 후 동일 요청 재시도 및 주문 수 확인을 통과했습니다. 1440px·390px 화면을 확인했습니다.
## 한투 설정과 현재가 미리보기

서버 환경변수 KIS_APP_KEY, KIS_APP_SECRET을 설정합니다. 키를 VITE_ 접두사로 노출하지 않습니다.
StockMarketService의 기존 토큰 캐시를 재사용하며, 순위 화면의 오래된 캐시를 체결 가격으로 사용하지 않습니다.
.env.local은 Spring이 자동으로 읽지 않습니다. 로컬 실행 시 해당 키 두 개를 서버 프로세스 환경변수로 주입해야 합니다.
API: /uapi/domestic-stock/v1/quotations/inquire-price, TR ID FHKST01010100, 시장 J(KRX).
공식 예제: https://github.com/koreainvestment/open-trading-api/blob/main/examples_llm/domestic_stock/inquire_price/inquire_price.py

현재가 미리보기는 프론트 5176, 백엔드 18081의 별도 H2 파일 DB(backend/.local/paper-preview)를 사용합니다.
backend/start-paper-preview.ps1로 서버를 실행합니다. ddl-auto=update를 사용해 재시작 후에도 테스트 계정과 거래내역을 유지합니다. .local은 Git에서 제외합니다. 기존 메모리 DB의 유실 데이터는 복구되지 않습니다. 운영 배포는 하지 않았습니다.
DB 변경은 nullable quote_fetched_at 컬럼 추가입니다. 운영 DB 반영은 별도 마이그레이션 검토가 필요합니다.

## 종목 검색·일봉 차트·계좌 탭

- 왼쪽: 선택 종목의 수정주가 일봉 캔들과 거래량. 20/60/100봉 전환, 마우스·터치·좌우 방향키로 OHLC 확인.
- 오른쪽: 종목명/코드 검색 및 매수·매도. 종목 변경 시 이전 종목 시세로 주문할 수 없도록 차단.
- 하단: 보유종목(기본)/거래내역 탭. 보유 종목명을 누르면 해당 차트와 주문 종목을 선택.
- GET /api/paper/symbols: 서버 카탈로그의 코스피·코스닥 2,756개 종목. 검색 결과는 화면에서 최대 30개 표시.
- GET /api/paper/quotes/{symbol}: 선택 종목 현재가. 주문 가격은 주문 시 별도 조회.
- GET /api/paper/charts/{symbol}: 일봉 OHLC와 거래량, 출처, 조회 시각. 최대 100개, 오름차순. 성공 응답만 60초 캐시.
- 차트는 KIS FHKST03010100, 시장 J, 수정주가(0)로 요청. 캔들 색은 종가와 시가를 비교하며 과거 매입단가는 조정하지 않음.
- 거래정지 등 OHLC가 0인 날짜는 그리지 않음. 상장 이력이 짧은 종목은 선택한 봉 수보다 적게 표시될 수 있음.
- 보유 종목 시세는 동시 요청을 3개로 제한하고, 전체 시장의 시세를 일괄 조회하지 않음.
- 차트 조회 실패는 잔고·주문 영역과 분리하며 재조회 버튼 표시. 시세 누락 시 평가금액을 0원으로 표시하지 않음.

종목 목록은 src/data/koreaStocks.json을 서버 리소스 paper-stocks.json으로 복사한 스냅샷입니다.
자동 상장/상폐 목록 갱신은 아직 없습니다. 목록 갱신 시 두 파일을 함께 갱신하세요.
KIS에서 유효한 현재가를 조회하지 못하는 종목은 거래할 수 없습니다.
브라우저에서 실제 NAVER 차트와 매수, 탭 전환, 데스크톱 좌우 배치, 모바일 가로 넘침 없음,
차트 장애 시 다른 종목 차트가 남지 않는 동작을 검증했습니다.
