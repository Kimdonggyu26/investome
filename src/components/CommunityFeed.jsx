const posts = [
  { title: "오늘 나스닥 흐름 어떻게 봄?", meta: "익명 · 3분 전" },
  { title: "BTC 단기 지지선 공유", meta: "익명 · 22분 전" },
  { title: "KOSPI 박스권 맞나", meta: "익명 · 1시간 전" },
];

export default function CommunityFeed() {
  return (
    <section id="community" style={{ padding: "10px 0 42px" }}>
      <div className="container">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>커뮤니티 피드</h2>
            <button className="btn">글쓰기</button>
          </div>

          <hr className="hr" />

          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((p, i) => (
              <div
                key={i}
                className="card"
                style={{ padding: 14, background: "rgba(255,255,255,.02)" }}
              >
                <div style={{ fontWeight: 800 }}>{p.title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{p.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}