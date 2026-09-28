import test from "node:test";
import assert from "node:assert/strict";
import { mergeLiveCandle } from "./paperChart.js";
const candles = [{date: "2026-09-28", open: 100, high: 120, low: 90, close: 110, volume: 200}];
const trade = {tradedAt: "2026-09-28T15:00:00", open: 100, high: 130, low: 85, price: 125, accumulatedVolume: 250};
test("updates today's entire OHLC and cumulative volume without mutating REST data", () => {
 const result = mergeLiveCandle(candles, trade);
 assert.deepEqual(result[0], {date: "2026-09-28", open: 100, high: 130, low: 85, close: 125, volume: 250});
 assert.equal(candles[0].close, 110);
});
test("older day or lower cumulative volume cannot overwrite the REST snapshot", () => {
 assert.equal(mergeLiveCandle(candles, {...trade, tradedAt:"2026-09-27T15:00:00"}), candles);
 assert.equal(mergeLiveCandle(candles, {...trade, accumulatedVolume:199}), candles);
});
test("new trading day appends using KIS daily open rather than first observed trade", () => {
 const result=mergeLiveCandle(candles,{...trade,tradedAt:"2026-09-29T10:00:00"});
 assert.equal(result.length,2); assert.equal(result[1].open,100); assert.equal(result[1].close,125);
});
test("missing OHLC does not fabricate a candle", () => {
 assert.equal(mergeLiveCandle(candles,{...trade,open:0}),candles);
});
