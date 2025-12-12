

const firebaseConfig = {
  apiKey: "_FIREBASE_API_KEY_",
  authDomain: "_FIREBASE_AUTH_DOMAIN_",
  projectId: "_FIREBASE_PROJECT_ID_",
  storageBucket: "_FIREBASE_STORAGE_BUCKET_",
  messagingSenderId: "_FIREBASE_MESSAGING_SENDER_ID_",
  appId: "_FIREBASE_APP_ID_",
}

console.log("🔧 Firebase config loaded:", {
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + "...",
  projectId: firebaseConfig.projectId,
});

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Firestore만 필요 (Auth는 사용 안함)

// 현재 인증된 유저 info
let currentUser = null;
let currentIdToken = null;
let tokenExpiresAt = 0;
let currentRefreshToken = null;
let authRestorePromise = restoreAuthFromStorage();
let refreshingTokenPromise = null;
let iframeReady = false;
const iframeReadyWaiters = [];
const IFRAME_READY_TIMEOUT = 5000;

function restoreAuthFromStorage() {
  if (!chrome.storage?.local) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["currentUser", "currentIdToken", "currentRefreshToken", "lastLoginTime"],
      async (result) => {
        if (!result.currentUser) {
          resolve(false);
          return;
        }

        const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);
        if (hoursSinceLogin >= 24) {
          chrome.storage.local.remove(["currentUser", "currentIdToken", "currentRefreshToken", "lastLoginTime"]);
          resolve(false);
          return;
        }

        currentUser = result.currentUser;
        currentIdToken = result.currentIdToken || null;
        currentRefreshToken = result.currentRefreshToken || null;
        if (currentIdToken) {
          tokenExpiresAt = parseJwtExp(currentIdToken);
        }

        if (!currentIdToken && currentRefreshToken) {
          try {
            await refreshIdTokenUsingRefreshToken();
          } catch (error) {
            console.warn("⚠️ [offscreen] Failed to refresh token during restore:", error.message);
          }
        }

        if (currentUser) {
          console.log("🔄 [offscreen] Restored auth from storage:", currentUser.email || currentUser.uid);
        }
        resolve(!!currentIdToken);
      }
    );
  });
}

async function ensureAuthReady() {
  if (authRestorePromise) {
    await authRestorePromise;
    authRestorePromise = null;
  }
}

function persistAuthSnapshot() {
  if (!chrome.storage?.local) return;
  if (!currentUser && !currentIdToken && !currentRefreshToken) {
    chrome.storage.local.remove(["currentUser", "currentIdToken", "currentRefreshToken", "lastLoginTime"]);
    return;
  }

  chrome.storage.local.set({
    currentUser,
    currentIdToken,
    currentRefreshToken,
    lastLoginTime: Date.now(),
  });
}

function markIframeReady() {
  if (iframeReady) return;
  iframeReady = true;
  while (iframeReadyWaiters.length) {
    const waiter = iframeReadyWaiters.shift();
    if (!waiter) continue;
    clearTimeout(waiter.timeoutId);
    waiter.resolve();
  }
}

function waitForIframeReady() {
  if (iframeReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const index = iframeReadyWaiters.findIndex((entry) => entry.timeoutId === timeoutId);
      if (index >= 0) {
        iframeReadyWaiters.splice(index, 1);
      }
      reject(new Error("IFRAME_READY_TIMEOUT"));
    }, IFRAME_READY_TIMEOUT);

    iframeReadyWaiters.push({ resolve, reject, timeoutId });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("auth-iframe");
  if (iframe) {
    try {
      const baseSrc = iframe.getAttribute("src") || "";
      const url = new URL(baseSrc, location.origin);
      url.searchParams.set("extension", "true");
      url.searchParams.set("iframe", "true");
      const extId = chrome.runtime?.id || "";
      if (extId) {
        url.searchParams.set("extensionId", extId);
      }
      iframe.setAttribute("src", url.toString());
    } catch (error) {
      console.warn("⚠️ [offscreen] Failed to configure iframe src:", error);
    }
  }
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === "IFRAME_READY") {
    markIframeReady();
    return;
  }

  if (msg.type === "AUTH_STATE_CHANGED") {
    if (msg.user && msg.idToken) {
      currentUser = msg.user;
      currentIdToken = msg.idToken;
      tokenExpiresAt = parseJwtExp(currentIdToken);
      if (msg.refreshToken) currentRefreshToken = msg.refreshToken;
      persistAuthSnapshot();
      console.log("✅ [offscreen] AUTH_STATE_CHANGED received from iframe:", currentUser.email || currentUser.uid);
    } else {
      currentUser = null;
      currentIdToken = null;
      currentRefreshToken = null;
      tokenExpiresAt = 0;
      persistAuthSnapshot();
      console.log("✅ [offscreen] AUTH_STATE_CHANGED logout received from iframe");
    }
  }
});

/**
 * iframe(React 웹)에게 Fresh ID Token/Refresh Token 요청
 */
async function getFreshIdTokenFromIframe() {
  await waitForIframeReady();
  return new Promise((resolve, reject) => {
    const iframe = document.getElementById("auth-iframe");
    if (!iframe || !iframe.contentWindow) {
      return reject(new Error("IFRAME_NOT_READY"));
    }

    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      reject(new Error("IFRAME_TOKEN_TIMEOUT"));
    }, 5000);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      const { type, idToken, refreshToken, error } = event.data || {};
      if (type === "FRESH_ID_TOKEN" && idToken) {
        resolve({ idToken, refreshToken: refreshToken || null });
      } else {
        reject(new Error(error || "IFRAME_NO_TOKEN"));
      }
    };

    iframe.contentWindow.postMessage(
      { type: "GET_FRESH_ID_TOKEN" },
      "*",
      [channel.port2]
    );
  });
}

async function refreshIdTokenUsingRefreshToken() {
  if (!currentRefreshToken) throw new Error("NO_REFRESH_TOKEN");
  if (refreshingTokenPromise) return refreshingTokenPromise;

  const url = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentRefreshToken,
  });

  refreshingTokenPromise = (async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await response.json();
    if (!response.ok || !data.id_token) {
      throw new Error(data.error?.message || "REFRESH_FAILED");
    }
    currentIdToken = data.id_token;
    tokenExpiresAt = parseJwtExp(currentIdToken);
    if (data.refresh_token) {
      currentRefreshToken = data.refresh_token;
    }
    persistAuthSnapshot();
    console.log("✅ [offscreen] Token refreshed via refresh_token");
    return currentIdToken;
  })().finally(() => {
    refreshingTokenPromise = null;
  });

  return refreshingTokenPromise;
}

async function ensureFreshIdToken() {
  await ensureAuthReady();

  if (!currentUser) return;
  const now = Date.now();
  const isExpired = !currentIdToken || (tokenExpiresAt && tokenExpiresAt <= now);
  const isExpiringSoon = tokenExpiresAt && tokenExpiresAt - now < 5 * 60 * 1000;

  if (!isExpired && !isExpiringSoon) return;

  if (currentRefreshToken) {
    try {
      await refreshIdTokenUsingRefreshToken();
      return;
    } catch (error) {
      console.warn("⚠️ [offscreen] Refresh via refresh_token failed:", error.message);
    }
  }

  try {
    const { idToken, refreshToken } = await getFreshIdTokenFromIframe();
    currentIdToken = idToken;
    tokenExpiresAt = parseJwtExp(currentIdToken);
    if (refreshToken) currentRefreshToken = refreshToken;
    persistAuthSnapshot();
    console.log("✅ [offscreen] Token refreshed via iframe");
  } catch (error) {
    console.error("❌ [offscreen] Failed to refresh token via iframe:", error.message);
    throw error;
  }
}

// background에서 메시지 수신
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    // 컬렉션 추가
    if (msg.type === "OFFSCREEN_ADD_COLLECTION") {
      addCollection(msg.payload)
        .then((result) => {
          sendResponse({ ok: true, result });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error.message });
        });
      return true; // 비동기 응답 대기
    }
  console.log("📨 Offscreen received:", msg.type);

  // OFFSCREEN_ 접두사가 없는 메시지는 무시 (offscreen 전용 메시지만 처리)
  if (!msg.type || !msg.type.startsWith("OFFSCREEN_")) {
    return false;
  }

  // 인증 상태 업데이트 (Background에서 동기화)
  if (msg.type === "OFFSCREEN_AUTH_STATE_CHANGED") {
    (async () => {
      if (!msg.user) {
        currentUser = null;
        currentIdToken = null;
        currentRefreshToken = null;
        tokenExpiresAt = 0;
        persistAuthSnapshot();
        console.log("✅ User logged out");

        const iframe = document.getElementById("auth-iframe");
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: "AUTH_STATE_CHANGED",
            user: null,
            idToken: null,
            refreshToken: null,
          }, "*");
        }
        sendResponse({ ok: true });
        return;
      }

      currentUser = msg.user;
      if (msg.idToken) {
        currentIdToken = msg.idToken;
        tokenExpiresAt = parseJwtExp(currentIdToken);
      } else {
        currentIdToken = null;
        tokenExpiresAt = 0;
      }
      if (msg.refreshToken) {
        currentRefreshToken = msg.refreshToken;
      }
      if (!currentIdToken) {
        try {
          await ensureFreshIdToken();
        } catch (error) {
          console.warn("⚠️ [offscreen] Failed to refresh token from background payload:", error.message);
        }
      }
      persistAuthSnapshot();
      console.log("🔐 Received auth payload:", currentUser.email || currentUser.uid);

      const iframe = document.getElementById("auth-iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: "AUTH_STATE_CHANGED",
          user: currentUser,
          idToken: currentIdToken,
          refreshToken: currentRefreshToken,
        }, "*");
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  // 북마크 저장
  if (msg.type === "OFFSCREEN_SAVE_BOOKMARK") {
    saveBookmark(msg.payload)
      .then((result) => {
        sendResponse({ ok: true, result });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // 비동기 응답 대기
  }

  // 북마크 목록 조회
  if (msg.type === "OFFSCREEN_LIST_BOOKMARKS") {
    listBookmarks()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // 비동기 응답 대기
  }

  // 컬렉션 목록 조회
  if (msg.type === "OFFSCREEN_GET_COLLECTIONS") {
    getCollections()
      .then((collections) => {
        sendResponse({ ok: true, collections });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // 비동기 응답 대기
  }

  return false;
});

// 컬렉션 목록 조회 (REST API 사용)
async function getCollections() {
  await ensureAuthReady();
  await ensureFreshIdToken();

  if (!currentUser) {
    return [];
  }

  if (!currentIdToken) {
    console.warn("⚠️ No idToken for getting collections");
    return [];
  }

  try {
    const userId = currentUser.uid;
    console.log("📁 Loading collections via REST API for:", userId);

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentIdToken}`,
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "collections" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "userId" },
                op: "EQUAL",
                value: { stringValue: userId },
              },
            },
          },
        }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 컬렉션 조회 실패");
    }
    const data = await response.json();
    const collections = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const fields = doc.fields || {};
        return {
          id: doc.name.split("/").pop(),
          name: fields.name?.stringValue || "",
          icon: fields.icon?.stringValue || "📁",
          order: fields.order?.integerValue || 0,
          userId: fields.userId?.stringValue || "",
        };
      });
    console.log("✅ Collections loaded:", collections.length);

    return collections;
  } catch (e) {
    console.error("❌ Firestore collections error:", e);
    return [];
  }
}

// 컬렉션 추가 (REST API)
async function addCollection({ name, icon }) {
  await ensureAuthReady();
  await ensureFreshIdToken();

  if (!currentUser) {
    const error = "로그인이 필요합니다.";
    console.error("❌", error);
    throw new Error(error);
  }

  if (!currentIdToken) {
    const error = "인증 토큰이 없습니다. 다시 로그인해주세요.";
    console.error("❌", error);
    throw new Error(error);
  }

  try {
    const userId = currentUser.uid;
    const now = new Date().toISOString();
    const fields = {
      name: { stringValue: name },
      icon: { stringValue: icon || "Folder" },
      description: { stringValue: "" },
      isPinned: { booleanValue: false },
      parentId: { nullValue: null },
      userId: { stringValue: userId },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    };
    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/collections`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentIdToken}`,
        },
        body: JSON.stringify({ fields }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 컬렉션 추가 실패");
    }
    const result = await response.json();
    console.log("✅ Collection added:", { name, id: result.name });

    return result;
  } catch (e) {
    console.error("❌ Firestore add collection error:", e);
    throw e;
  }
}

// Firestore에 북마크 저장 (REST API 사용)
async function saveBookmark({ url, title, collectionId, description, tags, favicon }) {
  await ensureAuthReady();
  await ensureFreshIdToken();

  if (!currentUser) {
    const error = "로그인이 필요합니다.";
    console.error("❌", error);
    throw new Error(error);
  }

  if (!currentIdToken) {
    const error = "인증 토큰이 없습니다. 다시 로그인해주세요.";
    console.error("❌", error);
    throw new Error(error);
  }

  try {
    const userId = currentUser.uid;
    console.log("💾 Saving bookmark via REST API:", { url, title, userId, collectionId });

    const fields = {
      userId: { stringValue: userId },
      url: { stringValue: url },
      title: { stringValue: title },
      description: { stringValue: description || "" },
      isFavorite: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() },
    };

    if (collectionId) {
      fields.collection = { stringValue: collectionId };
    }
    if (tags && Array.isArray(tags) && tags.length > 0) {
      fields.tags = {
        arrayValue: {
          values: tags.map(tag => ({ stringValue: tag }))
        }
      };
    }
    if (favicon) {
      fields.favicon = { stringValue: favicon };
    }

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/bookmarks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentIdToken}`,
        },
        body: JSON.stringify({ fields }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 저장 실패");
    }
    const result = await response.json();
    console.log("✅ Bookmark saved:", { url, title, id: result.name });
    return result;
  } catch (e) {
    console.error("❌ Firestore error:", e);
    throw e;
  }
}

// 현재 유저의 북마크 목록 조회 (REST API 사용)
async function listBookmarks() {
  await ensureAuthReady();
  await ensureFreshIdToken();

  if (!currentUser) {
    chrome.runtime.sendMessage({
      type: "BOOKMARKS_SYNC",
      bookmarks: [],
    });
    return;
  }

  if (!currentIdToken) {
    console.warn("⚠️ No idToken for listing bookmarks");
    chrome.runtime.sendMessage({
      type: "BOOKMARKS_SYNC",
      bookmarks: [],
    });
    return;
  }

  try {
    const userId = currentUser.uid;
    console.log("📚 Loading bookmarks via REST API for:", userId);

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentIdToken}`,
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "bookmarks" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "userId" },
                op: "EQUAL",
                value: { stringValue: userId },
              },
            },
          },
        }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 조회 실패");
    }
    const data = await response.json();
    const bookmarks = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const fields = doc.fields || {};
        return {
          id: doc.name.split("/").pop(),
          url: fields.url?.stringValue || "",
          title: fields.title?.stringValue || "",
          userId: fields.userId?.stringValue || "",
          createdAt: fields.createdAt?.timestampValue || null,
        };
      });
    chrome.runtime.sendMessage({
      type: "BOOKMARKS_SYNC",
      bookmarks,
    });
    console.log("✅ Bookmarks loaded:", bookmarks.length);
  } catch (e) {
    console.error("❌ Firestore list error:", e);
    chrome.runtime.sendMessage({
      type: "BOOKMARK_ERROR",
      error: e.message || "북마크 목록 로딩 실패",
    });
    throw e;
  }
}


// Offscreen 문서 로드 완료 시 background에 준비 완료 알림
console.log("🚀 [offscreen] Document loaded and ready");

(async () => {
  await ensureAuthReady();
  try {
    chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }, async (response) => {
      if (chrome.runtime.lastError) {
        console.warn("⚠️ [offscreen] OFFSCREEN_READY failed:", chrome.runtime.lastError.message);
        return;
      }

      if (response?.type === "INIT_AUTH" && response.user) {
        if (!currentUser) {
          currentUser = response.user;
          console.log("✅ [offscreen] Initial user info received from background:", currentUser.email || currentUser.uid);
        }
        if (response.refreshToken) {
          currentRefreshToken = response.refreshToken;
        }
        if (!currentIdToken && currentRefreshToken) {
          try {
            await ensureFreshIdToken();
          } catch (error) {
            console.warn("⚠️ [offscreen] Failed to refresh token from INIT_AUTH:", error.message);
          }
        }
        persistAuthSnapshot();
      }
    });
  } catch (error) {
    console.warn("⚠️ [offscreen] Failed to send OFFSCREEN_READY:", error);
  }
})();
function parseJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}
