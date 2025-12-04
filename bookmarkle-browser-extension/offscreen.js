// 외부 공개 페이지(iframe)에 로그인 시퀀스를 시작하고, 결과를 다시 background로 전달.
const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

// 현재 사용자 상태 저장
let currentUser = null;
let currentIdToken = null;
let isIframeReady = false;

const iframe = document.createElement("iframe");
iframe.src = PUBLIC_SIGN_URL;
iframe.style.display = "none"; // iframe 숨기기
document.documentElement.appendChild(iframe);

// iframe 로드 확인
iframe.addEventListener("load", () => {
  console.log("SignIn popup iframe loaded successfully");
  // iframe이 준비되었음을 표시
  isIframeReady = true;
  // background에 준비 완료 신호 보내기
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }).catch(() => {
    // 메시지를 받을 리스너가 없을 수 있음 (무시)
  });
});

// iframe에서 보낸 로그인 결과 메시지를 받는 영구 리스너
// (START_POPUP_AUTH와 무관하게 항상 수신 대기)
window.addEventListener("message", (ev) => {
  // Firebase 내부 메시지 노이즈 필터
  if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

  try {
    const data =
      typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

    // iframe 준비 신호 처리
    if (data.type === "IFRAME_READY") {
      console.log("✅ IFRAME_READY signal received");
      isIframeReady = true;
      return;
    }

    // 로그인 성공 메시지만 처리
    if (data.type === "LOGIN_SUCCESS" && data.user) {
      console.log(
        "📥 Received LOGIN_SUCCESS from iframe:",
        data.user.email
      );

      // 사용자 정보와 토큰 저장
      currentUser = data.user;
      currentIdToken = data.idToken;

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          currentUser: data.user,
          currentIdToken: data.idToken,
          cachedCollections: data.collections || [],
        });
        console.log("✅ User data and collections saved to Chrome Storage");
      }

      // background에 로그인 완료 알림 (컬렉션 포함)
      chrome.runtime.sendMessage({
        type: "LOGIN_COMPLETED",
        user: data.user,
        idToken: data.idToken,
        collections: data.collections || [],
      }).catch(() => {
        console.log("No listener for LOGIN_COMPLETED message");
      });
    }
  } catch (e) {
    // JSON 파싱 실패는 무시
  }
}, false);

iframe.addEventListener("error", () => {
  console.error("SignIn popup iframe failed to load");
});

// Chrome Extension Storage에서 사용자 정보 및 토큰 로드
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["currentUser", "currentIdToken"], (result) => {
    if (result.currentUser) {
      currentUser = result.currentUser;
    }
    if (result.currentIdToken) {
      currentIdToken = result.currentIdToken;
      console.log("Loaded idToken from storage");
    }
  });
}

// iframe이 준비될 때까지 기다리는 헬퍼 함수
function ensureIframeReady() {
  return new Promise(resolve => {
    if (isIframeReady) {
      resolve();
      return;
    }

    // 최대 3초 기다리기 (50ms 간격)
    let waited = 0;
    const interval = setInterval(() => {
      if (isIframeReady) {
        clearInterval(interval);
        console.log("✅ Iframe ready, processing message");
        resolve();
      } else if (waited > 3000) {
        clearInterval(interval);
        console.warn("⚠️ Iframe not ready after 3 seconds, proceeding anyway");
        resolve();
      }
      waited += 50;
    }, 50);
  });
}

// background → offscreen 메시지 브리지
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("Offscreen received message:", msg?.type, msg);

  if (msg?.target !== "offscreen") return;

  // PING 응답 (준비 확인용)
  if (msg.type === "PING") {
    sendResponse({ ready: true });
    return true;
  }

  if (msg.type === "START_POPUP_AUTH") {
    // 외부 페이지에 초기화 신호
    const origin = new URL(PUBLIC_SIGN_URL).origin;

    function handleIframeMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        window.removeEventListener("message", handleIframeMessage);

        // 로그인 성공 시 사용자 정보와 토큰 저장
        if (data.user) {
          currentUser = data.user;
          currentIdToken = data.idToken;
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
              currentUser: data.user,
              currentIdToken: data.idToken,
            });
          }
        }

        sendResponse(data); // background로 결과 반환
      } catch (e) {
        sendResponse({ name: "ParseError", message: e.message });
      }
    }

    window.addEventListener("message", handleIframeMessage, false);
    iframe.contentWindow.postMessage({ initAuth: true }, origin);

    return true; // async 응답
  }

  if (msg.type === "GET_AUTH_STATE") {
    // 저장된 사용자 상태 반환
    sendResponse({
      user: currentUser,
    });
    return true;
  }

  if (msg.type === "LOGOUT") {
    // 로그아웃 처리
    currentUser = null;
    currentIdToken = null;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["currentUser", "currentIdToken"]);
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === "LOGOUT_FIREBASE") {
    // signin-popup의 Firebase 세션도 로그아웃
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    console.log("🔥 Firebase 로그아웃 요청을 signin-popup으로 전송");
    console.log("🔥 Target origin:", origin);
    console.log("🔥 Iframe exists:", !!iframe);
    console.log("🔥 Iframe contentWindow:", !!iframe?.contentWindow);

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 Firebase 로그아웃 타임아웃");
      window.removeEventListener("message", handleLogoutMessage);

      // 로컬 상태 정리
      currentUser = null;
      currentIdToken = null;
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(["currentUser", "currentIdToken"]);
      }

      sendResponse({
        type: "LOGOUT_COMPLETE",
        message: "Firebase logout completed (timeout)",
      });
    }, 10000);

    function handleLogoutMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 로그아웃 완료 응답 처리
        if (data.type === "LOGOUT_COMPLETE" || data.type === "LOGOUT_ERROR") {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleLogoutMessage);
          console.log("Firebase 로그아웃 응답 수신:", data.type);

          // 로컬 상태도 정리
          currentUser = null;
          currentIdToken = null;
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(["currentUser", "currentIdToken"]);
          }

          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleLogoutMessage);
        console.error("Firebase 로그아웃 응답 파싱 오류:", e);
        sendResponse({
          type: "LOGOUT_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    window.addEventListener("message", handleLogoutMessage, false);

    console.log("🔥 Sending logout message to iframe...");
    try {
      iframe.contentWindow.postMessage({ logoutFirebase: true }, origin);
      console.log("🔥 Logout message sent successfully");
    } catch (error) {
      console.error("🔥 Failed to send logout message:", error);
    }

    return true; // async 응답
  }

  if (msg.type === "GET_COLLECTIONS") {
    // 컬렉션 데이터 요청
    ensureIframeReady().then(() => {
      const origin = new URL(PUBLIC_SIGN_URL).origin;

      function handleCollectionsMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 컬렉션 데이터 응답만 처리
        if (
          data.type === "COLLECTIONS_DATA" ||
          data.type === "COLLECTIONS_ERROR"
        ) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleCollectionsMessage);
          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleCollectionsMessage);
        sendResponse({
          type: "COLLECTIONS_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 GET_COLLECTIONS 타임아웃");
      window.removeEventListener("message", handleCollectionsMessage);
      sendResponse({
        type: "COLLECTIONS_ERROR",
        message: "Timeout waiting for collections data",
      });
    }, 10000);

    window.addEventListener("message", handleCollectionsMessage, false);
    console.log("🔥 Sending getCollections to iframe with origin:", origin);
    console.log("🔥 currentIdToken:", currentIdToken ? "exists" : "missing");

    iframe.contentWindow.postMessage(
      {
        getCollections: true,
        idToken: currentIdToken, // ID 토큰 함께 전달
      },
      origin
    );
    });

    return true; // async 응답
  }

  if (msg.type === "GET_BOOKMARKS") {
    // 북마크 데이터 요청
    ensureIframeReady().then(() => {
      const origin = new URL(PUBLIC_SIGN_URL).origin;

      function handleBookmarksMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 북마크 데이터 응답만 처리
        if (data.type === "BOOKMARKS_DATA" || data.type === "BOOKMARKS_ERROR") {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleBookmarksMessage);
          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleBookmarksMessage);
        sendResponse({
          type: "BOOKMARKS_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 GET_BOOKMARKS 타임아웃");
      window.removeEventListener("message", handleBookmarksMessage);
      sendResponse({
        type: "BOOKMARKS_ERROR",
        message: "Timeout waiting for bookmarks data",
      });
    }, 10000);

    window.addEventListener("message", handleBookmarksMessage, false);
    iframe.contentWindow.postMessage(
      {
        getBookmarks: true,
        collectionId: msg.collectionId,
        idToken: currentIdToken, // ID 토큰 함께 전달
      },
      origin
    );
    });

    return true; // async 응답
  }

  if (msg.type === "SAVE_BOOKMARK") {
    // 북마크 저장 요청
    ensureIframeReady().then(() => {
      const origin = new URL(PUBLIC_SIGN_URL).origin;

      function handleSaveBookmarkMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 북마크 저장 응답만 처리
        if (
          data.type === "BOOKMARK_SAVED" ||
          data.type === "BOOKMARK_SAVE_ERROR"
        ) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleSaveBookmarkMessage);
          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleSaveBookmarkMessage);
        sendResponse({
          type: "BOOKMARK_SAVE_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 SAVE_BOOKMARK 타임아웃");
      window.removeEventListener("message", handleSaveBookmarkMessage);
      sendResponse({
        type: "BOOKMARK_SAVE_ERROR",
        message: "Timeout waiting for bookmark save response",
      });
    }, 10000);

    window.addEventListener("message", handleSaveBookmarkMessage, false);

    const messageToSend = {
      saveBookmark: true,
      bookmarkData: msg.bookmarkData,
      idToken: currentIdToken, // ID 토큰 함께 전달
    };

    iframe.contentWindow.postMessage(messageToSend, origin);
    });

    return true; // async 응답
  }

  if (msg.type === "CREATE_COLLECTION") {
    // 컬렉션 생성 요청
    ensureIframeReady().then(() => {
      const origin = new URL(PUBLIC_SIGN_URL).origin;

      function handleCreateCollectionMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 컬렉션 생성 응답만 처리
        if (
          data.type === "COLLECTION_CREATED" ||
          data.type === "COLLECTION_CREATE_ERROR"
        ) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleCreateCollectionMessage);
          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleCreateCollectionMessage);
        sendResponse({
          type: "COLLECTION_CREATE_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 CREATE_COLLECTION 타임아웃");
      window.removeEventListener("message", handleCreateCollectionMessage);
      sendResponse({
        type: "COLLECTION_CREATE_ERROR",
        message: "Timeout waiting for collection creation response",
      });
    }, 10000);

    window.addEventListener("message", handleCreateCollectionMessage, false);
    iframe.contentWindow.postMessage(
      {
        createCollection: true,
        collectionData: msg.collectionData,
        idToken: currentIdToken, // ID 토큰 함께 전달
      },
      origin
    );
    });

    return true; // async 응답
  }

  if (msg.type === "GET_NOTIFICATION_SETTINGS") {
    // 알림 설정 요청
    ensureIframeReady().then(() => {
      const origin = new URL(PUBLIC_SIGN_URL).origin;

      function handleNotificationSettingsMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 알림 설정 응답만 처리
        if (
          data.type === "NOTIFICATION_SETTINGS_DATA" ||
          data.type === "NOTIFICATION_SETTINGS_ERROR"
        ) {
          clearTimeout(timeoutId);
          window.removeEventListener(
            "message",
            handleNotificationSettingsMessage
          );
          sendResponse(data);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        window.removeEventListener(
          "message",
          handleNotificationSettingsMessage
        );
        sendResponse({
          type: "NOTIFICATION_SETTINGS_ERROR",
          name: "ParseError",
          message: e.message,
        });
      }
    }

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      console.log("🔥 GET_NOTIFICATION_SETTINGS 타임아웃");
      window.removeEventListener(
        "message",
        handleNotificationSettingsMessage
      );
      sendResponse({
        type: "NOTIFICATION_SETTINGS_ERROR",
        message: "Timeout waiting for notification settings",
      });
    }, 10000);

    window.addEventListener(
      "message",
      handleNotificationSettingsMessage,
      false
    );
    iframe.contentWindow.postMessage(
      {
        getNotificationSettings: true,
        idToken: currentIdToken, // ID 토큰 함께 전달
      },
      origin
    );
    });

    return true; // async 응답
  }
});
