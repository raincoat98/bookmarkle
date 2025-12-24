// 메인 진입점
import { initializeIcons, reinitializeLucideIcons } from "./popup/icons.js";
import { updateUIWithLanguage } from "./popup/ui.js";
import { loadTheme } from "./popup/theme.js";
import { loadAuthState } from "./popup/auth.js";
import { loadCurrentTabInfoToInput } from "./popup/bookmark.js";
import { initializeTagInput } from "./popup/tags.js";
import { initializeEventListeners } from "./popup/events.js";
import { setCollectionControlsState } from "./popup/collection-state.js";
import { setSaveButtonState } from "./popup/bookmark.js";

// 초기화
setCollectionControlsState();
setSaveButtonState();

// DOM이 완전히 로드된 후 아이콘 초기화 및 언어 설정
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    initializeIcons();
    await updateUIWithLanguage();
    initializeTagInput();
    initializeEventListeners();
  });
} else {
  // DOM이 이미 로드됨
  setTimeout(async () => {
    initializeIcons();
    await updateUIWithLanguage();
    initializeTagInput();
    initializeEventListeners();
  }, 0);
}

// 팝업 초기화 - 테마와 인증 상태 로드
loadTheme(); // 테마는 즉시 로드
(async () => {
  await loadAuthState();
  loadCurrentTabInfoToInput();
})();
