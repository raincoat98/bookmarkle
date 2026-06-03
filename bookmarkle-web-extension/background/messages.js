import { isValidSender } from "./utils.js";
import {
  handleGoogleLogin,
  handleEmailLogin,
  handleAuthResultFromWeb,
  restoreUserInfo,
} from "./auth.js";
import {
  handleFetchCollections,
  handleCreateCollection,
} from "./collection.js";
import { handleSaveBookmark, quickSaveBookmark } from "./bookmark.js";
import {
  currentUser,
  setCurrentUser,
  setCurrentIdToken,
  clearAuthState,
  notificationUrlMap,
} from "./state.js";

// 메시지 핸들러
export async function handleMessage(message, sender, sendResponse) {
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
      clearAuthState();
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
      console.log("📥 인증 결과 수신:", { hasUser: !!message.user, hasIdToken: !!message.idToken });
      const tabId = sender.tab?.id || message.tabId || null;
      console.log("📋 사용할 탭 ID:", tabId);
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
        setCurrentIdToken(message.idToken);
        if (message.user) {
          setCurrentUser(message.user);
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
      if (self.tokenResponseHandler) {
        self.tokenResponseHandler(message.idToken, message.user);
      }
      sendResponse({ success: true });
      return;
    }
  } catch (error) {
    console.error("메시지 처리 오류:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// 알림 URL을 storage에 저장 (서비스 워커 재시작 후에도 복원 가능)
async function persistNotificationUrl(notificationId, url) {
  notificationUrlMap.set(notificationId, url);
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    const notificationUrls = stored.notificationUrls || {};
    notificationUrls[notificationId] = url;
    await chrome.storage.local.set({ notificationUrls });
  } catch (e) {
    console.warn("⚠️ 알림 URL 저장 실패:", e);
  }
}

// 알림 URL 조회: 메모리 → storage 순으로 fallback
async function getNotificationUrl(notificationId) {
  const memUrl = notificationUrlMap.get(notificationId);
  if (memUrl) return memUrl;
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    return stored.notificationUrls?.[notificationId] || null;
  } catch {
    return null;
  }
}

// 알림 URL 삭제
async function deleteNotificationUrl(notificationId) {
  notificationUrlMap.delete(notificationId);
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    const notificationUrls = stored.notificationUrls || {};
    delete notificationUrls[notificationId];
    await chrome.storage.local.set({ notificationUrls });
  } catch (e) {
    console.warn("⚠️ 알림 URL 삭제 실패:", e);
  }
}

// 알림 이벤트 리스너 초기화
export function setupNotificationHandlers() {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    const bookmarkUrl = await getNotificationUrl(notificationId);
    if (bookmarkUrl) {
      chrome.tabs.create({ url: bookmarkUrl });
      deleteNotificationUrl(notificationId);
    }
  });

  chrome.notifications.onButtonClicked.addListener(async (notificationId) => {
    const bookmarkUrl = await getNotificationUrl(notificationId);
    if (bookmarkUrl) {
      chrome.tabs.create({ url: bookmarkUrl });
      deleteNotificationUrl(notificationId);
    }
  });

  chrome.notifications.onClosed.addListener((notificationId) => {
    deleteNotificationUrl(notificationId);
  });
}
