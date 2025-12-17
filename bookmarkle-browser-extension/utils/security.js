/**
 * 보안 유틸리티 함수
 * XSS 방지, 입력 검증, 메시지 검증 등
 */

/**
 * 허용된 origin 목록
 */
const ALLOWED_ORIGINS = new Set([
  "https://bookmarkhub-5ea6c.web.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

/**
 * 허용된 프로토콜
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "chrome-extension:"]);

/**
 * Origin 검증
 * @param {string} origin - 검증할 origin
 * @returns {boolean} 허용된 origin인지 여부
 */
export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  try {
    const url = new URL(origin);
    const originWithoutPath = `${url.protocol}//${url.host}`;
    return ALLOWED_ORIGINS.has(originWithoutPath);
  } catch {
    return false;
  }
}

/**
 * URL 검증 및 정규화
 * @param {string} url - 검증할 URL
 * @param {string} extensionId - 확장 프로그램 ID (선택)
 * @returns {boolean} 유효한 URL인지 여부
 */
export function isValidUrl(url, extensionId = null) {
  if (!url || typeof url !== "string" || !url.trim().length) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // 프로토콜 검증
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return false;
    }

    // chrome-extension: 프로토콜인 경우 extensionId 검증
    if (parsed.protocol === "chrome-extension:") {
      if (!extensionId) {
        return false;
      }
      const expectedOrigin = `chrome-extension://${extensionId}`;
      return parsed.origin === expectedOrigin;
    }

    // http/https는 호스트 검증
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      // localhost는 허용
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return true;
      }
      // 일반적인 URL 형식 검증
      return parsed.hostname.length > 0;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * HTML 이스케이프 (XSS 방지)
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
export function escapeHtml(text) {
  if (text == null) {
    return "";
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 안전한 텍스트 노드 생성
 * @param {string} text - 텍스트
 * @returns {Text} 텍스트 노드
 */
export function createSafeTextNode(text) {
  return document.createTextNode(String(text || ""));
}

/**
 * 안전한 HTML 삽입 (innerHTML 대신 사용)
 * @param {HTMLElement} element - 대상 요소
 * @param {string} text - 삽입할 텍스트 (HTML이 아닌 순수 텍스트)
 */
export function setSafeTextContent(element, text) {
  if (!element) return;
  element.textContent = String(text || "");
}

/**
 * 사용자 입력 sanitization
 * @param {string} input - 사용자 입력
 * @param {number} maxLength - 최대 길이
 * @returns {string} sanitized 입력
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (input == null) {
    return "";
  }

  const str = String(input).trim();

  // 길이 제한
  if (str.length > maxLength) {
    return str.substring(0, maxLength);
  }

  // 제어 문자 제거 (탭, 줄바꿈은 허용)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * 태그 이름 검증
 * @param {string} tag - 태그 이름
 * @returns {boolean} 유효한 태그인지 여부
 */
export function isValidTag(tag) {
  if (!tag || typeof tag !== "string") {
    return false;
  }

  const trimmed = tag.trim();

  // 길이 제한 (1-50자)
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }

  // 허용된 문자만 사용 (한글, 영문, 숫자, 하이픈, 언더스코어)
  const tagPattern = /^[가-힣a-zA-Z0-9_-]+$/;
  return tagPattern.test(trimmed);
}

/**
 * 컬렉션 이름 검증
 * @param {string} name - 컬렉션 이름
 * @returns {boolean} 유효한 이름인지 여부
 */
export function isValidCollectionName(name) {
  if (!name || typeof name !== "string") {
    return false;
  }

  const trimmed = name.trim();

  // 길이 제한 (1-100자)
  if (trimmed.length === 0 || trimmed.length > 100) {
    return false;
  }

  return true;
}

/**
 * 메시지 페이로드 검증
 * @param {any} payload - 검증할 페이로드
 * @param {string} expectedType - 예상되는 타입
 * @returns {boolean} 유효한 페이로드인지 여부
 */
export function isValidMessagePayload(payload, expectedType) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  // 타입 검증
  if (expectedType && payload.type !== expectedType) {
    return false;
  }

  return true;
}

/**
 * Sender URL 검증 (Chrome Extension 메시지)
 * @param {chrome.runtime.MessageSender} sender - 메시지 sender
 * @param {string[]} allowedPatterns - 허용된 URL 패턴 배열
 * @returns {boolean} 유효한 sender인지 여부
 */
export function isValidSender(sender, allowedPatterns = []) {
  if (!sender) {
    return false;
  }

  // Extension 내부 메시지 (sender.url이 없는 경우)
  if (!sender.url) {
    // offscreen 문서는 sender.url이 없을 수 있음
    if (sender.id === chrome.runtime.id) {
      return true;
    }
    return false;
  }

  // 외부 메시지인 경우 origin 검증
  try {
    const url = new URL(sender.url);
    const origin = `${url.protocol}//${url.host}`;

    // 허용된 origin 목록 확인
    if (ALLOWED_ORIGINS.has(origin)) {
      return true;
    }

    // 패턴 매칭 확인
    if (allowedPatterns.length > 0) {
      return allowedPatterns.some((pattern) => {
        try {
          const patternUrl = new URL(pattern.replace("*", ""));
          return (
            url.hostname === patternUrl.hostname ||
            url.hostname.endsWith(`.${patternUrl.hostname}`)
          );
        } catch {
          return false;
        }
      });
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 북마크 데이터 검증
 * @param {object} bookmark - 북마크 데이터
 * @returns {boolean} 유효한 북마크 데이터인지 여부
 */
export function isValidBookmarkData(bookmark) {
  if (!bookmark || typeof bookmark !== "object") {
    return false;
  }

  // URL 필수
  if (!bookmark.url || typeof bookmark.url !== "string") {
    return false;
  }

  // URL 형식 검증
  if (!isValidUrl(bookmark.url)) {
    return false;
  }

  // 제목 검증 (선택적이지만 있으면 문자열이어야 함)
  if (bookmark.title !== undefined && typeof bookmark.title !== "string") {
    return false;
  }

  // 제목 길이 제한
  if (bookmark.title && bookmark.title.length > 500) {
    return false;
  }

  // 설명 길이 제한
  if (bookmark.description && typeof bookmark.description === "string") {
    if (bookmark.description.length > 2000) {
      return false;
    }
  }

  // 태그 검증
  if (bookmark.tags) {
    if (!Array.isArray(bookmark.tags)) {
      return false;
    }

    // 태그 개수 제한
    if (bookmark.tags.length > 20) {
      return false;
    }

    // 각 태그 검증
    for (const tag of bookmark.tags) {
      if (!isValidTag(tag)) {
        return false;
      }
    }
  }

  // collectionId 검증 (선택적)
  if (bookmark.collectionId !== undefined && bookmark.collectionId !== null) {
    if (
      typeof bookmark.collectionId !== "string" ||
      bookmark.collectionId.length === 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 컬렉션 데이터 검증
 * @param {object} collection - 컬렉션 데이터
 * @returns {boolean} 유효한 컬렉션 데이터인지 여부
 */
export function isValidCollectionData(collection) {
  if (!collection || typeof collection !== "object") {
    return false;
  }

  // 이름 필수
  if (!collection.name || typeof collection.name !== "string") {
    return false;
  }

  // 이름 검증
  if (!isValidCollectionName(collection.name)) {
    return false;
  }

  // 아이콘 검증 (선택적)
  if (collection.icon !== undefined) {
    if (typeof collection.icon !== "string") {
      return false;
    }

    // 아이콘 길이 제한 (이모지 또는 Lucide 아이콘 이름)
    if (collection.icon.length > 50) {
      return false;
    }
  }

  return true;
}

/**
 * Rate limiting을 위한 간단한 카운터
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * 요청이 허용되는지 확인
   * @param {string} key - 요청 키 (예: userId, IP 등)
   * @returns {boolean} 허용되는지 여부
   */
  isAllowed(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // 오래된 요청 제거
    const recentRequests = userRequests.filter(
      (time) => now - time < this.windowMs
    );

    // 요청 수 확인
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // 새 요청 추가
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  /**
   * 카운터 초기화
   */
  reset() {
    this.requests.clear();
  }
}

// 전역 Rate Limiter 인스턴스
export const messageRateLimiter = new RateLimiter(30, 60000); // 1분에 30개 요청
export const bookmarkRateLimiter = new RateLimiter(10, 60000); // 1분에 10개 북마크 저장
