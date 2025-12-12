import { QUICK_MODE_KEY } from "./constants.js";
import { setQuickMode } from "./quick-mode.js";

export function initContextMenus() {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "openDashboard",
      title: "대시보드로 가기",
      contexts: ["action"],
    });

    chrome.contextMenus.create({
      id: "toggleQuickMode",
      title: "빠른 실행모드 활성화",
      type: "checkbox",
      contexts: ["action"],
    });

    chrome.contextMenus.create({
      id: "openGithub",
      title: "깃허브",
      contexts: ["action"],
    });

    chrome.storage.local.get([QUICK_MODE_KEY], (result) => {
      updateQuickModeMenu(result[QUICK_MODE_KEY] || false);
    });
  });

  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "openDashboard") {
      chrome.tabs.create({ url: chrome.runtime.getURL("newtab.html") });
      return;
    }

    if (info.menuItemId === "toggleQuickMode") {
      setQuickMode(Boolean(info.checked));
      return;
    }

    if (info.menuItemId === "openGithub") {
      chrome.tabs.create({ url: "https://github.com/raincoat98/bookmarkle" });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[QUICK_MODE_KEY]) {
      updateQuickModeMenu(changes[QUICK_MODE_KEY].newValue || false);
    }
  });
}

function updateQuickModeMenu(isQuickMode) {
  chrome.contextMenus.update("toggleQuickMode", { checked: isQuickMode }, () => {
    if (chrome.runtime.lastError) {
      // 메뉴가 아직 생성되지 않은 경우 무시
    }
  });
}
