import { useEffect, useState } from "react";
import { getPaperRealtime, startPaperRealtime } from "../api/paperApi";

const labels = { DISCONNECTED: "연결 안 됨", CONNECTING: "한투 연결 중", SUBSCRIBING: "삼성전자 구독 요청 중", WAITING: "구독 완료 · 체결 수신 대기", LIVE: "체결 데이터 수신", ERROR: "연결 오류 · 다시 연결해 주세요" };
export default function PaperRealtimeQuote() {
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false, timer;
    async function poll() {
      if (!document.hidden) {
        try { const next = await getPaperRealtime(); if (!cancelled) { setSnapshot(next); setError(""); } }
        catch { if (!cancelled) setError("서버 연결을 확인해 주세요."); }
      }
      if (!cancelled) timer = window.setTimeout(poll, 2000);
    }
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [enabled]);
  async function connect() {
    if (busy) return;
    setBusy(true); setError("");
    try { setSnapshot(await startPaperRealtime()); setEnabled(true); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const trade = snapshot?.trade;
  const fresh = !error && snapshot?.state === "LIVE" && !snapshot?.stale;
  return <div className="paperRealtime">
    <div><span className={`paperLiveDot ${fresh ? "active" : ""}`} />
      <span role="status">{error || (snapshot?.state === "LIVE" && snapshot.stale ? "새 체결 대기 · 최근 수신 없음" : labels[snapshot?.state] || "삼성전자 실시간 연결")}</span>
      {trade && <strong className={fresh ? "" : "paperMuted"}>웹소켓 수신가 {trade.price.toLocaleString("ko-KR")}원</strong>}
    </div>
    {(!snapshot || ["DISCONNECTED", "ERROR"].includes(snapshot.state) || error) && <button type="button" onClick={connect} disabled={busy}>{busy ? "연결 중…" : "실시간 연결"}</button>}
    {trade && <small>거래시각 {trade.tradedAt.replace("T", " ")} · 누적거래량 {trade.accumulatedVolume.toLocaleString("ko-KR")}주</small>}
  </div>;
}
