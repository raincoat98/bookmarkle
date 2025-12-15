// content-bridge.js
// 웹(React)에서 오는 메시지 듣기
const STATIC_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bookmarkhub-5ea6c.web.app",
]);

const FORWARDABLE_TYPES = {
  AUTH_STATE_CHANGED: "WEB_AUTH_STATE_CHANGED",
  COLLECTIONS_UPDATED: "WEB_COLLECTIONS_UPDATED",
};

const forwardPayloadTracker = new Map();
const pendingAuthRequests = new Set();
let lastAuthPayload = null;
const FORWARD_DUPLICATE_SUPPRESS_MS = 1000;
const CONTEXT_INVALIDATION_TTL_MS = 10 * 60 * 1000; // 10분
const AUTH_REQUEST_TIMEOUT_MS = 2000;

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

function recordAuthPayload(payload) {
  lastAuthPayload = payload ?? null;
  resolvePendingAuthRequests(payload);
}

function resolvePendingAuthRequests(payload) {
  if (!pendingAuthRequests.size) return;
  const requests = Array.from(pendingAuthRequests);
  pendingAuthRequests.clear();
  requests.forEach((pending) => {
    if (pending.settled) return;
    pending.settled = true;
    clearTimeout(pending.timeoutId);
    pending.sendResponse({ ok: true, payload: payload ?? lastAuthPayload ?? null });
  });
}

function requestAuthStateFromPage() {
  try {
    window.postMessage(
      {
        source: "bookmarkhub",
        type: "EXTENSION_REQUEST_AUTH_STATE",
      },
      window.location.origin
    );
  } catch (error) {
    console.warn("[content] Failed to request auth state from page:", error);
  }
}

function isAllowedOrigin(origin) {
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }
    const hostname = url.hostname;
    if (hostname === "bookmarkle.app" || hostname.endsWith(".bookmarkle.app")) {
      return true;
    }
    if (hostname === "bookmarkle.com" || hostname.endsWith(".bookmarkle.com")) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

window.addEventListener("message", (event) => {
  // 보안: origin 체크 (필수!!)
  if (!isAllowedOrigin(event.origin)) {
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

  const isAuthStateChanged = data.type === "AUTH_STATE_CHANGED";

  if (isAuthStateChanged) {
    recordAuthPayload(data.payload ?? null);
  }

  const now = Date.now();
  const payloadKey = JSON.stringify(data.payload ?? {});
  const payloadTrackerKey = `${data.type}|${payloadKey}`;

  const shouldDedup = !isAuthStateChanged;
  if (shouldDedup) {
    const lastPayloadForward = forwardPayloadTracker.get(payloadTrackerKey) ?? 0;
    if (now - lastPayloadForward < FORWARD_DUPLICATE_SUPPRESS_MS) return;
    forwardPayloadTracker.set(payloadTrackerKey, now);
  }

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
      lastAuthPayload = msg.payload ?? null;
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

    if (msg.type === "REQUEST_WEB_AUTH_STATE") {
      console.log("[content] REQUEST_WEB_AUTH_STATE received from background. hasCache?", !!lastAuthPayload);
      if (lastAuthPayload) {
        sendResponse({ ok: true, payload: lastAuthPayload });
        return true;
      }

      const pending = {
        settled: false,
        sendResponse,
        timeoutId: null,
      };

      pending.timeoutId = setTimeout(() => {
        if (pending.settled) return;
        pending.settled = true;
        pendingAuthRequests.delete(pending);
        sendResponse({ ok: false, payload: null });
      }, AUTH_REQUEST_TIMEOUT_MS);

      pendingAuthRequests.add(pending);
      console.log("[content] Requesting auth state from page");
      requestAuthStateFromPage();
      return true;
    }
  });
}
