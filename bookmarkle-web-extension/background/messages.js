import { isValidSender } from "./utils.js";
import {
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
} from "./state.js";
import {
  persistNotificationUrl,
  getNotificationUrl,
  deleteNotificationUrl,
} from "./notifications.js";

// 메시지 핸들러
export async function handleMessage(message, sender, sendResponse) {
  try {
    if (!isValidSender(sender)) {
      console.warn("⚠️ 신뢰할 수 없는 sender로부터 메시지 수신:", sender);
      return false;
    }

    const messageType = typeof message === "string" ? message : message?.type;

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

// 알림 이벤트 리스너 초기화
export function setupNotificationHandlers() {
  const openBookmarkUrl = async (notificationId) => {
    const bookmarkUrl = await getNotificationUrl(notificationId);
    if (bookmarkUrl) {
      chrome.tabs.create({ url: bookmarkUrl });
      deleteNotificationUrl(notificationId);
    }
  };

  chrome.notifications.onClicked.addListener(openBookmarkUrl);
  chrome.notifications.onButtonClicked.addListener(openBookmarkUrl);
  chrome.notifications.onClosed.addListener((notificationId) => {
    deleteNotificationUrl(notificationId);
  });
}
