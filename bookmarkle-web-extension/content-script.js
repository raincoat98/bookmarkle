// Content Script - 웹 앱과 Extension 간 메시지 중계

console.log("📥 Content script 로드됨", window.location.href);

// ===== 헬퍼 함수 =====

// 컬렉션 개수 요청 처리
function handleGetDataCount(sendResponse) {
  console.log("📥 컬렉션 개수 요청 수신 (content script)");
  sendResponse({ received: true });

  // 사용자 정보 가져오기
  chrome.storage.local.get(["user"], (result) => {
    if (chrome.runtime.lastError || !result.user) {
      console.warn("사용자 정보 없음");
      return;
    }

    // 웹 앱에 메시지 전송 (컬렉션 개수 요청)
    window.postMessage(
      {
        type: "GET_COLLECTIONS_COUNT_FROM_EXTENSION",
        user: result.user,
      },
      window.location.origin
    );
  });

  // 응답 핸들러 설정
  const responseHandler = (event) => {
    if (
      event.data &&
      event.data.type === "COLLECTIONS_COUNT_RESPONSE" &&
      event.origin === window.location.origin
    ) {
      window.removeEventListener("message", responseHandler);
      console.log("📥 컬렉션 개수 응답 수신 (content script):", event.data);

      chrome.runtime.sendMessage({
        type: "DATA_COUNT_RESPONSE",
        response: event.data,
      });
    }
  };

  window.addEventListener("message", responseHandler);

  // 타임아웃 (10초)
  setTimeout(() => {
    window.removeEventListener("message", responseHandler);
    chrome.runtime.sendMessage({
      type: "DATA_COUNT_RESPONSE",
      response: {
        success: false,
        error: "타임아웃: 웹 앱으로부터 응답을 받지 못했습니다.",
      },
    });
  }, 10000);

  return false;
}

// 인증 결과 전달
function handleAuthResult(event) {
  console.log("📥 인증 결과 메시지 수신 (content script):", event.data);

  // Background에 메시지 전송 (tabId는 background에서 sender.tab.id로 가져올 수 있음)
  chrome.runtime.sendMessage(
    {
      type: "AUTH_RESULT_FROM_WEB",
      user: event.data.user,
      idToken: event.data.idToken,
      refreshToken: event.data.refreshToken, // Refresh Token 추가
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ 메시지 전송 오류:", chrome.runtime.lastError);
      } else {
        console.log("✅ 인증 결과 전달 완료");
      }
    }
  );
}

// 토큰 요청 처리
function handleTokenRequest(sendResponse) {
  console.log("🔐 토큰 요청 수신 (content script)");
  sendResponse({ received: true });

  // 웹 앱에 토큰 요청 메시지 전송
  window.postMessage(
    {
      type: "TOKEN_REQUEST",
    },
    window.location.origin
  );

  // 응답 핸들러 설정
  const responseHandler = (event) => {
    if (
      event.data &&
      event.data.type === "TOKEN_RESPONSE" &&
      event.origin === window.location.origin
    ) {
      window.removeEventListener("message", responseHandler);
      clearTimeout(timeoutId);
      console.log("🔐 토큰 응답 수신 (content script):", {
        hasToken: !!event.data.idToken,
        hasUser: !!event.data.user,
      });

      // Background에 토큰 전달
      chrome.runtime.sendMessage({
        type: "TOKEN_RESPONSE_FROM_WEB",
        idToken: event.data.idToken,
        user: event.data.user,
      });
    }
  };

  window.addEventListener("message", responseHandler);

  // 타임아웃 (5초)
  const timeoutId = setTimeout(() => {
    window.removeEventListener("message", responseHandler);
    console.warn("🔐 토큰 응답 타임아웃 (content script)");
    chrome.runtime.sendMessage({
      type: "TOKEN_RESPONSE_FROM_WEB",
      idToken: null,
      error: "웹 앱으로부터 토큰을 받지 못했습니다.",
    });
  }, 5000);

  return false;
}

// ===== 이벤트 리스너 =====

// Background로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ready: true });
    return true;
  }

  if (message.type === "GET_DATA_COUNT") {
    return handleGetDataCount(sendResponse);
  }

  if (message.type === "TOKEN_REQUEST") {
    return handleTokenRequest(sendResponse);
  }

  if (message.type === "EXTENSION_LOGOUT") {
    console.log(
      "📥 Extension 로그아웃 메시지 수신 (content script) - 웹 앱으로 전달",
      {
        currentOrigin: window.location.origin,
        url: window.location.href,
      }
    );
    // 웹 앱에 로그아웃 메시지 전송
    // targetOrigin을 '*'로 설정하여 모든 origin에서 받을 수 있도록 함 (보안상 일반적으로는 권장하지 않지만, 같은 origin이므로 안전)
    window.postMessage(
      {
        type: "EXTENSION_LOGOUT",
      },
      window.location.origin
    );
    console.log("📤 웹 앱에 EXTENSION_LOGOUT 메시지 전송 완료");
    sendResponse({ received: true });
    return true;
  }

  return false;
});

// 웹 앱으로부터 postMessage 수신
window.addEventListener("message", (event) => {
  // 디버깅: 모든 메시지 로깅
  if (event.data && event.data.type === "AUTH_RESULT") {
    console.log("📨 AUTH_RESULT 메시지 수신:", {
      type: event.data.type,
      origin: event.origin,
      currentOrigin: window.location.origin,
      hasUser: !!event.data.user,
      hasIdToken: !!event.data.idToken,
    });
  }

  // AUTH_RESULT 메시지 처리 (같은 origin만 허용)
  if (
    event.data &&
    event.data.type === "AUTH_RESULT" &&
    event.origin === window.location.origin
  ) {
    console.log("✅ AUTH_RESULT 메시지 처리 시작 (origin 일치)");
    handleAuthResult(event);
  } else if (event.data && event.data.type === "AUTH_RESULT") {
    console.warn("⚠️ AUTH_RESULT 메시지 origin 불일치:", {
      messageOrigin: event.origin,
      currentOrigin: window.location.origin,
    });
  }
});
