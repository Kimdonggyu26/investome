import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AssetDetail from "./pages/AssetDetail";
import NewsPage from "./pages/NewsPage";
import MyPage from "./pages/MyPage";
import BoardPage from "./pages/BoardPage";
import AuthPage from "./pages/AuthPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/asset/:market/:symbol" element={<AssetDetail />} />
    </Routes>
  );
}