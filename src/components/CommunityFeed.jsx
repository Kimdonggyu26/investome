import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayPopularPosts } from "../utils/boardStorage";
import "../styles/CommunityFeed.css";

export default function CommunityFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const sync = () => setPosts(getTodayPopularPosts(5));

    sync();
    window.addEventListener("board-storage-updated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("board-storage-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <section className="communityFloatPanel">
      <div className="communityFloatHeader">
        <div>
          <div className="communityFloatEyebrow">TRENDING NOW</div>
          <h3 className="communityFloatTitle">실시간 인기 글</h3>
        </div>
        <span className="communityFloatLive">TODAY</span>
      </div>

      <div className="communityFloatList">
        {posts.length === 0 ? (
          <div className="communityFloatEmpty">
            오늘 작성된 게시글이 아직 없어.
          </div>
        ) : (
          posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className="communityFloatItem"
              onClick={() => navigate(`/board/${post.id}`)}
            >
              <div className="communityFloatItemTop">
                <span className="communityFloatTag">조회 {post.views}</span>
              </div>
              <div className="communityFloatItemTitle">{post.title}</div>
              <div className="communityFloatItemMeta">
                {post.author} · 추천 {post.likes} · 댓글 {post.commentCount || 0}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}