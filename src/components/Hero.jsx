// src/components/Hero.jsx
import MyPortfolio from "./MyPortfolio";
import FxRates from "./FxRates";
import RankingTable from "./RankingTable";
import NewsList from "./NewsList";

export default function Hero({ prices }) {
  return (
    <section style={{ padding: "14px 0 0px" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* ✅ 왼쪽 : MyPortfolio 바로 아래에 TOP30/뉴스를 붙임 */}
          <div style={{ display: "grid", gap: 12 }}>
            <MyPortfolio prices={prices} />
            <RankingTable />
            <NewsList />
          </div>

          {/* ✅ 오른쪽 : 로그인 + 환율 */}
          <div style={{ display: "grid", gap: 12 }}>
            <div
              className="card"
              style={{
                padding: 18,
                background:
                  "radial-gradient(120% 120% at 20% 0%, rgba(14,165,255,0.18), rgba(255,255,255,0.02))",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>로그인</div>

              <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                로그인 하여 나만의 투자 포트폴리오를 완성해보세요.
              </div>

              <input className="input" placeholder="이메일" />
              <input className="input" type="password" placeholder="비밀번호" />

              <button className="btn primary" style={{ justifyContent: "center" }}>
                로그인
              </button>
            </div>

            <FxRates />
          </div>
        </div>
      </div>
    </section>
  );
}