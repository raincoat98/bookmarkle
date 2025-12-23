// Background Service Worker

// ===== 상수 =====
const SIGNIN_POPUP_URL = "SIGNIN_POPUP_URL_PLACEHOLDER"; // build-config.js에서 주입됨

// ===== 전역 변수 =====
let authResponseHandler = null;
let currentUser = null; // 메모리 캐시, storage에도 저장
let currentIdToken = null; // Firebase idToken
let currentRefreshToken = null; // Firebase refreshToken (토큰 갱신용)
const FIREBASE_PROJECT_ID = "FIREBASE_PROJECT_ID_PLACEHOLDER"; // build-config.js에서 주입됨
const FIREBASE_API_KEY = "FIREBASE_API_KEY_PLACEHOLDER"; // build-config.js에서 주입됨

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

    const url = "https://securetoken.googleapis.com/v1/token";
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
      const error = await response.json();
      console.error("🔐 토큰 갱신 실패:", error);
      throw new Error(error.error_description || "토큰 갱신 실패");
    }

    const data = await response.json();
    const newIdToken = data.id_token;

    if (newIdToken) {
      console.log("✅ ID Token 갱신 완료 (Refresh Token 사용)");
      currentIdToken = newIdToken;

      // storage에도 저장
      try {
        await chrome.storage.local.set({ idToken: newIdToken });
      } catch (e) {
        console.warn("⚠️ 갱신된 토큰 저장 실패:", e);
      }

      return newIdToken;
    }
  } catch (error) {
    console.error("🔐 Refresh Token 기반 토큰 갱신 실패:", error);
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
        let tabsToTry = tabs.filter(tab =>
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
                console.warn(`🔐 탭 ${tab.id}에서 토큰 요청 실패:`, chrome.runtime.lastError.message);
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
    const stored = await chrome.storage.local.get(["user", "idToken", "refreshToken"]);

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

// Firestore 쿼리 실행 (WHERE 절)
async function runFirestoreQuery(
  collectionId,
  fieldPath,
  operator,
  value,
  idToken
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

    if (!response.ok) {
      const errorData = await response.json();
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

// Firestore 문서 추가
async function addFirestoreDocument(collectionId, documentData, idToken) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}`;

    // Firestore API용 데이터 포맷 변환
    const firestoreData = {};
    for (const [key, value] of Object.entries(documentData)) {
      if (value === null) {
        firestoreData[key] = { nullValue: null };
      } else if (typeof value === "string") {
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

    if (!response.ok) {
      const errorData = await response.json();
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
      const result = await addFirestoreDocument(
        "collections",
        {
          name: collectionData.name.trim(),
          userId: currentUser.uid,
          icon: collectionData.icon || "",
          parentId: collectionData.parentId || null,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleMessage(message, sender, sendResponse);
  // handleMessage가 false를 반환하면 false 반환
  // 그 외의 경우에는 비동기 응답을 처리하기 위해 true 반환
  return result === false ? false : true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
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
    if (changes.idToken) {
      if (changes.idToken.newValue) {
        currentIdToken = changes.idToken.newValue;
        console.log("✅ Storage 변경 감지 - idToken 업데이트");
      } else {
        currentIdToken = null;
        console.log("✅ Storage 변경 감지 - idToken 삭제됨");
      }
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
