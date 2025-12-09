// 외부 공개 페이지(iframe)에 로그인 시퀀스를 시작하고, 결과를 다시 background로 전달.
const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

// 현재 사용자 상태 저장
let currentUser = null;
let isIframeReady = false;
let lastLoginUserId = null; // Prevent duplicate LOGIN_SUCCESS processing

// Iframe ready event handling
let iframeReadyResolver = null;
let iframeReadyPromise = new Promise((resolve) => {
  iframeReadyResolver = resolve;
});

const iframe = document.createElement("iframe");
// Add extensionId to URL for chrome.runtime.sendMessage
const iframeUrl = new URL(PUBLIC_SIGN_URL);
iframeUrl.searchParams.set('extensionId', chrome.runtime.id);
iframe.src = iframeUrl.toString();
iframe.style.display = "none"; // iframe 숨기기
document.documentElement.appendChild(iframe);

// Helper function to mark iframe as ready (prevent double-fire)
function markIframeReady() {
  console.log("📍 markIframeReady called, isIframeReady:", isIframeReady);
  
  if (isIframeReady) {
    console.log("⚠️ Iframe already marked as ready, skipping");
    return;
  }

  isIframeReady = true;
  if (iframeReadyResolver) {
    console.log("✅ Resolving iframe ready promise");
    iframeReadyResolver();
    iframeReadyResolver = null;
  } else {
    console.warn("⚠️ No iframeReadyResolver available");
  }
  console.log("✅ Iframe is ready");
  // background에 준비 완료 신호 보내기
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }).catch(() => {
    // 메시지를 받을 리스너가 없을 수 있음 (무시)
  });
}

// iframe 로드 확인
iframe.addEventListener("load", () => {
  console.log("SignIn popup iframe loaded successfully");
  markIframeReady();
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
      console.log("✅ IFRAME_READY signal received from React page");
      // Always mark as ready, even if already resolved
      if (!isIframeReady) {
        markIframeReady();
      } else {
        console.log("ℹ️ Iframe already ready, but acknowledging signal");
      }
      return;
    }

    // 로그인 성공 메시지 처리 (중복 방지)
    if (data.type === "LOGIN_SUCCESS" && data.user) {
      // Prevent duplicate processing from dual paths
      if (lastLoginUserId === data.user.uid) {
        console.log("⚠️ Duplicate LOGIN_SUCCESS ignored");
        return;
      }
      lastLoginUserId = data.user.uid;

      console.log(
        "📥 Received LOGIN_SUCCESS from iframe:",
        data.user.email
      );

      // 사용자 정보 저장
      currentUser = data.user;

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          currentUser: data.user,
        });
        console.log("✅ User data saved to Chrome Storage (offscreen)");
        console.log("📌 Logged in user:", data.user.email, "uid:", data.user.uid);
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

    // 로그아웃 신호 처리
    if (data.type === "LOGOUT_SUCCESS") {
      console.log("📤 Received LOGOUT_SUCCESS from iframe");

      // 로컬 상태 정리
      currentUser = null;
      lastLoginUserId = null; // Reset for next login

      // background에 로그아웃 신호 전달
      chrome.runtime.sendMessage({
        type: "LOGOUT_SUCCESS",
      }).catch(() => {
        console.log("No listener for LOGOUT_SUCCESS message in background");
      });
    }
  } catch (e) {
    // JSON 파싱 실패는 무시
  }
}, false);

iframe.addEventListener("error", () => {
  console.error("SignIn popup iframe failed to load");
});

// Chrome Extension Storage에서 사용자 정보 로드
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(["currentUser"], (result) => {
    if (result.currentUser) {
      currentUser = result.currentUser;
    }
  });
}

// iframe이 준비될 때까지 기다리는 헬퍼 함수 (event-driven)
function ensureIframeReady() {
  console.log("🔍 ensureIframeReady called, current state:", {
    isIframeReady,
    hasResolver: !!iframeReadyResolver,
  });

  // If already ready, return immediately
  if (isIframeReady) {
    console.log("✅ Iframe already ready, returning immediately");
    return Promise.resolve();
  }

  // If not ready, wait for the promise
  console.log("⏳ Waiting for iframe to be ready...");
  return Promise.race([
    iframeReadyPromise,
    new Promise((resolve) => {
      setTimeout(() => {
        console.warn("⚠️ Iframe not ready after 10 seconds, proceeding anyway");
        resolve();
      }, 10000);
    }),
  ]);
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
    let messageResolved = false;
    const timeout = 60000; // 60초 타임아웃

    function handleIframeMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // AUTH_RESULT, AUTH_ERROR, AUTH_FALLBACK 타입 또는 user 객체를 포함한 응답만 처리
        // 다른 메시지(예: LOGOUT_SUCCESS, 컬렉션 요청 등)는 무시
        const isAuthResult = data?.type === "AUTH_RESULT";
        const isAuthError = data?.type === "AUTH_ERROR";
        const isAuthFallback = data?.type === "AUTH_FALLBACK";
        const isLoginSuccess = data?.user && data?.idToken && data?.type !== "LOGIN_SUCCESS"; // LOGIN_SUCCESS는 별도 처리

        if (isAuthResult || isAuthError || isAuthFallback || isLoginSuccess) {
          if (messageResolved) {
            console.log("⚠️ Message already resolved, ignoring duplicate:", data.type);
            return; // 이미 응답한 경우 무시
          }

          window.removeEventListener("message", handleIframeMessage);
          messageResolved = true;
          clearTimeout(timeoutId);

          // 폴백 처리 (redirect 진행 중)
          if (isAuthFallback) {
            console.log("🔄 AUTH_FALLBACK received - popup blocked, using redirect fallback");
            console.log("📝 Fallback details:", data);
            // redirect는 페이지를 떠나므로 즉시 응답하지 않고 대기
            // 리다이렉트 후 돌아오면 getRedirectResult()가 처리함
            return;
          }

          // 에러 처리
          if (isAuthError) {
            console.error("🚨 AUTH_ERROR received from iframe:", data);
            sendResponse(data);
            return;
          }

          // 로그인 성공 시 사용자 정보 저장
          if (data.user) {
            currentUser = data.user;
            if (chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({
                currentUser: data.user,
              });
            }
            console.log("✅ Auth successful:", data.user.email);
          }

          sendResponse(data); // background로 결과 반환
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener("message", handleIframeMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          console.error("🔥 Error parsing iframe message:", e);
          sendResponse({ type: "AUTH_ERROR", name: "ParseError", message: e.message });
        }
      }
    }

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener("message", handleIframeMessage);
        messageResolved = true;
        console.error("START_POPUP_AUTH 타임아웃: 60초 이상 응답 없음");
        sendResponse({
          type: "AUTH_ERROR",
          code: "timeout",
          message: "로그인 요청 시간 초과",
        });
      }
    }, timeout);

    // 리스너 설정 AFTER 타임아웃 (순서 중요)
    window.addEventListener("message", handleIframeMessage, false);

    // iframe이 준비될 때까지 짧은 대기
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ initAuth: true }, origin);
        console.log("AUTH 초기화 메시지 전송 완료");
      } else {
        if (!messageResolved) {
          messageResolved = true;
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleIframeMessage);
          sendResponse({
            type: "AUTH_ERROR",
            code: "iframe-not-ready",
            message: "iframe이 준비되지 않았습니다",
          });
        }
      }
    }, 100); // 100ms 대기로 iframe이 로드될 시간 확보

    return true; // async 응답
  }

  if (msg.type === "GET_AUTH_STATE") {
    // 저장된 사용자 상태 반환
    chrome.storage.local.get(["currentUser"], (result) => {
      console.log("📌 GET_AUTH_STATE - returning user:", result.currentUser?.email, "uid:", result.currentUser?.uid);
      sendResponse({
        user: result.currentUser || currentUser,
      });
    });
    return true; // async 응답
  }

  if (msg.type === "LOGOUT") {
    // 로그아웃 처리
    console.log("🚪 LOGOUT - clearing user data");
    currentUser = null;
    lastLoginUserId = null;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["currentUser"]);
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
      console.log("🚪 LOGOUT_FIREBASE timeout - clearing user data");
      currentUser = null;
      lastLoginUserId = null;
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(["currentUser"]);
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
          console.log("🚪 LOGOUT_FIREBASE complete - clearing user data");
          currentUser = null;
          lastLoginUserId = null;
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(["currentUser"]);
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
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    let messageResolved = false;
    const timeout = 30000; // 30초 타임아웃

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
          window.removeEventListener("message", handleCollectionsMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse(data);
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener("message", handleCollectionsMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "COLLECTIONS_ERROR",
            name: "ParseError",
            message: e.message,
          });
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener("message", handleCollectionsMessage);
        messageResolved = true;
        console.error("GET_COLLECTIONS 타임아웃");
        sendResponse({
          type: "COLLECTIONS_ERROR",
          code: "timeout",
          message: "컬렉션 로드 시간 초과",
        });
      }
    }, timeout);

    window.addEventListener("message", handleCollectionsMessage, false);
    
    // Ensure iframe is ready before sending message
    (async () => {
      try {
        await ensureIframeReady();
        console.log("📤 GET_COLLECTIONS request - userId:", msg.userId);
        iframe.contentWindow.postMessage(
          {
            getCollections: true,
            userId: msg.userId,
            forceRefreshToken: true,
          },
          origin
        );
      } catch (error) {
        if (!messageResolved) {
          window.removeEventListener("message", handleCollectionsMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "COLLECTIONS_ERROR",
            code: "iframe-not-ready",
            message: "Iframe is not ready",
          });
        }
      }
    })();

    return true; // async 응답
  }

  if (msg.type === "GET_BOOKMARKS") {
    // 북마크 데이터 요청
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    let messageResolved = false;
    const timeout = 30000; // 30초 타임아웃

    function handleBookmarksMessage(ev) {
      // Firebase 내부 메시지 노이즈 필터
      if (typeof ev.data === "string" && ev.data.startsWith("!_{")) return;

      try {
        const data =
          typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

        // 북마크 데이터 응답만 처리
        if (data.type === "BOOKMARKS_DATA" || data.type === "BOOKMARKS_ERROR") {
          window.removeEventListener("message", handleBookmarksMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse(data);
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener("message", handleBookmarksMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "BOOKMARKS_ERROR",
            name: "ParseError",
            message: e.message,
          });
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener("message", handleBookmarksMessage);
        messageResolved = true;
        console.error("GET_BOOKMARKS 타임아웃");
        sendResponse({
          type: "BOOKMARKS_ERROR",
          code: "timeout",
          message: "북마크 로드 시간 초과",
        });
      }
    }, timeout);

    window.addEventListener("message", handleBookmarksMessage, false);
    
    // Ensure iframe is ready before sending message
    (async () => {
      try {
        await ensureIframeReady();
        iframe.contentWindow.postMessage(
          {
            getBookmarks: true,
            userId: msg.userId,
            collectionId: msg.collectionId,
            forceRefreshToken: true,
          },
          origin
        );
      } catch (error) {
        if (!messageResolved) {
          window.removeEventListener("message", handleBookmarksMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "BOOKMARKS_ERROR",
            code: "iframe-not-ready",
            message: "Iframe is not ready",
          });
        }
      }
    })();

    return true; // async 응답
  }

  if (msg.type === "SAVE_BOOKMARK") {
    // 북마크 저장 요청
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    let messageResolved = false;
    const timeout = 10000; // 10초 타임아웃

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
          window.removeEventListener("message", handleSaveBookmarkMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse(data);
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener("message", handleSaveBookmarkMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "BOOKMARK_SAVE_ERROR",
            name: "ParseError",
            message: e.message,
          });
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener("message", handleSaveBookmarkMessage);
        messageResolved = true;
        console.error("SAVE_BOOKMARK 타임아웃");
        sendResponse({
          type: "BOOKMARK_SAVE_ERROR",
          code: "timeout",
          message: "북마크 저장 시간 초과",
        });
      }
    }, timeout);

    window.addEventListener("message", handleSaveBookmarkMessage, false);

    // Ensure iframe is ready before sending
    (async () => {
      try {
        console.log("🔍 SAVE_BOOKMARK: Starting ensureIframeReady...");
        await ensureIframeReady();
        console.log("✅ SAVE_BOOKMARK: Iframe is ready, sending message...");
        
        const messageToSend = {
          saveBookmark: true,
          userId: msg.userId,
          bookmarkData: msg.bookmarkData,
          forceRefreshToken: true,
        };

        console.log("📤 SAVE_BOOKMARK: Message to send:", messageToSend);
        console.log("📤 SAVE_BOOKMARK: iframe exists?", !!iframe);
        console.log("📤 SAVE_BOOKMARK: iframe.contentWindow exists?", !!iframe.contentWindow);
        console.log("📤 SAVE_BOOKMARK: origin:", origin);

        iframe.contentWindow.postMessage(messageToSend, origin);
        console.log("📤 SAVE_BOOKMARK message sent to iframe with userId:", msg.userId);
      } catch (error) {
        if (!messageResolved) {
          window.removeEventListener("message", handleSaveBookmarkMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "BOOKMARK_SAVE_ERROR",
            code: "iframe-not-ready",
            message: "Iframe is not ready",
          });
        }
      }
    })();

    return true; // async 응답
  }

  if (msg.type === "CREATE_COLLECTION") {
    // 컬렉션 생성 요청
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    let messageResolved = false;
    const timeout = 30000; // 30초 타임아웃

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
          window.removeEventListener("message", handleCreateCollectionMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse(data);
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener("message", handleCreateCollectionMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "COLLECTION_CREATE_ERROR",
            name: "ParseError",
            message: e.message,
          });
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener("message", handleCreateCollectionMessage);
        messageResolved = true;
        console.error("CREATE_COLLECTION 타임아웃");
        sendResponse({
          type: "COLLECTION_CREATE_ERROR",
          code: "timeout",
          message: "컬렉션 생성 시간 초과",
        });
      }
    }, timeout);

    window.addEventListener("message", handleCreateCollectionMessage, false);
    iframe.contentWindow.postMessage(
      {
        createCollection: true,
        userId: msg.userId,
        collectionData: msg.collectionData,
        forceRefreshToken: true,
      },
      origin
    );

    return true; // async 응답
  }

  if (msg.type === "GET_NOTIFICATION_SETTINGS") {
    // 알림 설정 요청
    const origin = new URL(PUBLIC_SIGN_URL).origin;
    let messageResolved = false;
    const timeout = 15000; // 15초 타임아웃

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
          window.removeEventListener(
            "message",
            handleNotificationSettingsMessage
          );
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse(data);
        }
      } catch (e) {
        if (!messageResolved) {
          window.removeEventListener(
            "message",
            handleNotificationSettingsMessage
          );
          messageResolved = true;
          clearTimeout(timeoutId);
          sendResponse({
            type: "NOTIFICATION_SETTINGS_ERROR",
            name: "ParseError",
            message: e.message,
          });
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (!messageResolved) {
        window.removeEventListener(
          "message",
          handleNotificationSettingsMessage
        );
        messageResolved = true;
        console.error("GET_NOTIFICATION_SETTINGS 타임아웃");
        sendResponse({
          type: "NOTIFICATION_SETTINGS_ERROR",
          code: "timeout",
          message: "알림 설정 로드 시간 초과",
        });
      }
    }, timeout);

    window.addEventListener(
      "message",
      handleNotificationSettingsMessage,
      false
    );
    
    // Ensure iframe is ready before sending message
    (async () => {
      try {
        await ensureIframeReady();
        iframe.contentWindow.postMessage(
          {
            getNotificationSettings: true,
            userId: msg.userId,
            forceRefreshToken: true,
          },
          origin
        );
      } catch (error) {
        if (!messageResolved) {
          window.removeEventListener("message", handleNotificationSettingsMessage);
          messageResolved = true;
          clearTimeout(timeoutId);
          console.error("Failed to send notification settings request:", error);
          sendResponse({
            type: "NOTIFICATION_SETTINGS_ERROR",
            code: "iframe-error",
            message: "Failed to communicate with iframe",
          });
        }
      }
    })();

    return true; // async 응답
  }
});
