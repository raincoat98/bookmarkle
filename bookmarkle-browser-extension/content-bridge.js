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
const CONTEXT_INVALIDATION_TTL_MS = 10 * 60 * 1000; // 10분

// If extension context is temporarily invalid (reload/uninstall/navigation), queue important messages
const pendingByType = new Map();

function safeSendMessageToExtension(message) {
  if (!isExtensionContextValid()) return false;

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Context can be invalidated between call and callback
        console.warn("[content] sendMessage lastError:", chrome.runtime.lastError.message);
        return;
      }
      // Successful round-trip implies context is good
      markContextValid();
    });
    return true;
  } catch (error) {
    // Common case: "Extension context invalidated." (e.g. extension reloaded)
    console.warn("[content] Failed to send message (will queue if needed):", error);
    return false;
  }
}

function queueMessageIfNeeded(runtimeMessageType, data) {
  // Only queue critical events that are safe to resend
  if (data?.type === "AUTH_STATE_CHANGED") {
    pendingByType.set(runtimeMessageType, { type: runtimeMessageType, payload: data });
  }
}

function flushPendingMessages() {
  if (!isExtensionContextValid()) return;
  for (const [runtimeType, message] of pendingByType.entries()) {
    const ok = safeSendMessageToExtension(message);
    if (ok) pendingByType.delete(runtimeType);
  }
}

// 확장 프로그램 컨텍스트 유효성 검사
function isExtensionContextValid() {
  try {
    return !!chrome.runtime?.id;
  } catch (error) {
    return false;
  }
}

const contextState = {
  lastValidTimestamp: null,
};

function isKnownValidContext() {
  if (!contextState.lastValidTimestamp) return false;
  return Date.now() - contextState.lastValidTimestamp < CONTEXT_INVALIDATION_TTL_MS;
}

function markContextValid() {
  contextState.lastValidTimestamp = Date.now();
}

function shouldAcknowledgeExtensionContext() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("extension") === "true") return true;
    if (params.get("iframe") === "true") return true;
    if (params.get("source") === "extension") return true;
  } catch (error) {
    console.warn("[content] Failed to parse URL parameters:", error);
  }
  return false;
}

window.addEventListener("message", (event) => {
  // 보안: origin 체크 (필수!!)
  if (!ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== "bookmarkhub" || !data.type || data.fromExtension) return;
  if (data.type === "EXTENSION_DETECTION_PING") {
    markContextValid();
    // If the extension just woke up / reloaded, try to flush queued messages
    flushPendingMessages();
    window.postMessage(
      {
        source: "bookmarkhub",
        type: "EXTENSION_DETECTION_PONG",
        payload: {},
      },
      event.origin
    );
    return;
  }

  const runtimeMessageType = FORWARDABLE_TYPES[data.type];
  if (!runtimeMessageType) {
    return;
  }

  // Gate non-critical messages behind extension-context acknowledgement
  const isAuthStateChanged = data.type === "AUTH_STATE_CHANGED";
  if (!isAuthStateChanged && !shouldAcknowledgeExtensionContext() && !isKnownValidContext()) return;

  const now = Date.now();
  const payloadKey = JSON.stringify(data.payload ?? {});
  const payloadTrackerKey = `${data.type}|${payloadKey}`;

  const lastPayloadForward = forwardPayloadTracker.get(payloadTrackerKey) ?? 0;
  if (now - lastPayloadForward < FORWARD_DUPLICATE_SUPPRESS_MS) return;

  const lastForward = forwardThrottleTracker.get(data.type) ?? 0;
  if (now - lastForward < FORWARD_COOLDOWN_MS) return;

  forwardThrottleTracker.set(data.type, now);
  forwardPayloadTracker.set(payloadTrackerKey, now);

  // If the extension context is invalidated, do NOT throw noisy errors.
  // Queue AUTH_STATE_CHANGED and try again when we receive a ping.
  if (!isExtensionContextValid()) {
    queueMessageIfNeeded(runtimeMessageType, data);
    return;
  }

  markContextValid();

  const ok = safeSendMessageToExtension({ type: runtimeMessageType, payload: data });
  if (!ok) {
    queueMessageIfNeeded(runtimeMessageType, data);
  }
});

// (선택) background → 웹(React)으로 보내고 싶을 때를 위한 리스너
if (isExtensionContextValid()) {
  markContextValid();
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "EXTENSION_EVENT_TO_WEB") {
      window.postMessage(
        {
          source: "bookmarkhub",
          type: msg.eventType,
          payload: msg.payload ?? {},
          fromExtension: true,
        },
        window.location.origin
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
          payload: {
            user: msg.payload?.user ?? null,
            idToken: msg.payload?.idToken ?? null,
            refreshToken: msg.payload?.refreshToken ?? null,
          },
          fromExtension: true,
        },
        window.location.origin
      );
      sendResponse({ ok: true });
      return true;
    }
  });
}
