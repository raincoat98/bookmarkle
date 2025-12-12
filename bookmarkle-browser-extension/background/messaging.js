import {
  clearAuth,
  getCurrentRefreshToken,
  getCurrentUser,
  saveAuthToStorage,
} from "./auth.js";
import { isOffscreenSynced, markOffscreenSynced, sendToOffscreen } from "./offscreen.js";

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
    processAuthPayload(msg.payload.user, {
      idToken: msg.payload.idToken,
      refreshToken: msg.payload.refreshToken,
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
    sendResponse({ user: getCurrentUser() });
    return false;
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
  broadcastAuthState(user, refreshToken);
}

function handleLogout() {
  clearAuth();
  syncAuthToOffscreen(null, { refreshToken: null });
  broadcastAuthState(null, null);
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

function broadcastAuthState(user, refreshToken) {
  chrome.runtime.sendMessage(
    {
      type: "AUTH_STATE_CHANGED",
      user,
      refreshToken: refreshToken ?? getCurrentRefreshToken(),
    },
    () => {
      if (chrome.runtime.lastError) {
        // popup이 열려있지 않을 수 있으므로 무시
      }
    }
  );
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

  chrome.tabs.query({ url: WEB_URL_PATTERNS }, (tabs) => {
    tabs.forEach((tab) => {
      if (typeof tab.id === "number") {
        chrome.tabs.sendMessage(tab.id, {
          type: "EXTENSION_EVENT_TO_WEB",
          eventType: "COLLECTIONS_UPDATED",
          payload: {},
        });
      }
    });
  });
}
