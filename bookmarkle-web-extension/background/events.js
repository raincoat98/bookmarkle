import { setCurrentUser, setCurrentIdToken } from "./state.js";
import { restoreUserInfo } from "./auth.js";
import { createContextMenus } from "./context-menu.js";
import { updateQuickModePopup } from "./quick-mode.js";

// Storage 변경 감지 리스너
export function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      // 사용자 정보 변경 감지
      if (changes.user) {
        if (changes.user.newValue) {
          setCurrentUser(changes.user.newValue);
          console.log(
            "✅ Storage 변경 감지 - 사용자 정보 업데이트:",
            changes.user.newValue.email
          );
        } else {
          setCurrentUser(null);
          console.log("✅ Storage 변경 감지 - 사용자 정보 삭제됨");
        }
      }
      // idToken 변경 감지
      if (changes.idToken) {
        if (changes.idToken.newValue) {
          setCurrentIdToken(changes.idToken.newValue);
          console.log("✅ Storage 변경 감지 - idToken 업데이트");
        } else {
          setCurrentIdToken(null);
          console.log("✅ Storage 변경 감지 - idToken 삭제됨");
        }
      }
      // 빠른 실행 모드 상태 변경 감지
      if (changes.quickMode) {
        updateQuickModePopup();
        createContextMenus();
      }
    }
  });
}

// Extension 시작 시 초기화
export function setupRuntimeListeners() {
  // Extension 시작 시 초기화
  chrome.runtime.onStartup?.addListener(async () => {
    console.log("🚀 Extension 시작됨 - 사용자 정보 복원 중...");
    await restoreUserInfo();
    await createContextMenus();
    await updateQuickModePopup();
  });

  // Extension 설치/업데이트 시 초기화
  chrome.runtime.onInstalled?.addListener(async (details) => {
    console.log("✅ Extension 설치/업데이트 완료:", details.reason);
    await restoreUserInfo();
    await createContextMenus();
    await updateQuickModePopup();
  });
}
