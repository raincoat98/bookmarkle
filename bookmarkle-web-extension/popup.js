// emoji-mart import
import { Picker } from "emoji-mart";
import data from "@emoji-mart/data";

// lucide.js를 사용하여 data-lucide 속성의 아이콘을 자동 렌더링
function initializeIcons() {
  if (window.lucide && window.lucide.createIcons) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.error("Icon initialization error:", error);
    }
  } else {
    console.warn("Lucide library not fully loaded");
  }
}

function reinitializeLucideIcons() {
  initializeIcons();
}

const SUPPORT_URL = "https://bookmarkle.app/support";
const BUG_REPORT_URL =
  "https://github.com/raincoat98/bookmakle/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen";
const DASHBOARD_URL = "https://bookmarkle.app/dashboard";
const GITHUB_URL = "https://github.com/raincoat98/bookmakle";

// ===== i18n 설정 =====
const DEFAULT_LANGUAGE = "ko"; // 기본값: 한글
let i18nResources = {}; // 로드된 언어 리소스 캐시
let currentLanguage = DEFAULT_LANGUAGE;

// 언어 리소스 로드
async function loadLanguageResources(lang) {
  if (i18nResources[lang]) {
    return i18nResources[lang];
  }

  try {
    const response = await fetch(chrome.runtime.getURL(`locales/${lang}.json`));
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    const resources = await response.json();
    i18nResources[lang] = resources;
    return resources;
  } catch (error) {
    console.error(`Failed to load language resources for ${lang}:`, error);
    // 기본 언어(한글) 로드 시도
    if (lang !== DEFAULT_LANGUAGE) {
      return loadLanguageResources(DEFAULT_LANGUAGE);
    }
    return {};
  }
}

// 현재 언어 가져오기
async function getCurrentLanguage() {
  const result = await chrome.storage.local.get(["language"]);
  return result.language || DEFAULT_LANGUAGE;
}

// 언어 변경
async function setLanguage(lang) {
  await chrome.storage.local.set({ language: lang });
  currentLanguage = lang;
  await updateUIWithLanguage(lang);
}

// i18n 번역 함수 (t 함수)
async function t(key, lang = null) {
  const langToUse = lang || currentLanguage || (await getCurrentLanguage());
  const resources = await loadLanguageResources(langToUse);

  // 키 경로 파싱 (예: "menu.userInfo" -> resources.menu.userInfo)
  const keys = key.split(".");
  let value = resources;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // 키를 찾을 수 없으면 기본 언어로 시도
      if (langToUse !== DEFAULT_LANGUAGE) {
        return t(key, DEFAULT_LANGUAGE);
      }
      return key; // 기본 언어에서도 없으면 키 반환
    }
  }

  return value || key;
}

// UI 텍스트 업데이트
async function updateUIWithLanguage(lang = null) {
  const currentLang = lang || (await getCurrentLanguage());
  currentLanguage = currentLang;

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
  if (collectionModalTitle)
    collectionModalTitle.textContent = await t("collection.createCollection");

  const collectionNameLabel = document.querySelector(
    'label[for="collectionModalNameInput"]'
  );
  if (collectionNameLabel)
    collectionNameLabel.textContent = await t("collection.collectionName");

  // 컬렉션 모달 아이콘 라벨 (id로 직접 찾기)
  const collectionModalIconLabel = document.getElementById("collectionModalIconLabel");
  if (collectionModalIconLabel)
    collectionModalIconLabel.textContent = await t("collection.collectionIcon");

  // 컬렉션 모달 이름 라벨 (HTML에서 label 태그 직접 찾기)
  const labels = document.querySelectorAll("#collectionModal label");
  const nameLabelText = await t("collection.name");
  for (const label of labels) {
    const labelText = label.textContent.trim();
    if (labelText === "이름" || labelText === "Name" || labelText === "名前") {
      label.textContent = nameLabelText;
      break;
    }
  }

  const createCollectionBtn = document.getElementById("collectionModalCreateBtn");
  if (createCollectionBtn)
    createCollectionBtn.textContent = await t("collection.create");

  const cancelCollectionBtn = document.getElementById("collectionModalCancelBtn");
  if (cancelCollectionBtn)
    cancelCollectionBtn.textContent = await t("collection.cancel");

  // 새로 만들기 텍스트
  const collectionCreateOption = document.getElementById(
    "collectionCreateOption"
  );
  if (collectionCreateOption) {
    const createNewLabel = await t("collection.createNew");
    // HTML 구조: <span data-lucide="plus"></span><span></span><span id="newCollectionName"></span><span>"</span>
    const allSpans = collectionCreateOption.querySelectorAll("span:not([data-lucide]):not([id])");
    if (allSpans.length > 0) {
      // 첫 번째 빈 span에 "새로 만들기: " 텍스트 추가
      allSpans[0].textContent = `${createNewLabel} "`;
    }
  }

  // 새로고침 버튼 title
  if (refreshCollectionsBtn) {
    refreshCollectionsBtn.title = await t("collection.refresh");
  }

  // 새 컬렉션 버튼 title
  if (newCollectionBtn) {
    newCollectionBtn.title = await t("collection.manageOnWeb");
  }

  // 이모지 선택 버튼 title
  if (emojiPickerBtn) {
    emojiPickerBtn.title = await t("collection.selectEmoji");
  }

  // 컬렉션 검색 placeholder
  if (collectionSearchInput) {
    collectionSearchInput.placeholder = await t("collection.searchPlaceholder");
  }

  // 컬렉션 이름 placeholder
  if (collectionModalInput) {
    collectionModalInput.placeholder = await t("collection.namePlaceholder");
  }

  // 컬렉션 아이콘 placeholder
  if (collectionModalIconInput) {
    collectionModalIconInput.placeholder = await t(
      "collection.iconPlaceholder"
    );
  }

  // 로딩 텍스트
  if (loadingDiv) loadingDiv.textContent = await t("common.loading");

  // 사용자 정보 모달
  const userInfoModalStrong = document.querySelector("#userInfoModal strong");
  if (userInfoModalStrong)
    userInfoModalStrong.textContent = await t("user.userInfo");
}

// 언어 선택 모달 표시
async function showLanguageModal() {
  const currentLang = await getCurrentLanguage();
  const t = await (async () => {
    const resources = await loadLanguageResources(currentLang);
    return (key) => {
      const keys = key.split(".");
      let value = resources;
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }
      return value || key;
    };
  })();

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
  reinitializeLucideIcons();

  // 언어 선택 이벤트
  modal.querySelectorAll(".language-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      await setLanguage(lang);
      closeLanguageModal();
    });
  });

  // 닫기 버튼
  modal
    .querySelector("#closeLanguageModal")
    ?.addEventListener("click", closeLanguageModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLanguageModal();
  });
}

// 언어 모달 닫기
function closeLanguageModal() {
  const modal = document.getElementById("languageModal");
  if (modal) {
    modal.remove();
  }
}

const loginButtons = document.getElementById("loginButtons");
const loginEmailBtn = document.getElementById("loginEmailBtn");
const loggedInContent = document.getElementById("loggedInContent");
const userHeaderDiv = document.getElementById("userHeader");
const userEmailSpan = document.getElementById("userEmail");
const statusBadge = document.getElementById("statusBadge");
const menuBtn = document.getElementById("menuBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const menuUserInfo = document.getElementById("menuUserInfo");
const menuTheme = document.getElementById("menuTheme");
const themeText = document.getElementById("themeText");
const menuLanguage = document.getElementById("menuLanguage");
const languageText = document.getElementById("languageText");
const menuLogout = document.getElementById("menuLogout");
const userInfoModal = document.getElementById("userInfoModal");
const userDetailsDiv = document.getElementById("userDetails");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const loadingDiv = document.getElementById("loading");
const statusMessageDiv = document.getElementById("statusMessage");
const saveBookmarkBtn = document.getElementById("saveBookmarkBtn");
const currentPageInput = document.getElementById("currentPageInput");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const memoTextarea = document.getElementById("memoTextarea");
const collectionInput = document.getElementById("collectionInput");
const selectedCollectionId = document.getElementById("selectedCollectionId");
const collectionDropdown = document.getElementById("collectionDropdown");
const collectionSearchInput = document.getElementById("collectionSearchInput");
const collectionDropdownList = document.getElementById(
  "collectionDropdownList"
);
const collectionCreateOption = document.getElementById(
  "collectionCreateOption"
);
const newCollectionName = document.getElementById("newCollectionName");
const refreshCollectionsBtn = document.getElementById("refreshCollectionsBtn");
const newCollectionBtn = document.getElementById("newCollectionBtn");
const collectionModal = document.getElementById("collectionModal");
const collectionModalInput = document.getElementById("collectionModalInput");
const collectionModalIconInput = document.getElementById(
  "collectionModalIconInput"
);
const emojiPickerBtn = document.getElementById("emojiPickerBtn");
const emojiPickerModal = document.getElementById("emojiPickerModal");
const emojiPickerContainer = document.getElementById("emojiPickerContainer");
const collectionModalCloseBtn = document.getElementById(
  "collectionModalCloseBtn"
);
const collectionModalCancelBtn = document.getElementById(
  "collectionModalCancelBtn"
);
const collectionModalCreateBtn = document.getElementById(
  "collectionModalCreateBtn"
);
const tagInput = document.getElementById("tagInput");
const tagList = document.getElementById("tagList");
const supportLink = document.getElementById("supportLink");
const bugLink = document.getElementById("bugLink");

let currentTabInfo = null;
let tags = [];
let isSaving = false;
let userIsLoggedIn = false;
let statusTimeoutId = null;
let isComposing = false;
let collections = [];
let filteredCollections = [];

async function displayUserInfo(user) {
  if (!userDetailsDiv) return;
  userDetailsDiv.innerHTML = "";

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

function showUserInfoModal() {
  userInfoModal?.classList.add("show");
  if (dropdownMenu) {
    dropdownMenu.style.display = "none";
  }
}

function closeUserInfoModal() {
  userInfoModal?.classList.remove("show");
  if (dropdownMenu) {
    dropdownMenu.style.display = "none";
  }
}

function updateStatus(message, variant = "neutral", autoHide = true) {
  if (!statusMessageDiv) return;
  statusMessageDiv.textContent = message;
  statusMessageDiv.classList.remove("success", "error");

  if (variant === "success") {
    statusMessageDiv.classList.add("success");
  } else if (variant === "error") {
    statusMessageDiv.classList.add("error");
  }

  statusMessageDiv.style.display = "block";
  window.clearTimeout(statusTimeoutId);
  if (autoHide) {
    statusTimeoutId = window.setTimeout(() => {
      statusMessageDiv.style.display = "none";
    }, 3500);
  }
}

function setCollectionControlsState() {
  const disabled = !userIsLoggedIn;
  if (collectionInput) collectionInput.disabled = disabled;
  if (refreshCollectionsBtn) refreshCollectionsBtn.disabled = disabled;
  if (newCollectionBtn) newCollectionBtn.disabled = disabled;
}

function setSaveButtonState() {
  if (!saveBookmarkBtn) return;
  saveBookmarkBtn.disabled = !userIsLoggedIn || isSaving;
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tabs);
      }
    });
  });
}

async function loadCurrentTabInfo() {
  try {
    const tabs = await queryActiveTab();
    if (tabs && tabs.length > 0) {
      currentTabInfo = tabs[0];
      if (currentPageInput) {
        currentPageInput.value = currentTabInfo.url || "";
      }
    }
  } catch (error) {
    console.error("현재 탭 정보 로드 실패:", error);
    updateStatus("현재 탭 정보를 가져오지 못했습니다.", "error");
  }
}

async function updateCollectionsList(newCollections = []) {
  collections = newCollections;
  await filterCollections("");
}

async function filterCollections(searchText = "") {
  const search = searchText.trim().toLowerCase();
  filteredCollections = search
    ? collections.filter((col) => col.name.toLowerCase().includes(search))
    : collections;

  // 드롭다운 업데이트
  if (collectionDropdownList) {
    collectionDropdownList.innerHTML = "";

    // "선택 없음" 옵션 추가 (검색 중이 아닐 때만)
    if (!search) {
      const noneItem = document.createElement("div");
      noneItem.className = "collection-dropdown-item";
      noneItem.textContent = await t("collection.selectNone");
      noneItem.addEventListener("click", () => {
        clearCollection();
      });
      collectionDropdownList.appendChild(noneItem);
    }

    if (filteredCollections.length > 0) {
      filteredCollections.forEach((collection) => {
        const item = document.createElement("div");
        item.className = "collection-dropdown-item";
        // 아이콘이 있으면 아이콘과 이름을 함께 표시
        if (collection.icon) {
          item.innerHTML = `<span style="margin-right: 6px;">${collection.icon}</span>${collection.name}`;
        } else {
          item.textContent = collection.name;
        }
        item.addEventListener("click", () => {
          selectCollection(collection);
        });
        collectionDropdownList.appendChild(item);
      });
    } else if (search) {
      // 검색 결과가 없을 때
      const noResult = document.createElement("div");
      noResult.className = "collection-dropdown-item";
      noResult.style.color = "rgba(255, 255, 255, 0.5)";
      noResult.style.cursor = "default";
      noResult.textContent = await t("collection.noResults");
      collectionDropdownList.appendChild(noResult);
    }
  }

  // 새로 만들기 옵션 표시
  if (collectionCreateOption && newCollectionName) {
    const exactMatch = collections.some(
      (col) => col.name.toLowerCase() === search
    );

    if (search && !exactMatch) {
      newCollectionName.textContent = searchText.trim();
      collectionCreateOption.style.display = "block";
    } else {
      collectionCreateOption.style.display = "none";
    }
  }
}

function showCollectionDropdown() {
  if (collectionDropdown) {
    collectionDropdown.style.display = "flex";
    // 검색 인풋 초기화 및 포커스
    if (collectionSearchInput) {
      collectionSearchInput.value = "";
      collectionSearchInput.focus();
      filterCollections("");
    }
  }
}

function hideCollectionDropdown() {
  if (collectionDropdown) {
    collectionDropdown.style.display = "none";
    if (collectionSearchInput) {
      collectionSearchInput.value = "";
    }
  }
}

function selectCollection(collection) {
  if (collectionInput) {
    // 아이콘이 있으면 아이콘과 이름을 함께 표시
    collectionInput.value = collection.icon
      ? `${collection.icon} ${collection.name}`
      : collection.name;
  }
  if (selectedCollectionId) {
    selectedCollectionId.value = collection.id;
  }
  hideCollectionDropdown();
}

function clearCollection() {
  if (collectionInput) {
    collectionInput.value = "";
  }
  if (selectedCollectionId) {
    selectedCollectionId.value = "";
  }
  hideCollectionDropdown();
}

let emojiPickerInstance = null;

async function initializeEmojiPicker() {
  if (!emojiPickerContainer || emojiPickerInstance) return;

  try {
    emojiPickerInstance = new Picker({
      data: data,
      onEmojiSelect: (emoji) => {
        if (collectionModalIconInput) {
          collectionModalIconInput.value = emoji.native;
          collectionModalIconInput.dispatchEvent(new Event("input"));
        }
        // 이모지 선택 후 picker 숨기기
        hideEmojiPicker();
      },
      onClickOutside: () => {
        hideEmojiPicker();
      },
      locale: "ko",
      theme: "dark",
      previewPosition: "none",
      skinTonePosition: "none",
    });

    emojiPickerContainer.appendChild(emojiPickerInstance);
  } catch (error) {
    console.error("이모지 picker 초기화 실패:", error);
  }
}

async function showEmojiPicker() {
  if (!emojiPickerModal || !emojiPickerContainer) return;

  if (!emojiPickerInstance) {
    await initializeEmojiPicker();
  }

  if (emojiPickerModal) {
    const isVisible = emojiPickerModal.classList.contains("show");
    if (isVisible) {
      emojiPickerModal.classList.remove("show");
    } else {
      emojiPickerModal.classList.add("show");
    }
  }
}

function hideEmojiPicker() {
  if (emojiPickerModal) {
    emojiPickerModal.classList.remove("show");
  }
}

function showCollectionModal(initialName = "") {
  if (collectionModal) {
    if (collectionModalInput) {
      collectionModalInput.value = initialName;
      collectionModalInput.focus();
    }
    if (collectionModalIconInput) {
      collectionModalIconInput.value = "";
    }
    collectionModal.classList.add("show");
    if (collectionDropdown) {
      collectionDropdown.style.display = "none";
    }
    // 이모지 picker 숨기기
    hideEmojiPicker();
  }
}

function closeCollectionModal() {
  if (collectionModal) {
    collectionModal.classList.remove("show");
    if (collectionModalInput) {
      collectionModalInput.value = "";
    }
    if (collectionModalIconInput) {
      collectionModalIconInput.value = "";
    }
    // 이모지 picker 숨기기
    hideEmojiPicker();
  }
}

async function createCollectionFromModal() {
  const name = collectionModalInput?.value?.trim();
  if (!name) {
    updateStatus(await t("common.collectionNameRequired"), "error");
    return;
  }

  // 아이콘 가져오기 (선택사항, 없으면 기본값 "Folder")
  const icon = collectionModalIconInput?.value?.trim() || "Folder";

  // 중복 확인
  const existingCollection = collections.find(
    (col) => col.name.toLowerCase() === name.toLowerCase()
  );

  if (existingCollection) {
    updateStatus(await t("common.collectionExists"), "error");
    selectCollection(existingCollection);
    closeCollectionModal();
    return;
  }

  // 컬렉션 생성
  if (collectionModalCreateBtn) {
    collectionModalCreateBtn.disabled = true;
    collectionModalCreateBtn.textContent = await t("collection.creating");
  }

  try {
    const createResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "CREATE_COLLECTION",
          collectionData: { name: name, icon: icon },
        },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });

    if (createResponse?.success && createResponse?.collectionId) {
      // 컬렉션 목록 새로고침
      await fetchCollectionsList();

      // 새로 생성된 컬렉션 선택
      const newCollection = collections.find(
        (col) => col.id === createResponse.collectionId
      );
      if (newCollection) {
        selectCollection(newCollection);
      }

      updateStatus(await t("common.collectionCreated"), "success");
      closeCollectionModal();
    } else {
      updateStatus(
        createResponse?.error || (await t("common.collectionCreateError")),
        "error"
      );
    }
  } catch (error) {
    console.error("컬렉션 생성 실패:", error);
    updateStatus(await t("common.collectionCreateError"), "error");
  } finally {
    if (collectionModalCreateBtn) {
      collectionModalCreateBtn.disabled = false;
      collectionModalCreateBtn.textContent = await t("collection.create");
    }
  }
}

function fetchCollectionsList() {
  return new Promise((resolve) => {
    if (!userIsLoggedIn) {
      updateCollectionsList([]);
      resolve();
      return;
    }

    chrome.runtime.sendMessage(
      { type: "FETCH_COLLECTIONS" },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error("컬렉션 목록 로드 오류:", chrome.runtime.lastError);
          updateStatus(await t("common.collectionListError"), "error");
          resolve();
          return;
        }

        if (response?.success && Array.isArray(response.collections)) {
          await updateCollectionsList(response.collections);
        } else {
          const errorMsg =
            response?.error || (await t("common.collectionLoadError"));
          updateStatus(errorMsg, "error");
          await updateCollectionsList([]);
        }
        resolve();
      }
    );
  });
}

function addTagsFromInput(value) {
  if (!value) return;
  const trimmedValue = value.trim();
  if (!trimmedValue) return;

  // 쉼표나 줄바꿈으로 분리
  const rawTags = trimmedValue
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  let added = false;
  rawTags.forEach((tag) => {
    if (!tags.includes(tag)) {
      tags.push(tag);
      added = true;
    }
  });
  if (added) {
    renderTags();
  }
}

function renderTags() {
  if (!tagList) return;
  tagList.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = tag;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      tags = tags.filter((item) => item !== tag);
      renderTags();
    });
    chip.appendChild(nameSpan);
    chip.appendChild(removeBtn);
    tagList.appendChild(chip);
  });
}

async function saveCurrentPageBookmark() {
  if (isSaving) return;
  if (!userIsLoggedIn) {
    updateStatus(await t("common.loginRequired"), "error");
    return;
  }

  await loadCurrentTabInfo();
  if (!currentTabInfo || !currentTabInfo.url || !currentTabInfo.title) {
    updateStatus(await t("common.pageInfoError"), "error");
    return;
  }

  // 컬렉션 처리: 선택된 컬렉션 ID 사용
  let collectionId = selectedCollectionId?.value || null;

  // 입력된 이름이 있지만 ID가 없으면 기존 컬렉션에서 찾기
  let collectionName = collectionInput?.value?.trim() || "";
  // 아이콘 이모지가 포함되어 있으면 제거 (이모지는 보통 단일 문자이므로 첫 번째 문자를 확인)
  // 간단하게 공백으로 split하고 첫 번째가 이모지인지 확인하거나, 이름만 추출
  if (collectionName) {
    // 아이콘과 이름이 "이모지 이름" 형식으로 되어 있다면 이름만 추출
    const parts = collectionName.split(/\s+/);
    if (parts.length > 1 && parts[0].length === 1) {
      // 첫 번째 부분이 단일 문자(이모지)일 가능성이 높음
      collectionName = parts.slice(1).join(" ");
    }
  }
  if (collectionName && !collectionId) {
    const existingCollection = collections.find(
      (col) => col.name.toLowerCase() === collectionName.toLowerCase()
    );

    if (existingCollection) {
      collectionId = existingCollection.id;
    } else {
      // 컬렉션이 없으면 모달 열기
      updateStatus(await t("common.collectionRequired"), "error");
      showCollectionModal(collectionName);
      return;
    }
  }

  const bookmarkData = {
    title: currentTabInfo.title,
    url: currentTabInfo.url,
    description: memoTextarea?.value?.trim() || "",
    collection: collectionId,
    tags: [...tags],
  };

  isSaving = true;
  setSaveButtonState();
  const previousButtonText = saveBookmarkBtn?.textContent;
  if (saveBookmarkBtn) {
    saveBookmarkBtn.textContent = "저장 중...";
  }
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "SAVE_BOOKMARK", bookmarkData },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });

    if (response?.success) {
      updateStatus(await t("common.bookmarkSaved"), "success");
    } else {
      const errorMsg = response?.error || (await t("common.bookmarkSaveError"));
      updateStatus(errorMsg, "error");
    }
  } catch (error) {
    console.error("북마크 저장 실패:", error);
    updateStatus(
      error?.message || "북마크 저장 중 오류가 발생했습니다.",
      "error"
    );
  } finally {
    isSaving = false;
    setSaveButtonState();
    if (saveBookmarkBtn && previousButtonText) {
      saveBookmarkBtn.textContent = previousButtonText;
    }
  }
}

async function copyCurrentUrl() {
  if (!currentPageInput || !currentPageInput.value) {
    updateStatus(await t("common.urlCopyError"), "error");
    return;
  }

  navigator.clipboard
    .writeText(currentPageInput.value)
    .then(async () => updateStatus(await t("common.urlCopied"), "success"))
    .catch(async (error) => {
      console.error("URL 복사 실패:", error);
      updateStatus(await t("common.urlCopyFailed"), "error");
    });
}

function openExternalLink(url) {
  chrome.tabs.create({ url });
}

async function handleLogin() {
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

// 테마 관련 함수들
function getTheme() {
  try {
    const theme = localStorage.getItem("theme") || "dark";
    return theme;
  } catch (error) {
    console.error("테마 가져오기 오류:", error);
    return "dark";
  }
}

async function setTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    await updateThemeButton(theme);
  } catch (error) {
    console.error("테마 저장 오류:", error);
  }
}

function applyTheme(theme) {
  const body = document.body;
  if (theme === "light") {
    body.classList.add("light-theme");
  } else {
    body.classList.remove("light-theme");
  }
  // 아이콘 재초기화 (테마 변경 시 필요)
  reinitializeLucideIcons();
}

async function updateThemeButton(theme) {
  if (themeText) {
    const themeKey = theme === "light" ? "menu.darkMode" : "menu.lightMode";
    themeText.textContent = await t(themeKey);
  }
}

async function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  await setTheme(newTheme);
}

async function loadTheme() {
  const theme = getTheme();
  applyTheme(theme);
  await updateThemeButton(theme);
}

function loadAuthState() {
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

function updateLoginUI(isLoggedIn, user = null) {
  userIsLoggedIn = isLoggedIn;
  if (isLoggedIn && user) {
    // displayName이 있으면 우선 표시, 없으면 이메일 표시
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
    // loggedInContent가 표시된 후에 데이터 로드 (약간의 지연)
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
    tags = [];
    renderTags();
    setCollectionControlsState();
    setSaveButtonState();
  }
  reinitializeLucideIcons();
}

document.addEventListener("click", (event) => {
  if (
    !menuBtn?.contains(event.target) &&
    !dropdownMenu?.contains(event.target)
  ) {
    if (dropdownMenu) {
      dropdownMenu.style.display = "none";
    }
  }

  // 컬렉션 드롭다운 외부 클릭 시 닫기
  if (
    collectionInput &&
    !collectionInput.contains(event.target) &&
    collectionDropdown &&
    !collectionDropdown.contains(event.target)
  ) {
    hideCollectionDropdown();
  }
});

loginEmailBtn?.addEventListener("click", () => handleLogin());
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
modalCloseBtn?.addEventListener("click", () => closeUserInfoModal());
userInfoModal?.addEventListener("click", (event) => {
  if (event.target === userInfoModal) {
    closeUserInfoModal();
  }
});

// 컬렉션 모달 이벤트 리스너
collectionModalCloseBtn?.addEventListener("click", () =>
  closeCollectionModal()
);
collectionModalCancelBtn?.addEventListener("click", () =>
  closeCollectionModal()
);
collectionModal?.addEventListener("click", (event) => {
  if (event.target === collectionModal) {
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

// 아이콘 입력 필드: 이모지만 허용, 일반 문자 및 한글 입력 차단
collectionModalIconInput?.addEventListener("input", (event) => {
  const value = event.target.value;
  // ASCII 문자(영문, 숫자, 특수문자) 및 한글 제거
  // 한글 유니코드 범위: \uAC00-\uD7A3 (완성형), \u1100-\u11FF (자모), \u3130-\u318F (호환용)
  const emojiOnly = value
    .replace(/[\x00-\x7F]/g, "") // ASCII 제거
    .replace(/[\uAC00-\uD7A3]/g, "") // 완성형 한글 제거
    .replace(/[\u1100-\u11FF]/g, "") // 한글 자모 제거
    .replace(/[\u3130-\u318F]/g, ""); // 호환용 한글 자모 제거
  if (value !== emojiOnly) {
    event.target.value = emojiOnly;
  }
});

collectionModalIconInput?.addEventListener("keydown", (event) => {
  // 일반 문자 키 입력 차단 (이모지는 허용)
  // input 이벤트에서 필터링하므로 keydown에서는 완전히 차단하지 않음
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    const keyCode = event.key.charCodeAt(0);
    // ASCII 문자만 차단 (한글과 이모지는 input 이벤트에서 처리)
    const isASCII = /[\x00-\x7F]/.test(event.key);

    if (isASCII) {
      // Backspace, Delete, Arrow keys 등은 허용
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

// composition 이벤트는 이모지 입력을 위해 허용
// input 이벤트에서 한글과 ASCII를 필터링하므로 composition 이벤트는 방해하지 않음

// 이모지 picker 버튼 이벤트
emojiPickerBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  showEmojiPicker();
});

// 이모지 picker 모달 외부 클릭 시 닫기
emojiPickerModal?.addEventListener("click", (event) => {
  if (event.target === emojiPickerModal) {
    hideEmojiPicker();
  }
});

copyUrlBtn?.addEventListener("click", () => copyCurrentUrl());
saveBookmarkBtn?.addEventListener("click", () => saveCurrentPageBookmark());

refreshCollectionsBtn?.addEventListener("click", () => fetchCollectionsList());
newCollectionBtn?.addEventListener("click", () => {
  hideCollectionDropdown();
  showCollectionModal("");
});

// 컬렉션 입력 필드 이벤트 - 드롭다운 열기
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
  const name = newCollectionName?.textContent?.trim();
  if (name) {
    hideCollectionDropdown();
    showCollectionModal(name);
  }
});

let isProcessingTag = false;

// 한글 입력 중인지 확인
tagInput?.addEventListener("compositionstart", () => {
  isComposing = true;
});

tagInput?.addEventListener("compositionend", () => {
  isComposing = false;
});

tagInput?.addEventListener("keydown", (event) => {
  // 한글 입력 중이면 무시
  if (isComposing) return;

  if (event.key === "Enter") {
    event.preventDefault();
    if (isProcessingTag) return;
    isProcessingTag = true;
    const value = tagInput.value.trim();
    if (value) {
      addTagsFromInput(value);
      tagInput.value = "";
    }
    setTimeout(() => {
      isProcessingTag = false;
    }, 100);
  } else if (event.key === ",") {
    event.preventDefault();
    if (isProcessingTag) return;
    isProcessingTag = true;
    const value = tagInput.value.trim();
    if (value) {
      addTagsFromInput(value);
      tagInput.value = "";
    }
    setTimeout(() => {
      isProcessingTag = false;
    }, 100);
  }
});

tagInput?.addEventListener("blur", () => {
  if (isProcessingTag || isComposing) return;
  const value = tagInput.value.trim();
  if (value) {
    addTagsFromInput(value);
    tagInput.value = "";
  }
});

supportLink?.addEventListener("click", () => openExternalLink(SUPPORT_URL));
bugLink?.addEventListener("click", () => openExternalLink(BUG_REPORT_URL));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.user) {
    const userValue = changes.user.newValue;
    updateLoginUI(!!userValue, userValue || null);
  }
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "AUTH_SUCCESS") {
    updateStatus(await t("common.loginSuccess"), "success");
    updateLoginUI(true, message.user);
  }
});

setCollectionControlsState();
setSaveButtonState();

// DOM이 완전히 로드된 후 아이콘 초기화 및 언어 설정
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    initializeIcons();
    await updateUIWithLanguage();
  });
} else {
  // DOM이 이미 로드됨
  setTimeout(async () => {
    initializeIcons();
    await updateUIWithLanguage();
  }, 0);
}

// 팝업 초기화 - 테마와 인증 상태 로드
loadTheme(); // 테마는 즉시 로드
(async () => {
  await loadAuthState();
  loadCurrentTabInfo();
})();
