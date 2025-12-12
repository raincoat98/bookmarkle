import { QUICK_MODE_KEY } from "./background-constants.js";

export function initQuickModeControls() {
  chrome.storage.local.get([QUICK_MODE_KEY], (result) => {
    const isQuickMode = result[QUICK_MODE_KEY] || false;
    applyQuickMode(isQuickMode);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[QUICK_MODE_KEY]) {
      const isQuickMode = changes[QUICK_MODE_KEY].newValue || false;
      applyQuickMode(isQuickMode);
    }
  });
}

export function applyQuickMode(isQuickMode) {
  chrome.action.setPopup({ popup: isQuickMode ? "" : "popup-simple.html" });
}

export function setQuickMode(value) {
  chrome.storage.local.set({ [QUICK_MODE_KEY]: value }, () => {
    console.log(`빠른 실행 모드 ${value ? "활성화" : "비활성화"}`);
  });
}
