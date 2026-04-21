import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SEARCH_ASSETS } from "../data/searchAssets";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notificationApi";
import { getAuthUser, isLoggedIn, logoutAuth } from "../utils/auth";
import "../styles/Header.css";

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()\-_.]/g, "");
}

function splitTokens(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreAsset(asset, keyword) {
  const raw = String(keyword || "").trim().toLowerCase();
  const q = normalize(keyword);

  if (!q) return 0;

  const symbol = normalize(asset.symbol);
  const name = normalize(asset.name);
  const en = normalize(asset.displayNameEN);
  const aliases = (asset.aliases || []).map(normalize);

  let score = 0;

  if (symbol === q) score += 120;
  if (name === q) score += 115;
  if (en === q) score += 110;
  if (aliases.includes(q)) score += 105;

  if (symbol.startsWith(q)) score += 70;
  if (name.startsWith(q)) score += 66;
  if (en.startsWith(q)) score += 60;

  if (symbol.includes(q)) score += 38;
  if (name.includes(q)) score += 34;
  if (en.includes(q)) score += 30;

  aliases.forEach((alias) => {
    if (alias.startsWith(q)) score += 28;
    else if (alias.includes(q)) score += 18;
  });

  const tokenMatches = [
    asset.symbol,
    asset.name,
    asset.displayNameEN,
    ...(asset.aliases || []),
  ]
    .filter(Boolean)
    .flatMap((value) => splitTokens(value));

  tokenMatches.forEach((token) => {
    const n = normalize(token);
    if (!n) return;
    if (n === q) score += 44;
    else if (n.startsWith(q)) score += 24;
    else if (n.includes(q)) score += 14;
  });

  if (raw && String(asset.name || "").toLowerCase().includes(raw)) score += 18;
  if (raw && String(asset.displayNameEN || "").toLowerCase().includes(raw)) score += 14;

  return score;
}

function marketLabel(market) {
  if (market === "CRYPTO") return "CRYPTO";
  if (market === "KOSPI") return "KOSPI";
  return "NASDAQ";
}

function notificationTypeLabel(type) {
  switch (type) {
    case "post_comment":
      return "댓글";
    case "comment_reply":
      return "답글";
    case "watchlist_volatility":
      return "관심종목";
    case "popular_post":
      return "인기글";
    case "portfolio_threshold":
      return "목표";
    case "notice_post":
      return "공지";
    default:
      return "알림";
  }
}

function formatRelativeTime(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const wrapRef = useRef(null);
  const notificationRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [authUser, setAuthUser] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setAuthUser(isLoggedIn() ? getAuthUser() : null);
    };

    syncAuth();
    window.addEventListener("investome-auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("investome-auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
        setFocusIndex(-1);
      }
      if (!notificationRef.current?.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!authUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoadingNotifications(true);
      const data = await fetchNotifications();
      setNotifications(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      // keep previous notifications on transient failures
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (!authUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [authUser?.id]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    const deduped = new Map();

    SEARCH_ASSETS.forEach((asset) => {
      const score = scoreAsset(asset, query);
      if (score <= 0) return;

      const key = `${asset.market}-${asset.symbol}`;
      const prev = deduped.get(key);

      if (!prev || score > prev._score) {
        deduped.set(key, {
          ...asset,
          _score: score,
        });
      }
    });

    return [...deduped.values()]
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);
  }, [query]);

  useEffect(() => {
    setOpen(false);
    setFocusIndex(-1);
    setNotificationsOpen(false);
  }, [location.pathname]);

  function moveToAsset(asset) {
    setQuery("");
    setOpen(false);
    setFocusIndex(-1);
    navigate(`/asset/${asset.market}/${asset.symbol}`);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (results.length > 0) {
      const picked = results[focusIndex >= 0 ? focusIndex : 0];
      moveToAsset(picked);
    }
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((prev) => {
        const next = prev + 1;
        return next >= results.length ? 0 : next;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? results.length - 1 : next;
      });
    }

    if (e.key === "Escape") {
      setOpen(false);
      setFocusIndex(-1);
    }
  }

  async function handleLogout() {
    await logoutAuth();
    setAuthUser(null);
    setNotifications([]);
    setUnreadCount(0);
    navigate("/");
  }

  async function handleNotificationClick(item) {
    if (!item) return;

    try {
      if (!item.read) {
        const data = await markNotificationRead(item.id);
        setNotifications(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unreadCount) || 0);
      }
    } catch {
      // ignore
    } finally {
      setNotificationsOpen(false);
      if (item.link) {
        navigate(item.link);
      }
    }
  }

  async function handleReadAll() {
    try {
      const data = await markAllNotificationsRead();
      setNotifications(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      // ignore
    }
  }

  return (
    <header className="header">
      <div className="container headerInner">
        <Link to="/" className="brand">
          <div className="brandLogo">📈</div>
          <div className="brandText">
            <div className="brandTitle">Investome</div>
            <div className="brandSub">Market Intelligence</div>
          </div>
        </Link>

        <nav className="nav">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            홈
          </Link>
          <Link to="/news" className={location.pathname === "/news" ? "active" : ""}>
            실시간 뉴스
          </Link>
          <Link to="/mypage" className={location.pathname === "/mypage" ? "active" : ""}>
            마이페이지
          </Link>
          <Link to="/board" className={location.pathname === "/board" ? "active" : ""}>
            게시판
          </Link>
        </nav>

        <div className="headerSearchWrap" ref={wrapRef}>
          <form className="headerSearch" onSubmit={handleSubmit}>
            <span className="headerSearchIcon">⌕</span>

            <input
              type="text"
              value={query}
              placeholder="종목 검색 (예: BTC, 솔라나, 한화, 삼성전자, AAPL)"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setFocusIndex(-1);
              }}
              onFocus={() => {
                if (results.length > 0 || query.trim()) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
            />

            {query && (
              <button
                type="button"
                className="headerSearchClear"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  setFocusIndex(-1);
                }}
                aria-label="검색어 지우기"
              >
                ×
              </button>
            )}
          </form>

          {open && query.trim() && (
            <div className="searchDropdown">
              {results.length === 0 ? (
                <div className="searchEmpty">검색 결과가 없어요.</div>
              ) : (
                results.map((asset, index) => (
                  <button
                    key={`${asset.market}-${asset.symbol}`}
                    type="button"
                    className={`searchItem ${focusIndex === index ? "active" : ""}`}
                    onMouseEnter={() => setFocusIndex(index)}
                    onClick={() => moveToAsset(asset)}
                  >
                    <div className="searchItemMain">
                      <div className="searchItemName">{asset.name}</div>
                      <div className="searchItemMeta">
                        {asset.symbol}
                        {asset.displayNameEN ? ` · ${asset.displayNameEN}` : ""}
                      </div>
                    </div>

                    <div className={`searchItemBadge ${asset.market.toLowerCase()}`}>
                      {marketLabel(asset.market)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="themeToggleBtn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            <span className="themeToggleIcon" aria-hidden="true">
              {theme === "dark" ? "☀" : "☾"}
            </span>
            <span className="themeToggleLabel">{theme === "dark" ? "라이트" : "다크"}</span>
          </button>

          {authUser ? (
            <>
              <div className="notificationWrap" ref={notificationRef}>
                <button
                  type="button"
                  className={`notificationBtn ${notificationsOpen ? "active" : ""}`}
                  onClick={() => {
                    const next = !notificationsOpen;
                    setNotificationsOpen(next);
                    if (next) {
                      loadNotifications();
                    }
                  }}
                  aria-label="알림 보기"
                >
                  <span className="notificationBell">🔔</span>
                  {unreadCount > 0 ? (
                    <span className="notificationBadge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  ) : null}
                </button>

                {notificationsOpen && (
                  <div className="notificationDropdown">
                    <div className="notificationHead">
                      <div>
                        <strong>알림</strong>
                        <span>최근 활동을 한눈에 확인하세요</span>
                      </div>

                      <button
                        type="button"
                        className="notificationReadAllBtn"
                        onClick={handleReadAll}
                        disabled={unreadCount === 0}
                      >
                        모두 읽음
                      </button>
                    </div>

                    <div className="notificationList">
                      {loadingNotifications && notifications.length === 0 ? (
                        <div className="notificationEmpty">알림을 불러오는 중이에요.</div>
                      ) : notifications.length === 0 ? (
                        <div className="notificationEmpty">새로운 알림이 아직 없어요.</div>
                      ) : (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`notificationItem ${item.read ? "isRead" : "isUnread"}`}
                            onClick={() => handleNotificationClick(item)}
                          >
                            <div className="notificationItemTop">
                              <span className={`notificationType type-${item.type}`}>
                                {notificationTypeLabel(item.type)}
                              </span>
                              <time>{formatRelativeTime(item.createdAt)}</time>
                            </div>
                            <strong>{item.title}</strong>
                            <p>{item.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="authUserBox">
                <div className="authUserInfo">
                  <span className="authUserBadge">MY</span>
                  <span className="authUserName">{authUser.nickname || "사용자"}</span>
                </div>

                <button type="button" className="headerGhostBtn" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="loginBtn">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
