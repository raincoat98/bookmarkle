// Chrome Extension MV3에서는 Firebase SDK를 직접 import할 수 없음
// 모든 Firebase 로직은 offscreen document에서 처리

// Offscreen 문서 경로 상수
const OFFSCREEN_PATH = "offscreen.html";

// 동시 생성 방지
let creatingOffscreen;

async function hasOffscreen() {
  const clientsList = await self.clients.matchAll();
  return clientsList.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_PATH)
  );
}

async function setupOffscreen(silent = false) {
  if (await hasOffscreen()) {
    // 이미 존재하면 준비 확인만
    await waitForOffscreenReady(5000, silent);
    return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    await waitForOffscreenReady(5000, silent);
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: "Firebase signInWithPopup in iframe (MV3 limitation)",
  });
  await creatingOffscreen;
  creatingOffscreen = null;

  // offscreen이 준비될 때까지 대기
  await waitForOffscreenReady(5000, silent);
}

// offscreen이 준비될 때까지 대기 (ping 테스트)
async function waitForOffscreenReady(maxWait = 5000, silent = false) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      // ping 메시지를 보내서 응답이 오는지 확인
      await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "PING",
      });
      // 응답이 왔으면 준비된 것
      if (!silent) {
        console.log("Offscreen is ready");
      }
      return;
    } catch (error) {
      // 아직 준비 안됨, 조금 더 대기
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  if (!silent) {
    console.warn("Offscreen may not be ready after maximum wait time");
  }
}

// offscreen으로 메시지를 보내고 재시도 로직 포함
async function sendMessageToOffscreen(message, maxRetries = 3) {
  console.log("🔥 sendMessageToOffscreen called with:", message);
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(
        `🔥 Attempt ${i + 1}: Sending message via chrome.runtime.sendMessage`
      );
      const result = await chrome.runtime.sendMessage(message);
      console.log("🔥 Message sent successfully, result:", result);
      return result;
    } catch (error) {
      console.error(`🔥 Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`Offscreen 메시지 전송 재시도 ${i + 1}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// 알림 설정 가져오기 (캐싱 포함)
let cachedNotificationSettings = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_DURATION = 0; // 항상 최신 값 사용 (캐시는 실패 시 대비용)
const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications: true,
  bookmarkNotifications: true,
  systemNotifications: true,
};

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

// 알림 설정 캐시 무효화
function invalidateNotificationSettingsCache() {
  cachedNotificationSettings = null;
  settingsCacheTime = 0;
}

async function closeOffscreen() {
  if (await hasOffscreen()) {
    await chrome.offscreen.closeDocument();
  }
}

// 외부 웹사이트에서 로그인 완료 시 호출되는 메시지 처리
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_SUCCESS" && request.user) {
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
          console.log(
            "Saving collections to storage:",
            request.collections.length
          );
        }

        chrome.storage.local.set(dataToSave, () => {
          console.log("User login saved from external site:", request.user);
          if (request.collections) {
            console.log("Collections cached:", request.collections.length);
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
      // Chrome Storage에서 사용자 정보, 토큰, 컬렉션 제거
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(
          ["currentUser", "currentIdToken", "cachedCollections"],
          () => {
            console.log("User logout completed from external site");
            sendResponse({ success: true });
          }
        );
      } else {
        console.error("Chrome Storage API가 사용할 수 없습니다");
        sendResponse({ success: false, error: "Storage API unavailable" });
      }
      return true;
    }
  }
);

// popup → background 메시지 수신 (통합된 단일 리스너)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("Background received message:", msg?.type);

  (async () => {
    try {
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
        // Chrome Storage에서 직접 사용자 정보 조회
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["currentUser"], (result) => {
            sendResponse({ user: result.currentUser || null });
          });
        } else {
          console.error("Chrome Storage API가 사용할 수 없습니다");
          sendResponse({ user: null, error: "Storage API unavailable" });
        }
        return;
      }

      if (msg?.type === "LOGOUT") {
        console.log("로그아웃 요청 수신됨");

        try {
          // Chrome Storage에서 사용자 정보 제거 (Promise 기반)
          if (chrome.storage && chrome.storage.local) {
            await new Promise((resolve) => {
              chrome.storage.local.remove(
                ["currentUser", "currentIdToken", "cachedCollections"],
                () => {
                  console.log("Chrome Storage에서 사용자 정보 제거 완료");
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
        await setupOffscreen();
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "GET_COLLECTIONS",
          userId: msg.userId,
        });
        sendResponse(result);
        return;
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
        return;
      }

      if (msg?.type === "SAVE_BOOKMARK") {
        // 사용자 정보 가져오기
        const authResult = await chrome.storage.local.get(["currentUser"]);
        if (!authResult?.currentUser?.uid) {
          console.error("❌ [background] 사용자 정보 없음");
          sendResponse({
            type: "BOOKMARK_SAVE_ERROR",
            code: "auth/not-authenticated",
            message: "로그인이 필요합니다.",
          });
          return;
        }

        // 컬렉션이 선택된 경우 존재 여부 검증
        const collectionId = msg.bookmarkData?.collection;
        console.log(
          "🔍 [background] 북마크 저장 요청 - 컬렉션 ID:",
          collectionId,
          "타입:",
          typeof collectionId
        );

        if (collectionId && collectionId.trim() !== "") {
          console.log("🔍 [background] 컬렉션 검증 시작:", collectionId);

          // 캐시된 컬렉션 먼저 확인
          const cachedResult = await chrome.storage.local.get([
            "cachedCollections",
          ]);
          const cachedCollections = cachedResult.cachedCollections || [];
          console.log(
            "🔍 [background] 캐시된 컬렉션 수:",
            cachedCollections.length
          );

          let collectionExists = cachedCollections.some(
            (col) => col.id === collectionId
          );

          if (collectionExists) {
            console.log(
              "✅ [background] 캐시에서 컬렉션 존재 확인:",
              collectionId
            );
          } else {
            // 캐시에 없으면 실시간으로 Firestore에서 조회
            console.log(
              "🔍 [background] 캐시에 없음 - Firestore에서 실시간 조회 중..."
            );
            await setupOffscreen();
            const collectionsResult = await sendMessageToOffscreen({
              target: "offscreen",
              type: "GET_COLLECTIONS",
              userId: authResult.currentUser.uid,
            });

            console.log(
              "🔍 [background] 컬렉션 조회 결과:",
              collectionsResult.type
            );

            if (collectionsResult?.type === "COLLECTIONS_ERROR") {
              console.error("❌ [background] 컬렉션 조회 실패");
              sendResponse({
                type: "BOOKMARK_SAVE_ERROR",
                code: "firestore/fetch-failed",
                message: "컬렉션 목록을 가져올 수 없습니다.",
              });
              return;
            }

            const collections = collectionsResult.collections || [];
            console.log(
              "🔍 [background] 조회된 컬렉션 수:",
              collections.length
            );
            console.log(
              "🔍 [background] 컬렉션 ID 목록:",
              collections.map((c) => c.id)
            );

            collectionExists = collections.some(
              (col) => col.id === collectionId
            );
            console.log("🔍 [background] 컬렉션 존재 여부:", collectionExists);
          }

          if (!collectionExists) {
            console.error(
              "❌ [background] 컬렉션이 존재하지 않음:",
              collectionId
            );
            sendResponse({
              type: "BOOKMARK_SAVE_ERROR",
              code: "not-found",
              message:
                "선택한 컬렉션이 존재하지 않습니다. 컬렉션 목록을 새로고침하세요.",
            });
            return;
          }

          console.log("✅ [background] 컬렉션 존재 확인 완료:", collectionId);
        } else {
          console.log("ℹ️ [background] 컬렉션이 선택되지 않음 - 검증 건너뛰기");
        }

        // 북마크 저장 요청을 offscreen으로 전달
        await setupOffscreen();
        const result = await sendMessageToOffscreen({
          target: "offscreen",
          type: "SAVE_BOOKMARK",
          bookmarkData: msg.bookmarkData,
        });

        // 저장 성공 시 아이콘에 체크 표시 (비동기로 처리하여 저장 응답 지연 방지)
        if (result?.type === "BOOKMARK_SAVED") {
          // 응답을 먼저 보내고 알림은 나중에 처리
          sendResponse(result);

          // 비동기로 알림 처리
          (async () => {
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
                const notificationSettings = await getNotificationSettings(
                  authResult.currentUser.uid
                );

                // 성공 알림 (설정이 활성화된 경우만)
                if (
                  notificationSettings.notifications &&
                  notificationSettings.systemNotifications
                ) {
                  chrome.notifications.create({
                    type: "basic",
                    iconUrl: "public/bookmark.png",
                    title: "북마크 저장 완료",
                    message: `"${msg.bookmarkData.title}" 북마크가 저장되었습니다.`,
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
          })();

          return;
        }

        sendResponse(result);
        return;
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

// serializeUser 함수는 offscreen.js에서 처리

// 확장 프로그램 설치 시 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("확장 프로그램 설치/업데이트됨:", details.reason);
  await createContextMenus();
});

// 확장 프로그램 시작 시 컨텍스트 메뉴 생성
chrome.runtime.onStartup.addListener(async () => {
  console.log("확장 프로그램 시작됨");
  await createContextMenus();
});

// 서비스 워커가 활성화될 때도 메뉴 생성 (MV3에서 중요)
self.addEventListener("activate", async (event) => {
  console.log("서비스 워커 활성화됨");
  event.waitUntil(createContextMenus());
});

// 메뉴 생성 상태 추적
let isCreatingMenus = false;
let menuCreationPromise = null;

// 컨텍스트 메뉴 생성 함수
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

// 안전한 메뉴 제거 함수
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

// 재시도 로직이 포함된 메뉴 생성 함수
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

// 개별 컨텍스트 메뉴 아이템 생성 헬퍼 함수
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

// 빠른 실행 모드 토글 함수
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

// 컨텍스트 메뉴 아이템 업데이트 헬퍼 함수
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

// 대시보드 열기 함수
async function openDashboard() {
  try {
    const dashboardUrl = "https://bookmarkhub-5ea6c.web.app";
    await chrome.tabs.create({ url: dashboardUrl });
  } catch (error) {
    console.error("대시보드 열기 실패:", error);
  }
}

// GitHub 저장소 열기 함수
async function openGitHub() {
  try {
    const githubUrl = "https://github.com/raincoat98/bookmakle";
    await chrome.tabs.create({ url: githubUrl });
  } catch (error) {
    console.error("GitHub 저장소 열기 실패:", error);
  }
}

// Chrome 웹스토어 열기 함수
async function openChromeStore() {
  try {
    const chromeStoreUrl =
      "https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko";
    await chrome.tabs.create({ url: chromeStoreUrl });
  } catch (error) {
    console.error("Chrome 웹스토어 열기 실패:", error);
  }
}

// 버그 리포트 열기 함수
async function openBugReport() {
  try {
    const bugReportUrl =
      "https://github.com/raincoat98/bookmakle/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen";
    await chrome.tabs.create({ url: bugReportUrl });
  } catch (error) {
    console.error("버그 리포트 열기 실패:", error);
  }
}

// 빠른실행모드 상태에 따라 팝업 설정 업데이트
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
      collection: null, // 빠른 저장에서는 컬렉션 없음으로 저장
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

// storage 변경 감지하여 팝업 동작 업데이트
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.quickMode) {
    console.log("빠른실행모드 변경 감지:", changes.quickMode.newValue);
    updatePopupBehavior();
  }
});

// 확장 프로그램 시작 시 팝업 동작 초기화
updatePopupBehavior();
