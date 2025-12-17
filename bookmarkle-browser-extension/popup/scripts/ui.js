import { dom } from "./dom.js";
import { loadCollections, setLoginRequiredHandler } from "./collections.js";
import { state } from "./state.js";

/**
 * 로딩 섹션 표시
 */
export function showLoading() {
  if (dom.loadingSection) {
    dom.loadingSection.classList.remove("hidden");
    dom.loadingSection.style.display = "block";
  }
  if (dom.loginSection) {
    dom.loginSection.classList.add("hidden");
    dom.loginSection.style.display = "none";
  }
  if (dom.bookmarkSection) {
    dom.bookmarkSection.classList.add("hidden");
    dom.bookmarkSection.style.display = "none";
  }
  dom.loginGuide?.classList.add("hidden");
}

/**
 * 로딩 섹션 숨김
 */
export function hideLoading() {
  if (dom.loadingSection) {
    dom.loadingSection.classList.add("hidden");
    dom.loadingSection.style.display = "none";
  }
}

export function updateUI(user, shouldLoadCollections = true) {
  state.currentUser = user;

  // 먼저 로딩 섹션 숨김
  hideLoading();

  if (user) {
    if (dom.userEmailSpan) {
      // 이름 표시: displayName이 있으면 사용, 없으면 이메일의 @ 앞부분 사용
      let displayName = "";
      if (user.displayName) {
        displayName = user.displayName;
      } else if (user.email) {
        displayName = user.email.split("@")[0];
      } else {
        displayName = user.uid || "";
      }
      dom.userEmailSpan.textContent = displayName;
      dom.userEmailSpan.style.display = "inline";
    }
    if (dom.loginSection) {
      dom.loginSection.classList.add("hidden");
      dom.loginSection.style.display = "none";
    }
    if (dom.bookmarkSection) {
      dom.bookmarkSection.classList.remove("hidden");
      dom.bookmarkSection.style.display = "block";
    }
    dom.loginGuide?.classList.add("hidden");
    if (shouldLoadCollections) {
      loadCollections();
    }
  } else {
    if (dom.userEmailSpan) {
      dom.userEmailSpan.textContent = "";
      dom.userEmailSpan.style.display = "none";
    }
    if (dom.loginSection) {
      dom.loginSection.classList.remove("hidden");
      dom.loginSection.style.display = "block";
    }
    if (dom.bookmarkSection) {
      dom.bookmarkSection.classList.add("hidden");
      dom.bookmarkSection.style.display = "none";
    }
    dom.loginGuide?.classList.remove("hidden");
    state.collections = [];
  }
}

setLoginRequiredHandler(() => updateUI(null, false));
