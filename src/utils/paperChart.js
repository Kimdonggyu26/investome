// KIS ticks contain today's OHLC and cumulative volume, so a late subscription
// can build a complete daily candle without pretending its first tick is the open.
export function mergeLiveCandle(candles, trade) {
  if (!trade || !candles.length || ![trade.open, trade.high, trade.low, trade.price].every(v => v > 0)) return candles;
  const date = trade.tradedAt.slice(0, 10);
  const last = candles[candles.length - 1];
  if (date < last.date || (date === last.date && trade.accumulatedVolume < last.volume)) return candles;
  const next = { date, open: trade.open, high: Math.max(trade.high, trade.price),
    low: Math.min(trade.low, trade.price), close: trade.price, volume: trade.accumulatedVolume };
  return date === last.date ? [...candles.slice(0, -1), next] : [...candles, next].slice(-100);
}
