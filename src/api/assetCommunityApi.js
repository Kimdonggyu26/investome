import { apiUrl } from "../lib/apiClient";
import { getAuthHeaders } from "../utils/auth";

async function parseErrorMessage(res, fallbackMessage) {
  try {
    const data = await res.json();
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  } catch {
    // ignore
  }
  return fallbackMessage;
}

export async function fetchAssetComments({ market, symbol }) {
  const res = await fetch(
    apiUrl(`/api/assets/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}/comments`)
  );

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "의견을 불러오지 못했어요."));
  }

  return res.json();
}

export async function createAssetComment({ market, symbol, assetName, content }) {
  const res = await fetch(
    apiUrl(`/api/assets/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}/comments`),
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        assetName,
        content,
      }),
    }
  );

  if (!res.ok) {
    const fallbackMessage = res.status === 401
      ? "로그인 후 의견을 남길 수 있어요."
      : "의견 등록에 실패했어요.";
    throw new Error(await parseErrorMessage(res, fallbackMessage));
  }

  return res.json();
}

export async function deleteAssetComment({ market, symbol, commentId }) {
  const res = await fetch(
    apiUrl(`/api/assets/${encodeURIComponent(market)}/${encodeURIComponent(symbol)}/comments/${commentId}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    const fallbackMessage = res.status === 401
      ? "로그인 후 의견을 삭제할 수 있어요."
      : "의견 삭제에 실패했어요.";
    throw new Error(await parseErrorMessage(res, fallbackMessage));
  }
}
