// Background Service Worker - 메인 진입점
import { handleMessage, setupNotificationHandlers } from "./background/messages.js";
import {
  setupStorageListener,
  setupRuntimeListeners,
} from "./background/events.js";
import { setupContextMenuHandlers, createContextMenus } from "./background/context-menu.js";
import { setupQuickModeHandler, updateQuickModePopup } from "./background/quick-mode.js";
import { restoreUserInfo } from "./background/auth.js";

// 메시지 수신 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleMessage(message, sender, sendResponse);
  // handleMessage가 false를 반환하면 false 반환
  // 그 외의 경우에는 비동기 응답을 처리하기 위해 true 반환
  return result === false ? false : true;
});

// 이벤트 리스너 초기화
setupStorageListener();
setupRuntimeListeners();
setupNotificationHandlers();
setupContextMenuHandlers();
setupQuickModeHandler();

// Service Worker 시작 시 초기화
(async () => {
  console.log("🚀 Background Service Worker 시작 - 사용자 정보 복원 중...");
  await restoreUserInfo();
  await createContextMenus();
  await updateQuickModePopup();
})();
