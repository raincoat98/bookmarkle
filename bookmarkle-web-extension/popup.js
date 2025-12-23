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
const menuSettings = document.getElementById("menuSettings");
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

function displayUserInfo(user) {
  if (!userDetailsDiv) return;
  userDetailsDiv.innerHTML = "";

  const rows = [
    { label: "이메일", value: user.email },
    { label: "이름", value: user.displayName },
    { label: "UID", value: user.uid },
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

function updateCollectionsList(newCollections = []) {
  collections = newCollections;
  filterCollections("");
}

function filterCollections(searchText = "") {
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
      noneItem.textContent = "선택 없음";
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
      noResult.textContent = "검색 결과가 없습니다";
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
    updateStatus("컬렉션 이름을 입력해주세요.", "error");
    return;
  }

  // 아이콘 가져오기 (선택사항, 없으면 기본값 "Folder")
  const icon = collectionModalIconInput?.value?.trim() || "Folder";

  // 중복 확인
  const existingCollection = collections.find(
    (col) => col.name.toLowerCase() === name.toLowerCase()
  );

  if (existingCollection) {
    updateStatus("이미 존재하는 컬렉션입니다.", "error");
    selectCollection(existingCollection);
    closeCollectionModal();
    return;
  }

  // 컬렉션 생성
  if (collectionModalCreateBtn) {
    collectionModalCreateBtn.disabled = true;
    collectionModalCreateBtn.textContent = "만드는 중...";
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

      updateStatus("컬렉션이 생성되었습니다! 🎉", "success");
      closeCollectionModal();
    } else {
      updateStatus(
        createResponse?.error || "컬렉션 생성에 실패했습니다.",
        "error"
      );
    }
  } catch (error) {
    console.error("컬렉션 생성 실패:", error);
    updateStatus("컬렉션 생성 중 오류가 발생했습니다.", "error");
  } finally {
    if (collectionModalCreateBtn) {
      collectionModalCreateBtn.disabled = false;
      collectionModalCreateBtn.textContent = "만들기";
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

    chrome.runtime.sendMessage({ type: "FETCH_COLLECTIONS" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("컬렉션 목록 로드 오류:", chrome.runtime.lastError);
        updateStatus("컬렉션 목록을 가져올 수 없습니다.", "error");
        resolve();
        return;
      }

      if (response?.success && Array.isArray(response.collections)) {
        updateCollectionsList(response.collections);
      } else {
        updateStatus(response?.error || "컬렉션 로드에 실패했습니다.", "error");
        updateCollectionsList([]);
      }
      resolve();
    });
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
    updateStatus("로그인 후에 북마크를 저장할 수 있습니다.", "error");
    return;
  }

  await loadCurrentTabInfo();
  if (!currentTabInfo || !currentTabInfo.url || !currentTabInfo.title) {
    updateStatus("저장할 페이지 정보를 가져오지 못했습니다.", "error");
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
      updateStatus("컬렉션을 먼저 생성해주세요.", "error");
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
      updateStatus("북마크가 저장되었습니다! 🎉", "success");
    } else {
      updateStatus(response?.error || "북마크 저장에 실패했습니다.", "error");
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

function copyCurrentUrl() {
  if (!currentPageInput || !currentPageInput.value) {
    updateStatus("복사할 URL을 찾을 수 없습니다.", "error");
    return;
  }

  navigator.clipboard
    .writeText(currentPageInput.value)
    .then(() => updateStatus("URL이 복사되었습니다.", "success"))
    .catch((error) => {
      console.error("URL 복사 실패:", error);
      updateStatus("URL을 복사할 수 없습니다.", "error");
    });
}

function openExternalLink(url) {
  chrome.tabs.create({ url });
}

function handleLogin() {
  if (!loginEmailBtn) return;

  loginEmailBtn.disabled = true;
  if (loadingDiv) {
    loadingDiv.style.display = "block";
  }
  updateStatus("로그인 페이지를 여는 중...", "neutral");

  chrome.runtime.sendMessage({ type: "LOGIN_EMAIL" }, () => {
    if (chrome.runtime.lastError) {
      console.error("로그인 메시지 오류:", chrome.runtime.lastError);
      updateStatus("로그인 요청 중 오류가 발생했습니다.", "error");
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

function setTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    updateThemeButton(theme);
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

function updateThemeButton(theme) {
  if (themeText) {
    themeText.textContent = theme === "light" ? "다크 모드" : "라이트 모드";
  }
}

function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
}

function loadTheme() {
  const theme = getTheme();
  applyTheme(theme);
  updateThemeButton(theme);
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
      updateStatus("로그인 상태를 확인할 수 없습니다.", "error");
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
menuTheme?.addEventListener("click", () => {
  toggleTheme();
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
collectionSearchInput?.addEventListener("input", (event) => {
  const value = event.target.value;
  filterCollections(value);
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

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "AUTH_SUCCESS") {
    updateStatus("로그인 성공!", "success");
    updateLoginUI(true, message.user);
  }
});

setCollectionControlsState();
setSaveButtonState();

// DOM이 완전히 로드된 후 아이콘 초기화
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeIcons);
} else {
  // DOM이 이미 로드됨
  setTimeout(initializeIcons, 0);
}

// 팝업 초기화 - 테마와 인증 상태 로드
loadTheme(); // 테마는 즉시 로드
(async () => {
  await loadAuthState();
  loadCurrentTabInfo();
})();
