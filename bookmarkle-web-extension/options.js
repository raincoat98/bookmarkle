const DEFAULT_URL = "https://www.bookmarkle.app";

const customUrlInput = document.getElementById("customUrl");
const copyDefaultBtn = document.getElementById("copyDefaultBtn");
const defaultUrlSpan = document.getElementById("defaultUrl");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const currentUrlSpan = document.getElementById("currentUrl");

// 저장된 설정 로드
function loadSettings() {
  chrome.storage.local.get(["customNewTabUrl"], (result) => {
    const customUrl = result.customNewTabUrl || "";

    if (customUrlInput) {
      customUrlInput.value = customUrl;
    }
    if (defaultUrlSpan) {
      defaultUrlSpan.textContent = DEFAULT_URL;
    }
    updateCurrentUrl();
  });
}

// 현재 적용 URL 업데이트
function updateCurrentUrl() {
  chrome.storage.local.get(["customNewTabUrl"], (result) => {
    const customUrl = result.customNewTabUrl || "";
    const appliedUrl = customUrl.trim() || DEFAULT_URL;

    if (currentUrlSpan) {
      currentUrlSpan.textContent = appliedUrl;
    }
  });
}

// URL 유효성 검사
function isValidUrl(url) {
  if (!url || !url.trim()) return true; // 빈 값은 허용 (기본값 사용)
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

// 설정 저장
function saveSettings() {
  const customUrl = customUrlInput?.value.trim() || "";

  if (customUrl && !isValidUrl(customUrl)) {
    alert(
      "올바른 URL을 입력해주세요. http:// 또는 https://로 시작해야 합니다."
    );
    return;
  }

  chrome.storage.local.set(
    {
      customNewTabUrl: customUrl,
    },
    () => {
      updateCurrentUrl();
      alert("설정이 저장되었습니다.");
    }
  );
}

// 기본값으로 리셋
function resetToDefault() {
  if (customUrlInput) {
    customUrlInput.value = "";
  }
  chrome.storage.local.set(
    {
      customNewTabUrl: "",
    },
    () => {
      updateCurrentUrl();
      alert("기본값으로 복원되었습니다.");
    }
  );
}

// 기본 URL 복사
function copyDefaultUrl() {
  navigator.clipboard.writeText(DEFAULT_URL).then(() => {
    const originalText = copyDefaultBtn.textContent;
    copyDefaultBtn.textContent = "복사됨!";
    setTimeout(() => {
      copyDefaultBtn.textContent = originalText;
    }, 2000);
  });
}

// 이벤트 리스너
customUrlInput?.addEventListener("input", updateCurrentUrl);
copyDefaultBtn?.addEventListener("click", copyDefaultUrl);
saveBtn?.addEventListener("click", saveSettings);
resetBtn?.addEventListener("click", resetToDefault);

// 초기 로드
loadSettings();
