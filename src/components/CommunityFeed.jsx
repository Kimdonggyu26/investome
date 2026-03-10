import "../styles/CommunityFeed.css";

const posts = [
  {
    category: "실시간",
    title: "비트코인 11만 달러 부근 공방",
    meta: "방금 전 · 조회 128",
  },
  {
    category: "인기",
    title: "엔비디아 조정, 지금 분할매수 괜찮을까?",
    meta: "12분 전 · 댓글 18",
  },
  {
    category: "토론",
    title: "한화에어로스페이스 눌림목 보는 사람?",
    meta: "25분 전 · 댓글 9",
  },
  {
    category: "관심",
    title: "솔라나 다시 강세 전환 가능성",
    meta: "39분 전 · 조회 302",
  },
  {
    category: "요약",
    title: "오늘 시장에서 가장 많이 언급된 종목",
    meta: "1시간 전 · 조회 421",
  },
];

export default function CommunityFeed() {
  return (
    <section className="communityFloatPanel">
      <div className="communityFloatHeader">
        <div>
          <div className="communityFloatEyebrow">COMMUNITY</div>
          <h3 className="communityFloatTitle">커뮤니티 피드</h3>
        </div>
        <span className="communityFloatLive">LIVE</span>
      </div>

      <div className="communityFloatList">
        {posts.map((post, index) => (
          <button key={index} type="button" className="communityFloatItem">
            <div className="communityFloatItemTop">
              <span className="communityFloatTag">{post.category}</span>
            </div>
            <div className="communityFloatItemTitle">{post.title}</div>
            <div className="communityFloatItemMeta">{post.meta}</div>
          </button>
        ))}
      </div>
    </section>
  );
}