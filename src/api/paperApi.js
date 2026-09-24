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
