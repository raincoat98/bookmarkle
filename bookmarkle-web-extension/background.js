// Background Service Worker

// ===== 상수 =====
const SIGNIN_POPUP_URL = "SIGNIN_POPUP_URL_PLACEHOLDER"; // build-config.js에서 주입됨

// ===== 전역 변수 =====
let authResponseHandler = null;
let currentUser = null; // 메모리 캐시, storage에도 저장

// ===== 헬퍼 함수 =====

// Sender 검증
function isValidSender(sender) {
  return sender.id === chrome.runtime.id;
}

// 인증 에러 응답
function sendAuthError(error) {
  if (authResponseHandler) {
    authResponseHandler({ success: false, error: error.message || error });
    authResponseHandler = null;
  }
}

// 저장된 사용자 정보 복원
async function restoreUserInfo() {
  try {
    const stored = await chrome.storage.local.get(["user"]);
    if (stored?.user) {
      currentUser = stored.user;
      console.log(
        "✅ 저장된 사용자 정보 복원 완료:",
        stored.user.email || stored.user.uid
      );
    } else {
      currentUser = null;
      console.log("📭 저장된 사용자 정보 없음");
    }
  } catch (error) {
    console.error("❌ 사용자 정보 복원 실패:", error);
  }
}

// Offscreen Document 생성
async function ensureOffscreenDocument() {
  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["LOCAL_STORAGE"],
      justification: "Firebase Firestore 데이터 조회를 위해 필요합니다",
    });
    console.log("✅ Offscreen document 생성됨");
  } catch (error) {
    if (error.message?.includes("offscreen document")) {
      console.log("✅ Offscreen document이 이미 존재합니다");
    } else {
      console.error("❌ Offscreen document 생성 중 오류:", error);
      throw error;
    }
  }
}

// ===== 핵심 비즈니스 로직 =====

// URL에 쿼리 파라미터 추가 헬퍼 함수
function addQueryParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${value}`;
}

// 도메인 추출 함수
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

// 파비콘 URL 생성 함수
function getFaviconUrl(url) {
  const domain = getDomainFromUrl(url);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// 로그인 처리 공통 함수
async function handleLogin(sendResponse, mode = "google") {
  authResponseHandler = sendResponse;

  try {
    // URL에 mode 파라미터 추가 (extension=true는 build-config.js에서 이미 추가됨)
    let url = SIGNIN_POPUP_URL;
    url = addQueryParam(url, "mode", mode);

    const tab = await chrome.tabs.create({
      url: url,
      active: true,
    });
    console.log(`✅ ${mode} 로그인 페이지 탭 생성:`, tab.id, url);

    // 최대 2분 후 타임아웃
    setTimeout(() => {
      sendAuthError({
        message: "인증 결과를 받지 못했습니다. 시간이 초과되었습니다.",
      });
    }, 120000);
  } catch (error) {
    console.error(`❌ ${mode} 로그인 페이지 열기 오류:`, error);
    sendAuthError(error);
  }
}

// Google 로그인 처리
async function handleGoogleLogin(sendResponse) {
  await handleLogin(sendResponse, "google");
}

// 이메일 로그인 처리
async function handleEmailLogin(sendResponse) {
  await handleLogin(sendResponse, "email");
}

// 웹 앱으로부터 인증 결과 처리
async function handleAuthResultFromWeb(user, idToken, tabId) {
  try {
    console.log("✅ 웹 앱으로부터 인증 결과 처리 시작");

    // 사용자 정보 저장
    currentUser = user;
    try {
      await chrome.storage.local.set({
        user: user,
        lastLoginTime: Date.now(),
      });
      console.log("✅ 사용자 정보 저장 완료:", user.email || user.uid);
    } catch (e) {
      console.warn("⚠️ 사용자 정보 저장 실패:", e);
    }

    // Popup에 응답 전송
    if (authResponseHandler) {
      authResponseHandler({
        success: true,
        user: user,
      });
      authResponseHandler = null;
    }

    // 모든 탭에 로그인 완료 알림
    chrome.runtime
      .sendMessage({
        type: "AUTH_SUCCESS",
        user: user,
      })
      .catch(() => {
        // 팝업이 닫혀있을 수 있으므로 에러 무시
      });

    // 로그인 성공 후 signin-popup 탭 닫기
    const closeSigninTab = () => {
      if (tabId) {
        chrome.tabs.remove(tabId).catch(() => {
          // 탭이 이미 닫혔을 수 있음
        });
      } else {
        chrome.tabs.query({ url: SIGNIN_POPUP_URL + "*" }, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.remove(tab.id);
            }
          });
        });
      }
    };
    setTimeout(closeSigninTab, 500);

    // localStorage 정리
    if (tabId) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            localStorage.removeItem("extension_auth_result");
            sessionStorage.removeItem("extension_auth_result");
          },
        });
      } catch (error) {
        // 탭이 이미 닫혔을 수 있음 - 무시
      }
    }
  } catch (err) {
    console.error("인증 결과 저장 실패:", err);
    sendAuthError(err);
  }
}

// 컬렉션 개수 가져오기 처리
async function handleGetDataCount(sendResponse) {
  try {
    console.log("📊 컬렉션 개수 요청 처리 시작");

    // currentUser가 메모리에 없으면 storage에서 복원 시도
    if (!currentUser) {
      console.log("⚠️ currentUser가 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    if (!currentUser) {
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    console.log("✅ 사용자 정보 확인 완료, Offscreen Document으로 위임");

    await ensureOffscreenDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Promise로 변환하여 응답 대기
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "GET_DATA_COUNT",
          user: currentUser,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    sendResponse(response);
  } catch (error) {
    console.error("❌ handleGetDataCount 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "컬렉션 개수를 가져오는 중 오류가 발생했습니다.",
    });
  }
}

// 북마크 저장 처리
async function handleSaveBookmark(sendResponse) {
  try {
    console.log("📚 북마크 저장 요청 처리 시작");

    // 1. 사용자 정보 확인
    if (!currentUser) {
      console.log("⚠️ currentUser가 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    if (!currentUser) {
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    // 2. 현재 활성 탭 정보 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      sendResponse({
        success: false,
        error: "현재 탭 정보를 가져올 수 없습니다.",
      });
      return;
    }

    const currentTab = tabs[0];

    // 3. 탭 정보 검증
    if (!currentTab.url || !currentTab.title) {
      sendResponse({
        success: false,
        error: "현재 페이지의 URL 또는 제목을 가져올 수 없습니다.",
      });
      return;
    }

    // chrome:// 또는 edge:// 등 특수 URL 차단
    if (
      currentTab.url.startsWith("chrome://") ||
      currentTab.url.startsWith("edge://") ||
      currentTab.url.startsWith("about:")
    ) {
      sendResponse({
        success: false,
        error: "이 페이지는 북마크할 수 없습니다.",
      });
      return;
    }

    console.log("📋 현재 탭 정보:", {
      title: currentTab.title,
      url: currentTab.url,
    });

    // 4. 북마크 데이터 준비
    const favicon = getFaviconUrl(currentTab.url);
    const bookmarkData = {
      title: currentTab.title,
      url: currentTab.url,
      favicon: favicon,
      userId: currentUser.uid,
    };

    console.log("✅ 북마크 데이터 준비 완료, Offscreen Document으로 위임");

    // 5. Offscreen Document 생성 및 위임
    await ensureOffscreenDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 6. Offscreen에 북마크 저장 요청
    console.log("📤 Offscreen Document로 북마크 저장 요청 전송 중...");
    console.log("📋 전송할 데이터:", {
      hasBookmarkData: !!bookmarkData,
      hasUser: !!currentUser,
      bookmarkTitle: bookmarkData?.title,
    });

    // Promise로 변환하여 응답 대기
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_BOOKMARK",
          bookmarkData: bookmarkData,
          user: currentUser,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ Offscreen Document 응답 오류:",
              chrome.runtime.lastError
            );
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log("📥 Offscreen Document로부터 응답 수신:", response);
            resolve(response);
          }
        }
      );
    });

    console.log("✅ 최종 응답:", response);
    sendResponse(response);
  } catch (error) {
    console.error("❌ handleSaveBookmark 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "북마크 저장 중 오류가 발생했습니다.",
    });
  }
}

// ===== 메시지 핸들러 =====

async function handleMessage(message, sender, sendResponse) {
  try {
    if (!isValidSender(sender)) {
      console.warn("⚠️ 신뢰할 수 없는 sender로부터 메시지 수신:", sender);
      return;
    }

    if (message === "LOGIN_GOOGLE") {
      handleGoogleLogin(sendResponse);
      return;
    }

    if (message === "LOGIN_EMAIL") {
      handleEmailLogin(sendResponse);
      return;
    }

    if (message === "GET_DATA_COUNT") {
      console.log("📊 컬렉션 개수 요청 수신");
      handleGetDataCount(sendResponse);
      return;
    }

    if (message === "SAVE_BOOKMARK") {
      console.log("📚 북마크 저장 요청 수신");
      handleSaveBookmark(sendResponse);
      return;
    }

    if (message?.type === "GET_CURRENT_USER") {
      if (!currentUser) {
        await restoreUserInfo();
      }
      sendResponse({ user: currentUser });
      return;
    }

    if (message?.type === "LOGOUT") {
      console.log("🔓 Extension 로그아웃 시작");
      currentUser = null;
      try {
        await chrome.storage.local.remove(["user"]);
      } catch (e) {
        console.warn("storage 삭제 실패:", e);
      }
      sendResponse({ success: true });

      // 웹 앱에 로그아웃 메시지 전송
      try {
        const tabs = await chrome.tabs.query({});
        tabs.forEach((tab) => {
          if (tab.url && tab.url.includes(chrome.runtime.getURL(""))) {
            // Extension 자체 페이지는 제외
            return;
          }
          // 모든 탭에 로그아웃 메시지 전송
          chrome.tabs.sendMessage(tab.id, { type: "EXTENSION_LOGOUT" }, () => {
            // 에러 무시 (탭이 메시지를 받지 못했을 수 있음)
            chrome.runtime.lastError;
          });
        });
        console.log("📤 웹 앱 탭들에 로그아웃 메시지 전송 완료");
      } catch (error) {
        console.warn("웹 앱에 로그아웃 메시지 전송 실패:", error);
      }
      return;
    }

    if (message?.type === "AUTH_RESULT_FROM_WEB") {
      console.log("📥 인증 결과 수신:", message);
      // sender.tab.id 또는 메시지에 포함된 tabId 사용
      const tabId = sender.tab?.id || message.tabId || null;
      console.log(
        "📋 사용할 탭 ID:",
        tabId,
        "(sender.tab:",
        sender.tab?.id,
        ", message.tabId:",
        message.tabId,
        ")"
      );
      await handleAuthResultFromWeb(message.user, message.idToken, tabId);
      sendResponse({ success: true });
      return;
    }
  } catch (error) {
    console.error("메시지 처리 오류:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// ===== 이벤트 리스너 =====

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // 비동기 응답 처리
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.user) {
    if (changes.user.newValue) {
      currentUser = changes.user.newValue;
      console.log(
        "✅ Storage 변경 감지 - 사용자 정보 업데이트:",
        currentUser.email
      );
    } else {
      currentUser = null;
      console.log("✅ Storage 변경 감지 - 사용자 정보 삭제됨");
    }
  }
});

chrome.runtime.onStartup?.addListener(async () => {
  console.log("🚀 Extension 시작됨 - 사용자 정보 복원 중...");
  await restoreUserInfo();
});

chrome.runtime.onInstalled?.addListener(async (details) => {
  console.log("✅ Extension 설치/업데이트 완료:", details.reason);
  await restoreUserInfo();
});

// ===== 초기화 =====

(async () => {
  console.log("🚀 Background Service Worker 시작 - 사용자 정보 복원 중...");
  await restoreUserInfo();
})();
