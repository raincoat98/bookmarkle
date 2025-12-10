declare global {
  interface Window {
    EXTENSION_ID?: string;
  }
}
/**
 * Extension ID를 동적으로 추출하는 통합 함수
 * 우선순위: 환경변수 > URL 파라미터 > window.EXTENSION_ID
 */
export function getExtensionId(): string {
  // 1순위: 환경변수
  if (import.meta.env && import.meta.env.VITE_EXTENSION_ID) {
    return import.meta.env.VITE_EXTENSION_ID;
  }

  // 2순위: URL 파라미터
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const extensionId = urlParams.get("extensionId");
    if (extensionId) return extensionId;
  } catch {
    // URL 파라미터 파싱 실패 무시
  }

  // 3순위: window.EXTENSION_ID
  if (window.EXTENSION_ID) {
    return window.EXTENSION_ID;
  }

  // 기본값 반환 (빈 문자열)
  return "";
}
