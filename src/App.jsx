import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AssetDetail from "./pages/AssetDetail";
import NewsPage from "./pages/NewsPage";
import MyPage from "./pages/MyPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/asset/:market/:symbol" element={<AssetDetail />} />
    </Routes>
  );
}