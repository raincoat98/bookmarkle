// 컬렉션 추가 (REST API)
async function addCollection({ name, icon }) {
  if (!currentUser) {
    const error = "로그인이 필요합니다.";
    console.error("❌", error);
    throw new Error(error);
  }

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

    // 캐시 무효화 (새 컬렉션이 추가되었으므로)
    cachedCollections = null;
    collectionsLastFetched = 0;

    return result;
  } catch (e) {
    console.error("❌ Firestore add collection error:", e);
    throw e;
  }
}
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
// idToken 유효성 검사 함수 (만료 시 경고만 출력)
async function ensureFreshIdToken() {
  const now = Date.now();
  if (!currentIdToken || !currentUser) return;

  // 토큰이 만료되었는지 확인
  if (tokenExpiresAt && tokenExpiresAt < now) {
    console.warn("⚠️ Token expired - please re-login");
    return;
  }

  // 토큰이 5분 이내에 만료 예정이면 경고 (하지만 계속 사용)
  if (tokenExpiresAt && tokenExpiresAt - now < 5 * 60 * 1000) {
    console.warn("⚠️ Token expiring soon (< 5 min) - may need to re-login");
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
      // 캐시 무효화
      cachedCollections = null;
      collectionsLastFetched = 0;
      console.log("✅ User logged out");
    } else if (msg.idToken) {
      // 로그인 - idToken과 user 정보 저장
      currentUser = msg.user;
      currentIdToken = msg.idToken;
      tokenExpiresAt = parseJwtExp(msg.idToken);
      // 캐시 무효화 (새 사용자이므로)
      cachedCollections = null;
      collectionsLastFetched = 0;
      console.log("🔐 Received idToken from background:", msg.user.email);
    } else {
      // 사용자 정보만 동기화
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

// 컬렉션 캐시
let cachedCollections = null;
let collectionsLastFetched = 0;
const COLLECTIONS_CACHE_TTL = 30000; // 30초 캐시 유효 기간

// 컬렉션 목록 조회 (REST API 사용 + 캐싱)
async function getCollections() {
  if (!currentUser) {
    return [];
  }

  // 캐시 확인 - 30초 이내에 가져온 데이터가 있으면 재사용
  const now = Date.now();
  if (cachedCollections && (now - collectionsLastFetched < COLLECTIONS_CACHE_TTL)) {
    console.log("✅ Using cached collections:", cachedCollections.length);
    return cachedCollections;
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

    // 캐시 저장
    cachedCollections = collections;
    collectionsLastFetched = Date.now();

    return collections;
  } catch (e) {
    console.error("❌ Firestore collections error:", e);
    return [];
  }
}
