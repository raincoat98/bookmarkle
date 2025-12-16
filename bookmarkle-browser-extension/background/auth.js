import { AUTH_CACHE_KEYS } from "./constants.js";
import { backgroundState } from "./state.js";

export function saveAuthToStorage(user, refreshToken) {
  backgroundState.currentUser = user;
  if (refreshToken) {
    backgroundState.currentRefreshToken = refreshToken;
  }
  backgroundState.offscreenSynced = false;

  if (chrome.storage?.local && user) {
    const payload = {
      currentUser: user,
      lastLoginTime: Date.now(),
    };
    if (backgroundState.currentRefreshToken) {
      payload.currentRefreshToken = backgroundState.currentRefreshToken;
    }
    chrome.storage.local.set(payload, () => {
      console.log("✅ Auth saved to storage:", user.email || user.uid);
    });
  }
}

export function clearAuth() {
  backgroundState.currentUser = null;
  backgroundState.currentRefreshToken = null;
  backgroundState.offscreenSynced = false;

  if (chrome.storage?.local) {
    chrome.storage.local.remove(AUTH_CACHE_KEYS, () => {
      console.log("✅ Auth cleared from storage");
    });
  }
}

export function getCurrentUser() {
  return backgroundState.currentUser;
}

export function getCurrentRefreshToken() {
  return backgroundState.currentRefreshToken;
}

export function isUserAuthenticated() {
  return Boolean(backgroundState.currentUser);
}
