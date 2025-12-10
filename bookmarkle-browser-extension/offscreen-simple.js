let tokenExpiresAt = 0;

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
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "AUTH_STATE_CHANGED") return;
  if (msg.user && msg.idToken) {
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
  }
});
// 항상 최신 idToken을 받아오는 함수 (만료 임박 시 React에 갱신 요청)
async function ensureFreshIdToken() {
  const now = Date.now();
  if (!currentIdToken || !currentUser) return;
  if (tokenExpiresAt - now > 60_000) return; // 1분 이상 남았으면 그대로 사용
  // 만료 임박 시 React에 갱신 요청
  return new Promise((resolve) => {
    const listener = (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "AUTH_STATE_CHANGED") return;
      if (msg.user && msg.idToken) {
        currentUser = msg.user;
        currentIdToken = msg.idToken;
        tokenExpiresAt = parseJwtExp(msg.idToken);
        window.removeEventListener("message", listener);
        resolve();
      }
    };
    window.addEventListener("message", listener);
    window.postMessage({ type: "REFRESH_ID_TOKEN" }, "*");
  });
}
// 항상 최신 idToken을 받아오는 함수
async function ensureFreshIdToken() {
  if (auth.currentUser) {
    currentIdToken = await auth.currentUser.getIdToken(true);
    // chrome.storage.local에도 갱신
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        currentIdToken,
        lastLoginTime: Date.now()
      });
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
const auth = firebase.auth();
const db = firebase.firestore();

// 현재 인증된 유저 정보
let currentUser = null;
let currentIdToken = null; // idToken 저장
let authInitialized = false;

// offscreen이 완전히 준비되면 background에 READY 신호 전송
function notifyBackgroundReady() {
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });
}

console.log("123");


// Storage에서 인증 정보 복원 (24시간 이내만, chrome.storage.local이 있을 때만)
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["currentUser", "currentIdToken", "lastLoginTime"], (result) => {
    if (result.currentUser && result.currentIdToken) {
      const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);
      if (hoursSinceLogin < 24) {
        currentUser = result.currentUser;
        currentIdToken = result.currentIdToken;
        console.log("🔄 Restored user from chrome.storage.local:", currentUser.email || currentUser.uid);
      } else {
        console.log("⏰ Token expired, clearing chrome.storage.local");
        chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"]);
      }
    }
    // storage 복원 완료 후 background에 준비 신호
    notifyBackgroundReady();
  });
} else {
  // storage가 없을 때도 background에 준비 신호
  notifyBackgroundReady();
}

// Firebase Auth 상태 리스닝
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
    console.log("🔥 Firebase Auth state changed:", currentUser);
  }
  authInitialized = true;
});

// background에서 메시지 수신
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📨 Offscreen received:", msg);

  // OFFSCREEN_ 접두사가 없는 메시지는 무시 (offscreen 전용 메시지만 처리)
  if (!msg.type || !msg.type.startsWith("OFFSCREEN_")) {
    return false;
  }

  // 현재 인증 상태 조회
  if (msg.type === "OFFSCREEN_GET_AUTH_STATE") {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      sendResponse({
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        },
      });
    } else if (currentUser) {
      sendResponse({ user: currentUser });
    } else {
      sendResponse({ user: null });
    }
    return true;
  }

  // 인증 상태 업데이트
  if (msg.type === "OFFSCREEN_AUTH_STATE_CHANGED") {
    const userData = msg.user;

    if (!userData) {
      // 로그아웃
      currentUser = null;
      currentIdToken = null;
      authInitialized = true;
      auth.signOut().catch(() => {});
      // Chrome Storage 정리 (chrome.storage.local이 있을 때만)
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['currentUser', 'currentIdToken', 'lastLoginTime'], () => {
          console.log("✅ Storage cleared");
        });
      }
      sendResponse({ ok: true });
      return true;
    }

    // 로그인 - idToken과 user 정보 저장 (background에서 강제 동기화 포함)
    if (msg.idToken) {
      console.log("🔐 Received idToken from web dashboard or background");
      currentUser = userData;
      currentIdToken = msg.idToken;
      authInitialized = true;
      // Chrome Storage에 저장 (브라우저 재시작 후에도 유지, chrome.storage.local이 있을 때만)
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          currentUser: userData,
          currentIdToken: msg.idToken,
          lastLoginTime: Date.now()
        }, () => {
          console.log("✅ User and idToken saved to storage:", currentUser.email);
        });
      }
      sendResponse({ ok: true, authenticated: true });
      return true;
    }

    // idToken 없이 user 정보만 받은 경우 (동기화)
    currentUser = userData;
    authInitialized = true;
    console.log("✅ Current user updated (no idToken):", currentUser);
    sendResponse({ ok: true, authenticated: false });
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

  // 항상 최신 idToken으로 갱신
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

    // collectionId가 있으면 추가
    if (collectionId) {
      fields.collection = { stringValue: collectionId };
    }

    // tags가 있으면 추가
    if (tags && Array.isArray(tags) && tags.length > 0) {
      fields.tags = {
        arrayValue: {
          values: tags.map(tag => ({ stringValue: tag }))
        }
      };
    }

    // favicon이 있으면 추가
    if (favicon) {
      fields.favicon = { stringValue: favicon };
    }

    // Firestore REST API 사용
    const response = await fetch(
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
    
    // 성공 시 아무것도 브로드캐스트하지 않음 (응답으로만 처리)
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

    // Firestore REST API로 쿼리
    const response = await fetch(
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

// 컬렉션 목록 조회 (REST API 사용)
async function getCollections() {
  if (!currentUser) {
    return [];
  }

  // 항상 최신 idToken으로 갱신
  await ensureFreshIdToken();

  if (!currentIdToken) {
    console.warn("⚠️ No idToken for getting collections");
    return [];
  }

  try {
    const userId = currentUser.uid;
    console.log("📁 Loading collections via REST API for:", userId);

    // Firestore REST API로 쿼리
    const response = await fetch(
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
