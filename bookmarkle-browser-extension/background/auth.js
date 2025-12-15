import { AUTH_CACHE_KEYS } from "./constants.js";
import { backgroundState } from "./state.js";

let authRestorePromise = null;

export async function restoreAuthFromStorage() {
  if (authRestorePromise) {
    return authRestorePromise;
  }

  if (!chrome.storage?.local) {
    authRestorePromise = Promise.resolve(false);
    return authRestorePromise;
  }

  authRestorePromise = new Promise((resolve) => {
    chrome.storage.local.get(AUTH_CACHE_KEYS, (result) => {
      if (result.currentUser) {
        const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);

        if (hoursSinceLogin < 24) {
          backgroundState.currentUser = result.currentUser;
          backgroundState.currentRefreshToken = result.currentRefreshToken || null;
          console.log(
            "🔄 Restored user from chrome.storage.local:",
            backgroundState.currentUser.email || backgroundState.currentUser.uid
          );
          resolve(true);
        } else {
          console.log("⏰ Session expired, clearing chrome.storage.local");
          chrome.storage.local.remove(AUTH_CACHE_KEYS);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });

  return authRestorePromise;
}

export function waitForAuthRestore() {
  return authRestorePromise || Promise.resolve(false);
}

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
  authRestorePromise = Promise.resolve(false);

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
