// background.js - 인증(새 탭) + Firestore(offscreen) 조율

const OFFSCREEN_URL = "offscreen-simple.html";
let currentUser = null;
let currentIdToken = null;
// 확장 시작 시 크롬스토리지에서 인증 정보 복원 (chrome.storage.local이 있을 때만)
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["currentUser", "currentIdToken", "lastLoginTime"], (result) => {
    if (result.currentUser && result.currentIdToken) {
      const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);
      // 24시간 이내면 복원
      if (hoursSinceLogin < 24) {
        currentUser = result.currentUser;
        currentIdToken = result.currentIdToken;
        console.log("🔄 Restored user from chrome.storage.local:", currentUser.email || currentUser.uid);
        // 오프스크린에 인증 정보 강제 동기화
        ensureOffscreenDocument().then(() => {
          chrome.runtime.sendMessage({
            type: "OFFSCREEN_AUTH_STATE_CHANGED",
            user: currentUser,
            idToken: currentIdToken,
          });
        });
      } else {
        console.log("⏰ Token expired, clearing chrome.storage.local");
        chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"]);
      }
    }
  });
} else {
  console.warn("chrome.storage.local is not available in this context. Skipping auth restore.");
}

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
  } catch (error) {
    // 이미 존재하는 경우 에러 무시
    if (!error.message?.includes("Only a single offscreen")) {
      console.error("Failed to create offscreen document:", error);
    }
  }
}

// 외부 웹 페이지(새 탭)에서 오는 인증 메시지 처리
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("📨 External message received:", msg, "from:", sender);

  if (msg.type === "AUTH_STATE_CHANGED") {
    currentUser = msg.user;

    // 1. offscreen에 인증 상태 전달
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_AUTH_STATE_CHANGED",
          user: msg.user,
          idToken: msg.idToken,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Offscreen message error:", chrome.runtime.lastError.message);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to send auth to offscreen:", error);
      });

    // 크롬스토리지에 로그인 정보 저장
    if (msg.user && msg.idToken) {
      chrome.storage.local.set({
        currentUser: msg.user,
        currentIdToken: msg.idToken,
        lastLoginTime: Date.now(),
      }, () => {
        console.log("✅ User and idToken saved to chrome.storage.local");
      });
    }

    // 2. popup 등에 브로드캐스트 (로그인/로그아웃 모두)
    chrome.runtime.sendMessage({
      type: "AUTH_STATE_CHANGED",
      user: msg.user,
    }).catch(() => {
      // popup이 닫혀있으면 에러 무시
    });

    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// popup/content/offscreen에서 오는 내부 메시지 처리
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // offscreen에서 온 OFFSCREEN_READY 메시지는 특별 처리
  if (msg.type === "OFFSCREEN_READY") {
    // 인증 상태를 offscreen에 강제 동기화
    if (currentUser && currentIdToken) {
      ensureOffscreenDocument().then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_AUTH_STATE_CHANGED",
          user: currentUser,
          idToken: currentIdToken,
        });
      });
    }
    return false;
  }

  // offscreen에서 온 메시지는 무시 (무한 루프 방지)
  if (sender.url && sender.url.includes("offscreen-simple.html")) {
    return false;
  }

  console.log("📨 Background received from popup:", msg.type);

  // 현재 인증 상태 요청 - offscreen으로 전달
  if (msg.type === "GET_AUTH_STATE") {
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({ type: "OFFSCREEN_GET_AUTH_STATE" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Offscreen GET_AUTH_STATE error:", chrome.runtime.lastError.message);
            sendResponse({ user: currentUser });
          } else {
            sendResponse(response);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to get auth state:", error);
        sendResponse({ user: currentUser });
      });
    return true;
  }

  // 로그아웃
  if (msg.type === "LOGOUT") {
    currentUser = null;

    // offscreen에 로그아웃 전달
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_AUTH_STATE_CHANGED",
          user: null,
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn("Offscreen logout error:", chrome.runtime.lastError.message);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to send logout to offscreen:", error);
      });

    // 크롬스토리지에서 로그인 정보 삭제
    chrome.storage.local.remove(["currentUser", "currentIdToken", "lastLoginTime"], () => {
      console.log("✅ User and idToken removed from chrome.storage.local");
    });

    // popup에 브로드캐스트
    chrome.runtime.sendMessage({
      type: "AUTH_STATE_CHANGED",
      user: null,
    }, () => {
      if (chrome.runtime.lastError) {
        // 에러 무시
      }
    });

    sendResponse({ ok: true });
    return true;
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
