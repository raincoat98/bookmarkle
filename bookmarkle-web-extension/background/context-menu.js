import {
  DASHBOARD_URL,
  GITHUB_URL,
  BUG_REPORT_URL,
  CLICK_DEBOUNCE_MS,
} from "./constants.js";
import { updateQuickModePopup } from "./quick-mode.js";

// 컨텍스트 메뉴 클릭 이벤트 처리 (중복 방지)
let lastClickTime = {};

// 컨텍스트 메뉴 생성
export async function createContextMenus() {
  try {
    // 빠른 실행 모드 상태 확인
    const quickModeResult = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = quickModeResult.quickMode || false;
    const quickModeTitle = isQuickModeEnabled
      ? "⚡ 빠른 실행 모드 비활성화"
      : "⚡ 빠른 실행 모드 활성화";

    // 기존 메뉴 제거 (중복 방지) - Promise로 감싸서 완료 대기
    await new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        // removeAll 완료 후 메뉴 생성
        resolve();
      });
    });

    // 빠른 실행 모드 활성화/비활성화
    chrome.contextMenus.create(
      {
        id: "quick-mode",
        title: quickModeTitle,
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          // 중복 ID 오류는 무시 (이미 존재하는 경우)
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 빠른 실행 모드");
        }
      }
    );

    // 대시보드 열기
    chrome.contextMenus.create(
      {
        id: "open-dashboard",
        title: "📊 대시보드 열기",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 대시보드");
        }
      }
    );

    // 구분선
    chrome.contextMenus.create(
      {
        id: "separator-1",
        type: "separator",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        }
      }
    );

    // GitHub 저장소
    chrome.contextMenus.create(
      {
        id: "open-github",
        title: "🐙 GitHub 저장소",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: GitHub");
        }
      }
    );

    // 버그 리포트
    chrome.contextMenus.create(
      {
        id: "open-bug-report",
        title: "🐛 버그 리포트",
        contexts: ["all"],
      },
      () => {
        if (chrome.runtime.lastError) {
          if (
            chrome.runtime.lastError.message &&
            !chrome.runtime.lastError.message.includes("duplicate id")
          ) {
            console.error(
              "컨텍스트 메뉴 생성 오류:",
              chrome.runtime.lastError.message || chrome.runtime.lastError
            );
          }
        } else {
          console.log("✅ 컨텍스트 메뉴 생성: 버그 리포트");
        }
      }
    );

    console.log("✅ 컨텍스트 메뉴 생성 완료");
  } catch (error) {
    console.error("❌ 컨텍스트 메뉴 생성 실패:", error);
  }
}

// 컨텍스트 메뉴 클릭 핸들러 초기화
export function setupContextMenuHandlers() {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
        case "quick-mode":
          // 빠른 실행 모드 토글
          chrome.storage.local.get(["quickMode"], async (result) => {
            const newQuickMode = !result.quickMode;
            await chrome.storage.local.set({ quickMode: newQuickMode });
            console.log(
              "빠른 실행 모드:",
              newQuickMode ? "활성화" : "비활성화"
            );
            // 컨텍스트 메뉴 다시 생성하여 텍스트 업데이트
            await createContextMenus();
            // popup 상태도 업데이트
            await updateQuickModePopup();
          });
          break;

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
