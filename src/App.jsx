import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AssetDetail from "./pages/AssetDetail";
import NewsPage from "./pages/NewsPage";
import MyPage from "./pages/MyPage";
import BoardPage from "./pages/BoardPage";
import BoardWritePage from "./pages/BoardWritePage";
import BoardDetailPage from "./pages/BoardDetailPage";
import AuthPage from "./pages/AuthPage";
import { initializeAuthSession } from "./utils/auth";

export default function App() {
  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      if (cancelled) return;
      const ok = await initializeAuthSession();
      if (!cancelled && !ok) {
        window.dispatchEvent(new Event("investome-auth-changed"));
      }
    }

    syncSession();
    const interval = window.setInterval(syncSession, 60 * 1000);
    window.addEventListener("focus", syncSession);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncSession);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/board/write" element={<BoardWritePage />} />
      <Route path="/board/:postId/edit" element={<BoardWritePage />} />
      <Route path="/board/:postId" element={<BoardDetailPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/asset/:market/:symbol" element={<AssetDetail />} />
    </Routes>
  );
}
