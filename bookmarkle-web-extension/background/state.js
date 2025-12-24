// 전역 상태 변수
export let authResponseHandler = null; // 인증 응답 핸들러
export let currentUser = null; // 현재 로그인한 사용자 정보 (메모리 캐시)
export let currentIdToken = null; // Firebase ID Token
export let currentRefreshToken = null; // Firebase Refresh Token (토큰 갱신용)
export const notificationUrlMap = new Map(); // 알림 ID와 URL 매핑

// 상태 설정 함수들
export function setAuthResponseHandler(handler) {
  authResponseHandler = handler;
}

export function getAuthResponseHandler() {
  return authResponseHandler;
}

export function clearAuthResponseHandler() {
  authResponseHandler = null;
}

export function setCurrentUser(user) {
  currentUser = user;
}

export function setCurrentIdToken(token) {
  currentIdToken = token;
}

export function setCurrentRefreshToken(token) {
  currentRefreshToken = token;
}

export function clearAuthState() {
  currentUser = null;
  currentIdToken = null;
  currentRefreshToken = null;
}

// 상태 조회 함수들 (getter)
export function getCurrentUser() {
  return currentUser;
}

export function getCurrentIdToken() {
  return currentIdToken;
}
