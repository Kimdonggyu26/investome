import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AssetDetail from "./pages/AssetDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/asset/:market/:symbol" element={<AssetDetail />} />
    </Routes>
  );
}