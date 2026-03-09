import { useEffect, useMemo, useState } from "react";

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

export default function AssetCommunity({ market, symbol, assetName }) {
  const storageKey = useMemo(
    () => `investome-community-${market}-${symbol}`,
    [market, symbol]
  );

  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [comments, setComments] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setComments(saved ? JSON.parse(saved) : []);
    } catch {
      setComments([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(comments));
    } catch {
      // noop
    }
  }, [storageKey, comments]);

  function handleSubmit(e) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed) return;

    const next = {
      id: Date.now(),
      nickname: nickname.trim() || "익명",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [next, ...prev]);
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

      <form className="communityForm" onSubmit={handleSubmit}>
        <input
          className="communityInput"
          type="text"
          placeholder="닉네임 (선택)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
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

      <div className="communityList">
        {comments.length === 0 && (
          <div className="assetEmpty">첫 댓글을 남겨보세요.</div>
        )}

        {comments.map((item) => (
          <div key={item.id} className="communityItem">
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