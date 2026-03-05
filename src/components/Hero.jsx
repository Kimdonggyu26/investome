export default function Hero() {
  return (
    <section style={{ padding: "42px 0 18px" }}>
      <div className="container">
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "stretch",
              justifyContent: "space-between",
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                Investome • Markets • Portfolio • News
              </div>

              <h1 style={{ margin: 0, fontSize: 34, letterSpacing: ".2px" }}>
                실시간 시장 데이터, 한눈에.
              </h1>

              <p className="muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
                오늘의 주요 지표와 헤드라인을 빠르게 확인하고,
                내 포트폴리오까지 한 화면에서 관리하세요.
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <a className="btn primary" href="#ranking">
                  TOP30 보기
                </a>
                <a className="btn" href="#news">
                  경제 뉴스 보기
                </a>
              </div>
            </div>

            {/* 로그인 카드(코인니스 느낌) */}
            <div
              className="card"
              style={{
                padding: 16,
                minWidth: 300,
                flex: "0 0 320px",
                background: "rgba(255,255,255,.02)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>
                로그인
              </div>

              <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                로그인 하여 나만의 투자 포트폴리오를 완성해보세요.
              </div>

              <button className="btn primary" style={{ justifyContent: "center" }} type="button">
                로그인 (추후 연결)
              </button>

              <button className="btn" style={{ justifyContent: "center" }} type="button">
                회원가입 (추후 연결)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}