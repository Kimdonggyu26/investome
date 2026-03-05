export default function FilterBar() {
  return (
    <section style={{ padding: "10px 0 18px" }}>
      <div className="container">
        <div className="card" style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn">시가총액: 전체</button>
            <button className="btn">1T$+</button>
            <button className="btn">500B$+</button>
            <button className="btn">100B$+</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn">국가: 전체</button>
            <button className="btn">US</button>
            <button className="btn">KR</button>
            <button className="btn">JP</button>
          </div>
        </div>
      </div>
    </section>
  );
}