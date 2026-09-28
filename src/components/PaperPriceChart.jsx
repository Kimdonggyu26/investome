import { useEffect, useState } from "react";
import { mergeLiveCandle } from "../utils/paperChart";
import { getPaperChart } from "../api/paperApi";

const number = value => Number(value).toLocaleString("ko-KR");
export default function PaperPriceChart({ symbol, name, refreshVersion, averagePrice, realtime, trade }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const [range, setRange] = useState(60);
  const [hover, setHover] = useState(null);
  const requestKey = `${symbol}-${refreshVersion}-${retry}`;
  const loading = state.key !== requestKey;
  useEffect(() => {
    let cancelled = false;
    getPaperChart(symbol).then(chart => { if (!cancelled) setState({ chart, key: requestKey }); })
      .catch(e => { if (!cancelled) setState({ error: e.message, key: requestKey }); });
    return () => { cancelled = true; };
  }, [symbol, requestKey]);
  const candles = mergeLiveCandle(state.chart?.candles || [], trade).slice(-range);
  const active = candles[Math.min(hover ?? candles.length - 1, candles.length - 1)];
  const average = Number(averagePrice);
  const hasAverage = averagePrice != null && Number.isFinite(average) && average > 0;
  const averageLabel = `${average.toLocaleString("ko-KR", { maximumFractionDigits: 4 })} 평단가`;
  const averageLabelWidth = Math.max(140, averageLabel.length * 8 + 16);
  const chartWidth = hasAverage ? 636 + averageLabelWidth : 720;
  const low = candles.length ? Math.min(...candles.map(c => c.low), ...(hasAverage ? [average] : [])) : 0;
  const high = candles.length ? Math.max(...candles.map(c => c.high), ...(hasAverage ? [average] : [])) : 1;
  const padding = Math.max((high - low) * .08, high * .001, 1);
  const min = low - padding, max = high + padding;
  const y = price => 24 + (max - price) / (max - min) * 250;
  const left = 12, plotWidth = 610, step = plotWidth / Math.max(candles.length, 1);
  const x = i => left + (i + .5) * step;
  const maxVolume = Math.max(1, ...candles.map(c => c.volume));
  const color = c => c.close >= c.open ? "#ef646e" : "#5094f3";
  function point(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * chartWidth;
    setHover(Math.max(0, Math.min(candles.length - 1, Math.floor((px - left) / step))));
  }
  return <section className="paperCard paperChart" aria-label={`${name} 일봉 차트`}>
    <div className="paperSectionHead"><div><span className="paperEyebrow">DAILY CHART</span><h2>{name}</h2><span className="paperMuted">{symbol} · KRX · 수정주가 일봉</span></div>
      <div className="paperChartRanges" aria-label="차트 표시 기간">{[20, 60, 100].map(days => <button type="button" key={days} aria-pressed={range === days} onClick={() => { setRange(days); setHover(null); }}>{days}봉</button>)}</div>
    </div>
    <div className="paperRealtime" role="status">
      {realtime?.state === "LIVE" && trade && realtime.now - Date.parse(trade.receivedAt) < 15000
        ? `● 실시간 · ${number(trade.price)}원 · ${trade.tradedAt.slice(11)}`
        : realtime?.stocks?.length && !realtime.stocks.some(stock => stock.symbol === symbol)
          ? "TOP30 밖 종목 · 조회 시세"
          : ["ERROR", "DISCONNECTED"].includes(realtime?.state) ? "실시간 연결 복구 중 · 최근 조회 시세"
          : trade ? "최근 수신 시세 · 새 체결 대기 중" : "실시간 체결 대기 중"}
    </div>
    {loading ? <div className="paperChartEmpty" role="status">일봉 차트를 불러오는 중…</div>
      : state.error ? <div className="paperChartEmpty" role="alert"><p>{state.error}</p><button onClick={() => setRetry(v => v + 1)}>차트 다시 불러오기</button></div>
      : !candles.length ? <div className="paperChartEmpty">표시할 일봉 데이터가 없습니다.</div>
      : <>
        <div className="paperCandleInfo"><strong>{active.date}</strong><span>시 {number(active.open)}</span><span>고 {number(active.high)}</span><span>저 {number(active.low)}</span><span>종 {number(active.close)}</span><span>거래량 {number(active.volume)}주</span></div>
        <svg className="paperCandleChart" viewBox={`0 0 ${chartWidth} 390`} role="img" aria-label={`${name} 최근 ${candles.length}거래일 가격과 거래량`} tabIndex="0"
          onPointerMove={point} onPointerLeave={() => setHover(null)} onKeyDown={e => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault(); setHover(Math.max(0, Math.min(candles.length - 1, (hover ?? candles.length - 1) + (e.key === "ArrowLeft" ? -1 : 1))));
            }
          }}>
          <title>{name} 일봉 캔들 및 거래량. 좌우 방향키로 날짜를 확인할 수 있습니다.</title>
          {[0, 1, 2, 3, 4].map(i => { const price = max - (max - min) * i / 4; return <g key={i}><line x1={left} x2="622" y1={y(price)} y2={y(price)} className="paperChartGrid" />{(!hasAverage || Math.abs(y(price) - y(average)) > 18) && <text x="636" y={y(price) + 4}>{number(Math.round(price))}</text>}</g>; })}
          <text x="12" y="306">거래량 (주)</text>
          {candles.map((c, i) => <g key={c.date}><title>{`${c.date} 시가 ${number(c.open)} 고가 ${number(c.high)} 저가 ${number(c.low)} 종가 ${number(c.close)} 거래량 ${number(c.volume)}`}</title>
            <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color(c)} />
            <rect x={x(i) - step * .32} y={Math.min(y(c.open), y(c.close))} width={Math.max(1, step * .64)} height={Math.max(1, Math.abs(y(c.open) - y(c.close)))} fill={color(c)} />
            <rect x={x(i) - step * .32} y={354 - c.volume / maxVolume * 40} width={Math.max(1, step * .64)} height={Math.max(.5, c.volume / maxVolume * 40)} fill={color(c)} opacity=".55" />
          </g>)}
          {hasAverage && <g className="paperAverageLine" aria-label={averageLabel}>
            <line x1={left} x2="622" y1={y(average)} y2={y(average)} />
            <rect x="628" y={y(average) - 11} width={averageLabelWidth} height="22" rx="5" />
            <text x="636" y={y(average) + 4}>{averageLabel}</text>
          </g>}
          {hover !== null && <line x1={x(Math.min(hover, candles.length - 1))} x2={x(Math.min(hover, candles.length - 1))} y1="18" y2="355" className="paperCrosshair" />}
          {[...new Set([0, Math.floor((candles.length - 1) / 2), candles.length - 1])].map(i => <text key={i} x={x(i)} y="378" textAnchor={i === 0 ? "start" : i === candles.length - 1 ? "end" : "middle"}>{candles[i].date.slice(5)}</text>)}
        </svg>
        <p className="paperMuted">빨강: 시가 대비 상승 · 파랑: 하락 · 당일 봉은 변할 수 있습니다.<br />조회 {new Date(state.chart.fetchedAt).toLocaleString("ko-KR")} · 최대 100봉 · 차트 조회 결과는 1분간 재사용합니다.</p>
      </>}
  </section>;
}
