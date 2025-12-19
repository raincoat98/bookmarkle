import { backgroundState } from "./state.js";
import {
  ensureFirebaseAuthUser,
  isOffscreenSynced,
  markOffscreenSynced,
  sendToOffscreen,
} from "./offscreen.js";
import {
  isValidSender,
  isValidMessagePayload,
  isValidBookmarkData,
  isValidCollectionData,
  messageRateLimiter,
  bookmarkRateLimiter,
} from "../utils/security.js";

const WEB_URL_PATTERNS = [
  "https://bookmarkhub-5ea6c.web.app/*",
  "http://localhost:3000/*",
];

// ============================================================================
// Exported Functions
// ============================================================================

export function initMessageHandlers() {
  chrome.runtime.onMessageExternal.addListener(handleExternalMessage);
  chrome.runtime.onMessage.addListener(handleInternalMessage);
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

// ============================================================================
// Message Handlers
// ============================================================================

function handleExternalMessage(msg, sender, sendResponse) {
  console.log("📨 External message received:", msg.type, "from:", sender.url);

  // 보안: sender 검증
  if (!isValidSender(sender, WEB_URL_PATTERNS)) {
    console.warn("⚠️ Invalid sender:", sender.url);
    sendResponse({ ok: false, error: "Invalid sender" });
    return false;
  }

  // 보안: Rate limiting
  const senderKey = sender.url || sender.id || "unknown";
  if (!messageRateLimiter.isAllowed(senderKey)) {
    console.warn("⚠️ Rate limit exceeded for:", senderKey);
    sendResponse({ ok: false, error: "Rate limit exceeded" });
    return false;
  }

  // 보안: 메시지 페이로드 검증
  if (!isValidMessagePayload(msg, "AUTH_STATE_CHANGED")) {
    console.warn("⚠️ Invalid message payload:", msg);
    sendResponse({ ok: false, error: "Invalid message payload" });
    return false;
  }

  if (msg.type === "AUTH_STATE_CHANGED") {
    // 보안: user 객체 검증
    if (msg.user && (typeof msg.user !== "object" || !msg.user.uid)) {
      console.warn("⚠️ Invalid user object:", msg.user);
      sendResponse({ ok: false, error: "Invalid user object" });
      return false;
    }

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
    // 보안: 컬렉션 데이터 검증
    if (!msg.payload || !isValidCollectionData(msg.payload)) {
      console.warn("⚠️ Invalid collection data:", msg.payload);
      sendResponse({ ok: false, error: "Invalid collection data" });
      return false;
    }

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
    // 단, 현재 background 상태가 null(로그아웃 상태)이면 offscreen 값을 무시
    const currentUser = backgroundState.currentUser;

    getAuthStateFromOffscreen(3, 100)
      .then((authState) => {
        // 로그아웃 상태면 offscreen 값으로 덮어쓰지 않음
        if (!currentUser && !authState?.user) {
          // 둘 다 null이면 웹 탭에서 인증 상태 확인 (익스텐션 재설치 시나리오)
          console.log(
            "🔍 [background] Both background and offscreen are null, checking web tabs for auth state"
          );
          getAuthStateFromWebTabs()
            .then((webAuthState) => {
              if (webAuthState?.user && webAuthState?.idToken) {
                // 웹에서 로그인한 상태면 동기화
                console.log(
                  "✅ [background] Found logged-in user in web tabs, syncing:",
                  webAuthState.user.uid
                );
                processAuthPayload(webAuthState.user, {
                  idToken: webAuthState.idToken,
                  refreshToken: webAuthState.refreshToken,
                });
              } else {
                // 웹에서도 로그아웃 상태면 정상 (로그아웃 상태 유지)
                console.log(
                  "✅ [background] Web tabs also show logout state, keeping logout"
                );
              }
              markOffscreenSynced(true);
            })
            .catch((error) => {
              console.warn(
                "⚠️ Failed to get auth state from web tabs:",
                error
              );
              markOffscreenSynced(true);
            });
          return;
        }

        if (currentUser && authState?.user) {
          // 둘 다 로그인 상태면 offscreen 값을 사용 (더 최신일 수 있음)
          processAuthPayload(authState.user, {
            idToken: authState.idToken,
            refreshToken: authState.refreshToken,
          });
          markOffscreenSynced(true);
        } else if (!currentUser && authState?.user) {
          // background는 로그아웃 상태인데 offscreen은 로그인 상태
          // 이 경우 offscreen 값으로 덮어쓰지 않음 (명시적 로그아웃 상태 유지)
          console.log(
            "🔄 [background] Keeping logout state, ignoring offscreen auth state"
          );
          markOffscreenSynced(true);
        } else {
          // currentUser는 있지만 authState는 null인 경우는 로그아웃 처리
          if (currentUser) {
            console.log(
              "🔄 [background] Offscreen reports logout, clearing background state"
            );
            processAuthPayload(null, {
              idToken: null,
              refreshToken: null,
            });
          }
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
    const user = backgroundState.currentUser;
    if (!isOffscreenSynced() && user) {
      sendResponse({
        type: "INIT_AUTH",
        user,
        refreshToken: backgroundState.currentRefreshToken,
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
    // 현재 background 상태 확인
    const currentUser = backgroundState.currentUser;

    // 명시적 로그아웃 후 5초 이내면 offscreen 확인하지 않고 null 반환 (로그아웃 보호)
    const logoutTime = backgroundState.logoutTimestamp;
    const isRecentLogout = logoutTime && Date.now() - logoutTime < 5000;
    if (!currentUser && isRecentLogout) {
      console.log(
        "🔄 [background] Recent logout detected, returning null without checking offscreen"
      );
      sendResponse({ user: null });
      return true;
    }

    // offscreen에서 실시간으로 최신 인증 상태 가져오기 (웹 iframe에서 토큰 가져옴)
    console.log(
      "🔍 [background] Getting auth state from offscreen (currentUser:",
      currentUser ? currentUser.uid : "null",
      ")"
    );
    getAuthStateFromOffscreen()
      .then((authState) => {
        console.log(
          "📥 [background] Got auth state from offscreen:",
          authState?.user ? authState.user.uid : "null"
        );

        // 명시적 로그아웃 후 5초 이내면 offscreen 값 무시
        if (!currentUser && isRecentLogout) {
          console.log(
            "🔄 [background] Recent logout, ignoring offscreen auth state"
          );
          sendResponse({ user: null });
          return;
        }

        if (authState?.user) {
          // offscreen에서 가져온 사용자 정보로 background 상태 업데이트
          // 로그아웃 타임스탬프 클리어 (정상 로그인)
          backgroundState.logoutTimestamp = null;
          console.log(
            "✅ [background] Updating background state from offscreen:",
            authState.user.email || authState.user.uid
          );
          processAuthPayload(authState.user, {
            idToken: authState.idToken,
            refreshToken: authState.refreshToken,
          });
          sendResponse({ user: authState.user });
        } else {
          // offscreen에 사용자 정보가 없으면 로그아웃 상태
          // background 상태가 있으면 명시적으로 클리어
          if (currentUser) {
            console.log(
              "🔄 [background] Offscreen reports logout, clearing background state"
            );
            processAuthPayload(null, {
              idToken: null,
              refreshToken: null,
            });
          }
          console.log(
            "❌ [background] No auth state from offscreen, returning null"
          );
          sendResponse({ user: null });
        }
      })
      .catch((error) => {
        console.warn("⚠️ Failed to get auth state from offscreen:", error);
        // 실패 시 background 상태 확인
        if (currentUser) {
          // background에 사용자 정보가 있으면 그대로 반환
          sendResponse({ user: currentUser });
        } else {
          // background에도 없으면 null 반환 (웹에서도 로그인 안 된 상태)
          sendResponse({ user: null });
        }
      });
    return true;
  }

  if (msg.type === "LOGOUT") {
    handleLogout();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "SAVE_BOOKMARK") {
    // 보안: 북마크 데이터 검증
    if (!msg.payload || !isValidBookmarkData(msg.payload)) {
      console.warn("⚠️ Invalid bookmark data:", msg.payload);
      sendResponse({ ok: false, error: "Invalid bookmark data" });
      return false;
    }

    // 보안: Rate limiting
    const user = backgroundState.currentUser;
    const rateLimitKey = user?.uid || sender?.id || "anonymous";
    if (!bookmarkRateLimiter.isAllowed(rateLimitKey)) {
      console.warn("⚠️ Bookmark rate limit exceeded for:", rateLimitKey);
      sendResponse({
        ok: false,
        error: "Too many bookmark requests. Please wait.",
      });
      return false;
    }

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

// ============================================================================
// Auth Processing
// ============================================================================

function processAuthPayload(user, { idToken, refreshToken }) {
  if (user && idToken) {
    handleLogin(user, { idToken, refreshToken });
  } else {
    // user가 null이거나 idToken이 없으면 로그아웃 처리
    handleLogout();
  }
}

function handleLogin(user, { idToken, refreshToken }) {
  backgroundState.currentUser = user;
  backgroundState.currentRefreshToken = refreshToken ?? null;
  backgroundState.offscreenSynced = false;
  backgroundState.logoutTimestamp = null; // 로그인 시 로그아웃 타임스탬프 클리어
  console.log(
    "✅ [auth] Auth state updated:",
    user ? user.email || user.uid : "null"
  );
  syncAuthToOffscreen(user, { idToken, refreshToken });
  broadcastAuthState(user, { idToken, refreshToken });
}

function handleLogout() {
  backgroundState.currentUser = null;
  backgroundState.currentRefreshToken = null;
  backgroundState.offscreenSynced = false;
  backgroundState.logoutTimestamp = Date.now(); // 로그아웃 시간 기록
  console.log("✅ [auth] Auth state cleared");
  syncAuthToOffscreen(null, { refreshToken: null });
  broadcastAuthState(null, { idToken: null, refreshToken: null });
}

function syncAuthToOffscreen(user, { idToken, refreshToken }) {
  // 로그아웃 시 명시적으로 null 전송
  const message = {
    type: "OFFSCREEN_AUTH_STATE_CHANGED",
    user: user ?? null,
    refreshToken: user
      ? refreshToken ?? backgroundState.currentRefreshToken ?? null
      : null,
  };
  if (user && idToken) {
    message.idToken = idToken;
  }

  console.log(
    "📤 [background] Syncing auth to offscreen:",
    user ? user.uid : "null"
  );
  sendToOffscreen(message).catch((error) => {
    console.warn("⚠️ Failed to send auth to offscreen:", error.message);
  });
}

function broadcastAuthState(user, { refreshToken, idToken }) {
  // 로그아웃 시 명시적으로 null payload 전송
  const payload = user
    ? {
        user,
        refreshToken: refreshToken ?? backgroundState.currentRefreshToken,
        idToken: idToken ?? null,
      }
    : {
        user: null,
        refreshToken: null,
        idToken: null,
      };

  console.log(
    "📢 [background] Broadcasting AUTH_STATE_CHANGED:",
    payload.user ? payload.user.uid : "null"
  );
  chrome.runtime.sendMessage(
    {
      type: "AUTH_STATE_CHANGED",
      ...payload,
    },
    () => {
      if (chrome.runtime.lastError) {
        // popup이 열려있지 않을 수 있으므로 무시
        console.log(
          "⚠️ [background] Popup not open or message failed:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("✅ [background] AUTH_STATE_CHANGED message sent to popup");
      }
    }
  );

  sendMessageToWebTabs({ type: "WEB_AUTH_STATE_CHANGED", payload });
}

// ============================================================================
// Utility Functions
// ============================================================================

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

// ============================================================================
// Broadcast Functions
// ============================================================================

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

async function getAuthStateFromWebTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: WEB_URL_PATTERNS }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        resolve(null);
        return;
      }

      // 첫 번째 탭에서 인증 상태 요청
      const tab = tabs[0];
      if (typeof tab.id !== "number") {
        resolve(null);
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "REQUEST_WEB_AUTH_STATE" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "⚠️ Failed to request auth state from web tab:",
              chrome.runtime.lastError.message
            );
            resolve(null);
            return;
          }

          if (response?.ok && response?.payload?.user && response?.payload?.idToken) {
            resolve({
              user: response.payload.user,
              idToken: response.payload.idToken,
              refreshToken: response.payload.refreshToken || null,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  });
}
