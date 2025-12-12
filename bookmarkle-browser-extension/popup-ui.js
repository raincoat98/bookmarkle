import { dom } from "./popup-dom.js";
import { loadCollections, setLoginRequiredHandler } from "./popup-collections.js";
import { state } from "./popup-state.js";

export function updateUI(user, shouldLoadCollections = true) {
  state.currentUser = user;

  if (user) {
    if (dom.userEmailSpan) {
      dom.userEmailSpan.textContent = user.email || user.uid || "";
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
