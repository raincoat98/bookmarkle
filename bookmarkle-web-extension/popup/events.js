import { elements } from "./dom.js";
import { SUPPORT_URL, BUG_REPORT_URL } from "./constants.js";
import { showLanguageModal } from "./ui.js";
import { toggleTheme, loadTheme } from "./theme.js";
import {
  showUserInfoModal,
  closeUserInfoModal,
  handleLogin,
  updateLoginUI,
} from "./auth.js";
import {
  showCollectionDropdown,
  hideCollectionDropdown,
  showCollectionModal,
  closeCollectionModal,
  createCollectionFromModal,
  fetchCollectionsList,
  filterCollections,
} from "./collection.js";
import { showEmojiPicker, hideEmojiPicker } from "./emoji.js";
import { saveCurrentPageBookmark, copyCurrentUrl } from "./bookmark.js";
import { openExternalLink } from "./tabs.js";
import { t } from "./i18n.js";
import { updateStatus } from "./status.js";

export function initializeEventListeners() {
  const {
    loginEmailBtn,
    menuBtn,
    dropdownMenu,
    menuUserInfo,
    menuTheme,
    menuLanguage,
    menuLogout,
    modalCloseBtn,
    userInfoModal,
    collectionModalCloseBtn,
    collectionModalCancelBtn,
    collectionModalCreateBtn,
    collectionModalInput,
    collectionModalIconInput,
    emojiPickerBtn,
    emojiPickerModal,
    copyUrlBtn,
    saveBookmarkBtn,
    refreshCollectionsBtn,
    newCollectionBtn,
    collectionInput,
    collectionSearchInput,
    collectionCreateOption,
    supportLink,
    bugLink,
  } = elements;

  // 드롭다운 외부 클릭 감지
  document.addEventListener("click", (event) => {
    if (
      !menuBtn?.contains(event.target) &&
      !dropdownMenu?.contains(event.target)
    ) {
      if (dropdownMenu) {
        dropdownMenu.style.display = "none";
      }
    }

    if (
      collectionInput &&
      !collectionInput.contains(event.target) &&
      elements.collectionDropdown &&
      !elements.collectionDropdown.contains(event.target)
    ) {
      hideCollectionDropdown();
    }
  });

  // 로그인
  loginEmailBtn?.addEventListener("click", () => handleLogin());

  // 메뉴
  menuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (dropdownMenu) {
      dropdownMenu.style.display =
        dropdownMenu.style.display === "block" ? "none" : "block";
    }
  });

  menuUserInfo?.addEventListener("click", () => {
    showUserInfoModal();
  });

  menuTheme?.addEventListener("click", async () => {
    await toggleTheme();
    if (dropdownMenu) {
      dropdownMenu.style.display = "none";
    }
  });

  menuLanguage?.addEventListener("click", () => {
    showLanguageModal();
    if (dropdownMenu) {
      dropdownMenu.style.display = "none";
    }
  });

  menuLogout?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
      if (chrome.runtime.lastError) {
        console.error("로그아웃 오류:", chrome.runtime.lastError);
        return;
      }
      updateLoginUI(false);
    });
    if (dropdownMenu) {
      dropdownMenu.style.display = "none";
    }
  });

  // 사용자 정보 모달
  modalCloseBtn?.addEventListener("click", () => closeUserInfoModal());
  userInfoModal?.addEventListener("click", (event) => {
    if (event.target === userInfoModal) {
      closeUserInfoModal();
    }
  });

  // 컬렉션 모달
  collectionModalCloseBtn?.addEventListener("click", () =>
    closeCollectionModal()
  );
  collectionModalCancelBtn?.addEventListener("click", () =>
    closeCollectionModal()
  );
  collectionModal?.addEventListener("click", (event) => {
    if (event.target === elements.collectionModal) {
      closeCollectionModal();
    }
  });
  collectionModalCreateBtn?.addEventListener("click", () =>
    createCollectionFromModal()
  );

  collectionModalInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createCollectionFromModal();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeCollectionModal();
    }
  });

  // 컬렉션 아이콘 입력 필드: 이모지만 허용
  collectionModalIconInput?.addEventListener("input", (event) => {
    const value = event.target.value;
    const emojiOnly = value
      .replace(/[\x00-\x7F]/g, "")
      .replace(/[\uAC00-\uD7A3]/g, "")
      .replace(/[\u1100-\u11FF]/g, "")
      .replace(/[\u3130-\u318F]/g, "");
    if (value !== emojiOnly) {
      event.target.value = emojiOnly;
    }
  });

  collectionModalIconInput?.addEventListener("keydown", (event) => {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const keyCode = event.key.charCodeAt(0);
      const isASCII = /[\x00-\x7F]/.test(event.key);
      if (isASCII) {
        if (
          ![
            "Backspace",
            "Delete",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
          ].includes(event.key)
        ) {
          event.preventDefault();
        }
      }
    }
  });

  // 이모지 picker
  emojiPickerBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    showEmojiPicker();
  });

  emojiPickerModal?.addEventListener("click", (event) => {
    if (event.target === emojiPickerModal) {
      hideEmojiPicker();
    }
  });

  // 북마크 관련
  copyUrlBtn?.addEventListener("click", () => copyCurrentUrl());
  saveBookmarkBtn?.addEventListener("click", () => saveCurrentPageBookmark());

  // 컬렉션 관련
  refreshCollectionsBtn?.addEventListener("click", () =>
    fetchCollectionsList()
  );
  newCollectionBtn?.addEventListener("click", () => {
    hideCollectionDropdown();
    showCollectionModal("");
  });

  collectionInput?.addEventListener("click", () => {
    showCollectionDropdown();
  });

  collectionInput?.addEventListener("focus", () => {
    showCollectionDropdown();
  });

  // 컬렉션 검색 인풋 이벤트
  collectionSearchInput?.addEventListener("input", async (event) => {
    const value = event.target.value;
    await filterCollections(value);
  });

  collectionSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hideCollectionDropdown();
      collectionInput?.blur();
    }
  });

  // 새 컬렉션 생성 옵션 클릭 - 모달 열기
  collectionCreateOption?.addEventListener("click", () => {
    const name = elements.newCollectionName?.textContent?.trim();
    if (name) {
      hideCollectionDropdown();
      showCollectionModal(name);
    }
  });

  // 외부 링크
  supportLink?.addEventListener("click", () => openExternalLink(SUPPORT_URL));
  bugLink?.addEventListener("click", () => openExternalLink(BUG_REPORT_URL));

  // Chrome storage 변경 감지
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.user) {
      const userValue = changes.user.newValue;
      updateLoginUI(!!userValue, userValue || null);
    }
  });

  // 메시지 리스너
  chrome.runtime.onMessage.addListener(async (message) => {
    if (message?.type === "AUTH_SUCCESS") {
      updateStatus(await t("common.loginSuccess"), "success");
      updateLoginUI(true, message.user);
    }
  });
}
