// content-bridge.js
// 웹(React)에서 오는 메시지 듣기
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bookmarkhub-5ea6c.web.app",
]);

window.addEventListener("message", (event) => {
  console.log("[content] message event:", event);
  // 보안: origin 체크 (필수!!)
  if (!ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== "bookmarkhub" || !data.type) return;

  console.log("[content] received from web:", data);

  if (!chrome.runtime?.id) {
    console.warn("[content] Extension context invalidated - skipping sendMessage");
    return;
  }

  try {
    chrome.runtime.sendMessage(
      {
        type: "WEB_AUTH_STATE_CHANGED",
        payload: data,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[content] sendMessage error:", chrome.runtime.lastError.message);
          return;
        }
        console.log("[content] extension response:", response);
      }
    );
  } catch (error) {
    console.warn("[content] Failed to send message:", error);
  }
});

// (선택) background → 웹(React)으로 보내고 싶을 때를 위한 리스너
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTENSION_EVENT_TO_WEB") {
    window.postMessage(
      {
        source: "bookmarkhub",
        type: msg.eventType,
        payload: msg.payload,
      },
      window.origin
    );
    sendResponse({ ok: true });
    return true;
  }
  // background에서 오는 WEB_AUTH_STATE_CHANGED 메시지 처리
  if (msg.type === "WEB_AUTH_STATE_CHANGED") {
    console.log("[content] WEB_AUTH_STATE_CHANGED received from extension:", msg.payload);
    // 필요시 웹에 브로드캐스트 가능 (예시)
    window.postMessage(
      {
        source: "bookmarkhub",
        type: "AUTH_STATE_CHANGED",
        user: msg.payload.user,
        idToken: msg.payload.idToken,
        refreshToken: msg.payload.refreshToken || null,
      },
      window.origin
    );
    sendResponse({ ok: true });
    return true;
  }
});
