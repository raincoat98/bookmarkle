// background.js - 인증 관리 + Firestore(offscreen) 조율
// Background가 주요 인증 상태를 관리하고, Popup은 Background에서 직접 조회

const OFFSCREEN_URL = "offscreen-simple.html";
const AUTH_CACHE_KEYS = ["currentUser", "lastLoginTime"];

// 메모리: 빠른 접근용
let currentUser = null;
let offscreenSynced = false; // Offscreen 초기 동기화 완료 플래그

// 확장 시작 시 크롬스토리지에서 인증 정보 복원
async function restoreAuthFromStorage() {
  if (!chrome.storage?.local) return;

  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_CACHE_KEYS, (result) => {
      if (result.currentUser) {
        const hoursSinceLogin = (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);

        // 24시간 이내면 복원
        if (hoursSinceLogin < 24) {
          currentUser = result.currentUser;
          console.log("🔄 Restored user from chrome.storage.local:", currentUser.email || currentUser.uid);
          resolve(true);
        } else {
          console.log("⏰ Session expired, clearing chrome.storage.local");
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
function saveAuthToStorage(user) {
  currentUser = user;
  offscreenSynced = false; // 새 인증 상태이므로 동기화 필요

  if (chrome.storage?.local && user) {
    chrome.storage.local.set({
      currentUser: user,
      lastLoginTime: Date.now(),
    }, () => {
      console.log("✅ Auth saved to storage:", user.email || user.uid);
    });
  }
}

// 인증 정보 삭제
function clearAuth() {
  currentUser = null;
  offscreenSynced = false; // 로그아웃 상태 동기화 필요

  if (chrome.storage?.local) {
    chrome.storage.local.remove(AUTH_CACHE_KEYS, () => {
      console.log("✅ Auth cleared from storage");
    });
  }
}

// 시작 시 저장된 인증 정보 복원
restoreAuthFromStorage();

// 시작 시 빠른 실행모드에 따라 팝업 설정
chrome.storage.local.get(["quickMode"], (result) => {
  const isQuickMode = result.quickMode || false;
  if (isQuickMode) {
    chrome.action.setPopup({ popup: "" }); // 팝업 비활성화
  } else {
    chrome.action.setPopup({ popup: "popup-simple.html" }); // 팝업 활성화
  }
});

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

// 외부 웹 페이지(새 탭)에서 오는 인증 메시지 처리
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log("📨 External message received:", msg.type, "from:", sender.url);

  if (msg.type === "AUTH_STATE_CHANGED") {
    if (msg.user && msg.idToken) {
      // Background에 user 정보만 저장 (idToken은 offscreen이 관리)
      saveAuthToStorage(msg.user);

      // Offscreen에 user + idToken 전달 (초기 로그인 토큰)
      ensureOffscreenDocument()
        .then(() => {
          chrome.runtime.sendMessage({
            type: "OFFSCREEN_AUTH_STATE_CHANGED",
            user: msg.user,
            idToken: msg.idToken,
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn("⚠️ Failed to send auth to offscreen:", chrome.runtime.lastError.message);
            }
          });
        })
        .catch((error) => {
          console.error("Failed to create offscreen for auth sync:", error);
        });

      // Popup에 브로드캐스트
      chrome.runtime.sendMessage({
        type: "AUTH_STATE_CHANGED",
        user: msg.user,
      }, () => {
        // popup이 닫혀있으면 에러 무시
        if (chrome.runtime.lastError) {
          // 무시 (popup이 열려있지 않을 수 있음)
        }
      });
    } else if (!msg.user) {
      // 로그아웃
      clearAuth();
      ensureOffscreenDocument()
        .then(() => {
          chrome.runtime.sendMessage({
            type: "OFFSCREEN_AUTH_STATE_CHANGED",
            user: null,
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn("⚠️ Failed to send logout to offscreen:", chrome.runtime.lastError.message);
            }
          });
        })
        .catch((error) => {
          console.error("Failed to create offscreen for logout:", error);
        });

      chrome.runtime.sendMessage({
        type: "AUTH_STATE_CHANGED",
        user: null,
      }, () => {
        if (chrome.runtime.lastError) {
          // 무시 (popup이 열려있지 않을 수 있음)
        }
      });
    }

    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// popup/content/offscreen에서 오는 내부 메시지 처리
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // content-bridge.js에서 오는 인증 메시지 처리
    if (msg.type === "WEB_AUTH_STATE_CHANGED") {
      if (msg.payload.user && msg.payload.idToken) {
        saveAuthToStorage(msg.payload.user);
        ensureOffscreenDocument()
          .then(() => {
            chrome.runtime.sendMessage({
              type: "OFFSCREEN_AUTH_STATE_CHANGED",
              user: msg.payload.user,
              idToken: msg.payload.idToken,
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn("⚠️ Failed to send auth to offscreen:", chrome.runtime.lastError.message);
              }
            });
          })
          .catch((error) => {
            console.error("Failed to create offscreen for auth sync:", error);
          });
      } else {
        clearAuth();
        ensureOffscreenDocument()
          .then(() => {
            chrome.runtime.sendMessage({
              type: "OFFSCREEN_AUTH_STATE_CHANGED",
              user: null,
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn("⚠️ Failed to send logout to offscreen:", chrome.runtime.lastError.message);
              }
            });
          })
          .catch((error) => {
            console.error("Failed to create offscreen for logout:", error);
          });
      }
      sendResponse({ ok: true });
      return true;
    }
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
    // 토큰은 offscreen이 직접 관리하므로, user 정보만 전달
    if (!offscreenSynced && currentUser) {
      offscreenSynced = true;
      // sendResponse로 직접 user 정보 전달 (브로드캐스트 대신)
      sendResponse({
        type: "INIT_AUTH",
        user: currentUser,
      });
      return true; // 비동기 응답 대기
    } else {
      // 동기화할 user 정보 없음
      sendResponse({ type: "INIT_AUTH", user: null });
      return true;
    }
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
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn("⚠️ Failed to send logout to offscreen:", chrome.runtime.lastError.message);
          }
        });
      })
      .catch((error) => {
        console.error("Failed to create offscreen for logout:", error);
      });

    // popup에 브로드캐스트
    chrome.runtime.sendMessage({
      type: "AUTH_STATE_CHANGED",
      user: null,
    }, () => {
      if (chrome.runtime.lastError) {
        // 무시 (popup이 열려있지 않을 수 있음)
      }
    });

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

// ============================================================
// 컨텍스트 메뉴 설정 (확장 프로그램 아이콘 우클릭 시)
// ============================================================

// 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openDashboard",
    title: "대시보드로 가기",
    contexts: ["action"], // 확장 프로그램 아이콘 우클릭
  });

  chrome.contextMenus.create({
    id: "toggleQuickMode",
    title: "빠른 실행모드 활성화",
    type: "checkbox",
    contexts: ["action"],
  });

  chrome.contextMenus.create({
    id: "openGithub",
    title: "깃허브",
    contexts: ["action"],
  });

  // 빠른 실행모드 초기 상태 설정
  chrome.storage.local.get(["quickMode"], (result) => {
    const isQuickMode = result.quickMode || false;
    chrome.contextMenus.update("toggleQuickMode", {
      checked: isQuickMode,
    });
  });
});

// 컨텍스트 메뉴 클릭 이벤트 핸들러
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === "openDashboard") {
    // 대시보드로 가기 (newtab.html이 자동으로 대시보드로 리다이렉트)
    chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
  } else if (info.menuItemId === "toggleQuickMode") {
    // 빠른 실행모드 토글
    const isChecked = info.checked;
    chrome.storage.local.set({ quickMode: isChecked }, () => {
      console.log(`빠른 실행 모드 ${isChecked ? "활성화" : "비활성화"}`);

      // 팝업 동적으로 활성화/비활성화
      if (isChecked) {
        chrome.action.setPopup({ popup: "" }); // 팝업 비활성화 → onClicked 이벤트 발생
      } else {
        chrome.action.setPopup({ popup: "popup-simple.html" }); // 팝업 활성화
      }
    });
  } else if (info.menuItemId === "openGithub") {
    // 깃허브로 이동
    chrome.tabs.create({ url: "https://github.com/raincoat98/bookmarkle" });
  }
});

// 빠른 실행모드 상태가 다른 곳에서 변경되었을 때 컨텍스트 메뉴 및 팝업 업데이트
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.quickMode) {
    const isQuickMode = changes.quickMode.newValue || false;

    // 컨텍스트 메뉴 체크박스 업데이트
    chrome.contextMenus.update("toggleQuickMode", {
      checked: isQuickMode,
    });

    // 팝업 동적으로 활성화/비활성화
    if (isQuickMode) {
      chrome.action.setPopup({ popup: "" }); // 팝업 비활성화
    } else {
      chrome.action.setPopup({ popup: "popup-simple.html" }); // 팝업 활성화
    }
  }
});

// ============================================================
// 아이콘 클릭 이벤트 (빠른 실행모드일 때만 발생)
// ============================================================
chrome.action.onClicked.addListener(async (tab) => {
  console.log("🚀 Icon clicked - quick save mode");

  // 현재 탭 정보 확인
  if (!tab || !tab.url) {
    console.error("No active tab URL");
    chrome.action.setBadgeText({ text: "✗" });
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
    return;
  }

  // 인증 상태 확인
  if (!currentUser) {
    console.log("Not logged in");
    chrome.action.setBadgeText({ text: "?" });
    chrome.action.setBadgeBackgroundColor({ color: "#F59E0B" }); // 주황색
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
    return;
  }

  // 북마크 저장 (컬렉션은 null)
  try {
    await ensureOffscreenDocument();

    const saveResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "OFFSCREEN_SAVE_BOOKMARK",
        payload: {
          url: tab.url,
          title: tab.title || "",
          collectionId: null,
          description: "",
          tags: [],
          favicon: tab.favIconUrl || "",
        },
      }, (response) => {
        resolve(response);
      });
    });

    if (saveResponse?.ok) {
      console.log("✅ Quick save success");
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#10B981" });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
    } else {
      console.error("Quick save failed:", saveResponse?.error);
      chrome.action.setBadgeText({ text: "✗" });
      chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
      setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
    }
  } catch (error) {
    console.error("Quick save error:", error);
    chrome.action.setBadgeText({ text: "✗" });
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
  }
});
