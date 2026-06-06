/**
 * 브라우저 호환성 감지 유틸리티
 * 구글 로그인이 제한될 수 있는 브라우저들을 감지합니다.
 */

export interface BrowserInfo {
  name: string;
  isCompatible: boolean;
  isInAppBrowser: boolean;
  userAgent: string;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent.toLowerCase();

  // ─── 인앱 브라우저 감지 ────────────────────────────────────────────
  const isKakaoTalk = userAgent.includes("kakaotalk");
  const isNaverApp = userAgent.includes("naver") && !userAgent.includes("whale");
  const isLineApp = userAgent.includes(" line/"); // 라인 앱은 정확히 "line/" 형태
  const isFacebookApp = userAgent.includes("fbav") || userAgent.includes("fban");
  const isInstagramApp = userAgent.includes("instagram");
  // Android WebView 감지: "; wv)" 패턴이 정확
  const isAndroidWebView = userAgent.includes("; wv)");

  // ─── 일반 브라우저 식별 ───────────────────────────────────────────
  const isWhale = userAgent.includes("whale");
  const isEdge = userAgent.includes("edg/") || userAgent.includes("edge");
  const isFirefox = userAgent.includes("firefox") || userAgent.includes("fxios");
  // Chrome iOS는 "crios" 포함
  const isChrome =
    !isEdge &&
    !isWhale &&
    (userAgent.includes("chrome") || userAgent.includes("crios"));
  // Safari: WebKit이고 Chrome/Edge/Firefox/인앱이 아닌 경우
  // 데스크톱·모바일 모두 정상 식별
  const hasSafari = userAgent.includes("safari");
  const isSafari =
    hasSafari &&
    !isChrome &&
    !isEdge &&
    !isFirefox &&
    !isKakaoTalk &&
    !isNaverApp &&
    !isLineApp &&
    !isFacebookApp &&
    !isInstagramApp &&
    !isAndroidWebView;

  const isInAppBrowser =
    isKakaoTalk ||
    isNaverApp ||
    isLineApp ||
    isFacebookApp ||
    isInstagramApp ||
    isAndroidWebView;

  // ─── 브라우저 이름 ────────────────────────────────────────────────
  let browserName = "알 수 없는 브라우저";
  if (isKakaoTalk) browserName = "카카오톡";
  else if (isNaverApp) browserName = "네이버 앱";
  else if (isLineApp) browserName = "라인";
  else if (isFacebookApp) browserName = "페이스북";
  else if (isInstagramApp) browserName = "인스타그램";
  else if (isWhale) browserName = "웨일";
  else if (isEdge) browserName = "Edge";
  else if (isChrome) browserName = "Chrome";
  else if (isFirefox) browserName = "Firefox";
  else if (isSafari) browserName = "Safari";

  // ─── 호환성 ────────────────────────────────────────────────────────
  // 인앱 브라우저만 비호환. 일반 브라우저(데스크톱/모바일 Safari, Chrome 등)는 호환
  const isCompatible = !isInAppBrowser;

  return {
    name: browserName,
    isCompatible,
    isInAppBrowser,
    userAgent: navigator.userAgent,
  };
}

export function getRecommendedBrowsers(): string[] {
  return ["Chrome", "Safari", "Edge", "웨일"];
}

export function getBrowserCompatibilityMessage(
  browserInfo: BrowserInfo
): string {
  if (browserInfo.isCompatible) {
    return "";
  }

  if (browserInfo.isInAppBrowser) {
    return `${browserInfo.name}에서는 구글 로그인이 제한될 수 있습니다. 더 나은 경험을 위해 일반 브라우저(Chrome, Safari 등)에서 접속해주세요.`;
  }

  return "현재 브라우저에서는 구글 로그인이 제한될 수 있습니다. Chrome, Safari, Edge, 웨일 등의 브라우저를 사용해주세요.";
}
