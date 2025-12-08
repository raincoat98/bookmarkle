// Chrome Extension MV3에서는 Firebase SDK를 직접 import할 수 없음
// 모든 Firebase 로직은 offscreen document에서 처리

// ============================================================================
// 상수 및 전역 변수
// ============================================================================

// Offscreen 문서 경로 상수
const OFFSCREEN_PATH = "offscreen.html";

// 동시 생성 방지
let creatingOffscreen = null;

// Offscreen ready event handling
let offscreenReadyResolver = null;
let offscreenReadyPromise = new Promise((resolve) => {
  offscreenReadyResolver = resolve;
});

// 시작 페이지 설정
const DEFAULT_START_PAGE_URL = "_PUBLIC_START_PAGE_URL_";
let overrideNewTabEnabled = false;
let cachedStartPageUrl = DEFAULT_START_PAGE_URL;
let startPageSettingsInitialized = false;
let startPageSettingsReadyPromise = null;

// 알림 설정 캐시
let cachedNotificationSettings = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_DURATION = 60000; // 1분 캐시 TTL (설정이 자주 바뀌지 않음)
const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications: true,
  bookmarkNotifications: true,
  systemNotifications: true,
};

// 컨텍스트 메뉴 생성 상태 추적
let isCreatingMenus = false;
let menuCreationPromise = null;

// 중복 로그인 방지
let lastLoginUserId = null;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 시작 페이지 URL이 허용된 프로토콜인지 확인
 */
function isAllowedStartUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return true;
    }

    if (
      parsed.protocol === "chrome-extension:" &&
      parsed.origin === `chrome-extension://${chrome.runtime.id}`
    ) {
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
}

/**
 * 캐시된 시작 페이지 URL 업데이트
 */
function updateCachedStartPageUrl(rawValue) {
  if (typeof rawValue === "string" && rawValue.trim().length) {
    if (isAllowedStartUrl(rawValue)) {
      cachedStartPageUrl = rawValue;
      return;
    }
    console.warn(
      "허용되지 않은 시작 페이지 URL이 저장되어 기본값으로 대체됩니다:",
      rawValue
    );
  }
  cachedStartPageUrl = DEFAULT_START_PAGE_URL;
}

/**
 * 시작 페이지 URL 해석 (설정 초기화 대기 포함)
 */
async function resolveStartPageUrl() {
  if (!startPageSettingsInitialized && startPageSettingsReadyPromise) {
    try {
      await startPageSettingsReadyPromise;
    } catch (error) {
      console.warn("시작 페이지 URL 준비 중 오류 - 기본값 사용:", error);
    }
  }
  return cachedStartPageUrl;
}

// ============================================================================
// Offscreen Document 관리
// ============================================================================

/**
 * Offscreen 문서가 존재하는지 확인
 */
async function hasOffscreen() {
  const clientsList = await self.clients.matchAll();
  return clientsList.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_PATH)
  );
}

/**
 * Offscreen 문서가 준비될 때까지 대기 (event-driven)
 */
async function waitForOffscreenReady(maxWait = 1000, silent = false) {
  try {
    await Promise.race([
      offscreenReadyPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), maxWait)
      ),
    ]);
    if (!silent) {
      console.log("✅ Offscreen is ready");
    }
  } catch (error) {
    if (!silent) {
      console.warn("⚠️ Offscreen may not be ready after maximum wait time");
    }
  }
}

/**
 * Offscreen 문서 생성 및 설정
 */
async function setupOffscreen(silent = false) {
  if (await hasOffscreen()) {
    // 이미 존재하면 빠르게 반환 (PING으로 활성 상태 확인)
    try {
      const response = await Promise.race([
        chrome.runtime.sendMessage({ type: "PING" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("PING timeout")), 500)
        ),
      ]);
      if (response?.ready) {
        if (!silent) console.log("✅ Offscreen is ready");
        return;
      }
    } catch (error) {
      // PING 실패해도 진행 (offscreen이 준비되지 않았을 수 있음)
    }
    // PING이 실패하면 waitForOffscreenReady로 짧게 대기
    await waitForOffscreenReady(500, true);
    return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    await waitForOffscreenReady(500, silent);
    return;
  }

  // Reset promise for new offscreen document
  offscreenReadyPromise = new Promise((resolve) => {
    offscreenReadyResolver = resolve;
  });

  try {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: "Firebase signInWithPopup in iframe (MV3 limitation)",
    });
    await creatingOffscreen;
  } catch (error) {
    // 이미 offscreen이 생성 중이거나 존재하는 경우 무시
    if (!error.message?.includes("Only a single offscreen")) {
      console.error("Offscreen 생성 실패:", error);
    }
  } finally {
    creatingOffscreen = null;
  }

  // offscreen이 준비될 때까지 대기
  await waitForOffscreenReady(1000, silent);
}

/**
 * Offscreen 문서 닫기
 */
async function closeOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument();
  }
}

/**
 * Offscreen으로 메시지를 보내고 재시도 로직 포함
 */
async function sendMessageToOffscreen(message, maxRetries = 2) {
  console.log("🔥 sendMessageToOffscreen called with:", message);
  
  // offscreen이 없으면 생성
  await setupOffscreen(true);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔥 Attempt ${i + 1}: Sending message`);
      const result = await chrome.runtime.sendMessage(message);
      console.log("🔥 Message sent successfully");
      return result;
    } catch (error) {
      console.error(`🔥 Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // Faster backoff: 50ms instead of exponential
      const backoffMs = 50;
      console.log(
        `Retrying in ${backoffMs}ms (${i + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// ============================================================================
// 알림 설정 관리
// ============================================================================

/**
 * 알림 설정 가져오기 (캐싱 포함)
 */
async function getNotificationSettings(userId) {
  // 캐시 확인
  const now = Date.now();
  if (
    cachedNotificationSettings !== null &&
    now - settingsCacheTime < SETTINGS_CACHE_DURATION
  ) {
    return cachedNotificationSettings;
  }

  // 사용자가 없으면 기본값 반환
  if (!userId) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    await setupOffscreen();
    const settingsResult = await sendMessageToOffscreen({
      target: "offscreen",
      type: "GET_NOTIFICATION_SETTINGS",
    });

    if (settingsResult?.type === "NOTIFICATION_SETTINGS_DATA") {
      cachedNotificationSettings = {
        notifications:
          settingsResult.notifications !== undefined
            ? settingsResult.notifications
            : true,
        bookmarkNotifications:
          settingsResult.bookmarkNotifications !== undefined
            ? settingsResult.bookmarkNotifications
            : true,
        systemNotifications:
          settingsResult.systemNotifications !== undefined
            ? settingsResult.systemNotifications
            : settingsResult.notifications !== undefined
            ? settingsResult.notifications
            : true,
      };
      settingsCacheTime = now;
      return cachedNotificationSettings;
    }
  } catch (error) {
    console.error("알림 설정 확인 실패:", error);
  }

  // 기본값 반환
  return DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * 알림 설정 캐시 무효화
 */
function invalidateNotificationSettingsCache() {
  cachedNotificationSettings = null;
  settingsCacheTime = 0;
}

/**
 * 컬렉션 캐시 무효화
 */
function invalidateCollectionsCache() {
  // This will be set by popup when cache version mismatches
  console.log("📌 Collections cache invalidated");
}

// ============================================================================
// 시작 페이지 설정 관리
// ============================================================================

/**
 * 시작 페이지 설정 초기화
 */
async function initializeStartPageSettings() {
  try {
    const { customStartUrl, overrideNewTab } = await chrome.storage.local.get([
      "customStartUrl",
      "overrideNewTab",
    ]);
    overrideNewTabEnabled = Boolean(overrideNewTab);
    updateCachedStartPageUrl(customStartUrl);
  } catch (error) {
    console.warn("시작 페이지 설정 초기화 실패 - 기본값 사용:", error);
    overrideNewTabEnabled = false;
    cachedStartPageUrl = DEFAULT_START_PAGE_URL;
  } finally {
    startPageSettingsInitialized = true;
  }
}

// 시작 페이지 설정 초기화 시작
startPageSettingsReadyPromise = initializeStartPageSettings();

// ============================================================================
// 컨텍스트 메뉴 관리
// ============================================================================

/**
 * 안전한 메뉴 제거 함수
 */
async function removeAllMenusSafely() {
  console.log("기존 메뉴 제거 시작...");

  // 첫 번째 시도: 일반 제거
  await new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.warn(
          "첫 번째 메뉴 제거 시도 중 경고:",
          chrome.runtime.lastError.message
        );
      }
      resolve();
    });
  });

  // 제거 완료 대기
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 두 번째 시도: 확실한 제거
  await new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        console.warn(
          "두 번째 메뉴 제거 시도 중 경고:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("기존 메뉴 제거 완료");
      }
      resolve();
    });
  });

  // 추가 안전 대기
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * 개별 컨텍스트 메뉴 아이템 생성 헬퍼 함수
 */
function createContextMenuItem(properties) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🔧 메뉴 생성 시도: ${properties.id} (${properties.title})`);
      chrome.contextMenus.create(properties, () => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          const errorMsg =
            error.message || error.toString() || "알 수 없는 오류";
          console.error(
            `❌ 메뉴 생성 실패 [${properties.id || properties.type}]:`,
            errorMsg
          );
          console.error("메뉴 속성:", JSON.stringify(properties, null, 2));

          // 특정 오류 타입에 대한 추가 정보
          if (errorMsg.includes("duplicate")) {
            console.error(
              "중복 ID 오류 - 기존 메뉴가 완전히 제거되지 않았을 수 있습니다"
            );
          }

          reject(new Error(errorMsg));
        } else {
          console.log(
            `✅ 메뉴 생성 성공 [${properties.id || properties.type}]`
          );
          resolve();
        }
      });
    } catch (syncError) {
      console.error("메뉴 생성 중 동기 오류:", syncError);
      reject(syncError);
    }
  });
}

/**
 * 재시도 로직이 포함된 메뉴 생성 함수
 */
async function createContextMenuItemWithRetry(properties, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 메뉴 생성 시도 ${attempt}/${maxRetries}: ${properties.id}`
      );
      await createContextMenuItem(properties);
      console.log(`✅ 메뉴 생성 성공: ${properties.id}`);
      return; // 성공하면 종료
    } catch (error) {
      console.warn(
        `⚠️ 메뉴 생성 시도 ${attempt}/${maxRetries} 실패 [${properties.id}]:`,
        error.message
      );

      if (attempt === maxRetries) {
        console.error(
          `❌ 메뉴 생성 최종 실패 [${properties.id || properties.type}]`
        );
        throw error; // 최대 재시도 후 실패하면 에러 던지기
      }

      // 재시도 전 대기 (지수적 백오프)
      const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
      console.log(`⏳ ${delay}ms 후 재시도합니다...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // 중복 ID 오류인 경우 추가 메뉴 제거 시도
      if (error.message.includes("duplicate")) {
        console.log("🔄 중복 ID 오류 감지 - 추가 메뉴 제거 시도");
        await new Promise((resolve) => {
          chrome.contextMenus.removeAll(() => {
            resolve();
          });
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}

/**
 * 컨텍스트 메뉴 생성 내부 로직
 */
async function createContextMenusInternal() {
  try {
    console.log("컨텍스트 메뉴 생성 시작...");

    // 기존 메뉴 완전 제거 및 확인
    await removeAllMenusSafely();

    // 빠른 실행 모드 상태 확인
    const result = await chrome.storage.local.get(["quickMode"]);
    const isQuickMode = result.quickMode || false;
    console.log("빠른 실행 모드 상태:", isQuickMode);

    // 메뉴 생성 (최대 4개 제한 - Chrome 확장 프로그램 제약)
    const menuItems = [
      {
        id: "toggle-quick-mode",
        title: isQuickMode
          ? "⚡ 빠른 실행 모드 비활성화"
          : "⚡ 빠른 실행 모드 활성화",
        contexts: ["action"],
      },
      {
        id: "open-dashboard",
        title: "📊 대시보드 열기",
        contexts: ["action"],
      },
      {
        id: "separator-1",
        type: "separator",
        contexts: ["action"],
      },
      {
        id: "open-github",
        title: "🐙 GitHub 저장소",
        contexts: ["action"],
      },
      {
        id: "open-bug-report",
        title: "🐛 버그 리포트",
        contexts: ["action"],
      },
    ];

    for (const menuItem of menuItems) {
      console.log("메뉴 생성 시도:", menuItem.id, menuItem.title);
      try {
        await createContextMenuItemWithRetry(menuItem, 3);
        console.log("✅ 메뉴 생성 완료:", menuItem.id);
      } catch (error) {
        console.error("❌ 메뉴 생성 실패:", menuItem.id, error.message);
      }
    }

    console.log("컨텍스트 메뉴 생성 완료");
  } catch (error) {
    console.error("컨텍스트 메뉴 생성 중 오류:", error);
    // 실패해도 확장 프로그램이 계속 작동하도록 함
  }
}

/**
 * 컨텍스트 메뉴 생성 함수
 */
async function createContextMenus() {
  // 이미 메뉴 생성 중이면 기존 Promise 반환
  if (isCreatingMenus && menuCreationPromise) {
    console.log("메뉴 생성이 이미 진행 중입니다. 기존 작업을 기다립니다.");
    return menuCreationPromise;
  }

  isCreatingMenus = true;
  menuCreationPromise = createContextMenusInternal();

  try {
    await menuCreationPromise;
  } finally {
    isCreatingMenus = false;
    menuCreationPromise = null;
  }
}

/**
 * 컨텍스트 메뉴 아이템 업데이트 헬퍼 함수
 */
function updateContextMenuItem(id, updateProperties) {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.update(id, updateProperties, () => {
      if (chrome.runtime.lastError) {
        const errorMsg =
          chrome.runtime.lastError.message ||
          JSON.stringify(chrome.runtime.lastError);
        console.error(`메뉴 업데이트 실패 [${id}]:`, errorMsg);
        reject(new Error(errorMsg));
      } else {
        console.log(`메뉴 업데이트 성공 [${id}]`);
        resolve();
      }
    });
  });
}

// ============================================================================
// 액션 및 메뉴 핸들러
// ============================================================================

/**
 * 빠른 실행 모드 토글 함수
 */
async function toggleQuickMode() {
  try {
    const result = await chrome.storage.local.get(["quickMode"]);
    const currentMode = result.quickMode || false;
    const newMode = !currentMode;

    await chrome.storage.local.set({ quickMode: newMode });

    // 메뉴 텍스트 업데이트 (Promise 방식으로 개선)
    await updateContextMenuItem("toggle-quick-mode", {
      title: newMode
        ? "⚡ 빠른 실행 모드 비활성화"
        : "⚡ 빠른 실행 모드 활성화",
    });

    // 팝업 동작 업데이트
    await updatePopupBehavior();

    console.log(`빠른 실행 모드 ${newMode ? "활성화" : "비활성화"}`);
  } catch (error) {
    console.error("빠른 실행 모드 토글 실패:", error);
  }
}

/**
 * 빠른실행모드 상태에 따라 팝업 설정 업데이트
 */
async function updatePopupBehavior() {
  const result = await chrome.storage.local.get(["quickMode"]);
  const isQuickMode = result.quickMode || false;

  if (isQuickMode) {
    // 빠른실행모드: 팝업 제거하여 onClicked 이벤트 발생
    await chrome.action.setPopup({ popup: "" });
    console.log("빠른실행모드 활성화 - 팝업 비활성화");
  } else {
    // 일반 모드: 팝업 설정
    await chrome.action.setPopup({ popup: "popup.html" });
    console.log("일반 모드 - 팝업 활성화");
  }
}

/**
 * 대시보드 열기 함수
 */
async function openDashboard() {
  try {
    const dashboardUrl = DEFAULT_START_PAGE_URL;
    await chrome.tabs.create({ url: dashboardUrl });
  } catch (error) {
    console.error("대시보드 열기 실패:", error);
  }
}

/**
 * GitHub 저장소 열기 함수
 */
async function openGitHub() {
  try {
    const githubUrl = "https://github.com/raincoat98/bookmakle";
    await chrome.tabs.create({ url: githubUrl });
  } catch (error) {
    console.error("GitHub 저장소 열기 실패:", error);
  }
}

/**
 * Chrome 웹스토어 열기 함수
 */
async function openChromeStore() {
  try {
    const chromeStoreUrl =
      "https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko";
    await chrome.tabs.create({ url: chromeStoreUrl });
  } catch (error) {
    console.error("Chrome 웹스토어 열기 실패:", error);
  }
}

/**
 * 버그 리포트 열기 함수
 */
async function openBugReport() {
  try {
    const bugReportUrl =
      "https://github.com/raincoat98/bookmakle/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen";
    await chrome.tabs.create({ url: bugReportUrl });
  } catch (error) {
    console.error("버그 리포트 열기 실패:", error);
  }
}

// ============================================================================
// 메시지 핸들러
// ============================================================================

/**
 * 컬렉션 존재 여부 검증
 */
async function validateCollection(collectionId, userId) {
  if (!collectionId || collectionId.trim() === "") {
    return { valid: true };
  }

  console.log("🔍 [background] 컬렉션 검증 시작:", collectionId);

  // Chrome Storage에서 컬렉션 가져오기
  const storageResult = await chrome.storage.local.get(["cachedCollections"]);
  const cachedCollections = storageResult.cachedCollections || [];
  console.log("🔍 [background] Storage 캐시된 컬렉션 수:", cachedCollections.length);

  let collectionExists = cachedCollections.some(
    (col) => col.id === collectionId
  );

  if (collectionExists) {
    console.log("✅ [background] Storage 캐시에서 컬렉션 존재 확인:", collectionId);
    return { valid: true };
  }

  // 캐시에 없으면 실시간으로 Firestore에서 조회
  console.log("🔍 [background] 캐시에 없음 - Firestore에서 실시간 조회 중...");
  
  // Chrome Storage에서 idToken 가져오기
  const storageData = await chrome.storage.local.get(["currentIdToken"]);
  const idToken = storageData.currentIdToken;
  
  await setupOffscreen();
  const collectionsResult = await sendMessageToOffscreen({
    target: "offscreen",
    type: "GET_COLLECTIONS",
    userId: userId,
    idToken: idToken, // idToken 추가
  });

  console.log("🔍 [background] 컬렉션 조회 결과:", collectionsResult.type);

  if (collectionsResult?.type === "COLLECTIONS_ERROR") {
    console.error("❌ [background] 컬렉션 조회 실패");
    return {
      valid: false,
      error: {
        type: "BOOKMARK_SAVE_ERROR",
        code: "firestore/fetch-failed",
        message: "컬렉션 목록을 가져올 수 없습니다.",
      },
    };
  }

  const collections = collectionsResult.collections || [];
  console.log("🔍 [background] 조회된 컬렉션 수:", collections.length);
  console.log(
    "🔍 [background] 컬렉션 ID 목록:",
    collections.map((c) => c.id)
  );

  collectionExists = collections.some((col) => col.id === collectionId);
  console.log("🔍 [background] 컬렉션 존재 여부:", collectionExists);

  if (!collectionExists) {
    console.error("❌ [background] 컬렉션이 존재하지 않음:", collectionId);
    return {
      valid: false,
      error: {
        type: "BOOKMARK_SAVE_ERROR",
        code: "not-found",
        message:
          "선택한 컬렉션이 존재하지 않습니다. 컬렉션 목록을 새로고침하세요.",
      },
    };
  }

  console.log("✅ [background] 컬렉션 존재 확인 완료:", collectionId);
  return { valid: true };
}

/**
 * 북마크 저장 성공 시 알림 처리
 */
async function handleBookmarkSaveSuccess(bookmarkData, userId) {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab) {
      chrome.action.setBadgeText({ text: "✓", tabId: activeTab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#10b981",
        tabId: activeTab.id,
      });

      // 알림 설정 확인
      const notificationSettings = await getNotificationSettings(userId);

      // 성공 알림 (설정이 활성화된 경우만)
      if (
        notificationSettings.notifications &&
        notificationSettings.systemNotifications
      ) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "public/bookmark.png",
          title: "북마크 저장 완료",
          message: `"${bookmarkData.title}" 북마크가 저장되었습니다.`,
          priority: 2,
        });
      }

      // 3초 후 제거
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: activeTab.id });
      }, 3000);
    }
  } catch (error) {
    console.error("알림 처리 중 오류:", error);
  }
}

/**
 * 북마크 저장 요청 처리
 */
async function handleSaveBookmark(msg) {
  // 사용자 정보 가져오기
  const authResult = await chrome.storage.local.get(["currentUser"]);
  if (!authResult?.currentUser?.uid) {
    console.error("❌ [background] 사용자 정보 없음");
    return {
      type: "BOOKMARK_SAVE_ERROR",
      code: "auth/not-authenticated",
      message: "로그인이 필요합니다.",
    };
  }

  // 컬렉션이 선택된 경우 존재 여부 검증
  const collectionId = msg.bookmarkData?.collectionId;
  console.log(
    "🔍 [background] 북마크 저장 요청 - 컬렉션 ID:",
    collectionId,
    "타입:",
    typeof collectionId
  );

  if (collectionId && collectionId.trim() !== "") {
    const validation = await validateCollection(
      collectionId,
      authResult.currentUser.uid
    );
    if (!validation.valid) {
      return validation.error;
    }
  } else {
    console.log("ℹ️ [background] 컬렉션이 선택되지 않음 - 검증 건너뛰기");
  }

  // 북마크 저장 요청을 offscreen으로 전달
  const result = await sendMessageToOffscreen({
    target: "offscreen",
    type: "SAVE_BOOKMARK",
    userId: authResult.currentUser.uid,
    bookmarkData: msg.bookmarkData,
  });

  // 저장 성공 시 아이콘에 체크 표시 (비동기로 처리하여 저장 응답 지연 방지)
  if (result?.type === "BOOKMARK_SAVED") {
    // 응답을 먼저 보내고 알림은 나중에 처리
    handleBookmarkSaveSuccess(msg.bookmarkData, authResult.currentUser.uid);
    return result;
  }

  return result;
}

// ============================================================================
// 이벤트 리스너 등록
// ============================================================================

// 외부 웹사이트에서 로그인/로그아웃 메시지 처리 (통합된 단일 리스너)
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log("🌐 [onMessageExternal] Received:", request?.type, "from:", sender?.url);

    if (request.type === "LOGIN_SUCCESS" && request.user) {
      // 중복 로그인 방지
      if (lastLoginUserId === request.user.uid) {
        console.log("⏭️ Duplicate LOGIN_SUCCESS ignored for:", request.user.email);
        sendResponse({ success: true, duplicate: true });
        return true;
      }
      lastLoginUserId = request.user.uid;
      
      console.log("✅ LOGIN_SUCCESS received:", request.user.email);
      
      // 로그인 성공 시 알림 설정 캐시 무효화
      invalidateNotificationSettingsCache();
      
      // Chrome Storage에 사용자 정보, 토큰, 컬렉션 저장
      if (chrome.storage && chrome.storage.local) {
        const dataToSave = {
          currentUser: request.user,
        };

        // idToken이 있으면 함께 저장
        if (request.idToken) {
          dataToSave.currentIdToken = request.idToken;
        }

        // 컬렉션이 있으면 함께 저장
        if (request.collections) {
          dataToSave.cachedCollections = request.collections;
          console.log("✅ Saving collections to storage:", request.collections.length);
        }

        chrome.storage.local.set(dataToSave, () => {
          console.log("✅ User login data saved to Chrome Storage");
          if (request.collections) {
            console.log("✅ Collections cached:", request.collections.length);
          }
          sendResponse({ success: true });
        });
      } else {
        console.error("Chrome Storage API가 사용할 수 없습니다");
        sendResponse({ success: false, error: "Storage API unavailable" });
      }
      return true;
    }

    if (request.type === "LOGOUT_SUCCESS") {
      console.log("✅ LOGOUT_SUCCESS received");
      
      // Reset duplicate login prevention
      lastLoginUserId = null;
      
      // Chrome Storage에서 사용자 정보, 토큰, 컬렉션 제거
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(
          ["currentUser", "currentIdToken", "cachedCollections"],
          () => {
            console.log("✅ User data cleared from Chrome Storage");
            invalidateNotificationSettingsCache();

            // 모든 탭에 로그아웃 알림 브로드캐스트
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, {
                  type: "LOGOUT_COMPLETED",
                }).catch(() => {
                  // 탭이 로드되지 않았거나 메시지를 받을 리스너가 없을 수 있음
                });
              });
            });

            sendResponse({ success: true });
          }
        );
      } else {
        console.error("Chrome Storage API가 사용할 수 없습니다");
        sendResponse({ success: false, error: "Storage API unavailable" });
      }
      return true;
    }
    
    return false;
  }
);

// popup → background 메시지 수신 (통합된 단일 리스너)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("Background received message:", msg?.type);

  // Handle OFFSCREEN_READY signal
  if (msg?.type === "OFFSCREEN_READY") {
    console.log("✅ Offscreen is ready");
    if (offscreenReadyResolver) {
      offscreenReadyResolver();
      offscreenReadyResolver = null;
    }
    sendResponse({ received: true });
    return true;
  }

  (async () => {
    try {
      // offscreen으로부터의 로그인 완료 알림
      if (msg?.type === "LOGIN_COMPLETED") {
        console.log("✅ LOGIN_COMPLETED received in background:", msg.user?.email);
        invalidateCollectionsCache(); // Invalidate on login

        if (chrome.storage && chrome.storage.local) {
          await new Promise((resolve) => {
            chrome.storage.local.set({
              currentUser: msg.user,
              currentIdToken: msg.idToken,
              cachedCollections: msg.collections || [],
            }, () => {
              console.log("✅ User data and collections saved to Chrome Storage");
              resolve();
            });
          });
        }

        // 로그인 완료를 모든 콘텐츠 스크립트와 팝업에 브로드캐스트
        try {
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                type: "LOGIN_COMPLETED",
                user: msg.user,
                collections: msg.collections,
              }).catch(() => {
                // 탭이 로드되지 않았거나 메시지를 받을 리스너가 없을 수 있음
              });
            });
          });
        } catch (e) {
          console.log("Failed to broadcast to tabs:", e.message);
        }

        sendResponse({ success: true });
        return;
      }

      if (msg?.type === "LOGIN_GOOGLE") {
        await setupOffscreen();
        // offscreen으로 위임
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "START_POPUP_AUTH",
        });
        await closeOffscreen();
        sendResponse(result);
        return;
      }

      if (msg?.type === "GET_AUTH_STATE") {
        // Chrome Storage에서 직접 사용자 정보 및 컬렉션 조회
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["currentUser", "cachedCollections"], (result) => {
            console.log("GET_AUTH_STATE - currentUser:", result.currentUser?.email);
            console.log("GET_AUTH_STATE - cachedCollections:", result.cachedCollections?.length || 0);
            sendResponse({
              user: result.currentUser || null,
              collections: result.cachedCollections || []
            });
          });
          return true; // async 응답
        } else {
          console.error("Chrome Storage API가 사용할 수 없습니다");
          sendResponse({ user: null, collections: [], error: "Storage API unavailable" });
          return;
        }
      }

      if (msg?.type === "LOGOUT") {
        console.log("로그아웃 요청 수신됨");

        try {
          // Chrome Storage에서 사용자 정보 제거 (Promise 기반)
          if (chrome.storage && chrome.storage.local) {
            await new Promise((resolve) => {
              chrome.storage.local.remove(
                ["currentUser", "currentIdToken", "cachedCollections", "collections"],
                () => {
                  console.log("Chrome Storage에서 사용자 정보 및 컬렉션 제거 완료");
                  resolve();
                }
              );
            });

            // offscreen을 통해 signin-popup의 Firebase 세션도 로그아웃
            try {
              console.log("Firebase 세션 로그아웃 시작...");
              await setupOffscreen(true); // silent 모드
              console.log("🔥 Sending LOGOUT_FIREBASE message to offscreen...");
              const logoutResult = await sendMessageToOffscreen({
                target: "offscreen",
                type: "LOGOUT_FIREBASE",
              });
              console.log("Firebase 세션 로그아웃 완료:", logoutResult);
            } catch (error) {
              console.error("Firebase 세션 로그아웃 실패:", error);
            }

            console.log("로그아웃 처리 완료, 성공 응답 전송");
            sendResponse({ success: true });
          } else {
            console.error("Chrome Storage API가 사용할 수 없습니다");
            sendResponse({ success: false, error: "Storage API unavailable" });
          }
        } catch (error) {
          console.error("로그아웃 처리 중 오류:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // async 응답을 위해 true 반환
      }

      if (msg?.type === "GET_COLLECTIONS") {
        // 컬렉션 데이터 요청을 offscreen으로 전달
        // Chrome Storage에서 idToken 가져오기
        const storageData = await chrome.storage.local.get(["currentIdToken"]);
        const idToken = storageData.currentIdToken;
        
        await setupOffscreen();
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "GET_COLLECTIONS",
          userId: msg.userId,
          idToken: idToken, // idToken 추가
        });
        sendResponse(result);
        return true; // async 응답을 위해 true 반환
      }

      if (msg?.type === "GET_BOOKMARKS") {
        // 북마크 데이터 요청을 offscreen으로 전달
        await setupOffscreen();
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "GET_BOOKMARKS",
          userId: msg.userId,
          collectionId: msg.collectionId,
        });
        sendResponse(result);
        return true; // async 응답을 위해 true 반환
      }

      if (msg?.type === "SAVE_BOOKMARK") {
        const result = await handleSaveBookmark(msg);
        sendResponse(result);
        return true; // async 응답을 위해 true 반환
      }

      if (msg?.type === "CREATE_COLLECTION") {
        // 컬렉션 생성 요청을 offscreen으로 전달
        await setupOffscreen();
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "CREATE_COLLECTION",
          collectionData: msg.collectionData,
        });
        sendResponse(result);
        return;
      }
    } catch (error) {
      console.error("Background script error:", error);
      sendResponse({ error: error.message });
    }
  })();

  // async 응답을 위해 true
  return true;
});

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("컨텍스트 메뉴 클릭됨:", info.menuItemId);

  try {
    switch (info.menuItemId) {
      case "toggle-quick-mode":
        console.log("빠른 실행 모드 토글 실행");
        await toggleQuickMode();
        break;
      case "open-dashboard":
        console.log("대시보드 열기 실행");
        await openDashboard();
        break;
      case "open-github":
        console.log("GitHub 저장소 열기 실행");
        await openGitHub();
        break;
      case "open-bug-report":
        console.log("버그 리포트 열기 실행");
        await openBugReport();
        break;
      default:
        console.log("알 수 없는 메뉴 항목:", info.menuItemId);
    }
  } catch (error) {
    console.error("컨텍스트 메뉴 처리 중 오류:", error);
  }
});

// 확장 프로그램 아이콘 클릭 이벤트 (빠른실행모드 전용)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 사용자 정보 확인
    const result = await chrome.storage.local.get(["currentUser"]);
    const currentUser = result.currentUser;

    if (!currentUser) {
      console.log("빠른실행모드: 로그인 필요 - 대시보드로 이동");
      chrome.notifications.create({
        type: "basic",
        iconUrl: "public/bookmark.png",
        title: "로그인 필요",
        message: "북마크를 저장하려면 먼저 로그인하세요.",
        priority: 2,
      });
      await openDashboard();

      return;
    }

    console.log("⚡ 빠른 저장 시작...");

    // 현재 탭 정보
    const bookmarkData = {
      userId: currentUser.uid,
      title: tab.title || tab.url,
      url: tab.url,
      description: "",
      collectionId: null, // 빠른 저장에서는 컬렉션 없음으로 저장
      tags: [],
      favicon: tab.favIconUrl || "",
      isFavorite: false,
      order: Date.now(),
    };

    // offscreen 설정 및 저장
    await setupOffscreen();

    // 알림 설정 가져오기
    const notificationSettings = await getNotificationSettings(currentUser.uid);

    const saveResult = await sendMessageToOffscreen({
      target: "offscreen",
      type: "SAVE_BOOKMARK",
      bookmarkData: bookmarkData,
    });

    if (saveResult?.type === "BOOKMARK_SAVED") {
      // 아이콘에 체크 표시
      chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#10b981",
        tabId: tab.id,
      });

      // 성공 알림 (설정이 활성화된 경우만)
      if (
        notificationSettings.notifications &&
        notificationSettings.systemNotifications
      ) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "public/bookmark.png",
          title: "⚡ 빠른 저장 완료",
          message: `"${tab.title}" 북마크가 저장되었습니다.`,
          priority: 2,
        });
      }
      console.log("빠른 저장 완료:", saveResult.bookmarkId);

      // 3초 후 체크 표시 제거
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 3000);
    } else {
      // 아이콘에 실패 표시
      chrome.action.setBadgeText({ text: "✕", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#ef4444",
        tabId: tab.id,
      });

      // 실패 알림
      chrome.notifications.create({
        type: "basic",
        iconUrl: "public/bookmark.png",
        title: "❌ 저장 실패",
        message: saveResult?.message || "북마크 저장에 실패했습니다.",
        priority: 2,
      });
      console.error("빠른 저장 실패:", saveResult);

      // 3초 후 제거
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 3000);
    }
  } catch (error) {
    console.error("빠른 저장 중 오류:", error);

    // 아이콘에 오류 표시
    chrome.action.setBadgeText({ text: "✕", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });

    chrome.notifications.create({
      type: "basic",
      iconUrl: "public/bookmark.png",
      title: "❌ 오류 발생",
      message: "북마크 저장 중 오류가 발생했습니다.",
      priority: 2,
    });

    // 3초 후 제거
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
    }, 3000);
  }
});

// Storage 변경 감지 리스너
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  // 시작 페이지 설정 변경 감지
  if (Object.prototype.hasOwnProperty.call(changes, "overrideNewTab")) {
    overrideNewTabEnabled = Boolean(changes.overrideNewTab.newValue);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "customStartUrl")) {
    updateCachedStartPageUrl(changes.customStartUrl.newValue);
  }

  // 빠른 실행 모드 변경 감지
  if (changes.quickMode) {
    console.log("빠른실행모드 변경 감지:", changes.quickMode.newValue);
    updatePopupBehavior();
  }
});

// 새 탭 생성 감지 및 전환
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    if (!tab.pendingUrl && !tab.url) {
      return;
    }

    const targetUrl = tab.pendingUrl || tab.url;
    if (!targetUrl) return;

    // 확장에서 생성한 탭은 무시
    if (targetUrl.startsWith(`chrome-extension://${chrome.runtime.id}`)) {
      return;
    }

    if (!startPageSettingsInitialized && startPageSettingsReadyPromise) {
      try {
        await startPageSettingsReadyPromise;
      } catch (error) {
        console.warn("새 탭 전환 설정 준비 실패:", error);
      }
    }

    if (!overrideNewTabEnabled) {
      return;
    }

    // 새 탭 페이지인지 확인
    if (
      targetUrl === "chrome://newtab/" ||
      targetUrl === "chrome://new-tab-page/"
    ) {
      const startPageUrl = await resolveStartPageUrl();
      if (!startPageUrl) {
        return;
      }

      if (tab.pendingUrl === startPageUrl || tab.url === startPageUrl) {
        return;
      }

      await chrome.tabs.update(tab.id, { url: startPageUrl });
      console.log("새 탭을 설정된 페이지로 전환했습니다.");
    }
  } catch (error) {
    console.error("새 탭 전환 처리 실패:", error);
  }
});

// 확장 프로그램 설치 시 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("확장 프로그램 설치/업데이트됨:", details.reason);
  await createContextMenus();
});

// 서비스 워커가 활성화될 때도 메뉴 생성 (MV3에서 중요)
self.addEventListener("activate", async (event) => {
  console.log("서비스 워커 활성화됨");
  event.waitUntil(createContextMenus());
});

// ============================================================================
// 초기화
// ============================================================================

// 확장 프로그램 시작 시 팝업 동작 초기화
updatePopupBehavior();
