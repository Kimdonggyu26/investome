import { apiUrl } from "../lib/apiClient";
import { clearAuth, getAuthHeaders } from "../utils/auth";

async function request(path, method = "GET", body) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 65000);
  try {
    const res = await fetch(apiUrl(`/api/paper${path}`), {
      method, headers: getAuthHeaders(), signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) {
        clearAuth();
        window.dispatchEvent(new Event("investome-auth-changed"));
      }
      const error = new Error(data?.message || `요청을 처리하지 못했습니다. (${res.status})`);
      error.status = res.status;
      throw error;
    }
    if (!data) throw new Error("응답을 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("서버 응답이 지연되고 있습니다.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getPaperAccount() {
  try { return await request("/account"); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
export const createPaperAccount = () => request("/account", "POST");
export const getPaperHoldings = () => request("/holdings");
export const getPaperOrders = () => request("/orders");
export const getPaperQuotes = () => request("/quotes");
export const placePaperOrder = ({ side, requestId, symbol, quantity }) => {
  if (!["buy", "sell"].includes(side)) throw new Error("주문 구분이 올바르지 않습니다.");
  return request(`/orders/${side}`, "POST", { requestId, symbol, quantity });
};
export const getPaperSymbols = () => request("/symbols");
export const getPaperQuote = (symbol) => request(`/quotes/${encodeURIComponent(symbol)}`);
export const getPaperChart = (symbol) => request(`/charts/${encodeURIComponent(symbol)}`);

export const startPaperRealtime = () => request("/realtime/start", "POST");
export const getPaperRealtime = () => request("/realtime");

// Fetch streaming preserves the Authorization header; JWTs never appear in URLs.
export async function consumePaperRealtime(signal, onFeed) {
  const response = await fetch(apiUrl("/api/paper/realtime/stream"), {
    headers: { ...getAuthHeaders(), Accept: "text/event-stream" }, signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      clearAuth(); window.dispatchEvent(new Event("investome-auth-changed"));
    }
    const error = new Error("실시간 연결을 확인해 주세요."); error.status = response.status; throw error;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
        if (data) onFeed(JSON.parse(data));
      }
      if (buffer.length > 1_000_000) throw new Error("실시간 응답이 너무 큽니다.");
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
