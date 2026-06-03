import { FIREBASE_API_KEY, SIGNIN_POPUP_URL } from "./constants.js";
import {
  currentRefreshToken,
  currentIdToken,
  setCurrentIdToken,
  setCurrentRefreshToken,
  setCurrentUser,
  clearAuthState,
  getAuthResponseHandler,
  setAuthResponseHandler,
  clearAuthResponseHandler,
} from "./state.js";
import { addQueryParam, isTokenExpired } from "./utils.js";

// 동시 갱신 방지: 진행 중인 갱신이 있으면 같은 Promise를 공유
let _refreshPromise = null;

// Refresh Token으로 새로운 ID Token 발급 (웹 탭 없이도 작동)
export async function refreshIdTokenWithRefreshToken() {
  if (_refreshPromise) {
    return _refreshPromise;
  }
  _refreshPromise = _doRefreshIdToken().finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}

async function _doRefreshIdToken() {
  if (!currentRefreshToken) {
    console.warn("🔐 Refresh Token 없음");
    return null;
  }

  try {
    console.log("🔐 Refresh Token으로 ID Token 갱신 시도");

    const isValidApiKey =
      FIREBASE_API_KEY &&
      typeof FIREBASE_API_KEY === "string" &&
      FIREBASE_API_KEY.trim().length >= 20 &&
      FIREBASE_API_KEY.startsWith("AIza");

    if (!isValidApiKey) {
      console.error("🔐 Firebase API 키가 유효하지 않음");
      return null;
    }

    const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: currentRefreshToken,
      }).toString(),
    });

    if (!response.ok) {
      let errorMessage = "토큰 갱신 실패";
      try {
        const error = await response.json();
        console.error("🔐 토큰 갱신 실패:", JSON.stringify(error, null, 2));
        errorMessage =
          error.error?.message || error.error_description || errorMessage;
      } catch (e) {
        console.error("🔐 토큰 갱신 실패 (응답 파싱 불가):", response.status);
        errorMessage = `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const newIdToken = data.id_token;
    const newRefreshToken = data.refresh_token; // 새로운 refresh token도 받을 수 있음

    if (newIdToken) {
      console.log("✅ ID Token 갱신 완료 (Refresh Token 사용)");
      setCurrentIdToken(newIdToken);

      // 새로운 refresh token이 있으면 업데이트
      if (newRefreshToken) {
        setCurrentRefreshToken(newRefreshToken);
        console.log("✅ Refresh Token도 업데이트됨");
      }

      // storage에도 저장
      try {
        const storageData = { idToken: newIdToken };
        if (newRefreshToken) {
          storageData.refreshToken = newRefreshToken;
        }
        await chrome.storage.local.set(storageData);
      } catch (e) {
        console.warn("⚠️ 갱신된 토큰 저장 실패:", e);
      }

      return newIdToken;
    } else {
      console.error("🔐 응답에 id_token이 없음:", data);
      return null;
    }
  } catch (error) {
    console.error(
      "🔐 Refresh Token 기반 토큰 갱신 실패:",
      error.message || error
    );
    return null;
  }
}

// 웹 앱으로부터 토큰 갱신 요청 (보조 방법)
export async function getRefreshIdTokenFromWeb() {
  return new Promise((resolve) => {
    try {
      console.log("🔐 웹 앱에서 토큰 갱신 요청 시작");

      // Content Script를 통해 토큰 요청
      chrome.tabs.query({}, (tabs) => {
        let tokenReceived = false;
        let tabsToTry = tabs.filter(
          (tab) =>
            tab.url &&
            (tab.url.includes("firebase") ||
              tab.url.includes("localhost") ||
              tab.url.includes("127.0.0.1") ||
              tab.url.includes("bookmarkle.app"))
        );

        if (tabsToTry.length === 0) {
          console.warn("🔐 웹 앱 탭을 찾을 수 없음");
          resolve(null);
          return;
        }

        console.log(`🔐 ${tabsToTry.length}개의 웹 앱 탭에서 토큰 요청 중...`);

        // 모든 가능한 탭에서 토큰 요청
        tabsToTry.forEach((tab) => {
          if (tokenReceived) return;

          chrome.tabs.sendMessage(
            tab.id,
            { type: "TOKEN_REQUEST" },
            () => {
              if (chrome.runtime.lastError) {
                console.warn(
                  `🔐 탭 ${tab.id}에서 토큰 요청 실패:`,
                  chrome.runtime.lastError.message
                );
              } else {
                console.log(`🔐 탭 ${tab.id}에 토큰 요청 전송`);
              }
            }
          );
        });

        // 토큰 응답 대기 (3초)
        const timeoutId = setTimeout(() => {
          console.warn("🔐 웹 앱으로부터 토큰 응답 타임아웃");
          delete self.tokenResponseHandler;
          resolve(null);
        }, 3000);

        // 토큰 응답 핸들러 (일시적)
        self.tokenResponseHandler = (token) => {
          if (!tokenReceived) {
            tokenReceived = true;
            clearTimeout(timeoutId);
            console.log("🔐 웹 앱으로부터 토큰 갱신 완료");
            delete self.tokenResponseHandler;
            resolve(token);
          }
        };
      });
    } catch (error) {
      console.error("🔐 웹 앱 토큰 갱신 요청 실패:", error);
      resolve(null);
    }
  });
}

// 인증 에러 응답
export function sendAuthError(error) {
  const handler = getAuthResponseHandler();
  if (handler) {
    handler({ success: false, error: error.message || error });
    clearAuthResponseHandler();
  }
}

// 저장된 사용자 정보 및 토큰 복원
export async function restoreUserInfo() {
  try {
    const stored = await chrome.storage.local.get([
      "user",
      "idToken",
      "refreshToken",
    ]);

    // User 정보 복원
    if (stored?.user) {
      const user = stored.user;
      // uid가 있는지 확인 (필수 속성)
      if (user.uid) {
        setCurrentUser(user);
        console.log("✅ 저장된 사용자 정보 복원 완료:", user.email || user.uid);
      } else {
        console.warn("⚠️ 저장된 사용자 정보의 uid가 없음:", {
          hasUser: !!user,
          hasUid: !!user.uid,
          hasEmail: !!user.email,
        });
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
      console.log("📭 저장된 사용자 정보 없음");
    }

    // idToken 복원
    if (stored?.idToken) {
      setCurrentIdToken(stored.idToken);
      console.log("✅ idToken 복원 완료");
    } else {
      setCurrentIdToken(null);
      console.log("📭 저장된 idToken 없음");
    }

    // refreshToken 복원
    if (stored?.refreshToken) {
      setCurrentRefreshToken(stored.refreshToken);
      console.log("🔐 refreshToken 복원 완료");
    } else {
      setCurrentRefreshToken(null);
      console.log("📭 저장된 refreshToken 없음");
    }
  } catch (error) {
    console.error("❌ 사용자 정보 복원 실패:", error);
    clearAuthState();
  }
}

// 토큰 상태를 보장: 없거나 만료됐으면 갱신, storage 복원 포함
// 반환값: true = 유효한 토큰 있음, false = 갱신 실패 (재로그인 필요)
export async function ensureFreshToken() {
  // 메모리에 없으면 storage에서 복원
  if (!currentIdToken) {
    await restoreUserInfo();
  }

  // 없거나 만료됐으면 갱신 시도
  if (!currentIdToken || isTokenExpired(currentIdToken)) {
    if (currentIdToken) {
      console.log("⚠️ idToken 만료됨, 갱신 시도");
    }

    let refreshedToken = await refreshIdTokenWithRefreshToken();

    if (!refreshedToken) {
      console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
      refreshedToken = await getRefreshIdTokenFromWeb();
    }

    if (refreshedToken) {
      setCurrentIdToken(refreshedToken);
      console.log("✅ 토큰 갱신 완료");
    } else {
      // 갱신 실패 시 만료된 토큰을 null로 — Firestore 호출 방지
      setCurrentIdToken(null);
      return false;
    }
  }

  return true;
}

// 로그인 처리 공통 함수
export async function handleLogin(sendResponse, mode = "google") {
  setAuthResponseHandler(sendResponse);

  try {
    // URL에 mode 파라미터 추가 (extension=true는 build-config.js에서 이미 추가됨)
    let url = SIGNIN_POPUP_URL;
    url = addQueryParam(url, "mode", mode);

    const tab = await chrome.tabs.create({
      url: url,
      active: true,
    });
    console.log(`✅ ${mode} 로그인 페이지 탭 생성:`, tab.id, url);

    // 최대 2분 후 타임아웃 (성공 시 clearAuthResponseHandler로 핸들러가 제거되므로 sendAuthError는 no-op)
    const timeoutId = setTimeout(() => {
      sendAuthError({
        message: "인증 결과를 받지 못했습니다. 시간이 초과되었습니다.",
      });
    }, 120000);

    // 로그인 탭이 닫히면 타임아웃 취소 + 미완료 인증 에러 전송
    const tabRemovedListener = (removedTabId) => {
      if (removedTabId === tab.id) {
        clearTimeout(timeoutId);
        chrome.tabs.onRemoved.removeListener(tabRemovedListener);
        // 인증 성공 시 clearAuthResponseHandler가 이미 호출됐으므로 no-op
        sendAuthError({ message: "로그인 페이지가 닫혔습니다." });
      }
    };
    chrome.tabs.onRemoved.addListener(tabRemovedListener);
  } catch (error) {
    console.error(`❌ ${mode} 로그인 페이지 열기 오류:`, error);
    sendAuthError(error);
  }
}

// Google 로그인 처리
export async function handleGoogleLogin(sendResponse) {
  await handleLogin(sendResponse, "google");
}

// 이메일 로그인 처리
export async function handleEmailLogin(sendResponse) {
  await handleLogin(sendResponse, "email");
}

// 웹 앱으로부터 인증 결과 처리
export async function handleAuthResultFromWeb(message, tabId) {
  try {
    console.log("✅ 웹 앱으로부터 인증 결과 처리 시작");

    const user = message.user;
    const idToken = message.idToken;
    const refreshToken = message.refreshToken;

    // 사용자 정보, idToken, refreshToken 저장 - 필수 속성만 추출
    if (user && user.uid && idToken) {
      const userToStore = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
      };
      setCurrentUser(userToStore);
      setCurrentIdToken(idToken);

      // Refresh Token 저장 (선택사항)
      if (refreshToken) {
        setCurrentRefreshToken(refreshToken);
        console.log("🔐 Refresh Token 저장됨");
      }

      try {
        const storageData = {
          user: userToStore,
          idToken: idToken,
          lastLoginTime: Date.now(),
        };

        // Refresh Token이 있으면 함께 저장
        if (refreshToken) {
          storageData.refreshToken = refreshToken;
        }

        await chrome.storage.local.set(storageData);
        console.log(
          "✅ 사용자 정보 및 토큰 저장 완료:",
          userToStore.email || userToStore.uid
        );
      } catch (e) {
        console.warn("⚠️ 사용자 정보 저장 실패:", e);
      }
    } else {
      console.error("❌ 웹 앱에서 받은 user/token 정보가 유효하지 않음:", {
        hasUser: !!user,
        hasUid: !!user?.uid,
        hasIdToken: !!idToken,
      });
      throw new Error("웹 앱에서 받은 user/token 정보가 유효하지 않음");
    }

    // Popup에 응답 전송
    const handler = getAuthResponseHandler();
    if (handler) {
      handler({
        success: true,
        user: user,
      });
      clearAuthResponseHandler();
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
