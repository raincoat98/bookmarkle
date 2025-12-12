import { dom } from "./popup-dom.js";
import { bindPopupEvents } from "./popup-events.js";
import { applyLanguageUI, getCurrentLanguage, loadLanguageTexts } from "./popup-locale.js";
import { initTheme } from "./popup-theme.js";
import { updateUI } from "./popup-ui.js";

const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

bindPopupEvents({ publicSignUrl: PUBLIC_SIGN_URL });

async function initCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
    const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" });
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

async function initPopup() {
  initTheme();
  await initCurrentTab();
  await initAuthState();
  await initLanguage();
}

initPopup();
