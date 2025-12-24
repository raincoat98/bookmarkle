import { restoreUserInfo } from "./auth.js";
import { currentUser } from "./state.js";
import { quickSaveBookmark } from "./bookmark.js";

// 빠른 실행 모드 상태에 따라 popup 활성/비활성화
export async function updateQuickModePopup() {
  try {
    const result = await chrome.storage.local.get(["quickMode"]);
    const isQuickModeEnabled = result.quickMode || false;

    if (isQuickModeEnabled) {
      // 빠른 실행 모드 활성화 → popup 비활성화, onClicked 리스너 사용
      chrome.action.setPopup({ popup: "" });
      console.log("⚡ 빠른 실행 모드: popup 비활성화");
    } else {
      // 빠른 실행 모드 비활성화 → popup 활성화
      chrome.action.setPopup({ popup: "popup.html" });
      console.log("📋 일반 모드: popup 활성화");
    }
  } catch (error) {
    console.error("❌ 빠른 실행 모드 popup 업데이트 실패:", error);
  }
}

// 빠른 실행 모드 클릭 핸들러 초기화
export function setupQuickModeHandler() {
  // 확장 프로그램 아이콘 클릭 처리 (빠른 실행 모드일 때만)
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      // 빠른 실행 모드 확인
      const quickModeResult = await chrome.storage.local.get(["quickMode"]);
      const isQuickModeEnabled = quickModeResult.quickMode || false;

      if (!isQuickModeEnabled) {
        // 빠른 실행 모드가 꺼져있으면 popup이 열림 (기본 동작)
        return;
      }

      // 로그인 상태 확인
      if (!currentUser) {
        await restoreUserInfo();
      }

      if (!currentUser || !currentUser.uid) {
        console.log("⚠️ 빠른 실행 모드: 로그인되지 않음");
        // 로그인 안되어 있으면 popup 활성화하여 로그인 유도
        chrome.action.setPopup({ popup: "popup.html" });
        chrome.action.openPopup();
        return;
      }

      // 빠른 실행 모드 활성화 + 로그인됨 → 바로 북마크 저장
      console.log("⚡ 빠른 실행 모드: 바로 북마크 저장");

      const saveResult = await quickSaveBookmark();

      if (saveResult.success) {
        console.log("✅ 빠른 실행 모드: 북마크 저장 완료");
        // 성공 알림
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "" });
        }, 2000);
      } else {
        // 실패 알림 (X 표시)
        chrome.action.setBadgeText({ text: "✕" });
        chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "" });
        }, 2000);
      }
    } catch (error) {
      console.error("❌ 빠른 실행 모드 클릭 처리 오류:", error);
    }
  });
}
