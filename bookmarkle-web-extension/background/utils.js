// Sender 검증
export function isValidSender(sender) {
  return sender.id === chrome.runtime.id;
}

// URL에 쿼리 파라미터 추가 헬퍼 함수
export function addQueryParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
}

// JWT 만료 여부 확인 (5분 여유 포함)
export function isTokenExpired(idToken) {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    return Date.now() >= (payload.exp - 300) * 1000;
  } catch {
    return true;
  }
}

// 도메인 추출 함수
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

// 파비콘 URL 생성 함수
export function getFaviconUrl(url) {
  const domain = getDomainFromUrl(url);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// fetch 응답에서 에러 메시지 파싱
export async function parseErrorResponse(response) {
  const errorText = await response.text().catch(() => "");
  let errorMessage = `HTTP ${response.status}`;
  try {
    const errorData = JSON.parse(errorText);
    errorMessage = errorData.error?.message || errorData.error?.status || errorMessage;
  } catch {
    if (errorText) errorMessage += `: ${errorText}`;
  }
  return errorMessage;
}
