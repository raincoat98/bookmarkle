import { elements } from "./dom.js";
import { t } from "./i18n.js";
import { updateStatus } from "./status.js";
import { reinitializeLucideIcons } from "./icons.js";
import { setCollectionControlsState } from "./collection-state.js";
import { clearTags } from "./tags.js";
import {
  fetchCollectionsList,
  setUserLoggedIn as setCollectionUserLoggedIn,
} from "./collection.js";
import {
  setUserLoggedIn as setBookmarkUserLoggedIn,
  setSaveButtonState,
} from "./bookmark.js";

let userIsLoggedIn = false;

export function isUserLoggedIn() {
  return userIsLoggedIn;
}

export async function displayUserInfo(user) {
  const { userDetailsDiv } = elements;
  if (!userDetailsDiv) return;

  // 기존 내용 완전 제거
  while (userDetailsDiv.firstChild) {
    userDetailsDiv.removeChild(userDetailsDiv.firstChild);
  }

  const rows = [
    { label: await t("user.email"), value: user.email },
    { label: await t("user.name"), value: user.displayName },
    { label: await t("user.uid"), value: user.uid },
  ];

  rows.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.textContent = `${label}: ${value || "N/A"}`;
    userDetailsDiv.appendChild(row);
  });
}

export function showUserInfoModal() {
  const { userInfoModal, dropdownMenu } = elements;
  userInfoModal?.classList.add("show");
  if (dropdownMenu) {
    dropdownMenu.style.display = "none";
  }
}

export function closeUserInfoModal() {
  const { userInfoModal, dropdownMenu } = elements;
  userInfoModal?.classList.remove("show");
  if (dropdownMenu) {
    dropdownMenu.style.display = "none";
  }
}

export async function handleLogin() {
  const { loginEmailBtn, loadingDiv } = elements;
  if (!loginEmailBtn) return;

  loginEmailBtn.disabled = true;
  if (loadingDiv) {
    loadingDiv.style.display = "block";
  }
  updateStatus(await t("common.loginPageOpening"), "neutral");

  chrome.runtime.sendMessage({ type: "LOGIN_EMAIL" }, async () => {
    if (chrome.runtime.lastError) {
      console.error("로그인 메시지 오류:", chrome.runtime.lastError);
      updateStatus(await t("common.loginRequestError"), "error");
      if (loadingDiv) {
        loadingDiv.style.display = "none";
      }
      loginEmailBtn.disabled = false;
    } else {
      updateStatus(
        "로그인 페이지가 열렸습니다. 새 탭에서 진행해주세요.",
        "neutral"
      );
    }
  });
}

function requestUserFromBackground() {
  chrome.runtime.sendMessage({ type: "GET_CURRENT_USER" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(
        "Background 사용자 정보 로드 실패:",
        chrome.runtime.lastError
      );
      updateLoginUI(false);
      return;
    }
    updateLoginUI(!!response?.user, response?.user || null);
  });
}

export function loadAuthState() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(["user"], (result) => {
        if (chrome.runtime.lastError) {
          console.error("사용자 정보 로드 오류:", chrome.runtime.lastError);
          requestUserFromBackground();
          resolve();
          return;
        }
        const storedUser = result?.user;
        if (storedUser) {
          updateLoginUI(true, storedUser);
        } else {
          requestUserFromBackground();
        }
        resolve();
      });
    } catch (error) {
      console.error("로그인 상태 확인 오류:", error);
      t("common.authStateError").then((msg) => {
        updateStatus(msg, "error");
      });
      resolve();
    }
  });
}

export function updateLoginUI(isLoggedIn, user = null) {
  userIsLoggedIn = isLoggedIn;
  setBookmarkUserLoggedIn(isLoggedIn);
  setCollectionUserLoggedIn(isLoggedIn);

  const {
    userEmailSpan,
    statusBadge,
    loggedInContent,
    userHeaderDiv,
    loginButtons,
    loadingDiv,
    userDetailsDiv,
  } = elements;

  if (isLoggedIn && user) {
    userEmailSpan.textContent = user.displayName || user.email || "사용자";
    statusBadge?.classList.remove("logged-out");
    if (loggedInContent) {
      loggedInContent.style.display = "block";
    }
    if (userHeaderDiv) {
      userHeaderDiv.style.display = "flex";
    }
    if (loginButtons) {
      loginButtons.style.display = "none";
    }
    if (loadingDiv) {
      loadingDiv.style.display = "none";
    }
    displayUserInfo(user);
    setTimeout(() => {
      fetchCollectionsList();
    }, 0);
    setCollectionControlsState();
    setSaveButtonState();
  } else {
    statusBadge?.classList.add("logged-out");
    if (loggedInContent) {
      loggedInContent.style.display = "none";
    }
    if (userHeaderDiv) {
      userHeaderDiv.style.display = "none";
    }
    if (loginButtons) {
      loginButtons.style.display = "flex";
    }
    clearTags();
    setCollectionControlsState();
    setSaveButtonState();
  }
  reinitializeLucideIcons();
}
