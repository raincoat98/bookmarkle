// popup.js
const PUBLIC_SIGN_URL = "_PUBLIC_SIGN_URL_";

const loginBtn = document.getElementById("login-btn");
const saveBtn = document.getElementById("save-btn");
const logoutBtn = document.getElementById("logout-btn");
const statusDiv = document.getElementById("status");
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
    statusDiv.textContent = `로그인됨: ${user.email || user.uid}`;
    statusDiv.classList.add("logged-in");
    loginSection.style.display = "none";
    bookmarkSection.style.display = "block";
    
    // 컬렉션 로드
    loadCollections();
  } else {
    // 로그아웃 상태
    statusDiv.textContent = "로그인되지 않음";
    statusDiv.classList.remove("logged-in");
    loginSection.style.display = "block";
    bookmarkSection.style.display = "none";
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
  // 현재 탭 URL 표시
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    currentUrlDiv.textContent = tab.url;
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

  statusDiv.textContent = "로그인 페이지로 이동 중...";
});

// 로그아웃 버튼 클릭
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        statusDiv.textContent = "로그아웃 실패";
      } else {
        statusDiv.textContent = "로그아웃되었습니다";
      }
    });
  });
}

// 현재 탭 북마크 저장
saveBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    statusDiv.textContent = "현재 탭 URL을 찾을 수 없습니다.";
    return;
  }

  statusDiv.textContent = "저장 중...";
  saveBtn.disabled = true;

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
      statusDiv.textContent = "북마크 저장 요청 실패";
      saveBtn.disabled = false;
      return;
    }

    if (!response || !response.ok) {
      statusDiv.textContent = response?.error || "북마크 저장 실패";
      saveBtn.disabled = false;
      return;
    }

    statusDiv.textContent = "북마크 저장 완료 ✅";
    // 저장 성공 시 태그와 설명 초기화
    tags = [];
    renderTags();
    descriptionInput.value = "";
    setTimeout(() => {
      updateUI(currentUser);
      saveBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Save error:", error);
    statusDiv.textContent = "북마크 저장 오류";
    saveBtn.disabled = false;
  }
});

// background / offscreen에서 오는 로그인 상태 변경 수신
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AUTH_STATE_CHANGED") {
    updateUI(msg.user);
  }
  // BOOKMARK_SAVED, BOOKMARK_ERROR 리스너 제거 (응답으로 처리)
});