import { useEffect, useMemo, useState } from "react";
import { getAuthNickname, isLoggedIn } from "../utils/auth";

function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function isToday(value) {
  const d = new Date(value);
  const now = new Date();
  if (Number.isNaN(d.getTime())) return false;

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getTodayComments(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => isToday(item.createdAt));
  } catch {
    return [];
  }
}

export default function AssetCommunity({ market, symbol, assetName }) {
  const storageKey = useMemo(
    () => `investome-community-${market}-${symbol}`,
    [market, symbol]
  );

  const loggedIn = useMemo(() => isLoggedIn(), []);
  const nickname = useMemo(() => getAuthNickname("사용자"), []);

  const [content, setContent] = useState("");
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const next = getTodayComments(storageKey);
    setComments(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  useEffect(() => {
    try {
      const todayOnly = comments.filter((item) => isToday(item.createdAt));
      localStorage.setItem(storageKey, JSON.stringify(todayOnly));
    } catch {
      // noop
    }
  }, [storageKey, comments]);

  function handleSubmit(e) {
    e.preventDefault();

    if (!loggedIn) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const next = {
      id: Date.now(),
      nickname,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [next, ...prev.filter((item) => isToday(item.createdAt))]);
    setContent("");
  }

  return (
    <div className="assetPanel">
      <div className="assetPanelHead">
        <div>
          <div className="assetPanelTitle">커뮤니티</div>
          <div className="assetPanelSub">{assetName} 의견 남기기</div>
        </div>
      </div>

      {loggedIn ? (
        <form className="communityForm" onSubmit={handleSubmit}>
          <input
            className="communityInput"
            type="text"
            value={nickname}
            disabled
            maxLength={20}
          />

          <textarea
            className="communityTextarea"
            placeholder={`${assetName}에 대한 의견을 남겨보세요`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
          />

          <button type="submit" className="btn primary communitySubmit">
            등록
          </button>
        </form>
      ) : (
        <div className="communityLoginNotice">
          로그인하면 {assetName} 커뮤니티에 글을 남길 수 있어요.
        </div>
      )}

      <div className="communityList communityListScrollable">
        {comments.length === 0 && (
          <div className="assetEmpty">오늘 등록된 글이 아직 없어요.</div>
        )}

        {comments.map((item) => (
          <div
            key={item.id}
            className="communityItem"
            data-initial={(item.nickname || "익명").trim().slice(0, 1)}
          >
            <div className="communityMeta">
              <span className="communityNick">{item.nickname}</span>
              <span className="communityDot">•</span>
              <span className="communityDate">{formatTime(item.createdAt)}</span>
            </div>
            <div className="communityContent">{item.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}