// background.js - 인증 관리 + Firestore(offscreen) 조율
// Background가 주요 인증 상태를 관리하고, Popup은 Background에서 직접 조회

const OFFSCREEN_URL = "offscreen-simple.html";
const AUTH_CACHE_KEYS = ["currentUser", "currentIdToken", "tokenExpiresAt", "lastLoginTime"];

// 메모리: 빠른 접근용
let currentUser = null;
let currentIdToken = null;
let tokenExpiresAt = 0;
let offscreenSynced = false; // Offscreen 초기 동기화 완료 플래그

// 확장 시작 시 크롬스토리지에서 인증 정보 복원
async function restoreAuthFromStorage() {
  if (!chrome.storage?.local) return;

  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_CACHE_KEYS, (result) => {
      if (result.currentUser && result.currentIdToken) {
        const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);

        // 24시간 이내면 복원
        if (hoursSinceLogin < 24) {
          currentUser = result.currentUser;
          currentIdToken = result.currentIdToken;
          tokenExpiresAt = result.tokenExpiresAt || 0;
          console.log("🔄 Restored user from chrome.storage.local:", currentUser.email || currentUser.uid);
          resolve(true);
        } else {
          console.log("⏰ Token expired, clearing chrome.storage.local");
          chrome.storage.local.remove(AUTH_CACHE_KEYS);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}

// 인증 정보 저장 (메모리 + Storage)
function saveAuthToStorage(user, idToken, expiresAt) {
  currentUser = user;
  currentIdToken = idToken;
  tokenExpiresAt = expiresAt || 0;
  offscreenSynced = false; // 새 인증 상태이므로 동기화 필요

  if (chrome.storage?.local && user && idToken) {
    chrome.storage.local.set({
      currentUser: user,
      currentIdToken: idToken,
      tokenExpiresAt: expiresAt,
      lastLoginTime: Date.now(),
    }, () => {
      console.log("✅ Auth saved to storage:", user.email || user.uid);
    });
  }
}

// 인증 정보 삭제
function clearAuth() {
  currentUser = null;
  currentIdToken = null;
  tokenExpiresAt = 0;
  offscreenSynced = false; // 로그아웃 상태 동기화 필요

  if (chrome.storage?.local) {
    chrome.storage.local.remove(AUTH_CACHE_KEYS, () => {
      console.log("✅ Auth cleared from storage");
    });
  }
}

// 시작 시 저장된 인증 정보 복원
restoreAuthFromStorage();

// offscreen 문서가 없으면 생성 (chrome.offscreen이 없으면 경고만 출력)
async function ensureOffscreenDocument() {
  if (!chrome.offscreen) {
    console.warn("chrome.offscreen is not available in this context. Skipping offscreen document creation.");
    return;
  }
  try {
    const has = await chrome.offscreen.hasDocument();
    if (has) return;

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: "Firestore bookmark backend operations"
    });

    // Offscreen 생성 후 플래그 초기화 (초기 동기화가 필요함)
    offscreenSynced = false;
  } catch (error) {
    // 이미 존재하는 경우 에러 무시
    if (!error.message?.includes("Only a single offscreen")) {
      console.error("Failed to create offscreen document:", error);
    }
  }
}

// JWT exp 파싱 함수
function parseJwtExp(idToken) {
  try {
    const [, payloadBase64] = idToken.split(".");
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.exp * 1000; // seconds to milliseconds
  } catch (e) {
    return 0;
  }
}

// 외부 웹 페이지(새 탭)에서 오는 인증 메시지 처리
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("📨 External message received:", msg.type, "from:", sender.url);

  if (msg.type === "AUTH_STATE_CHANGED") {
    if (msg.user && msg.idToken) {
      // Background에 인증 정보 저장
      const expiresAt = parseJwtExp(msg.idToken);
      saveAuthToStorage(msg.user, msg.idToken, expiresAt);

      // Offscreen에 동기화
      ensureOffscreenDocument()
        .then(() => {
          chrome.runtime.sendMessage({
            type: "OFFSCREEN_AUTH_STATE_CHANGED",
            user: msg.user,
            idToken: msg.idToken,
          });
        })
        .catch((error) => {
          console.error("Failed to sync auth to offscreen:", error);
        });

      // Popup에 브로드캐스트
      chrome.runtime.sendMessage({
        type: "AUTH_STATE_CHANGED",
        user: msg.user,
      }).catch(() => {
        // popup이 닫혀있으면 에러 무시
      });
    } else if (!msg.user) {
      // 로그아웃
      clearAuth();
      ensureOffscreenDocument()
        .then(() => {
          chrome.runtime.sendMessage({
            type: "OFFSCREEN_AUTH_STATE_CHANGED",
            user: null,
          });
        });

      chrome.runtime.sendMessage({
        type: "AUTH_STATE_CHANGED",
        user: null,
      }).catch(() => {});
    }

    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// popup/content/offscreen에서 오는 내부 메시지 처리
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 컬렉션 추가 요청 → offscreen으로 전달
  if (msg.type === "ADD_COLLECTION") {
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_ADD_COLLECTION",
          payload: msg.payload,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Offscreen add collection error:", chrome.runtime.lastError.message);
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to add collection:", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // offscreen에서 온 OFFSCREEN_READY 메시지는 특별 처리
  if (msg.type === "OFFSCREEN_READY") {
    // 인증 상태를 offscreen에 동기화 (중복 방지)
    if (!offscreenSynced && currentUser && currentIdToken) {
      offscreenSynced = true;
      chrome.runtime.sendMessage({
        type: "OFFSCREEN_AUTH_STATE_CHANGED",
        user: currentUser,
        idToken: currentIdToken,
      }).catch(() => {
        // 에러 발생 시 플래그 초기화 (다음 시도에서 재동기화)
        offscreenSynced = false;
      });
    }
    return false;
  }

  // offscreen에서 온 메시지는 무시 (무한 루프 방지)
  if (sender.url && sender.url.includes("offscreen-simple.html")) {
    return false;
  }

  console.log("📨 Background received from popup:", msg.type);

  // 현재 인증 상태 요청 - Background에서 직접 반환 (빠름)
  if (msg.type === "GET_AUTH_STATE") {
    sendResponse({ user: currentUser });
    return false;
  }

  // 로그아웃
  if (msg.type === "LOGOUT") {
    clearAuth();

    // offscreen에 로그아웃 전달
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_AUTH_STATE_CHANGED",
          user: null,
        }).catch(() => {});
      });

    // popup에 브로드캐스트
    chrome.runtime.sendMessage({
      type: "AUTH_STATE_CHANGED",
      user: null,
    }).catch(() => {});

    sendResponse({ ok: true });
    return false;
  }

  // 북마크 저장 요청 → offscreen으로 전달
  if (msg.type === "SAVE_BOOKMARK") {
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_SAVE_BOOKMARK",
          payload: msg.payload,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Offscreen bookmark save error:", chrome.runtime.lastError.message);
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to save bookmark:", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // 북마크 목록 요청 → offscreen으로 전달
  if (msg.type === "LIST_BOOKMARKS") {
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({ type: "OFFSCREEN_LIST_BOOKMARKS" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Offscreen list bookmarks error:", chrome.runtime.lastError.message);
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true });
          }
        });
      })
      .catch((error) => {
        console.error("Failed to list bookmarks:", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  // 컬렉션 목록 요청 → offscreen으로 전달
  if (msg.type === "GET_COLLECTIONS") {
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({ type: "OFFSCREEN_GET_COLLECTIONS" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Offscreen get collections error:", chrome.runtime.lastError.message);
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to get collections:", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  return false;
});

// offscreen에서 오는 메시지 브로드캐스트는 제거 (응답으로만 처리)
