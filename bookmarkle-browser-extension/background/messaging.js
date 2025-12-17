import {
  clearAuth,
  getCurrentRefreshToken,
  getCurrentUser,
  saveAuthToStorage,
} from "./auth.js";
import {
  ensureFirebaseAuthUser,
  isOffscreenSynced,
  markOffscreenSynced,
  sendToOffscreen,
} from "./offscreen.js";

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
    const user = forwardedPayload.user;
    const idToken = forwardedPayload.idToken;
    const refreshToken = forwardedPayload.refreshToken;

    console.log("📨 [background] WEB_AUTH_STATE_CHANGED received from web:", {
      hasUser: !!user,
      userId: user?.uid,
      hasIdToken: !!idToken,
    });

    // 웹에서 로그아웃한 경우 (user가 null이고 idToken도 null)
    if (!user && !idToken) {
      console.log("🔄 [background] Web logged out, processing logout");
      processAuthPayload(null, {
        idToken: null,
        refreshToken: null,
      });
    } else if (user && idToken) {
      // 웹에서 로그인한 경우
      console.log("✅ [background] Web logged in, processing login");
      processAuthPayload(user, {
        idToken,
        refreshToken,
      });
    }

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
    // offscreen이 준비되었을 때 offscreen에서 최신 인증 상태 가져오기 (백그라운드)
    getAuthStateFromOffscreen(3, 100)
      .then((authState) => {
        if (authState?.user) {
          // offscreen에서 가져온 사용자 정보로 background 상태 업데이트
          processAuthPayload(authState.user, {
            idToken: authState.idToken,
            refreshToken: authState.refreshToken,
          });
          markOffscreenSynced(true);
        } else {
          markOffscreenSynced(true);
        }
      })
      .catch((error) => {
        console.warn(
          "⚠️ Failed to get auth state from offscreen on ready:",
          error
        );
        markOffscreenSynced(true);
      });

    // 즉시 응답 (offscreen 초기화는 백그라운드에서 진행)
    const user = getCurrentUser();
    if (!isOffscreenSynced() && user) {
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

  // offscreen에서 실시간 인증 상태 변경 알림 처리
  if (msg.type === "OFFSCREEN_AUTH_STATE_CHANGED_TO_BACKGROUND") {
    processAuthPayload(msg.user, {
      idToken: msg.idToken,
      refreshToken: msg.refreshToken,
    });
    sendResponse({ ok: true });
    return true;
  }

  if (sender.url && sender.url.includes("offscreen/index.html")) {
    return false;
  }

  console.log("📨 Background received from popup:", msg.type);

  if (msg.type === "GET_AUTH_STATE") {
    // offscreen에서 실시간으로 최신 인증 상태 가져오기
    getAuthStateFromOffscreen()
      .then((authState) => {
        if (authState?.user) {
          // offscreen에서 가져온 사용자 정보로 background 상태 업데이트
          processAuthPayload(authState.user, {
            idToken: authState.idToken,
            refreshToken: authState.refreshToken,
          });
          sendResponse({ user: authState.user });
        } else {
          // offscreen에 사용자 정보가 없으면 null 반환
          sendResponse({ user: null });
        }
      })
      .catch((error) => {
        console.warn("⚠️ Failed to get auth state from offscreen:", error);
        // 실패 시 null 반환
        sendResponse({ user: null });
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
      sendResponse,
      undefined,
      (response) => {
        // 북마크 저장 성공 후 시스템 알림 확인 및 표시
        if (response?.ok && response?.result?.notificationSettings) {
          const { notificationSettings } = response.result;
          const { title, url } = msg.payload || {};

          // 시스템 알림이 활성화되어 있으면 OS 알림 센터로 알림 표시
          if (notificationSettings.systemNotifications) {
            showSystemNotification(title || "북마크 저장됨", url || "");
          }
        }
      }
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

function proxyToOffscreen(
  message,
  sendResponse,
  transformResponse,
  afterSuccess
) {
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
  chrome.runtime.sendMessage({ type: "COLLECTIONS_UPDATED" }, () => {
    if (chrome.runtime.lastError) {
      // popup이 없을 수 있으므로 무시
    }
  });

  sendMessageToWebTabs({
    type: "EXTENSION_EVENT_TO_WEB",
    eventType: "COLLECTIONS_UPDATED",
    payload: {},
  });
}

export function showSystemNotification(title, url) {
  const notificationId = `bookmark-saved-${Date.now()}`;
  const message = url ? `${title}\n${url}` : title;

  chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("public/bookmark.png"),
      title: "북마크 저장됨",
      message: message,
      priority: 1,
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "⚠️ Failed to show notification:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("✅ System notification shown:", notificationId);
      }
    }
  );

  // 5초 후 알림 자동 닫기
  setTimeout(() => {
    chrome.notifications.clear(notificationId, () => {
      if (chrome.runtime.lastError) {
        // 이미 닫혔거나 없는 경우 무시
      }
    });
  }, 5000);
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

async function getAuthStateFromOffscreen(maxRetries = 5, retryDelay = 200) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await sendToOffscreen({
        type: "OFFSCREEN_GET_AUTH_STATE",
      });
      if (response?.ok && response?.payload) {
        return response.payload;
      }
      // 응답은 있지만 payload가 없는 경우 (로그아웃 상태)
      if (response?.ok) {
        return null;
      }
    } catch (error) {
      const errorMessage = error.message || "";
      // offscreen이 아직 준비되지 않은 경우 재시도
      if (
        attempt < maxRetries - 1 &&
        (errorMessage.includes("Could not establish connection") ||
          errorMessage.includes("The message port closed"))
      ) {
        console.log(
          `⏳ Offscreen not ready yet, retrying... (${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      console.warn("⚠️ getAuthStateFromOffscreen failed:", error);
      return null;
    }
  }
  return null;
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
