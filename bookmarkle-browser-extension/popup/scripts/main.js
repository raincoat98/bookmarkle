import { dom } from "./dom.js";
import { bindPopupEvents } from "./events.js";
import {
  applyLanguageUI,
  getCurrentLanguage,
  loadLanguageTexts,
} from "./locale.js";
import { initTheme } from "./theme.js";
import { updateUI } from "./ui.js";

const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

bindPopupEvents({ publicSignUrl: PUBLIC_SIGN_URL });

async function initCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url && dom.currentUrlDiv) {
      let displayUrl = tab.url;
      if (displayUrl.length > 100) {
        displayUrl = `${displayUrl.slice(0, 100)}...`;
      }
      dom.currentUrlDiv.textContent = displayUrl;
      dom.currentUrlDiv.setAttribute("href", tab.url);
      dom.currentUrlDiv.setAttribute("title", tab.url);
    }
  } catch (error) {
    console.error("Failed to resolve current tab:", error);
  }
}

async function initAuthState() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_AUTH_STATE",
    });
    if (response?.user) {
      updateUI(response.user);
    } else {
      updateUI(null);
    }
  } catch (error) {
    console.error("Auth state check error:", error);
    updateUI(null);
  }
}

async function initLanguage() {
  await loadLanguageTexts();
  applyLanguageUI(getCurrentLanguage());
}

function hideAllSections() {
  // 초기 상태: 모든 섹션 숨기기 (깜빡임 방지)
  if (dom.loginSection) {
    dom.loginSection.classList.add("hidden");
    dom.loginSection.style.display = "none";
  }
  if (dom.loadingSection) {
    dom.loadingSection.classList.add("hidden");
  }
  if (dom.bookmarkSection) {
    dom.bookmarkSection.classList.add("hidden");
    dom.bookmarkSection.style.display = "none";
  }
  dom.loginGuide?.classList.add("hidden");
}

async function initPopup() {
  hideAllSections();
  initTheme();
  await initCurrentTab();
  await initAuthState();
  await initLanguage();
}

initPopup();
