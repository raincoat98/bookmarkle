// content-bridge.js
// 웹(React)에서 오는 메시지 듣기
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bookmarkhub-5ea6c.web.app",
]);

const FORWARDABLE_TYPES = {
  AUTH_STATE_CHANGED: "WEB_AUTH_STATE_CHANGED",
  COLLECTIONS_UPDATED: "WEB_COLLECTIONS_UPDATED",
};

const forwardThrottleTracker = new Map();
const forwardPayloadTracker = new Map();
const FORWARD_COOLDOWN_MS = 500;
const FORWARD_DUPLICATE_SUPPRESS_MS = 1000;

window.addEventListener("message", (event) => {
  // 보안: origin 체크 (필수!!)
  if (!ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== "bookmarkhub" || !data.type || data.fromExtension) return;

  const runtimeMessageType = FORWARDABLE_TYPES[data.type];
  if (!runtimeMessageType) {
    return;
  }

  const now = Date.now();
  const payloadKey = JSON.stringify(data.payload ?? {});
  const payloadTrackerKey = `${data.type}|${payloadKey}`;
  const lastPayloadForward = forwardPayloadTracker.get(payloadTrackerKey) ?? 0;
  if (now - lastPayloadForward < FORWARD_DUPLICATE_SUPPRESS_MS) {
    return;
  }
  const lastForward = forwardThrottleTracker.get(data.type) ?? 0;
  if (now - lastForward < FORWARD_COOLDOWN_MS) {
    return;
  }
  forwardThrottleTracker.set(data.type, now);
  forwardPayloadTracker.set(payloadTrackerKey, now);

  console.log("[content] received from web:", data);

  if (!chrome.runtime?.id) {
    console.warn("[content] Extension context invalidated - skipping sendMessage");
    return;
  }

  try {
    chrome.runtime.sendMessage(
      {
        type: runtimeMessageType,
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
        fromExtension: true,
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
