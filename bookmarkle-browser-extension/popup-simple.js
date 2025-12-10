// 토스트 메시지 표시 함수
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "";
  toast.classList.add("show");
  if (type === "error") {
    toast.style.background = "#ef4444";
    toast.style.color = "#fff";
    toast.style.borderLeftColor = "#ef4444";
  } else {
    toast.style.background = "#10b981";
    toast.style.color = "#fff";
    toast.style.borderLeftColor = "#10b981";
  }
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
// popup.js
const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

const loginBtn = document.getElementById("login-btn");
const saveBtn = document.getElementById("save-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginGuide = document.getElementById("loginGuide");
const userEmailSpan = document.getElementById("user-email");
const loginSection = document.getElementById("login-section");
const bookmarkSection = document.getElementById("bookmark-section");
const currentUrlDiv = document.getElementById("current-url");
const collectionSelect = document.getElementById("collection-select");
const descriptionInput = document.getElementById("description-input");
const tagInput = document.getElementById("tag-input");
const tagsDisplay = document.getElementById("tags-display");

let currentUser = null;
let collections = [];
let isLoadingCollections = false; // 로딩 상태 플래그
let tags = []; // 태그 배열

// UI 업데이트 함수
function updateUI(user) {
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
    // 컬렉션 로드
    loadCollections();
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

// 컬렉션 목록 로드
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
    }
  } catch (error) {
    console.error("Failed to load collections:", error);
  } finally {
    isLoadingCollections = false;
  }
}

// 컬렉션 선택 드롭다운 업데이트
function updateCollectionSelect() {
  // 기존 옵션 제거 (첫 번째 "선택..." 옵션 제외)
  while (collectionSelect.options.length > 1) {
    collectionSelect.remove(1);
  }
  
  // 컬렉션 옵션 추가
  collections.forEach(collection => {
    const option = document.createElement("option");
    option.value = collection.id;
    option.textContent = `${collection.icon || "📁"} ${collection.name}`;
    collectionSelect.appendChild(option);
  });
}

// 태그 추가
function addTag(tag) {
  const trimmedTag = tag.trim();
  if (!trimmedTag || tags.includes(trimmedTag)) return;
  
  tags.push(trimmedTag);
  renderTags();
  tagInput.value = "";
}

// 태그 제거
function removeTag(tagToRemove) {
  tags = tags.filter(tag => tag !== tagToRemove);
  renderTags();
}

// 태그 렌더링
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

// 태그 입력 이벤트
if (tagInput) {
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput.value);
    }
  });
}

// 태그 제거 이벤트 (이벤트 위임)
if (tagsDisplay) {
  tagsDisplay.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const tagToRemove = e.target.getAttribute("data-tag");
      removeTag(tagToRemove);
    }
  });
}
// 페이지 로드 시 초기화
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

  // 인증 상태 요청 - offscreen으로 직접 요청
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

// 로그인 버튼 클릭 -> 웹 대시보드 열기
loginBtn.addEventListener("click", () => {
  // 웹 대시보드 URL에 extension 파라미터 추가
  const dashboardUrl = `${PUBLIC_SIGN_URL}&&extensionId=${chrome.runtime.id}`;

  // 새 탭으로 열기
  chrome.tabs.create({ url: dashboardUrl });
});

// 로그아웃 버튼 클릭

// ...existing code...
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
  const selectedCollectionId = collectionSelect.value || null;
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
      showToast(response?.error || "북마크 저장 실패", "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
      return;
    }

    // 저장 성공 시 태그와 설명 초기화
    tags = [];
    renderTags();
    descriptionInput.value = "";
    showToast("북마크가 저장되었습니다!", "success");
    setTimeout(() => {
      updateUI(currentUser);
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

// background / offscreen에서 오는 로그인 상태 변경 수신
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AUTH_STATE_CHANGED") {
    updateUI(msg.user);
  }
  // BOOKMARK_SAVED, BOOKMARK_ERROR 리스너 제거 (응답으로 처리)
});