import {
  DASHBOARD_URL,
  GITHUB_URL,
  BUG_REPORT_URL,
  CLICK_DEBOUNCE_MS,
} from "./constants.js";
import { updateQuickModePopup } from "./quick-mode.js";

let lastClickTime = {};

function onMenuCreated(label) {
  return () => {
    if (chrome.runtime.lastError) {
      if (!chrome.runtime.lastError.message?.includes("duplicate id")) {
        console.error(
          "컨텍스트 메뉴 생성 오류:",
          chrome.runtime.lastError.message || chrome.runtime.lastError
        );
      }
    } else if (label) {
      console.log(`✅ 컨텍스트 메뉴 생성: ${label}`);
    }
  };
}

// 컨텍스트 메뉴 생성
export async function createContextMenus() {
  try {
    const quickModeResult = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = quickModeResult.quickMode || false;

    await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));

    chrome.contextMenus.create(
      {
        id: "quick-mode",
        title: isQuickModeEnabled
          ? "⚡ 빠른 실행 모드 비활성화"
          : "⚡ 빠른 실행 모드 활성화",
        contexts: ["all"],
      },
      onMenuCreated("빠른 실행 모드")
    );

    chrome.contextMenus.create(
      { id: "open-dashboard", title: "📊 대시보드 열기", contexts: ["all"] },
      onMenuCreated("대시보드")
    );

    chrome.contextMenus.create(
      { id: "separator-1", type: "separator", contexts: ["all"] },
      onMenuCreated(null)
    );

    chrome.contextMenus.create(
      { id: "open-github", title: "🐙 GitHub 저장소", contexts: ["all"] },
      onMenuCreated("GitHub")
    );

    chrome.contextMenus.create(
      { id: "open-bug-report", title: "🐛 버그 리포트", contexts: ["all"] },
      onMenuCreated("버그 리포트")
    );

    console.log("✅ 컨텍스트 메뉴 생성 완료");
  } catch (error) {
    console.error("❌ 컨텍스트 메뉴 생성 실패:", error);
  }
}

// 컨텍스트 메뉴 클릭 핸들러 초기화
export function setupContextMenuHandlers() {
  chrome.contextMenus.onClicked.addListener(async (info) => {
    try {
      const now = Date.now();
      const menuItemId = info.menuItemId;

      // 중복 클릭 방지
      if (
        lastClickTime[menuItemId] &&
        now - lastClickTime[menuItemId] < CLICK_DEBOUNCE_MS
      ) {
        console.log("⚠️ 중복 클릭 무시:", menuItemId);
        return;
      }

      lastClickTime[menuItemId] = now;

      switch (menuItemId) {
        case "quick-mode": {
          // 빠른 실행 모드 토글
          const stored = await chrome.storage.local.get(["quickMode"]);
          const newQuickMode = !stored.quickMode;
          await chrome.storage.local.set({ quickMode: newQuickMode });
          console.log("빠른 실행 모드:", newQuickMode ? "활성화" : "비활성화");
          await createContextMenus();
          await updateQuickModePopup();
          break;
        }

        case "open-dashboard":
          // 대시보드 열기
          chrome.tabs.create({ url: DASHBOARD_URL });
          break;

        case "open-github":
          // GitHub 저장소 열기
          chrome.tabs.create({ url: GITHUB_URL });
          break;

        case "open-bug-report":
          // 버그 리포트 열기
          chrome.tabs.create({ url: BUG_REPORT_URL });
          break;

        default:
          console.log("알 수 없는 메뉴 항목:", menuItemId);
      }
    } catch (error) {
      console.error("컨텍스트 메뉴 처리 오류:", error);
    }
  });
}
