import { getAssetStaticMeta } from "../data/assetMeta";

export function resolveAssetMeta({
  market,
  symbol,
  rankingItem,
  watchItem,
  liveQuote,
  baseItem,
}) {
  const code = String(symbol || baseItem?.symbol || liveQuote?.symbol || "").toUpperCase();
  const staticMeta = getAssetStaticMeta(market, code);

  const name =
    staticMeta?.name ||
    rankingItem?.name ||
    watchItem?.name ||
    baseItem?.name ||
    liveQuote?.displayNameEN ||
    liveQuote?.name ||
    code;

  const displayNameEN =
    staticMeta?.displayNameEN ||
    rankingItem?.displayNameEN ||
    watchItem?.displayNameEN ||
    baseItem?.displayNameEN ||
    liveQuote?.displayNameEN ||
    liveQuote?.name ||
    name;

  const iconUrl =
    staticMeta?.iconUrl ||
    rankingItem?.iconUrl ||
    watchItem?.iconUrl ||
    baseItem?.iconUrl ||
    liveQuote?.iconUrl ||
    "";

  return {
    market,
    symbol: code,
    name,
    displayNameEN,
    iconUrl,
    coinId:
      liveQuote?.coinId ||
      rankingItem?.coinId ||
      watchItem?.coinId ||
      baseItem?.coinId ||
      "",
    capKRW: liveQuote?.capKRW ?? rankingItem?.capKRW ?? baseItem?.capKRW ?? null,
    priceKRW: liveQuote?.priceKRW ?? rankingItem?.priceKRW ?? baseItem?.priceKRW ?? null,
    changePct: liveQuote?.changePct ?? rankingItem?.changePct ?? baseItem?.changePct ?? null,
  };
}