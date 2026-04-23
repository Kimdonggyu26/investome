import { useEffect, useMemo, useState } from "react";
import { getAuthNickname, isLoggedIn } from "../utils/auth";

const COMMUNITY_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const COMMUNITY_LIMIT_COUNT = 5;
const COMMUNITY_COOLDOWN_MS = 30 * 1000;

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

function getRateLimitKey(storageKey, nickname) {
  return `${storageKey}-rate-limit-${String(nickname || "").trim().toLowerCase()}`;
}

function readRateLimitState(storageKey, nickname) {
  try {
    const saved = localStorage.getItem(getRateLimitKey(storageKey, nickname));
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    const cutoff = Date.now() - COMMUNITY_LIMIT_WINDOW_MS;
    return parsed.filter((timestamp) => Number.isFinite(timestamp) && timestamp >= cutoff);
  } catch {
    return [];
  }
}

function writeRateLimitState(storageKey, nickname, values) {
  try {
    localStorage.setItem(getRateLimitKey(storageKey, nickname), JSON.stringify(values));
  } catch {
    // noop
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
  const [submitError, setSubmitError] = useState("");

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

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    if (!loggedIn) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const now = Date.now();
    const recentAttempts = readRateLimitState(storageKey, nickname);
    const latestAttempt = recentAttempts.at(-1) || 0;

    if (now - latestAttempt < COMMUNITY_COOLDOWN_MS) {
      setSubmitError("의견은 30초 간격으로 남길 수 있어요.");
      return;
    }

    if (recentAttempts.length >= COMMUNITY_LIMIT_COUNT) {
      setSubmitError("의견 등록이 너무 많아요. 잠시 후 다시 시도해주세요.");
      return;
    }

    const next = {
      id: now,
      nickname,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    writeRateLimitState(storageKey, nickname, [...recentAttempts, now]);
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
            onChange={(event) => {
              setContent(event.target.value);
              if (submitError) setSubmitError("");
            }}
            maxLength={300}
          />

          {submitError ? <div className="communityError">{submitError}</div> : null}

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
