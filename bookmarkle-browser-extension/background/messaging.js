import {
  clearAuth,
  getCurrentRefreshToken,
  getCurrentUser,
  saveAuthToStorage,
  waitForAuthRestore,
} from "./auth.js";
import { ensureFirebaseAuthUser, isOffscreenSynced, markOffscreenSynced, sendToOffscreen } from "./offscreen.js";

const WEB_URL_PATTERNS = [
  "https://bookmarkhub-5ea6c.web.app/*",
  "http://localhost:3000/*",
];

export function initMessageHandlers() {
  chrome.runtime.onMessageExternal.addListener(handleExternalMessage);
  chrome.runtime.onMessage.addListener(handleInternalMessage);
}

function handleExternalMessage(msg, sender, sendResponse) {
  console.log("📨 External message received:", msg.type, "from:", sender.url);

  if (msg.type === "AUTH_STATE_CHANGED") {
    processAuthPayload(msg.user, {
      idToken: msg.idToken,
      refreshToken: msg.refreshToken,
    });
    sendResponse({ ok: true });
    return true;
  }

  return false;
}

function handleInternalMessage(msg, sender, sendResponse) {
  if (msg.type === "WEB_AUTH_STATE_CHANGED") {
    const forwardedPayload = msg?.payload?.payload ?? msg?.payload ?? {};
    processAuthPayload(forwardedPayload.user, {
      idToken: forwardedPayload.idToken,
      refreshToken: forwardedPayload.refreshToken,
    });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "WEB_COLLECTIONS_UPDATED") {
    broadcastCollectionsUpdated();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "ADD_COLLECTION") {
    proxyToOffscreen(
      { type: "OFFSCREEN_ADD_COLLECTION", payload: msg.payload },
      sendResponse,
      undefined,
      () => broadcastCollectionsUpdated()
    );
    return true;
  }

  if (msg.type === "OFFSCREEN_READY") {
    const user = getCurrentUser();
    if (!isOffscreenSynced() && user) {
      markOffscreenSynced(true);
      sendResponse({
        type: "INIT_AUTH",
        user,
        refreshToken: getCurrentRefreshToken(),
      });
    } else {
      sendResponse({ type: "INIT_AUTH", user: null, refreshToken: null });
    }
    return true;
  }

  if (sender.url && sender.url.includes("offscreen/index.html")) {
    return false;
  }

  console.log("📨 Background received from popup:", msg.type);

  if (msg.type === "GET_AUTH_STATE") {
    waitForAuthRestore()
      .catch(() => {})
      .then(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
          sendResponse({ user: currentUser });
          return;
        }

        requestAuthStateFromWeb()
          .then((payload) => {
            if (payload?.user && payload?.idToken) {
              processAuthPayload(payload.user, {
                idToken: payload.idToken,
                refreshToken: payload.refreshToken,
              });
              sendResponse({ user: getCurrentUser() });
            } else {
              checkAuthStateViaFirebase()
                .then((user) => sendResponse({ user }))
                .catch((error) => {
                  console.warn("⚠️ Failed to fetch auth state:", error);
                  sendResponse({ user: null });
                });
            }
          })
          .catch((error) => {
            console.warn("⚠️ Failed to fetch auth state from web:", error);
            checkAuthStateViaFirebase()
              .then((user) => sendResponse({ user }))
              .catch((firebaseError) => {
                console.warn("⚠️ Firebase auth check failed:", firebaseError);
                sendResponse({ user: null });
              });
          });
      });
    return true;
  }

  if (msg.type === "LOGOUT") {
    handleLogout();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "SAVE_BOOKMARK") {
    proxyToOffscreen(
      { type: "OFFSCREEN_SAVE_BOOKMARK", payload: msg.payload },
      sendResponse
    );
    return true;
  }

  if (msg.type === "LIST_BOOKMARKS") {
    proxyToOffscreen(
      { type: "OFFSCREEN_LIST_BOOKMARKS" },
      sendResponse,
      () => ({ ok: true })
    );
    return true;
  }

  if (msg.type === "GET_COLLECTIONS") {
    proxyToOffscreen({ type: "OFFSCREEN_GET_COLLECTIONS" }, sendResponse);
    return true;
  }

  return false;
}

function processAuthPayload(user, { idToken, refreshToken }) {
  if (user && idToken) {
    handleLogin(user, { idToken, refreshToken });
  } else if (!user) {
    handleLogout();
  }
}

function handleLogin(user, { idToken, refreshToken }) {
  saveAuthToStorage(user, refreshToken);
  syncAuthToOffscreen(user, { idToken, refreshToken });
  broadcastAuthState(user, { idToken, refreshToken });
}

function handleLogout() {
  clearAuth();
  syncAuthToOffscreen(null, { refreshToken: null });
  broadcastAuthState(null, { idToken: null, refreshToken: null });
}

function syncAuthToOffscreen(user, { idToken, refreshToken }) {
  const message = {
    type: "OFFSCREEN_AUTH_STATE_CHANGED",
    user,
    refreshToken: refreshToken ?? getCurrentRefreshToken(),
  };
  if (idToken) {
    message.idToken = idToken;
  }

  sendToOffscreen(message).catch((error) => {
    console.warn("⚠️ Failed to send auth to offscreen:", error.message);
  });
}

function broadcastAuthState(user, { refreshToken, idToken }) {
  const payload = {
    user,
    refreshToken: refreshToken ?? getCurrentRefreshToken(),
    idToken: idToken ?? null,
  };

  chrome.runtime.sendMessage(
    {
      type: "AUTH_STATE_CHANGED",
      ...payload,
    },
    () => {
      if (chrome.runtime.lastError) {
        // popup이 열려있지 않을 수 있으므로 무시
      }
    }
  );

  sendMessageToWebTabs({ type: "WEB_AUTH_STATE_CHANGED", payload });
}

function proxyToOffscreen(message, sendResponse, transformResponse, afterSuccess) {
  sendToOffscreen(message)
    .then((response) => {
      if (afterSuccess) {
        try {
          afterSuccess(response);
        } catch (error) {
          console.error("broadcast error:", error);
        }
      }
      sendResponse(transformResponse ? transformResponse(response) : response);
    })
    .catch((error) => {
      console.error(`${message.type} error:`, error.message);
      sendResponse({ ok: false, error: error.message });
    });
}

function broadcastCollectionsUpdated() {
  chrome.runtime.sendMessage(
    { type: "COLLECTIONS_UPDATED" },
    () => {
      if (chrome.runtime.lastError) {
        // popup이 없을 수 있으므로 무시
      }
    }
  );

  sendMessageToWebTabs({
    type: "EXTENSION_EVENT_TO_WEB",
    eventType: "COLLECTIONS_UPDATED",
    payload: {},
  });
}

function sendMessageToWebTabs(message) {
  chrome.tabs.query({ url: WEB_URL_PATTERNS }, (tabs) => {
    tabs.forEach((tab) => {
      if (typeof tab.id !== "number") {
        return;
      }
      chrome.tabs.sendMessage(tab.id, message, () => {
        if (chrome.runtime.lastError) {
          // 탭이 응답하지 않을 수 있으므로 무시
        }
      });
    });
  });
}

function requestAuthStateFromWeb() {
  const REQUEST_TIMEOUT_MS = 2000;
  return new Promise((resolve) => {
    chrome.tabs.query({ url: WEB_URL_PATTERNS }, (tabs) => {
      const targetTabs = tabs.filter((tab) => typeof tab.id === "number");
      console.log("[background] REQUEST_WEB_AUTH_STATE tabs found:", targetTabs.length);
      if (!targetTabs.length) {
        resolve(null);
        return;
      }

      let settled = false;
      let pending = targetTabs.length;
      let fallbackPayload = null;

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(fallbackPayload);
      }, REQUEST_TIMEOUT_MS);

      const handleResponse = (payload) => {
        if (settled) return;
        if (payload?.user && payload?.idToken) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(payload);
          return;
        }
        if (!fallbackPayload) {
          fallbackPayload = payload ?? null;
        }
      };

      targetTabs.forEach((tab) => {
        console.log("[background] Sending REQUEST_WEB_AUTH_STATE to tab", tab.id);
        sendAuthRequestToTab(tab.id)
          .then((payload) => {
            pending -= 1;
            if (payload) {
              console.log(
                "[background] Received auth payload from tab",
                tab.id,
                !!payload?.user
              );
            }
            handleResponse(payload);
            if (!pending && !settled) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(fallbackPayload);
            }
          })
          .catch((error) => {
            pending -= 1;
            console.warn("[background] REQUEST_WEB_AUTH_STATE failed for tab", tab.id, error?.message || error);
            if (!pending && !settled) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(fallbackPayload);
            }
          });
      });
    });
  });
}

function sendAuthRequestToTab(tabId, attempt = 0) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "REQUEST_WEB_AUTH_STATE" }, (response) => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message || "";
        console.warn("[background] REQUEST_WEB_AUTH_STATE error:", message);
        if (attempt === 0 && shouldInjectContentBridge(message) && chrome.scripting) {
          injectContentBridge(tabId)
            .then(() => sendAuthRequestToTab(tabId, attempt + 1).then(resolve).catch(reject))
            .catch((error) => {
              reject(error);
            });
          return;
        }
        resolve(null);
        return;
      }
      resolve(response?.payload ?? null);
    });
  });
}

function shouldInjectContentBridge(errorMessage) {
  if (!errorMessage) return false;
  return errorMessage.includes("Receiving end does not exist") || errorMessage.includes("Could not establish connection");
}

function injectContentBridge(tabId) {
  console.log("[background] Injecting content-bridge.js into tab", tabId);
  return chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-bridge.js"],
    world: "ISOLATED",
  });
}

async function checkAuthStateViaFirebase() {
  try {
    const user = await ensureFirebaseAuthUser();
    if (!user) return null;
    processAuthPayload(user.user, {
      idToken: user.idToken,
      refreshToken: user.refreshToken,
    });
    return getCurrentUser();
  } catch (error) {
    console.warn("⚠️ checkAuthStateViaFirebase failed:", error);
    return null;
  }
}
