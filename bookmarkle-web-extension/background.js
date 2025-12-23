// Background Service Worker

// ===== 상수 및 전역 변수 =====

// 빌드 시 주입되는 상수 (build-config.js에서 주입됨)
const SIGNIN_POPUP_URL = "SIGNIN_POPUP_URL_PLACEHOLDER";
const FIREBASE_PROJECT_ID = "FIREBASE_PROJECT_ID_PLACEHOLDER";
const FIREBASE_API_KEY = "FIREBASE_API_KEY_PLACEHOLDER";

// 전역 상태 변수
let authResponseHandler = null; // 인증 응답 핸들러
let currentUser = null; // 현재 로그인한 사용자 정보 (메모리 캐시)
let currentIdToken = null; // Firebase ID Token
let currentRefreshToken = null; // Firebase Refresh Token (토큰 갱신용)

// ===== 헬퍼 함수 =====

// Sender 검증
function isValidSender(sender) {
  return sender.id === chrome.runtime.id;
}

// Refresh Token으로 새로운 ID Token 발급 (웹 탭 없이도 작동)
async function refreshIdTokenWithRefreshToken() {
  if (!currentRefreshToken) {
    console.warn("🔐 Refresh Token 없음");
    return null;
  }

  try {
    console.log("🔐 Refresh Token으로 ID Token 갱신 시도");

    // API 키 상태 확인 (디버깅용)
    const apiKeyStatus = {
      exists: !!FIREBASE_API_KEY,
      type: typeof FIREBASE_API_KEY,
      length: FIREBASE_API_KEY?.length || 0,
      isEmpty:
        !FIREBASE_API_KEY ||
        (typeof FIREBASE_API_KEY === "string" &&
          FIREBASE_API_KEY.trim() === ""),
      isPlaceholder: FIREBASE_API_KEY === "FIREBASE_API_KEY_PLACEHOLDER",
      preview:
        FIREBASE_API_KEY && typeof FIREBASE_API_KEY === "string"
          ? `${FIREBASE_API_KEY.substring(0, 15)}...`
          : "없음",
    };
    console.log(
      "🔐 FIREBASE_API_KEY 상태:",
      JSON.stringify(apiKeyStatus, null, 2)
    );

    // Firebase securetoken API는 API 키가 필요합니다
    // API 키 유효성 검사: 길이가 20자 이상이고 "AIza"로 시작하는지 확인
    const isValidApiKey =
      FIREBASE_API_KEY &&
      typeof FIREBASE_API_KEY === "string" &&
      FIREBASE_API_KEY.trim().length >= 20 &&
      FIREBASE_API_KEY.startsWith("AIza");

    if (!isValidApiKey) {
      console.error("🔐 Firebase API 키가 유효하지 않음", {
        hasKey: !!FIREBASE_API_KEY,
        type: typeof FIREBASE_API_KEY,
        length: FIREBASE_API_KEY?.length || 0,
        startsWithAIza: FIREBASE_API_KEY?.startsWith?.("AIza") || false,
      });
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
        console.error(
          "🔐 토큰 갱신 실패 (응답 파싱 불가):",
          response.status,
          response.statusText
        );
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const newIdToken = data.id_token;
    const newRefreshToken = data.refresh_token; // 새로운 refresh token도 받을 수 있음

    if (newIdToken) {
      console.log("✅ ID Token 갱신 완료 (Refresh Token 사용)");
      currentIdToken = newIdToken;

      // 새로운 refresh token이 있으면 업데이트
      if (newRefreshToken) {
        currentRefreshToken = newRefreshToken;
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
async function getRefreshIdTokenFromWeb() {
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
            (response) => {
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
          resolve(null);
        }, 3000);

        // 토큰 응답 핸들러 (일시적)
        window.tokenResponseHandler = (token, user) => {
          if (!tokenReceived) {
            tokenReceived = true;
            clearTimeout(timeoutId);
            console.log("🔐 웹 앱으로부터 토큰 갱신 완료");
            delete window.tokenResponseHandler;
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
function sendAuthError(error) {
  if (authResponseHandler) {
    authResponseHandler({ success: false, error: error.message || error });
    authResponseHandler = null;
  }
}

// 저장된 사용자 정보 및 토큰 복원
async function restoreUserInfo() {
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
        currentUser = user;
        console.log("✅ 저장된 사용자 정보 복원 완료:", user.email || user.uid);
      } else {
        console.warn("⚠️ 저장된 사용자 정보의 uid가 없음:", {
          hasUser: !!user,
          hasUid: !!user.uid,
          hasEmail: !!user.email,
        });
        currentUser = null;
      }
    } else {
      currentUser = null;
      console.log("📭 저장된 사용자 정보 없음");
    }

    // idToken 복원
    if (stored?.idToken) {
      currentIdToken = stored.idToken;
      console.log("✅ idToken 복원 완료");
    } else {
      currentIdToken = null;
      console.log("📭 저장된 idToken 없음");
    }

    // refreshToken 복원
    if (stored?.refreshToken) {
      currentRefreshToken = stored.refreshToken;
      console.log("🔐 refreshToken 복원 완료");
    } else {
      currentRefreshToken = null;
      console.log("📭 저장된 refreshToken 없음");
    }
  } catch (error) {
    console.error("❌ 사용자 정보 복원 실패:", error);
    currentUser = null;
    currentIdToken = null;
    currentRefreshToken = null;
  }
}

// ===== Firestore REST API 함수 =====

// Firestore 쿼리 실행 (WHERE 절) - 토큰 만료 시 자동 갱신 및 재시도
async function runFirestoreQuery(
  collectionId,
  fieldPath,
  operator,
  value,
  idToken,
  retryOnAuthError = true
) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

    const body = {
      structuredQuery: {
        from: [{ collectionId: collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: fieldPath },
            op: operator, // "EQUAL", "GREATER_THAN", etc.
            value: { stringValue: value },
          },
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    // 401 Unauthorized 오류 발생 시 토큰 갱신 후 재시도
    if (!response.ok && response.status === 401 && retryOnAuthError) {
      console.log("🔐 401 오류 감지, 토큰 갱신 후 재시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        currentIdToken = refreshedToken;
        console.log("✅ 토큰 갱신 완료, API 재시도");
        // 재시도 (무한 루프 방지를 위해 retryOnAuthError를 false로)
        return runFirestoreQuery(
          collectionId,
          fieldPath,
          operator,
          value,
          refreshedToken,
          false
        );
      } else {
        throw new Error("토큰 갱신 실패. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firestore API 오류: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Firestore 쿼리 실행 실패:", error);
    throw error;
  }
}

// Firestore 문서 추가 - 토큰 만료 시 자동 갱신 및 재시도
async function addFirestoreDocument(
  collectionId,
  documentData,
  idToken,
  retryOnAuthError = true
) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}`;

    // Firestore API용 데이터 포맷 변환
    const firestoreData = {};
    for (const [key, value] of Object.entries(documentData)) {
      // undefined 값은 건너뛰기
      if (value === undefined) {
        continue;
      }

      if (value === null) {
        firestoreData[key] = { nullValue: null };
      } else if (value instanceof Date) {
        // Date 객체를 Firestore Timestamp로 변환
        firestoreData[key] = {
          timestampValue: value.toISOString(),
        };
      } else if (typeof value === "string") {
        // 빈 문자열도 명시적으로 포함 (description 필드 등)
        // Firestore는 빈 문자열을 저장할 수 있음
        firestoreData[key] = { stringValue: value };
      } else if (typeof value === "number") {
        firestoreData[key] = { integerValue: value.toString() };
      } else if (typeof value === "boolean") {
        firestoreData[key] = { booleanValue: value };
      } else if (value instanceof Array) {
        firestoreData[key] = {
          arrayValue: {
            values: value.map((v) => ({ stringValue: v })),
          },
        };
      } else if (value instanceof Object && value.seconds !== undefined) {
        // Timestamp 처리
        firestoreData[key] = {
          timestampValue: new Date(value.seconds * 1000).toISOString(),
        };
      }
    }

    // 디버깅: description 필드가 포함되었는지 확인
    if (
      collectionId === "collections" &&
      documentData.description !== undefined
    ) {
      console.log("📝 description 필드 포함 여부:", {
        inDocumentData: "description" in documentData,
        value: documentData.description,
        inFirestoreData: "description" in firestoreData,
        firestoreValue: firestoreData.description,
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: firestoreData,
      }),
    });

    // 401 Unauthorized 오류 발생 시 토큰 갱신 후 재시도
    if (!response.ok && response.status === 401 && retryOnAuthError) {
      console.log("🔐 401 오류 감지, 토큰 갱신 후 재시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        currentIdToken = refreshedToken;
        console.log("✅ 토큰 갱신 완료, API 재시도");
        // 재시도 (무한 루프 방지를 위해 retryOnAuthError를 false로)
        return addFirestoreDocument(
          collectionId,
          documentData,
          refreshedToken,
          false
        );
      } else {
        throw new Error("토큰 갱신 실패. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firestore API 오류: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Firestore 문서 추가 실패:", error);
    throw error;
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
async function handleAuthResultFromWeb(message, tabId) {
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
      currentUser = userToStore;
      currentIdToken = idToken;

      // Refresh Token 저장 (선택사항)
      if (refreshToken) {
        currentRefreshToken = refreshToken;
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
// 컬렉션 목록 요청 처리
async function handleFetchCollections(sendResponse) {
  try {
    console.log("📂 컬렉션 목록 요청 처리 시작");

    // idToken이 메모리에 없으면 storage에서 복원 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    // 토큰이 없거나 만료되었을 가능성이 있으면 갱신 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 없음, 토큰 갱신 시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        currentIdToken = refreshedToken;
        console.log("✅ 토큰 갱신 완료");
      }
    }

    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.error("❌ 사용자 정보 또는 인증 토큰 없음:", {
        hasUser: !!currentUser,
        hasUid: !!currentUser?.uid,
        hasIdToken: !!currentIdToken,
      });
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    console.log("✅ 사용자 정보 확인 완료, Firestore REST API 호출");

    // Firestore REST API로 컬렉션 목록 조회
    try {
      const queryResult = await runFirestoreQuery(
        "collections",
        "userId",
        "EQUAL",
        currentUser.uid,
        currentIdToken
      );

      // 응답에서 컬렉션 목록 추출 및 포맷팅
      const collections = queryResult
        .filter((item) => item.document)
        .map((item) => {
          const doc = item.document;
          const fields = doc.fields || {};
          return {
            id: doc.name.split("/").pop(), // 문서 ID 추출
            name: fields.name?.stringValue || "컬렉션",
            icon: fields.icon?.stringValue || "",
            parentId: fields.parentId?.stringValue || null,
            isPinned: fields.isPinned?.booleanValue || false,
          };
        })
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.name.localeCompare(b.name);
        });

      console.log(`✅ 컬렉션 목록 조회 완료: ${collections.length}개`);
      sendResponse({
        success: true,
        collections: collections,
      });
    } catch (error) {
      console.error("❌ Firestore 쿼리 실패:", error);
      sendResponse({
        success: false,
        error:
          error.message || "컬렉션 목록을 가져오는 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    console.error("❌ handleFetchCollections 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "컬렉션 목록을 가져오는 중 오류가 발생했습니다.",
    });
  }
}

// 컬렉션 생성 처리
async function handleCreateCollection(request, sendResponse) {
  try {
    console.log("➕ 컬렉션 생성 요청 처리 시작");

    // idToken이 메모리에 없으면 storage에서 복원 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    // 토큰이 없거나 만료되었을 가능성이 있으면 갱신 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 없음, 토큰 갱신 시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        currentIdToken = refreshedToken;
        console.log("✅ 토큰 갱신 완료");
      }
    }

    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.error("❌ 사용자 정보 또는 인증 토큰 없음");
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    const collectionData = request.collectionData;
    if (
      !collectionData ||
      !collectionData.name ||
      !collectionData.name.trim()
    ) {
      sendResponse({
        success: false,
        error: "컬렉션 이름이 필요합니다.",
      });
      return;
    }

    console.log("✅ 사용자 정보 확인 완료, Firestore REST API 호출");

    // Firestore REST API로 컬렉션 생성
    try {
      const now = new Date();
      const collectionDocument = {
        name: collectionData.name.trim(),
        userId: currentUser.uid,
        icon: collectionData.icon || "Folder",
        description: "",
        parentId: collectionData.parentId || null,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };

      console.log(
        "📝 컬렉션 데이터:",
        JSON.stringify(collectionDocument, null, 2)
      );

      const result = await addFirestoreDocument(
        "collections",
        collectionDocument,
        currentIdToken
      );

      // 응답에서 문서 ID 추출
      const collectionId = result.name?.split("/").pop() || null;

      console.log(`✅ 컬렉션 생성 완료, ID: ${collectionId}`);
      sendResponse({
        success: true,
        collectionId: collectionId,
      });
    } catch (error) {
      console.error("❌ Firestore 컬렉션 생성 실패:", error);
      sendResponse({
        success: false,
        error: error.message || "컬렉션 생성 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    console.error("❌ handleCreateCollection 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "컬렉션 생성 중 오류가 발생했습니다.",
    });
  }
}

// 북마크 저장 처리
async function handleSaveBookmark(request, sendResponse) {
  try {
    console.log("📚 북마크 저장 요청 처리 시작");

    // 1. 사용자 정보 확인
    if (!currentUser) {
      console.log("⚠️ currentUser가 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    if (!currentUser || !currentUser.uid) {
      console.error("❌ 사용자 정보 없음, uid 확인:", {
        hasCurrentUser: !!currentUser,
        hasUid: !!currentUser?.uid,
      });
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
    const extraData = request?.bookmarkData || {};
    const bookmarkData = {
      title: currentTab.title,
      url: currentTab.url,
      favicon: favicon,
      userId: currentUser.uid,
      description: extraData.description || "",
      collection:
        typeof extraData.collection === "string" && extraData.collection.length
          ? extraData.collection
          : null,
      tags: Array.isArray(extraData.tags)
        ? extraData.tags.filter(
            (tag) => typeof tag === "string" && tag.trim().length > 0
          )
        : [],
    };

    console.log("✅ 북마크 데이터 준비 완료, Firestore REST API 호출");

    // idToken이 메모리에 없으면 storage에서 복원 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    // 토큰이 없거나 만료되었을 가능성이 있으면 갱신 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 없음, 토큰 갱신 시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        currentIdToken = refreshedToken;
        console.log("✅ 토큰 갱신 완료");
      }
    }

    if (!currentIdToken) {
      sendResponse({
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      });
      return;
    }

    // 5. Firestore REST API로 북마크 저장
    try {
      console.log("📤 Firestore REST API로 북마크 저장 요청 전송 중...");

      // Timestamp 생성
      const now = new Date();
      const bookmarkDataToSave = {
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description,
        favicon: bookmarkData.favicon,
        collection: bookmarkData.collection,
        order: 0,
        userId: bookmarkData.userId,
        createdAt: now,
        updatedAt: now,
        tags: bookmarkData.tags,
        isFavorite: false,
      };

      const response = await addFirestoreDocument(
        "bookmarks",
        bookmarkDataToSave,
        currentIdToken
      );

      const bookmarkId = response.name?.split("/").pop();
      console.log("✅ 북마크 저장 완료, ID:", bookmarkId);

      sendResponse({
        success: true,
        bookmarkId: bookmarkId,
      });
    } catch (error) {
      console.error("❌ Firestore 문서 추가 실패:", error);
      sendResponse({
        success: false,
        error: error.message || "북마크 저장 중 오류가 발생했습니다.",
      });
    }
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
      return false;
    }

    const messageType = typeof message === "string" ? message : message?.type;

    if (messageType === "LOGIN_GOOGLE") {
      handleGoogleLogin(sendResponse);
      return;
    }

    if (messageType === "LOGIN_EMAIL") {
      handleEmailLogin(sendResponse);
      return;
    }

    if (messageType === "FETCH_COLLECTIONS") {
      console.log("📂 컬렉션 목록 요청 수신");
      await handleFetchCollections(sendResponse);
      return true; // 비동기 응답 처리
    }

    if (messageType === "CREATE_COLLECTION") {
      console.log("➕ 컬렉션 생성 요청 수신");
      await handleCreateCollection(message, sendResponse);
      return true; // 비동기 응답 처리
    }

    if (messageType === "SAVE_BOOKMARK") {
      console.log("📚 북마크 저장 요청 수신");
      await handleSaveBookmark(message, sendResponse);
      return true; // 비동기 응답 처리
    }

    if (messageType === "QUICK_SAVE_BOOKMARK") {
      console.log("⚡ 빠른 실행 모드: 북마크 저장 요청 수신");
      const result = await quickSaveBookmark();
      sendResponse(result);
      return true; // 비동기 응답 처리
    }

    if (messageType === "GET_CURRENT_USER") {
      if (!currentUser) {
        await restoreUserInfo();
      }
      sendResponse({ user: currentUser });
      return;
    }

    if (messageType === "LOGOUT") {
      console.log("🔓 Extension 로그아웃 시작");
      currentUser = null;
      currentIdToken = null;
      currentRefreshToken = null;
      try {
        await chrome.storage.local.remove(["user", "idToken", "refreshToken"]);
      } catch (e) {
        console.warn("storage 삭제 실패:", e);
      }
      sendResponse({ success: true });

      try {
        const tabs = await chrome.tabs.query({});
        tabs.forEach((tab) => {
          if (tab.url && tab.url.includes(chrome.runtime.getURL(""))) {
            return;
          }
          chrome.tabs.sendMessage(tab.id, { type: "EXTENSION_LOGOUT" }, () => {
            chrome.runtime.lastError;
          });
        });
        console.log("📤 웹 앱 탭들에 로그아웃 메시지 전송 완료");
      } catch (error) {
        console.warn("웹 앱에 로그아웃 메시지 전송 실패:", error);
      }
      return;
    }

    if (messageType === "AUTH_RESULT_FROM_WEB") {
      console.log("📥 인증 결과 수신:", message);
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
      await handleAuthResultFromWeb(message, tabId);
      sendResponse({ success: true });
      return;
    }

    if (messageType === "TOKEN_RESPONSE_FROM_WEB") {
      console.log("🔐 웹 앱으로부터 토큰 응답 수신");
      if (message.idToken) {
        console.log("✅ 갱신된 토큰 수신:", {
          hasToken: !!message.idToken,
          hasUser: !!message.user,
        });
        currentIdToken = message.idToken;
        if (message.user) {
          currentUser = message.user;
        }
        // 토큰을 storage에도 저장
        try {
          await chrome.storage.local.set({
            idToken: message.idToken,
            user: message.user || currentUser,
          });
          console.log("✅ 갱신된 토큰 저장 완료");
        } catch (e) {
          console.warn("⚠️ 토큰 저장 실패:", e);
        }
      } else {
        console.warn("⚠️ 토큰 응답에 토큰 없음:", message.error);
      }
      // 대기 중인 토큰 응답 핸들러 호출
      if (window.tokenResponseHandler) {
        window.tokenResponseHandler(message.idToken, message.user);
      }
      sendResponse({ success: true });
      return;
    }
  } catch (error) {
    console.error("메시지 처리 오류:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// ===== 이벤트 리스너 =====

// 메시지 수신 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleMessage(message, sender, sendResponse);
  // handleMessage가 false를 반환하면 false 반환
  // 그 외의 경우에는 비동기 응답을 처리하기 위해 true 반환
  return result === false ? false : true;
});

// Storage 변경 감지 리스너
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    // 사용자 정보 변경 감지
    if (changes.user) {
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
    // idToken 변경 감지
    if (changes.idToken) {
      if (changes.idToken.newValue) {
        currentIdToken = changes.idToken.newValue;
        console.log("✅ Storage 변경 감지 - idToken 업데이트");
      } else {
        currentIdToken = null;
        console.log("✅ Storage 변경 감지 - idToken 삭제됨");
      }
    }
    // 빠른 실행 모드 상태 변경 감지
    if (changes.quickMode) {
      updateQuickModePopup();
      createContextMenus(); // 컨텍스트 메뉴도 업데이트
    }
  }
});

// Extension 시작 시 초기화
chrome.runtime.onStartup?.addListener(async () => {
  console.log("🚀 Extension 시작됨 - 사용자 정보 복원 중...");
  await restoreUserInfo();
  createContextMenus();
  await updateQuickModePopup();
});

// Extension 설치/업데이트 시 초기화
chrome.runtime.onInstalled?.addListener(async (details) => {
  console.log("✅ Extension 설치/업데이트 완료:", details.reason);
  await restoreUserInfo();
  createContextMenus();
  await updateQuickModePopup();
});

// ===== 컨텍스트 메뉴 =====

// 외부 URL 상수
const DASHBOARD_URL = "https://bookmarkhub-5ea6c.web.app";
const GITHUB_URL = "https://github.com/raincoat98/bookmakle";
const BUG_REPORT_URL =
  "https://github.com/raincoat98/bookmakle/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen";

// 컨텍스트 메뉴 생성
async function createContextMenus() {
  try {
    // 빠른 실행 모드 상태 확인
    const quickModeResult = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = quickModeResult.quickMode || false;
    const quickModeTitle = isQuickModeEnabled
      ? "⚡ 빠른 실행 모드 비활성화"
      : "⚡ 빠른 실행 모드 활성화";

    // 기존 메뉴 제거 (중복 방지) - Promise로 감싸서 완료 대기
    await new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        // removeAll 완료 후 메뉴 생성
        resolve();
      });
    });

    // 빠른 실행 모드 활성화/비활성화
    chrome.contextMenus.create(
      {
        id: "quick-mode",
        title: quickModeTitle,
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          // 중복 ID 오류는 무시 (이미 존재하는 경우)
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 빠른 실행 모드");
        }
      }
    );

    // 대시보드 열기
    chrome.contextMenus.create(
      {
        id: "open-dashboard",
        title: "📊 대시보드 열기",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 대시보드");
        }
      }
    );

    // 구분선
    chrome.contextMenus.create(
      {
        id: "separator-1",
        type: "separator",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        }
      }
    );

    // GitHub 저장소
    chrome.contextMenus.create(
      {
        id: "open-github",
        title: "🐙 GitHub 저장소",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: GitHub");
        }
      }
    );

    // 버그 리포트
    chrome.contextMenus.create(
      {
        id: "open-bug-report",
        title: "🐛 버그 리포트",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 버그 리포트");
        }
      }
    );

    console.log("✅ 컨텍스트 메뉴 생성 완료");
  } catch (error) {
    console.error("❌ 컨텍스트 메뉴 생성 실패:", error);
  }
}

// 컨텍스트 메뉴 클릭 이벤트 처리 (중복 방지)
let lastClickTime = {};
const CLICK_DEBOUNCE_MS = 500; // 500ms 내 중복 클릭 방지

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const now = Date.now();
    const menuItemId = info.menuItemId;

    // 중복 클릭 방지
    if (
      lastClickTime[menuItemId] &&
      now - lastClickTime[menuItemId] < CLICK_DEBOUNCE_MS
    ) {
      console.log("⚠️ 중복 클릭 무시:", menuItemId);
      return;
    }

    lastClickTime[menuItemId] = now;

    switch (menuItemId) {
      case "quick-mode":
        // 빠른 실행 모드 토글
        chrome.storage.local.get(["quickMode"], async (result) => {
          const newQuickMode = !result.quickMode;
          await chrome.storage.local.set({ quickMode: newQuickMode });
          console.log("빠른 실행 모드:", newQuickMode ? "활성화" : "비활성화");
          // 컨텍스트 메뉴 다시 생성하여 텍스트 업데이트
          await createContextMenus();
          // popup 상태도 업데이트
          await updateQuickModePopup();
        });
        break;

      case "open-dashboard":
        // 대시보드 열기
        chrome.tabs.create({ url: DASHBOARD_URL });
        break;

      case "open-github":
        // GitHub 저장소 열기
        chrome.tabs.create({ url: GITHUB_URL });
        break;

      case "open-bug-report":
        // 버그 리포트 열기
        chrome.tabs.create({ url: BUG_REPORT_URL });
        break;

      default:
        console.log("알 수 없는 메뉴 항목:", menuItemId);
    }
  } catch (error) {
    console.error("컨텍스트 메뉴 처리 오류:", error);
  }
});

// ===== 빠른 실행 모드 =====

// 빠른 실행 모드 상태에 따라 popup 활성/비활성화
async function updateQuickModePopup() {
  try {
    const result = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = result.quickMode || false;

    if (isQuickModeEnabled) {
      // 빠른 실행 모드 활성화 → popup 비활성화, onClicked 리스너 사용
      chrome.action.setPopup({ popup: "" });
      console.log("⚡ 빠른 실행 모드: popup 비활성화");
    } else {
      // 빠른 실행 모드 비활성화 → popup 활성화
      chrome.action.setPopup({ popup: "popup.html" });
      console.log("📋 일반 모드: popup 활성화");
    }
  } catch (error) {
    console.error("❌ 빠른 실행 모드 popup 업데이트 실패:", error);
  }
}

// 확장 프로그램 아이콘 클릭 처리 (빠른 실행 모드일 때만)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 빠른 실행 모드 확인
    const quickModeResult = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = quickModeResult.quickMode || false;

    if (!isQuickModeEnabled) {
      // 빠른 실행 모드가 꺼져있으면 popup이 열림 (기본 동작)
      return;
    }

    // 로그인 상태 확인
    if (!currentUser) {
      await restoreUserInfo();
    }

    if (!currentUser || !currentUser.uid) {
      console.log("⚠️ 빠른 실행 모드: 로그인되지 않음");
      // 로그인 안되어 있으면 popup 활성화하여 로그인 유도
      chrome.action.setPopup({ popup: "popup.html" });
      chrome.action.openPopup();
      return;
    }

    // 빠른 실행 모드 활성화 + 로그인됨 → 바로 북마크 저장
    console.log("⚡ 빠른 실행 모드: 바로 북마크 저장");

    const saveResult = await quickSaveBookmark();

    if (saveResult.success) {
      console.log("✅ 빠른 실행 모드: 북마크 저장 완료");
      // 성공 알림
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
    } else {
      // 실패 알림 (X 표시)
      chrome.action.setBadgeText({ text: "✕" });
      chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
    }
  } catch (error) {}
});

// 빠른 실행 모드로 북마크 저장 (popup 없이)
async function quickSaveBookmark() {
  try {
    // 로그인 상태 확인
    if (!currentUser) {
      await restoreUserInfo();
    }

    if (!currentUser || !currentUser.uid) {
      console.log("⚠️ 빠른 실행 모드: 로그인되지 않음");
      return { success: false, error: "로그인이 필요합니다." };
    }

    // 현재 활성 탭 정보 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      return { success: false, error: "현재 탭 정보를 가져올 수 없습니다." };
    }

    const currentTab = tabs[0];

    // 탭 정보 검증
    if (!currentTab.url || !currentTab.title) {
      return {
        success: false,
        error: "현재 페이지의 URL 또는 제목을 가져올 수 없습니다.",
      };
    }

    // chrome:// 또는 edge:// 등 특수 URL 차단
    if (
      currentTab.url.startsWith("chrome://") ||
      currentTab.url.startsWith("edge://") ||
      currentTab.url.startsWith("about:")
    ) {
      return { success: false, error: "이 페이지는 북마크할 수 없습니다." };
    }

    // 북마크 데이터 준비
    const favicon = getFaviconUrl(currentTab.url);
    const now = new Date();
    const bookmarkDataToSave = {
      title: currentTab.title,
      url: currentTab.url,
      description: "",
      favicon: favicon,
      collection: null,
      order: 0,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      tags: [],
      isFavorite: false,
    };

    // idToken 확인 및 갱신
    if (!currentIdToken) {
      await restoreUserInfo();
    }

    if (!currentIdToken) {
      let refreshedToken = await refreshIdTokenWithRefreshToken();
      if (!refreshedToken) {
        refreshedToken = await getRefreshIdTokenFromWeb();
      }
      if (refreshedToken) {
        currentIdToken = refreshedToken;
      }
    }

    if (!currentIdToken) {
      return {
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      };
    }

    // Firestore REST API로 북마크 저장
    const response = await addFirestoreDocument(
      "bookmarks",
      bookmarkDataToSave,
      currentIdToken
    );

    const bookmarkId = response.name?.split("/").pop();
    console.log("✅ 빠른 실행 모드: 북마크 저장 완료, ID:", bookmarkId);

    return { success: true, bookmarkId: bookmarkId };
  } catch (error) {
    console.error("❌ 빠른 실행 모드 북마크 저장 실패:", error);
    return {
      success: false,
      error: error.message || "북마크 저장 중 오류가 발생했습니다.",
    };
  }
}

// ===== 초기화 =====

// Service Worker 시작 시 초기화
(async () => {
  console.log("🚀 Background Service Worker 시작 - 사용자 정보 복원 중...");
  await restoreUserInfo();
  createContextMenus();
  await updateQuickModePopup();
})();
