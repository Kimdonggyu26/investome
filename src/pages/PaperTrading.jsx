import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { getAuthUser, isLoggedIn } from "../utils/auth";
import { createPaperAccount, getPaperAccount, getPaperHoldings, getPaperOrders, getPaperQuote, getPaperSymbols, placePaperOrder } from "../api/paperApi";
import PaperPriceChart from "../components/PaperPriceChart";
import "../styles/PaperTrading.css";

const money = (value) => `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}원`;
const storageKey = (userId) => `investome-paper-pending-${userId}`;
function readPending(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId)) || "null");
    return saved && ["buy", "sell"].includes(saved.side) && typeof saved.requestId === "string"
      && typeof saved.symbol === "string" && Number.isInteger(saved.quantity) && saved.quantity > 0 ? saved : null;
  } catch { return null; }
}

export default function PaperTrading() {
  const [user, setUser] = useState(() => isLoggedIn() ? getAuthUser() : null);
  useEffect(() => {
    const sync = () => setUser(isLoggedIn() ? getAuthUser() : null);
    window.addEventListener("investome-auth-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("investome-auth-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return <><Header /><main className="paperPage container">
    <div className="paperHero"><div><span className="paperEyebrow">INVESTOME PAPER TRADING</span>
      <h1>투자 연습, 부담 없이.</h1><p>가상 자금 1,000만 원으로 주문부터 자산 관리까지 경험해 보세요.</p></div>
      <span className="paperBadge">연습 모드</span></div>
    <div className="paperNotice">실제 돈과 거래되지 않습니다. <strong>한투 API에서 조회한 KRX 현재가</strong>로 전량 모의 체결합니다. 실제 시장가의 호가·부분 체결·수수료·세금은 반영하지 않습니다. 장외 시간에는 마지막 시세로 연습할 수 있습니다.</div>
    {user ? <TradingDesk key={user.id} userId={user.id} /> : <section className="paperCard paperEmpty">
      <h2>나만의 모의계좌를 시작하세요</h2><p>로그인하면 가상 현금으로 매수·매도를 연습하고 거래 내역을 확인할 수 있습니다.</p>
      <Link className="paperPrimary" to="/login">로그인하기</Link></section>}
  </main></>;
}

function TradingDesk({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(() => readPending(userId));
  const [side, setSide] = useState("buy");
  const [symbol, setSymbol] = useState("005930");
  const [tab, setTab] = useState("holdings");
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [listMarket, setListMarket] = useState("KOSPI");
  const [stockError, setStockError] = useState("");
  const [quoteState, setQuoteState] = useState({});
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const inFlight = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true);
    try {
      const account = await getPaperAccount();
      const [holdings, orders] = account ? await Promise.all([getPaperHoldings(), getPaperOrders()]) : [[], []];
      const quotes = [];
      // Bound concurrency rather than requesting all domestic stocks (or all holdings) at once.
      for (let i = 0; i < holdings.length; i += 3) {
        if (!alive.current || run !== generation.current) return;
        const batch = await Promise.all(holdings.slice(i, i + 3).map(h => getPaperQuote(h.symbol).catch(() => null)));
        quotes.push(...batch.filter(Boolean));
      }
      if (alive.current && run === generation.current) setData({ account, quotes, holdings, orders,
        quoteError: quotes.length < holdings.length ? "일부 보유 종목의 시세를 조회하지 못했습니다." : "" });
    } finally {
      if (alive.current && run === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(e => { if (alive.current) setError(e.message); });
  }, [refresh]);

  async function loadStocks() {
    setStockError("");
    try { const list = await getPaperSymbols(); if (alive.current) setStocks(list); }
    catch (e) { if (alive.current) setStockError(e.message); }
  }
  useEffect(() => { loadStocks(); }, []);
  const accountId = data?.account?.accountId;
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setQuoteState({ symbol, loading: true });
    getPaperQuote(symbol).then(quote => {
      if (!cancelled) setQuoteState({ symbol, quote });
    }).catch(e => { if (!cancelled) setQuoteState({ symbol, error: e.message }); });
    return () => { cancelled = true; };
  }, [symbol, quoteVersion, accountId]);
  const selectedStock = stocks.find(stock => stock.symbol === symbol);
  const stockName = code => stocks.find(stock => stock.symbol === code)?.name || code;
  const matches = search.trim() ? stocks.filter(stock => `${stock.name} ${stock.symbol}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 30) : [];
  function selectStock(code) { setSymbol(code); setSearch(""); setSearchOpen(false); setQuantity("1"); }

  async function reload() {
    setError("");
    setQuoteVersion(v => v + 1);
    try { await refresh(); } catch (e) { if (alive.current) setError(e.message); }
  }
  async function openAccount() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await createPaperAccount(); await refresh(); }
    catch (e) { if (alive.current) setError(e.message); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }

  async function submitOrder(event) {
    event?.preventDefault();
    if (inFlight.current) return;
    const amount = Number(quantity);
    if (!pending && (!Number.isInteger(amount) || amount < 1 || amount > 1000000)) {
      setError("수량은 1~1,000,000 사이의 정수로 입력해 주세요."); return;
    }
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    let order;
    try {
      order = pending || { requestId: crypto.randomUUID(), side, symbol, quantity: amount };
      // Persist BEFORE sending: reload/retry must keep the same logical order ID.
      sessionStorage.setItem(storageKey(userId), JSON.stringify(order));
      setPending(order);
    } catch {
      setError("주문 복구 정보를 저장할 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.");
      inFlight.current = false; setBusy(false); return;
    }
    try {
      const result = await placePaperOrder(order);
      sessionStorage.removeItem(storageKey(userId));
      if (!alive.current) return;
      setPending(null);
      setQuoteVersion(v => v + 1);
      setNotice(`${result.side === "BUY" ? "매수" : "매도"} 완료 · ${result.quantity}주 · 체결가 ${money(result.price)} · 총 ${money(result.totalAmount)} · 주문 #${result.orderId}`);
      try { await refresh(); }
      catch { if (alive.current) setError("주문은 완료됐지만 잔고를 갱신하지 못했습니다. 새로고침해 주세요."); }
    } catch (e) {
      // Only definite validation/not-found failures can release the logical request.
      if ([400, 404].includes(e.status)) {
        sessionStorage.removeItem(storageKey(userId));
        if (alive.current) setPending(null);
      }
      if (alive.current) setError(e.message);
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const quote = quoteState.symbol === symbol ? quoteState.quote : null;
  const owned = data?.holdings.find(h => h.symbol === symbol)?.quantity || 0;
  const count = Number(quantity);
  const total = (quote?.price || 0) * count;
  const max = side === "buy" ? Math.min(1000000, Math.floor((data?.account?.cashBalance || 0) / (quote?.price || 1))) : owned;
  const valid = !!quote && Number.isInteger(count) && count > 0 && count <= max && count <= 1000000;
  const hasQuotes = data?.holdings.every(h => data.quotes.some(q => q.symbol === h.symbol));
  const valuation = data?.holdings.reduce((sum, h) => sum + h.quantity * (data.quotes.find(q => q.symbol === h.symbol)?.price || 0), 0) || 0;
  const totalAssets = (data?.account?.cashBalance || 0) + valuation;
  const totalReturn = (totalAssets - 10000000) / 10000000 * 100;
  const marketStocks = stocks.filter(stock => stock.market === listMarket);
  const cost = data?.holdings.reduce((sum, h) => sum + h.quantity * Number(h.averagePrice), 0) || 0;
  return <>
    {error && <div className="paperAlert" role="alert">{error} <button onClick={reload} disabled={busy || loading}>잔고 새로고침</button></div>}
    {data?.quoteError && <div className="paperAlert" role="alert">{data.quoteError} 잔고와 거래내역은 조회할 수 있습니다.</div>}
    {notice && <div className="paperSuccess" role="status">{notice}</div>}
    {pending && <div className="paperAlert" role="status">
      <strong>이전 주문 결과 확인이 필요합니다.</strong>
      <p>{pending.symbol} · {pending.side === "buy" ? "매수" : "매도"} {pending.quantity}주 — 같은 요청으로 확인하여 중복 거래를 방지합니다. 아직 처리되지 않았다면 이 주문을 실행합니다.</p>
      <button onClick={submitOrder} disabled={busy}>{busy ? "처리 중…" : "같은 주문 재시도"}</button>
    </div>}
    {!data ? <section className="paperCard paperEmpty" aria-live="polite">{loading ? "모의계좌를 불러오는 중…" : "계좌 정보를 불러오지 못했습니다."}</section>
    : !data.account ? <section className="paperCard paperEmpty"><span className="paperEyebrow">YOUR FIRST STEP</span><h2>1,000만 원으로 시작하는 첫 투자</h2>
      <p>계좌는 한 번만 개설되며, 가상 자금은 처음에만 지급됩니다.</p><button className="paperPrimary" onClick={openAccount} disabled={busy || loading}>{busy ? "개설 중…" : "무료 모의계좌 개설"}</button></section>
    : <>
      <div className="paperSummary">
        <section className="paperCard"><span>총 평가자산</span><div className="paperAssetValue"><strong>{hasQuotes ? money(totalAssets) : "시세 확인 필요"}</strong>{hasQuotes && <b className={`paperReturn ${totalReturn > 0 ? "positive" : totalReturn < 0 ? "negative" : "neutral"}`} aria-label="초기 자금 대비 수익률">{totalReturn > 0 ? "+" : ""}{totalReturn.toFixed(2)}%</b>}</div><small>초기 자금 1,000만 원 대비</small></section>
        <section className="paperCard"><span>주문 가능 현금</span><strong>{money(data.account.cashBalance)}</strong><small>계좌 #{data.account.accountId}</small></section>
        <section className="paperCard"><span>보유자산 평가금액</span><strong>{hasQuotes ? money(valuation) : "시세 확인 필요"}</strong><small>평가손익 {hasQuotes ? money(valuation - cost) : "—"} · {data.holdings.length}개 종목</small></section>
      </div>
      <div className="paperGrid">
        <PaperPriceChart key={symbol} symbol={symbol} name={selectedStock?.name || symbol} refreshVersion={quoteVersion} />
        <section className="paperCard paperOrder"><h2>주문하기</h2><p className="paperMuted">시장가 모의 주문 · 조회 현재가로 전량 체결</p>
          <form onSubmit={submitOrder}>
            <fieldset disabled={busy || loading || !!pending}>
              <div className="paperSides"><button type="button" aria-pressed={side === "buy"} className={side === "buy" ? "selected" : ""} onClick={() => setSide("buy")}>매수</button><button type="button" aria-pressed={side === "sell"} className={side === "sell" ? "selected sell" : ""} onClick={() => setSide("sell")}>매도</button></div>
              <label htmlFor="paper-search">종목 검색</label>
              <div className="paperSearchBox" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setSearchOpen(false); }}>
              <input id="paper-search" type="search" autoComplete="off" placeholder="종목명 또는 종목코드" value={search} onFocus={() => setSearchOpen(true)} onKeyDown={e => { if (e.key === "Escape") setSearchOpen(false); }} onChange={e => { setSearch(e.target.value); setSearchOpen(true); }} />
              {stockError && <p role="alert">{stockError} <button type="button" onClick={loadStocks}>목록 다시 불러오기</button></p>}
              {searchOpen && search.trim() && <div className="paperSearchResults" aria-label="종목 검색 결과">
                {matches.length ? matches.map(stock => <button key={stock.symbol} type="button" onClick={() => selectStock(stock.symbol)}><strong>{stock.name}</strong><small>{stock.symbol} · {stock.market}</small></button>) : <p>{stocks.length ? "검색 결과가 없습니다." : "종목 목록을 불러오는 중…"}</p>}
              </div>}
              </div>
              <div className="paperSelected"><strong>{selectedStock?.name || symbol}</strong><small>{symbol} · {selectedStock?.market || "국내주식"}</small></div>
              {quoteState.error && <p className="paperMuted" role="alert">{quoteState.error} <button type="button" onClick={() => setQuoteVersion(v => v + 1)}>시세 재조회</button></p>}
              <div className="paperQuote"><span>조회 현재가</span><strong>{quote ? money(quote.price) : quoteState.loading ? "조회 중…" : "조회 불가"}</strong></div>
              <p className="paperMuted">{quote ? `조회 시각 ${new Date(quote.fetchedAt).toLocaleString("ko-KR")}` : "시세를 새로고침해 주세요."}</p>
              <label htmlFor="paper-quantity">주문 수량</label><div className="paperQuantity"><input id="paper-quantity" type="number" min="1" max="1000000" step="1" required value={quantity} onChange={e => setQuantity(e.target.value)} /><button type="button" onClick={() => setQuantity(String(max))} disabled={max < 1}>최대</button></div>
              <small className="paperMuted">보유 {owned.toLocaleString()}주 · {side === "buy" ? "매수" : "매도"} 가능 {max.toLocaleString()}주</small>
              <div className="paperQuote paperTotal"><span>예상 {side === "buy" ? "매수" : "매도"} 금액</span><strong>{quote && Number.isFinite(total) && total >= 0 ? money(total) : "—"}</strong></div>
              {!valid && <p className="paperMuted">{side === "sell" && !owned ? "이 종목을 보유하고 있지 않습니다." : "주문 가능한 수량을 입력해 주세요."}</p>}
              <button className={`paperPrimary ${side === "sell" ? "sell" : ""}`} disabled={!valid} type="submit">{busy ? "처리 중…" : `${side === "buy" ? "매수" : "매도"} 주문`}</button>
            </fieldset>
          </form>
        </section>
        <aside className="paperCard paperMarketList" aria-label="시장 종목 목록">
          <h2>시장 종목</h2>
          <label htmlFor="paper-market" className="paperMuted">시장 선택</label>
          <select id="paper-market" value={listMarket} onChange={e => setListMarket(e.target.value)}><option value="KOSPI">코스피</option><option value="KOSDAQ">코스닥</option></select>
          <p className="paperMuted">{marketStocks.length.toLocaleString()}개 종목</p>
          <div className="paperMarketScroll">{marketStocks.map(stock => <button type="button" key={stock.symbol} aria-pressed={symbol === stock.symbol} disabled={busy || !!pending} onClick={() => selectStock(stock.symbol)}><strong>{stock.name}</strong><small>{stock.symbol}</small></button>)}</div>
          {!stocks.length && <p className="paperMuted">{stockError || "종목 목록을 불러오는 중…"}</p>}
        </aside>
      </div>
      <section className="paperCard paperHistory">
        <div className="paperSectionHead"><div className="paperTabs" role="tablist" aria-label="계좌 내역">
          {[['holdings', `보유종목 (${data.holdings.length})`], ['orders', '거래내역']].map(([id, label], index) =>
            <button key={id} id={`paper-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`paper-panel-${id}`} tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)} onKeyDown={e => {
                if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                  e.preventDefault(); const next = e.key === "Home" ? "holdings" : e.key === "End" ? "orders" : index === 0 ? "orders" : "holdings";
                  setTab(next); document.getElementById(`paper-tab-${next}`)?.focus();
                }
              }}>{label}</button>)}
        </div><button onClick={reload} disabled={loading || busy}>{loading ? "갱신 중…" : "새로고침"}</button></div>
        <div id="paper-panel-holdings" role="tabpanel" aria-labelledby="paper-tab-holdings" hidden={tab !== "holdings"}>
          {!data.holdings.length ? <div className="paperEmpty"><h3>아직 보유한 종목이 없어요</h3><p>첫 매수 주문을 넣으면 여기에 표시됩니다.</p></div> : <div className="paperTableWrap"><table><thead><tr><th>종목</th><th>보유 수량</th><th>평균 매입가</th><th>평가금액</th></tr></thead><tbody>{data.holdings.map(h => <tr key={h.symbol}><td><button className="paperStockLink" disabled={busy || !!pending} onClick={() => selectStock(h.symbol)}>{stockName(h.symbol)}</button><small>{h.symbol}</small></td><td>{h.quantity.toLocaleString()}주</td><td>{money(h.averagePrice)}</td><td>{hasQuotes ? money(h.quantity * (data.quotes.find(q => q.symbol === h.symbol)?.price || 0)) : "—"}</td></tr>)}</tbody></table></div>}
        </div>
        <div id="paper-panel-orders" role="tabpanel" aria-labelledby="paper-tab-orders" hidden={tab !== "orders"}>
          <p className="paperMuted">최근 체결 100건</p>
        {!data.orders.length ? <div className="paperEmpty">아직 체결된 주문이 없습니다.</div> : <div className="paperTableWrap"><table><thead><tr><th>체결 시각</th><th>구분</th><th>종목</th><th>수량</th><th>체결가</th><th>거래금액</th><th>상태</th></tr></thead><tbody>{data.orders.map(o => <tr key={o.orderId}><td>{new Date(o.executedAt).toLocaleString("ko-KR")}</td><td><span className={`paperTag ${o.side === "SELL" ? "sell" : ""}`}>{o.side === "BUY" ? "매수" : "매도"}</span></td><td>{stockName(o.symbol)}</td><td>{o.quantity}주</td><td>{money(o.price)}<small>{o.priceSource === "KIS_KRX" ? "KIS 조회 시세" : "고정 연습 가격"}</small></td><td>{money(o.totalAmount)}</td><td>체결 완료</td></tr>)}</tbody></table></div>}
        </div>
      </section>
    </>}
  </>;
}