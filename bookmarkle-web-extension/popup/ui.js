import { elements } from "./dom.js";
import {
  t,
  getCurrentLanguage,
  setLanguage,
  setCurrentLanguage,
} from "./i18n.js";
import { getTheme } from "./theme.js";
import { initializeIcons } from "./icons.js";
import { isUserLoggedIn, displayUserInfo } from "./auth.js";

export async function updateUIWithLanguage(lang = null) {
  const currentLang = lang || (await getCurrentLanguage());
  setCurrentLanguage(currentLang);

  const {
    menuUserInfo,
    languageText,
    menuLogout,
    themeText,
    loginEmailBtn,
    saveBookmarkBtn,
    currentPageInput,
    collectionInput,
    memoTextarea,
    tagInput,
    supportLink,
    bugLink,
    copyUrlBtn,
    collectionModalInput,
    collectionModalIconInput,
    refreshCollectionsBtn,
    newCollectionBtn,
    emojiPickerBtn,
    collectionSearchInput,
    loadingDiv,
  } = elements;

  // 메뉴 항목
  const menuUserInfoSpan = document.querySelector(
    "#menuUserInfo span:last-child"
  );
  if (menuUserInfoSpan) menuUserInfoSpan.textContent = await t("menu.userInfo");

  if (languageText) {
    const langNames = { ko: "한국어", en: "English", ja: "日本語" };
    languageText.textContent = `${await t("menu.language")} (${
      langNames[currentLang] || currentLang
    })`;
  }

  const menuLogoutSpan = document.querySelector("#menuLogout span:last-child");
  if (menuLogoutSpan) menuLogoutSpan.textContent = await t("menu.logout");

  // 테마 텍스트 업데이트
  if (themeText) {
    const currentTheme = getTheme();
    const themeKey =
      currentTheme === "light" ? "menu.darkMode" : "menu.lightMode";
    themeText.textContent = await t(themeKey);
  }

  // 로그인 버튼
  if (loginEmailBtn) loginEmailBtn.textContent = await t("login.login");

  // 로그인 정보
  const loginInfoItems = document.querySelectorAll(".login-info-list li");
  if (loginInfoItems.length >= 3) {
    loginInfoItems[0].textContent = await t("login.info1");
    loginInfoItems[1].textContent = await t("login.info2");
    loginInfoItems[2].textContent = await t("login.info3");
  }

  const privacyLink = document.querySelector(".privacy-info span:last-child");
  if (privacyLink) privacyLink.textContent = await t("login.privacyInfo");

  const contactLink = document.querySelector(".contact-info");
  if (contactLink) {
    const contactText = await t("login.contactInfo");
    contactLink.innerHTML = `${contactText}: <a href="mailto:ww57403@gmail.com">ww57403@gmail.com</a>`;
  }

  // 북마크 저장 버튼
  if (saveBookmarkBtn)
    saveBookmarkBtn.textContent = await t("bookmark.saveBookmark");

  // 현재 페이지 라벨
  const currentPageLabel = document.querySelector(
    'label[for="currentPageInput"]'
  );
  if (currentPageLabel)
    currentPageLabel.textContent = await t("bookmark.currentPage");

  // 컬렉션 라벨
  const collectionLabel = document.querySelector(
    'label[for="collectionInput"]'
  );
  if (collectionLabel) {
    const labelText = await t("bookmark.collection");
    const optionalText = await t("bookmark.optional");
    collectionLabel.innerHTML = `${labelText} <span>${optionalText}</span>`;
  }

  // 메모 라벨
  const memoLabel = document.querySelector('label[for="memoTextarea"]');
  if (memoLabel) {
    const memoText = await t("bookmark.memo");
    const optionalText = await t("bookmark.optional");
    memoLabel.innerHTML = `${memoText} <span>${optionalText}</span>`;
  }

  // 메모 placeholder
  if (memoTextarea) {
    memoTextarea.placeholder = await t("bookmark.memoPlaceholder");
  }

  // 태그 라벨
  const tagLabel = document.querySelector('label[for="tagInput"]');
  if (tagLabel) {
    const tagText = await t("bookmark.tag");
    const optionalText = await t("bookmark.optional");
    tagLabel.innerHTML = `${tagText} <span>${optionalText}</span>`;
  }

  // 태그 placeholder
  if (tagInput) {
    tagInput.placeholder = await t("bookmark.tagPlaceholder");
  }

  // 컬렉션 입력 placeholder
  if (collectionInput) {
    collectionInput.placeholder = await t("collection.selectNone");
  }

  // 후원하기 버튼
  if (supportLink) {
    supportLink.textContent = await t("bookmark.support");
  }

  // 버그 등록하기 버튼
  if (bugLink) {
    bugLink.textContent = await t("bookmark.bugReport");
  }

  // 복사 버튼
  if (copyUrlBtn) copyUrlBtn.textContent = await t("common.copy");

  // 컬렉션 모달
  const collectionModalTitle = document.getElementById("collectionModalTitle");
  if (collectionModalTitle) {
    collectionModalTitle.textContent = await t("collection.createCollection");
  }

  const collectionModalIconLabel = document.getElementById(
    "collectionModalIconLabel"
  );
  if (collectionModalIconLabel) {
    collectionModalIconLabel.textContent = await t("collection.collectionIcon");
  }

  const labels = document.querySelectorAll("#collectionModal label");
  const nameLabelText = await t("collection.name");
  for (const label of labels) {
    const labelText = label.textContent.trim();
    if (labelText === "이름" || labelText === "Name" || labelText === "名前") {
      label.textContent = nameLabelText;
      break;
    }
  }

  const createCollectionBtn = document.getElementById(
    "collectionModalCreateBtn"
  );
  if (createCollectionBtn) {
    createCollectionBtn.textContent = await t("collection.create");
  }

  const cancelCollectionBtn = document.getElementById(
    "collectionModalCancelBtn"
  );
  if (cancelCollectionBtn) {
    cancelCollectionBtn.textContent = await t("collection.cancel");
  }

  const collectionCreateOption = document.getElementById(
    "collectionCreateOption"
  );
  if (collectionCreateOption) {
    const createNewLabel = await t("collection.createNew");
    const allSpans = collectionCreateOption.querySelectorAll(
      "span:not([data-lucide]):not([id])"
    );
    if (allSpans.length > 0) {
      allSpans[0].textContent = `${createNewLabel} "`;
    }
  }

  if (refreshCollectionsBtn) {
    refreshCollectionsBtn.title = await t("collection.refresh");
  }

  if (newCollectionBtn) {
    newCollectionBtn.title = await t("collection.manageOnWeb");
  }

  if (emojiPickerBtn) {
    emojiPickerBtn.title = await t("collection.selectEmoji");
  }

  if (collectionSearchInput) {
    collectionSearchInput.placeholder = await t("collection.searchPlaceholder");
  }

  if (collectionModalInput) {
    collectionModalInput.placeholder = await t("collection.namePlaceholder");
  }

  if (collectionModalIconInput) {
    collectionModalIconInput.placeholder = await t(
      "collection.iconPlaceholder"
    );
  }

  if (loadingDiv) loadingDiv.textContent = await t("common.loading");

  const userInfoModalStrong = document.querySelector("#userInfoModal strong");
  if (userInfoModalStrong) {
    userInfoModalStrong.textContent = await t("user.userInfo");
  }

  // 사용자 정보가 로그인되어 있으면 사용자 정보를 다시 표시
  if (isUserLoggedIn()) {
    chrome.storage.local.get(["user"], async (result) => {
      if (chrome.runtime.lastError) return;
      if (result?.user) {
        await displayUserInfo(result.user);
      }
    });
  }
}

export async function showLanguageModal() {
  if (document.getElementById("languageModal")) return;
  const currentLang = await getCurrentLanguage();

  const modal = document.createElement("div");
  modal.id = "languageModal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content language-modal-content">
      <div class="modal-header">
        <h2>${await t("menu.language")}</h2>
        <button class="modal-close" id="closeLanguageModal">
          <span data-lucide="x"></span>
        </button>
      </div>
      <div class="modal-body language-options">
        <button class="language-option ${
          currentLang === "ko" ? "active" : ""
        }" data-lang="ko">
          <span>🇰🇷 한국어</span>
        </button>
        <button class="language-option ${
          currentLang === "en" ? "active" : ""
        }" data-lang="en">
          <span>🇺🇸 English</span>
        </button>
        <button class="language-option ${
          currentLang === "ja" ? "active" : ""
        }" data-lang="ja">
          <span>🇯🇵 日本語</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  initializeIcons();

  modal.querySelectorAll(".language-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      await setLanguage(lang);
      // 언어 변경 후 UI 전체 업데이트
      await updateUIWithLanguage(lang);
      closeLanguageModal();
    });
  });

  modal
    .querySelector("#closeLanguageModal")
    ?.addEventListener("click", closeLanguageModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLanguageModal();
  });
}

function closeLanguageModal() {
  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.remove();
  }
}
