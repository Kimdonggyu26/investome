import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBoardPosts } from "../api/boardApi";
import "../styles/CommunityFeed.css";

function isToday(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CommunityFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadPopularPosts() {
      try {
        const allPosts = await fetchBoardPosts();

        const popularTodayPosts = allPosts
          .filter((post) => post.category !== "notice")
          .filter((post) => isToday(post.createdAt))
          .sort(
            (a, b) =>
              (b.views || 0) - (a.views || 0) ||
              (b.likes || 0) - (a.likes || 0) ||
              (b.commentCount || 0) - (a.commentCount || 0) ||
              (b.no || 0) - (a.no || 0)
          )
          .slice(0, 5);

        if (!mounted) return;
        setPosts(popularTodayPosts);
      } catch {
        if (!mounted) return;
        setPosts([]);
      }
    }

    loadPopularPosts();

    const handleRefresh = () => {
      loadPopularPosts();
    };

    window.addEventListener("focus", handleRefresh);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleRefresh);
    };
  }, []);

  return (
    <section className="communityFloatPanel">
      <div className="communityFloatHeader">
        <div>
          <div className="communityFloatEyebrow">TRENDING NOW</div>
          <h3 className="communityFloatTitle">Top Community Posts</h3>
        </div>
        <span className="communityFloatLive">TODAY</span>
      </div>

      <div className="communityFloatList">
        {posts.length === 0 ? (
          <div className="communityFloatEmpty">No popular community posts have been created today yet.</div>
        ) : (
          posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className="communityFloatItem"
              onClick={() => navigate(`/board/${post.id}`)}
            >
              <div className="communityFloatItemTop">
                <span className="communityFloatTag">Views {post.views ?? 0}</span>
              </div>
              <div className="communityFloatItemTitle">{post.title}</div>
              <div className="communityFloatItemMeta">
                {post.author} · Likes {post.likes ?? 0} · Comments {post.commentCount ?? 0}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
