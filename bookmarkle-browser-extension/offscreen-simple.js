// 컬렉션 추가 (REST API)
async function addCollection({ name, icon }) {
  if (!currentUser) {
    const error = "로그인이 필요합니다.";
    console.error("❌", error);
    throw new Error(error);
  }

  // 토큰 만료 체크 및 갱신
  await ensureFreshIdToken();

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
    if (response.status === 401) {
      console.warn("⚠️ [addCollection] 401 Unauthorized - Retrying with fresh token");
      await ensureFreshIdToken();
      response = await fetch(
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
    }
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
let tokenExpiresAt = 0;
let authInitialized = false;
let iframeReady = false; // iframe 준비 상태 추적

// JWT exp 파싱 함수
function parseJwtExp(idToken) {
  try {
    const [, payloadBase64] = idToken.split(".");
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.exp * 1000;
  } catch (e) { return 0; }
}

// React 웹에서 인증 정보 수신 (window.postMessage)
// --- iframe src에 extensionId 파라미터 동적 추가 ---
document.addEventListener("DOMContentLoaded", () => {
  const iframe = document.getElementById("auth-iframe");
  if (iframe) {
    let src = iframe.getAttribute("src") || "";
    // 이미 ?가 있으면 &로, 없으면 ?로 구분
    const hasQuery = src.includes("?");
    const extId = chrome.runtime?.id || "";
    src += hasQuery ? `&extensionId=${extId}` : `?&extensionId=${extId}`;
    iframe.setAttribute("src", src);
  }
});

window.addEventListener("message", (event) => {
  const msg = event.data;
  console.log("[offscreen] window.message received:", msg);

  // iframe 준비 완료 메시지
  if (msg && msg.type === "IFRAME_READY") {
    iframeReady = true;
    console.log("✅ [offscreen] iframe is ready");
    return;
  }

  if (!msg || msg.type !== "AUTH_STATE_CHANGED") return;
  if (msg.user && msg.idToken) {
    // 로그인
    currentUser = msg.user;
    currentIdToken = msg.idToken;
    tokenExpiresAt = parseJwtExp(msg.idToken);
    authInitialized = true;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        currentUser,
        currentIdToken,
        lastLoginTime: Date.now()
      });
    }
    console.log("✅ [offscreen] AUTH_STATE_CHANGED received from React:", currentUser.email);
  } else {
    // 로그아웃
    currentUser = null;
    currentIdToken = null;
    tokenExpiresAt = 0;
    authInitialized = true;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"]);
    }
    console.log("✅ [offscreen] User logged out via AUTH_STATE_CHANGED from React");
  }
});

/**
 * iframe(React 웹)에게 Fresh ID Token 요청
 * @returns {Promise<string>} Fresh ID Token
 */
function getFreshIdTokenFromIframe() {
  return new Promise((resolve, reject) => {
    const authIframe = document.getElementById("auth-iframe");
  
    if (!authIframe || !authIframe.contentWindow) {
      return reject(new Error("auth iframe not ready"));
    }

    const channel = new MessageChannel();
    const TIMEOUT_MS = 5000; // 5초 타임아웃
    let timeoutId;

    channel.port1.onmessage = (event) => {
      clearTimeout(timeoutId);
      const { type, idToken, error } = event.data || {};
      if (type === "FRESH_ID_TOKEN" && idToken) {
        resolve(idToken);
      } else {
        reject(new Error(error || "NO_ID_TOKEN"));
      }
    };

    // 타임아웃 설정
    timeoutId = setTimeout(() => {
      reject(new Error("iframe token request timeout"));
    }, TIMEOUT_MS);

    // iframe(React 웹)에게 fresh 토큰 요청
    authIframe.contentWindow.postMessage(
      { type: "GET_FRESH_ID_TOKEN" },
      "*",
      [channel.port2]
    );
  });
}

/**
 * Fresh ID Token 확보
 * - 토큰이 없거나, 만료되었거나, 만료 임박(10분 이내)이면 iframe에게 fresh 토큰 요청
 * - 새 토큰을 받으면 currentIdToken과 tokenExpiresAt 업데이트
 */
async function ensureFreshIdToken() {
  if (!currentUser) {
    console.warn("⚠️ [ensureFreshIdToken] No user logged in");
    return;
  }

  const now = Date.now();
  const isExpired = tokenExpiresAt && tokenExpiresAt < now;
  const isExpiringSoon = tokenExpiresAt && tokenExpiresAt - now < 10 * 60 * 1000;

  if (!currentIdToken || isExpired || isExpiringSoon) {
    console.log("🔄 [ensureFreshIdToken] Token needs refresh - requesting from iframe");

    try {
      const freshToken = await getFreshIdTokenFromIframe();
      currentIdToken = freshToken;
      tokenExpiresAt = parseJwtExp(freshToken);
      console.log("✅ [ensureFreshIdToken] Fresh token received and updated");

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          currentIdToken,
          lastLoginTime: Date.now(),
        });
      }
    } catch (error) {
      console.error("❌ [ensureFreshIdToken] Failed to get fresh token:", error);

      if (
        error.message === "NO_USER" ||
        error.message === "NO_ID_TOKEN" ||
        error.message === "auth iframe not ready" ||
        error.message === "iframe token request timeout"
      ) {
        console.warn("⚠️ [ensureFreshIdToken] iframe not ready - trying to restore from storage");

        // Fallback: chrome.storage에서 토큰 복원 시도
        if (!currentIdToken && chrome.storage && chrome.storage.local) {
          try {
            const stored = await chrome.storage.local.get(["currentIdToken", "lastLoginTime"]);
            if (stored.currentIdToken && stored.lastLoginTime) {
              const storedTokenExp = parseJwtExp(stored.currentIdToken);
              if (storedTokenExp && storedTokenExp > Date.now()) {
                currentIdToken = stored.currentIdToken;
                tokenExpiresAt = storedTokenExp;
                console.log("✅ [ensureFreshIdToken] Token restored from chrome.storage");
                return;
              } else {
                console.warn("⚠️ [ensureFreshIdToken] Stored token is expired");
              }
            }
          } catch (storageError) {
            console.error("❌ [ensureFreshIdToken] Failed to restore from storage:", storageError);
          }
        }

        console.warn("⚠️ [ensureFreshIdToken] Will proceed with current token (may be null)");
        return;
      }

      throw error;
    }
  }
}

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

// 현재 인증된 유저 정보 (Background에서 동기화)
let currentUser = null;
let currentIdToken = null;

// offscreen 시작 시 storage에서 토큰 복원
async function restoreTokenFromStorage() {
  if (!chrome.storage?.local) return;

  return new Promise((resolve) => {
    chrome.storage.local.get(["currentUser", "currentIdToken", "lastLoginTime"], (result) => {
      if (result.currentUser && result.currentIdToken) {
        const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);

        // 24시간 이내면 복원
        if (hoursSinceLogin < 24) {
          currentUser = result.currentUser;
          currentIdToken = result.currentIdToken;
          tokenExpiresAt = parseJwtExp(result.currentIdToken);
          authInitialized = true;
          console.log("🔄 [offscreen] Restored token from storage:", currentUser.email || currentUser.uid);

          // iframe에 복원된 인증 정보 전달 (iframe 로드 대기 후)
          setTimeout(() => {
            const authIframe = document.getElementById("auth-iframe");
            if (authIframe && authIframe.contentWindow) {
              authIframe.contentWindow.postMessage({
                type: "AUTH_STATE_CHANGED",
                user: currentUser,
                idToken: currentIdToken
              }, "*");
              console.log("📤 [offscreen] Sent restored auth to iframe");
            }
          }, 1000); // iframe 로드 대기

          resolve(true);
        } else {
          console.log("⏰ [offscreen] Token expired, clearing storage");
          chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"]);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}

// offscreen 시작 시 즉시 토큰 복원 실행
restoreTokenFromStorage();

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
    if (!msg.user) {
      // 로그아웃
      currentUser = null;
      currentIdToken = null;
      // Storage 클리어
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"]);
      }
      console.log("✅ User logged out");

      // iframe에 로그아웃 전달
      const authIframe = document.getElementById("auth-iframe");
      if (authIframe && authIframe.contentWindow) {
        authIframe.contentWindow.postMessage({
          type: "AUTH_STATE_CHANGED",
          user: null,
          idToken: null
        }, "*");
        console.log("📤 [offscreen] Sent logout to iframe");
      }
    } else if (msg.idToken) {
      // 로그인 - idToken과 user 정보 저장
      currentUser = msg.user;
      currentIdToken = msg.idToken;
      tokenExpiresAt = parseJwtExp(msg.idToken);
      // Storage 저장
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          currentUser,
          currentIdToken,
          lastLoginTime: Date.now()
        });
      }
      console.log("🔐 Received idToken from background:", msg.user.email);

      // iframe에 인증 정보 전달 (iframe이 Firebase Auth 초기화 가능하도록)
      const authIframe = document.getElementById("auth-iframe");
      if (authIframe && authIframe.contentWindow) {
        authIframe.contentWindow.postMessage({
          type: "AUTH_STATE_CHANGED",
          user: msg.user,
          idToken: msg.idToken
        }, "*");
        console.log("📤 [offscreen] Sent auth to iframe for Firebase initialization");
      }
    } else {
      // 사용자 정보만 동기화 (OFFSCREEN_READY 시)
      currentUser = msg.user;
      console.log("✅ User updated:", msg.user.email);
    }

    sendResponse({ ok: true });
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

// Firestore에 북마크 저장 (REST API 사용)
async function saveBookmark({ url, title, collectionId, description, tags, favicon }) {
  if (!currentUser) {
    const error = "로그인이 필요합니다.";
    console.error("❌", error);
    throw new Error(error);
  }

  // 토큰 만료 체크 및 갱신
  await ensureFreshIdToken();

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
    if (response.status === 401) {
      console.warn("⚠️ [saveBookmark] 401 Unauthorized - Retrying with fresh token");
      await ensureFreshIdToken();
      response = await fetch(
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
    }
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
    if (response.status === 401) {
      console.warn("⚠️ [listBookmarks] 401 Unauthorized - Retrying with fresh token");
      await ensureFreshIdToken();
      response = await fetch(
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
    }
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

// 컬렉션 목록 조회 (REST API 사용)
async function getCollections() {
  if (!currentUser) {
    return [];
  }

  // 토큰 만료 체크 및 갱신
  await ensureFreshIdToken();

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
    if (response.status === 401) {
      console.warn("⚠️ [getCollections] 401 Unauthorized - Retrying with fresh token");
      await ensureFreshIdToken();
      response = await fetch(
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
    }
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

// Offscreen 문서 로드 완료 시 background에 준비 완료 알림
console.log("🚀 [offscreen] Document loaded and ready");

// OFFSCREEN_READY 메시지 전송 (에러 처리)
try {
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }, (response) => {
    // chrome.runtime.lastError 체크
    if (chrome.runtime.lastError) {
      console.warn("⚠️ [offscreen] OFFSCREEN_READY failed:", chrome.runtime.lastError.message);
      return;
    }

    // Background로부터 초기 인증 정보 수신
    if (response?.type === "INIT_AUTH" && response.user) {
      // storage에서 복원하지 못했다면 background로부터 받은 user 사용
      if (!currentUser) {
        currentUser = response.user;
        console.log("✅ [offscreen] Initial user info received from background:", currentUser.email || currentUser.uid);
      } else {
        console.log("✅ [offscreen] User already restored from storage, skipping background sync");
      }
    }
  });
} catch (error) {
  console.warn("⚠️ [offscreen] Failed to send OFFSCREEN_READY:", error);
}
