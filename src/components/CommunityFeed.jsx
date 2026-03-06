const posts = [
  {
    id: 1,
    author: "익명",
    time: "12분 전",
    title: "오늘 비트코인 눌림목 어떻게 보시나요?",
    likes: 14,
    comments: 6,
  },
  {
    id: 2,
    author: "Donggyu",
    time: "1시간 전",
    title: "엔화 환율 다시 올라오는데 달러 매수 타이밍 고민됨",
    likes: 9,
    comments: 3,
  },
  {
    id: 3,
    author: "익명",
    time: "어제",
    title: "나스닥 기술주 오늘 밤 반등 가능성 있을까요?",
    likes: 22,
    comments: 11,
  },
];

export default function CommunityFeed() {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        borderRadius: 14,
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18 }}>커뮤니티 피드</div>
      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
        Community Highlights
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {posts.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="muted"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              <span>{p.author}</span>
              <span>{p.time}</span>
            </div>

            <div style={{ fontWeight: 800, lineHeight: 1.4 }}>{p.title}</div>

            <div
              className="muted"
              style={{
                display: "flex",
                gap: 14,
                marginTop: 10,
                fontSize: 12,
              }}
            >
              <span>좋아요 {p.likes}</span>
              <span>댓글 {p.comments}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}