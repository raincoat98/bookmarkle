// ========================
// 1. 상수 및 DOM 요소 참조
// ========================
const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

// 인증 및 북마크 관련 요소
const loginBtn = document.getElementById("login-btn");
const saveBtn = document.getElementById("save-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginGuide = document.getElementById("loginGuide");
const userEmailSpan = document.getElementById("user-email");
const loginSection = document.getElementById("login-section");
const bookmarkSection = document.getElementById("bookmark-section");
const currentUrlDiv = document.getElementById("current-url");

// 컬렉션 관련 요소
const collectionDropdown = document.getElementById("collection-dropdown");
const dropdownSelected = document.getElementById("dropdownSelected");
const dropdownSelectedText = document.getElementById("dropdownSelectedText");
const dropdownOptions = document.getElementById("dropdownOptions");
const addCollectionModal = document.getElementById("addCollectionModal");
const confirmCollectionBtn = document.getElementById("confirmCollectionBtn");
const cancelCollectionBtn = document.getElementById("cancelCollectionBtn");
const collectionNameInput = document.getElementById("collectionNameInput");
const collectionIconInput = document.getElementById("collectionIconInput");

// 북마크 입력 관련 요소
const descriptionInput = document.getElementById("description-input");
const tagInput = document.getElementById("tag-input");
const tagsDisplay = document.getElementById("tags-display");

// 테마 관련 요소
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// 언어 설정 관련 요소
const languageSettingsBtn = document.getElementById("languageSettings");
const languageCancelBtn = document.getElementById("languageCancelBtn");
const languageSaveBtn = document.getElementById("languageSaveBtn");

// ========================
// 2. 전역 상태 변수
// ========================
let currentUser = null;
let collections = [];
let isLoadingCollections = false;
let tags = [];
let languageTexts = {};

// ========================
// 3. 유틸리티 함수
// ========================

// 3-1. 토스트 메시지 표시
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  // 언어별 메시지 적용
  const lang = getCurrentLanguage();
  if (message === "북마크가 저장되었습니다!" || message === "Bookmark saved!" || message === "ブックマークが保存されました！") {
    toast.textContent = languageTexts[lang].bookmarkSaved;
  } else if (message === "북마크 저장 오류" || message === "Bookmark save error" || message === "ブックマーク保存エラー") {
    toast.textContent = languageTexts[lang].bookmarkSaveError;
  } else if (message === "컬렉션이 추가되었습니다!" || message === "Collection added!" || message === "コレクションが追加されました！") {
    toast.textContent = languageTexts[lang].addCollection;
  } else if (message === "컬렉션 이름을 입력하세요." || message === "Please enter a collection name." || message === "コレクション名を入力してください。") {
    toast.textContent = languageTexts[lang].collectionNameRequired;
  } else {
    toast.textContent = message;
  }

  // 기존 클래스 및 인라인 스타일 제거
  toast.className = "";
  toast.removeAttribute("style");

  // 타입에 따른 클래스 추가
  toast.classList.add("show");
  if (type === "error") {
    toast.classList.add("error");
  } else if (type === "info") {
    toast.classList.add("info");
  } else if (type === "warning") {
    toast.classList.add("warning");
  }

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// 3-2. 테마 관련 함수
function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  if (mode === "dark") {
    if (themeIcon) themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
  } else {
    if (themeIcon) themeIcon.innerHTML = '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />';
  }
  localStorage.setItem("theme", mode);
}

function toggleTheme() {
  const current = localStorage.getItem("theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
}

// 3-3. 언어 관련 함수
async function loadLanguageTexts() {
  try {
    const res = await fetch('i18n.json');
    languageTexts = await res.json();
  } catch (e) {
    console.error('i18n.json load error:', e);
    languageTexts = {};
  }
}

function getCurrentLanguage() {
  return localStorage.getItem('language') || 'ko';
}

function applyLanguageUI(lang) {
  if (!languageTexts[lang]) return;

  // 주요 텍스트 변경
  const privacyPolicyText = document.getElementById("privacyPolicyText");
  const contactText = document.getElementById("contactText");
  if (privacyPolicyText) privacyPolicyText.textContent = languageTexts[lang].privacyPolicy;
  if (contactText) contactText.textContent = languageTexts[lang].contact;

  // 언어 버튼 국기 변경
  if (languageSettingsBtn) {
    if (lang === "ko") languageSettingsBtn.textContent = "🇰🇷";
    else if (lang === "en") languageSettingsBtn.textContent = "🇺🇸";
    else if (lang === "ja") languageSettingsBtn.textContent = "🇯🇵";
  }

  // '현재 페이지' 라벨
  const currentPageLabel = document.querySelector('.current-page .label');
  if (currentPageLabel) currentPageLabel.textContent = languageTexts[lang].currentPageLabel;

  // 하단 '후원하기' 버튼
  const sponsorButton = document.getElementById('sponsorButton');
  if (sponsorButton && sponsorButton.querySelector('span')) sponsorButton.querySelector('span').textContent = languageTexts[lang].sponsor;

  // 하단 '버그 등록하기' 버튼
  const bugReportButton = document.getElementById('bugReportButton');
  if (bugReportButton && bugReportButton.querySelector('span')) bugReportButton.querySelector('span').textContent = languageTexts[lang].bugReport;

  // 하단 구분선
  const dividerSpans = document.querySelectorAll('.flex.justify-center.gap-4.text-xs > span');
  dividerSpans.forEach(span => {
    if (span.textContent.trim() === '|' || span.textContent.trim() === languageTexts['ko'].divider || span.textContent.trim() === languageTexts['en'].divider || span.textContent.trim() === languageTexts['ja'].divider) {
      span.textContent = languageTexts[lang].divider;
    }
  });

  // 버튼, 라벨, placeholder 등 전체 변환
  const btnLogin = document.getElementById("login-btn");
  if (btnLogin && btnLogin.querySelector("span")) btnLogin.querySelector("span").textContent = languageTexts[lang].login;

  const btnSave = document.getElementById("save-btn");
  if (btnSave) btnSave.textContent = languageTexts[lang].bookmarkSaveBtn || "북마크 저장";

  const collSelect = document.getElementById("collection-select");
  if (collSelect && collSelect.options.length > 0) {
    collSelect.options[0].textContent = languageTexts[lang].collectionSelect || "컬렉션 선택...";
    for (let i = 0; i < collSelect.options.length; i++) {
      if (collSelect.options[i].value === "__add_collection__") {
        collSelect.options[i].textContent = languageTexts[lang].addCollectionOption || "+ 새 컬렉션 추가";
      }
    }
  }

  const descInput = document.getElementById("description-input");
  if (descInput) descInput.placeholder = languageTexts[lang].descriptionPlaceholder || "설명 입력 (선택사항)...";

  const tagInputElem = document.getElementById("tag-input");
  if (tagInputElem) tagInputElem.placeholder = languageTexts[lang].tagPlaceholder || "엔터로 태그 추가 (쉼표로 구분)";

  // 컬렉션 모달
  const modal = document.getElementById("addCollectionModal");
  if (modal) {
    const title = modal.querySelector("h3");
    if (title) title.textContent = languageTexts[lang].addCollectionTitle || "새 컬렉션 추가";
    const labels = modal.querySelectorAll("label");
    if (labels.length > 0) labels[0].textContent = languageTexts[lang].collectionNameLabel || "컬렉션 이름";
    if (labels.length > 1) labels[1].textContent = languageTexts[lang].collectionIconLabel || "아이콘 (선택사항)";
    const nameInput = document.getElementById("collectionNameInput");
    if (nameInput) nameInput.placeholder = languageTexts[lang].collectionNamePlaceholder || "컬렉션 이름을 입력하세요";
    const iconInput = document.getElementById("collectionIconInput");
    if (iconInput) iconInput.placeholder = languageTexts[lang].collectionIconPlaceholder || "아이콘을 입력하세요 (예: 📁, 💻, ⭐)";
    const cancelBtn = document.getElementById("cancelCollectionBtn");
    if (cancelBtn) cancelBtn.textContent = languageTexts[lang].cancelBtn || "취소";
    const confirmBtn = document.getElementById("confirmCollectionBtn");
    if (confirmBtn) confirmBtn.textContent = languageTexts[lang].addBtn || "추가";
  }

  // 언어 모달
  const langModal = document.getElementById("languageModal");
  if (langModal) {
    const title = langModal.querySelector("h3");
    if (title) title.textContent = languageTexts[lang].languageTitle || "언어 설정";
    const cancelBtn = document.getElementById("languageCancelBtn");
    if (cancelBtn) cancelBtn.textContent = languageTexts[lang].cancelBtn || "취소";
    const saveBtn = document.getElementById("languageSaveBtn");
    if (saveBtn) saveBtn.textContent = languageTexts[lang].saveBtn || "저장";
    const labels = langModal.querySelectorAll("label span.text-sm");
    if (labels.length > 0) labels[0].textContent = languageTexts[lang].langKo || "🇰🇷 한국어";
    if (labels.length > 1) labels[1].textContent = languageTexts[lang].langEn || "🇺🇸 English";
    if (labels.length > 2) labels[2].textContent = languageTexts[lang].langJa || "🇯🇵 日本語";
  }
}

// ========================
// 4. UI 업데이트 함수
// ========================
function updateUI(user, shouldLoadCollections = true) {
  currentUser = user;

  if (user) {
    // 로그인 상태
    if (userEmailSpan) {
      userEmailSpan.textContent = user.email || user.uid || "";
      userEmailSpan.style.display = "inline";
    }
    if (loginSection) {
      loginSection.classList.add("hidden");
      loginSection.style.display = "none";
    }
    if (bookmarkSection) {
      bookmarkSection.classList.remove("hidden");
      bookmarkSection.style.display = "block";
    }
    if (loginGuide) loginGuide.classList.add("hidden");
    // 컬렉션 로드 (옵션)
    if (shouldLoadCollections) {
      loadCollections();
    }
  } else {
    // 로그아웃 상태
    if (userEmailSpan) {
      userEmailSpan.textContent = "";
      userEmailSpan.style.display = "none";
    }
    if (loginSection) {
      loginSection.classList.remove("hidden");
      loginSection.style.display = "block";
    }
    if (bookmarkSection) {
      bookmarkSection.classList.add("hidden");
      bookmarkSection.style.display = "none";
    }
    if (loginGuide) loginGuide.classList.remove("hidden");
    collections = [];
  }
}

// ========================
// 5. 컬렉션 관련 함수
// ========================

// 5-1. 컬렉션 목록 로드
async function loadCollections() {
  if (isLoadingCollections) {
    console.log("⏳ Collections already loading, skip");
    return;
  }

  isLoadingCollections = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_COLLECTIONS" });

    if (response?.ok && response.collections) {
      collections = response.collections;
      updateCollectionSelect();
      console.log("✅ Collections loaded:", collections.length);
    } else if (!response?.ok && response?.error?.includes("로그인이 필요")) {
      // 로그인이 필요한 경우 로그인 UI로 전환
      updateUI(null);
    }
  } catch (error) {
    console.error("Failed to load collections:", error);
  } finally {
    isLoadingCollections = false;
  }
}

// 5-2. 컬렉션 선택 드롭다운 업데이트
function updateCollectionSelect(selectedId = "") {
  if (!dropdownOptions) return;
  dropdownOptions.innerHTML = "";
  collections.forEach(collection => {
    const option = document.createElement("div");
    option.className = "dropdown-option" + (selectedId === collection.id ? " selected" : "");
    option.dataset.value = collection.id;
    option.innerHTML = `<span>${collection.icon || "📁"}</span> <span>${collection.name}</span>`;
    option.addEventListener("click", () => {
      dropdownSelectedText.textContent = `${collection.icon || "📁"} ${collection.name}`;
      dropdownOptions.classList.add("hidden");
      dropdownSelected.classList.remove("active");
      dropdownSelected.dataset.value = collection.id;
    });
    dropdownOptions.appendChild(option);
  });
  // 컬렉션 추가 옵션
  const addOption = document.createElement("div");
  addOption.className = "dropdown-option add";
  addOption.dataset.value = "__add_collection__";
  addOption.textContent = "+ 새 컬렉션 추가";
  addOption.addEventListener("click", () => {
    dropdownOptions.classList.add("hidden");
    dropdownSelected.classList.remove("active");
    if (addCollectionModal) addCollectionModal.classList.remove("hidden");
    if (collectionNameInput) collectionNameInput.value = "";
    if (collectionIconInput) collectionIconInput.value = "📁";
  });
  dropdownOptions.appendChild(addOption);
}

// ========================
// 6. 태그 관련 함수
// ========================

// 6-1. 태그 추가 (단일 태그)
function addTag(tag) {
  const trimmed = tag.trim();
  if (trimmed && !tags.includes(trimmed)) {
    tags.push(trimmed);
    renderTags();
  }
}

// 6-2. 여러 태그 추가 (쉼표로 분리)
function addMultipleTags(input) {
  const newTags = input
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0 && !tags.includes(t));

  if (newTags.length > 0) {
    tags.push(...newTags);
    renderTags();
  }
}

// 6-3. 태그 제거
function removeTag(tagToRemove) {
  tags = tags.filter(tag => tag !== tagToRemove);
  renderTags();
}

// 6-4. 태그 렌더링
function renderTags() {
  tagsDisplay.innerHTML = "";
  tags.forEach(tag => {
    const tagElement = document.createElement("span");
    tagElement.className = "tag-item";
    tagElement.innerHTML = `
      ${tag}
      <span class="tag-remove" data-tag="${tag}">×</span>
    `;
    tagsDisplay.appendChild(tagElement);
  });
}

// ========================
// 7. 이벤트 리스너 등록
// ========================

// 7-1. 로그인 버튼
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const dashboardUrl = `${PUBLIC_SIGN_URL}&extensionId=${chrome.runtime.id}`;
    chrome.tabs.create({ url: dashboardUrl });
  });
}

// 7-2. 북마크 저장 버튼
if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      showToast("현재 탭 URL을 찾을 수 없습니다.", "error");
      return;
    }

    // 저장 버튼 로딩 상태 표시
    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `<span class="animate-spin mr-2" style="display:inline-block;vertical-align:middle;">
      <svg class="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
    </span>저장중...`;

    // 선택된 컬렉션 ID
    const selectedCollectionId = dropdownSelected.dataset.value || null;
    const description = descriptionInput.value.trim();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_BOOKMARK",
        payload: {
          url: tab.url,
          title: tab.title || "",
          collectionId: selectedCollectionId,
          description: description,
          tags: tags,
          favicon: tab.favIconUrl || "",
        },
      });

      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        showToast("북마크 저장 요청 실패", "error");
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
      }

      if (!response || !response.ok) {
        const errorMessage = response?.error || "북마크 저장 실패";
        showToast(errorMessage, "error");

        // 로그인이 필요한 경우 로그인 UI로 전환
        if (errorMessage.includes("로그인이 필요")) {
          updateUI(null);
        }

        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
      }

      // 저장 성공 시 태그, 설명, 컬렉션 선택 초기화
      tags = [];
      renderTags();
      descriptionInput.value = "";

      // 컬렉션 선택 초기화
      if (dropdownSelectedText) {
        const lang = getCurrentLanguage();
        dropdownSelectedText.textContent = languageTexts[lang]?.collectionSelect || "컬렉션 선택...";
      }
      if (dropdownSelected) {
        dropdownSelected.dataset.value = "";
      }

      showToast("북마크가 저장되었습니다!", "success");
      setTimeout(() => {
        // 북마크 저장 후에는 컬렉션을 다시 로드할 필요 없음
        updateUI(currentUser, false);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
      }, 1000);
    } catch (error) {
      console.error("Save error:", error);
      showToast("북마크 저장 오류", "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });
}

// 7-3. 컬렉션 선택 드롭다운
if (dropdownSelected) {
  dropdownSelected.addEventListener("click", () => {
    dropdownOptions.classList.toggle("hidden");
    dropdownSelected.classList.toggle("active");
  });
  // 외부 클릭 시 닫기
  document.addEventListener("click", (e) => {
    if (!collectionDropdown.contains(e.target)) {
      dropdownOptions.classList.add("hidden");
      dropdownSelected.classList.remove("active");
    }
  });
}

// 7-4. 컬렉션 추가 모달 - 취소 버튼
if (cancelCollectionBtn) {
  cancelCollectionBtn.addEventListener("click", () => {
    if (addCollectionModal) addCollectionModal.classList.add("hidden");
  });
}

// 7-5. 컬렉션 추가 모달 - 확인 버튼
if (confirmCollectionBtn) {
  confirmCollectionBtn.addEventListener("click", async () => {
    const name = collectionNameInput?.value.trim();
    const icon = collectionIconInput?.value.trim() || "📁";
    if (!name) {
      showToast("컬렉션 이름을 입력하세요.", "error");
      return;
    }
    confirmCollectionBtn.disabled = true;
    confirmCollectionBtn.textContent = "추가 중...";
    try {
      const response = await chrome.runtime.sendMessage({
        type: "ADD_COLLECTION",
        payload: { name, icon },
      });
      if (response?.ok) {
        showToast("컬렉션이 추가되었습니다!", "success");
        if (addCollectionModal) addCollectionModal.classList.add("hidden");
        await loadCollections();
      } else {
        showToast(response?.error || "컬렉션 추가 실패", "error");
      }
    } catch (e) {
      showToast("컬렉션 추가 오류", "error");
    } finally {
      confirmCollectionBtn.disabled = false;
      confirmCollectionBtn.textContent = "추가";
    }
  });
}

// 7-6. 태그 입력
if (tagInput) {
  // Enter 키로 태그 추가
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      const value = tagInput.value.trim();
      if (value) {
        // 쉼표가 포함되어 있으면 여러 태그로 처리
        if (value.includes(',')) {
          addMultipleTags(value);
        } else {
          addTag(value);
        }
        tagInput.value = "";
      }
    }
  });

  // 쉼표 입력 시 즉시 태그 추가
  tagInput.addEventListener("input", (e) => {
    const value = e.target.value;
    if (value.includes(',')) {
      // 쉼표 이전 텍스트를 태그로 추가
      const parts = value.split(',');
      // 마지막 부분을 제외하고 모두 태그로 추가
      for (let i = 0; i < parts.length - 1; i++) {
        addTag(parts[i]);
      }
      // 마지막 부분(쉼표 이후 입력 중인 텍스트)만 남김
      e.target.value = parts[parts.length - 1];
    }
  });
}

// 7-7. 태그 제거 (이벤트 위임)
if (tagsDisplay) {
  tagsDisplay.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const tagToRemove = e.target.getAttribute("data-tag");
      removeTag(tagToRemove);
    }
  });
}

// 7-8. 테마 토글
if (themeToggle && !themeToggle._themeHandlerAdded) {
  themeToggle.addEventListener("click", toggleTheme);
  themeToggle._themeHandlerAdded = true;
}

// 7-9. 언어 설정 버튼
if (languageSettingsBtn) {
  languageSettingsBtn.addEventListener("click", () => {
    const languageModal = document.getElementById("languageModal");
    if (languageModal) languageModal.classList.remove("hidden");
  });
}

// 7-10. 언어 모달 - 취소 버튼
if (languageCancelBtn) {
  languageCancelBtn.addEventListener("click", () => {
    const languageModal = document.getElementById("languageModal");
    if (languageModal) languageModal.classList.add("hidden");
  });
}

// 7-11. 언어 모달 - 저장 버튼
if (languageSaveBtn) {
  languageSaveBtn.addEventListener("click", () => {
    const selected = document.querySelector('input[name="language"]:checked');
    if (selected) {
      localStorage.setItem("language", selected.value);
      applyLanguageUI(selected.value);
    }
    const languageModal = document.getElementById("languageModal");
    if (languageModal) languageModal.classList.add("hidden");
  });
}

// 7-12. 백그라운드에서 오는 인증 상태 변경 수신
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AUTH_STATE_CHANGED") {
    updateUI(msg.user);
  }
});

// ========================
// 8. 초기화
// ========================

// 8-1. 페이지 로드 시 초기화
(async () => {
  // 현재 탭 URL 표시 (100자 초과 시 ... 처리)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    let displayUrl = tab.url;
    if (displayUrl.length > 100) {
      displayUrl = displayUrl.slice(0, 100) + '...';
    }
    currentUrlDiv.textContent = displayUrl;
    currentUrlDiv.setAttribute('href', tab.url);
    currentUrlDiv.setAttribute('title', tab.url);
  }

  // 인증 상태 요청
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
})();

// 8-2. 페이지 로드 시 테마 적용 (중복 방지)
if (!window._themeApplied) {
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
  window._themeApplied = true;
}

// 8-3. 페이지 로드 시 i18n.json 불러오고 언어 적용
(async function () {
  await loadLanguageTexts();
  applyLanguageUI(getCurrentLanguage());
})();
