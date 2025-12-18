export const backgroundState = {
  currentUser: null,
  currentRefreshToken: null,
  offscreenSynced: false,
  logoutTimestamp: null, // 명시적 로그아웃 시간 (5초 이내면 재인증 방지)
};
