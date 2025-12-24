// Sender 검증
export function isValidSender(sender) {
  return sender.id === chrome.runtime.id;
}

// URL에 쿼리 파라미터 추가 헬퍼 함수
export function addQueryParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
}

// 도메인 추출 함수
export function getDomainFromUrl(url) {
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
