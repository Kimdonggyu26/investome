import { useEffect, useMemo, useState } from "react";
import {
  createAssetComment,
  deleteAssetComment,
  fetchAssetComments,
} from "../api/assetCommunityApi";
import { getAuthNickname, getAuthUser, isLoggedIn } from "../utils/auth";

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

function commentInitial(nickname) {
  return String(nickname || "익명").trim().slice(0, 1) || "?";
}

export default function AssetCommunity({ market, symbol, assetName }) {
  const authUser = useMemo(() => getAuthUser(), []);
  const isAdmin = authUser?.role === "ADMIN";
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [nickname, setNickname] = useState(() => getAuthNickname("사용자"));
  const [content, setContent] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const requestKey = useMemo(
    () => ({
      market: String(market || "").trim().toUpperCase(),
      symbol: String(symbol || "").trim().toUpperCase(),
    }),
    [market, symbol]
  );

  useEffect(() => {
    function syncAuthState() {
      setLoggedIn(isLoggedIn());
      setNickname(getAuthNickname("사용자"));
    }

    syncAuthState();
    window.addEventListener("investome-auth-changed", syncAuthState);
    return () => window.removeEventListener("investome-auth-changed", syncAuthState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      try {
        setLoading(true);
        setError("");
        const next = await fetchAssetComments(requestKey);
        if (!cancelled) {
          setComments(Array.isArray(next) ? next : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "의견을 불러오지 못했어요.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadComments();
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    if (!loggedIn) {
      setSubmitError("로그인 후 의견을 남길 수 있어요.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    try {
      setSubmitting(true);
      const saved = await createAssetComment({
        ...requestKey,
        assetName,
        content: trimmed,
      });
      setComments((prev) => [saved, ...prev]);
      setContent("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "의견 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    const ok = window.confirm("이 의견을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteAssetComment({
        ...requestKey,
        commentId,
      });
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "의견 삭제에 실패했어요.");
    }
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
          <input className="communityInput" type="text" value={nickname} disabled maxLength={20} />

          <textarea
            className="communityTextarea"
            placeholder={`${assetName}에 대한 의견을 남겨보세요.`}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (submitError) setSubmitError("");
            }}
            maxLength={300}
          />

          {submitError ? <div className="communityError">{submitError}</div> : null}

          <button type="submit" className="btn primary communitySubmit" disabled={submitting}>
            {submitting ? "등록 중..." : "등록"}
          </button>
        </form>
      ) : (
        <div className="communityLoginNotice">로그인하면 {assetName} 커뮤니티에 의견을 남길 수 있어요.</div>
      )}

      <div className="communityList communityListScrollable">
        {loading ? (
          <div className="assetEmpty">의견을 불러오는 중이에요.</div>
        ) : error ? (
          <div className="communityError">{error}</div>
        ) : comments.length === 0 ? (
          <div className="assetEmpty">아직 등록된 의견이 없어요.</div>
        ) : (
          comments.map((item) => (
            <div key={item.id} className="communityItem" data-initial={commentInitial(item.authorNickname)}>
              <div className="communityMeta">
                <div className="communityMetaMain">
                  <span className="communityNick">{item.authorNickname}</span>
                  <span className="communityDot">·</span>
                  <span className="communityDate">{formatTime(item.createdAt)}</span>
                </div>
                {loggedIn && (item.mine || isAdmin) ? (
                  <button
                    type="button"
                    className="communityDeleteBtn"
                    onClick={() => handleDelete(item.id)}
                  >
                    삭제
                  </button>
                ) : null}
              </div>
              <div className="communityContent">{item.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
