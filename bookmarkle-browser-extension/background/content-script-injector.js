// content-script-injector.js
// 익스텐션 새로고침 시 이미 열려있는 탭에 content-bridge.js 주입

const WEB_URL_PATTERNS = [
  "https://bookmarkhub-5ea6c.web.app/*",
  "http://localhost:3000/*",
  "http://localhost:5173/*",
];

// 탭별 주입 상태 추적 (중복 주입 방지)
const injectedTabs = new Set();

/**
 * 지정된 탭에 content-bridge.js가 이미 주입되었는지 확인
 */
async function isContentBridgeLoaded(tabId) {
  // 먼저 메모리에서 확인
  if (injectedTabs.has(tabId)) {
    // 실제로 주입되었는지 재확인
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return !!window.__BOOKMARKLE_CONTENT_BRIDGE_LOADED__;
        },
      });
      const isLoaded = results?.[0]?.result === true;
      if (!isLoaded) {
        // 메모리에는 있지만 실제로는 없는 경우 (탭이 새로고침된 경우)
        injectedTabs.delete(tabId);
      }
      return isLoaded;
    } catch (error) {
      const errorMessage = error.message || "";
      // 탭이 이미 닫힌 경우 또는 주입할 수 없는 페이지인 경우 메모리에서도 제거
      if (
        errorMessage.includes("No tab with id") ||
        errorMessage.includes("Could not establish connection") ||
        errorMessage.includes("Cannot access")
      ) {
        injectedTabs.delete(tabId);
      }
      return false;
    }
  }
  return false;
}

/**
 * 지정된 탭에 content-bridge.js 주입 (중복 방지)
 */
async function injectContentBridge(tabId) {
  try {
    // 이미 주입되었는지 확인
    const alreadyLoaded = await isContentBridgeLoaded(tabId);
    if (alreadyLoaded) {
      // 이미 주입됨 - 조용히 스킵 (로그 제거)
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-bridge.js"],
    });

    // 주입 성공 시 메모리에 추가
    injectedTabs.add(tabId);
    console.log(`✅ [injector] Content bridge injected into tab ${tabId}`);
  } catch (error) {
    const errorMessage = error.message || "";
    // 이미 주입되었거나 주입할 수 없는 경우 (chrome://, extension:// 등)
    if (
      errorMessage.includes("Cannot access") ||
      errorMessage.includes("Cannot access a chrome") ||
      errorMessage.includes("Cannot access a file")
    ) {
      // 정상적인 경우 (chrome:// 페이지 등)
      return;
    }
    // 탭이 이미 닫힌 경우
    if (
      errorMessage.includes("No tab with id") ||
      errorMessage.includes("Could not establish connection")
    ) {
      // 탭이 닫혔으므로 메모리에서 제거
      injectedTabs.delete(tabId);
      return;
    }
    console.warn(
      `⚠️ [injector] Failed to inject into tab ${tabId}:`,
      errorMessage
    );
  }
}

/**
 * 모든 웹 탭에 content-bridge.js 주입
 */
export async function injectIntoAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: WEB_URL_PATTERNS });
    console.log(`📋 [injector] Found ${tabs.length} web tabs to inject`);

    await Promise.all(
      tabs.map((tab) => {
        if (typeof tab.id === "number") {
          return injectContentBridge(tab.id);
        }
      })
    );
  } catch (error) {
    console.error("❌ [injector] Failed to inject into all tabs:", error);
  }
}

/**
 * 초기화: 익스텐션 시작/새로고침 시 모든 탭에 주입
 */
export function initContentScriptInjector() {
  // 익스텐션 시작 시 모든 탭에 주입
  chrome.runtime.onStartup.addListener(() => {
    console.log("🚀 [injector] Extension started, injecting content bridge");
    injectIntoAllTabs();
  });

  // 익스텐션 설치/새로고침 시 모든 탭에 주입
  chrome.runtime.onInstalled.addListener(() => {
    console.log(
      "🔄 [injector] Extension installed/updated, injecting content bridge"
    );
    injectIntoAllTabs();
  });

  // 새 탭이 열리거나 업데이트될 때 주입
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 탭이 완전히 로드되었을 때만 주입
    if (changeInfo.status !== "complete") return;

    // URL이 변경된 경우 메모리에서 제거 (새 페이지 로드 시 재주입)
    if (changeInfo.url) {
      injectedTabs.delete(tabId);
    }

    // 웹 URL 패턴과 일치하는 경우만 주입
    if (
      tab.url &&
      WEB_URL_PATTERNS.some((pattern) => {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return regex.test(tab.url);
      })
    ) {
      // 약간의 지연을 두어 페이지가 완전히 로드되도록 함
      setTimeout(() => {
        injectContentBridge(tabId);
      }, 100);
    }
  });

  // 탭이 닫힐 때 메모리에서 제거
  chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
  });

  // 초기 실행 시에도 주입 (이미 열려있는 탭 처리)
  injectIntoAllTabs();
}
