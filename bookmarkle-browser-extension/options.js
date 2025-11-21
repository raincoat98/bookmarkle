const DEFAULT_START_PAGE_URL = "https://bookmarkhub-5ea6c.web.app";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const form = document.getElementById("startPageForm");
const urlInput = document.getElementById("startPageUrl");
const resetButton = document.getElementById("resetButton");
const statusBox = document.getElementById("status");
const currentUrlLink = document.getElementById("currentUrlLink");
const newTabToggle = document.getElementById("newTabToggle");
const urlInputContainer = document.getElementById("urlInputContainer");
const copyTriggers = document.querySelectorAll(".copy-trigger[data-copy-text]");
const CLIPBOARD_FEEDBACK_DELAY = 1000;

async function copyToClipboard(text) {
  if (!text) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.opacity = "0";
      helper.style.pointerEvents = "none";
      helper.style.zIndex = "-1";
      document.body.appendChild(helper);
      helper.select();
      const succeeded = document.execCommand("copy");
      document.body.removeChild(helper);
      return succeeded;
    } catch (fallbackError) {
      console.error("클립보드 복사 실패:", fallbackError);
      return false;
    }
  }
}

function attachKeyboardActivation(element) {
  if (element.tagName === "BUTTON") {
    return;
  }

  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      element.click();
    }
  });
}

function showClipboardFeedback(element, succeeded) {
  if (!element.dataset.originalText) {
    element.dataset.originalText = element.textContent;
  }

  const timeoutId = element.dataset.clipboardTimeoutId;
  if (timeoutId) {
    window.clearTimeout(Number(timeoutId));
  }

  const successText = element.dataset.copiedText || "복사됨!";
  const errorText = element.dataset.copyErrorText || "복사 실패";
  element.textContent = succeeded ? successText : errorText;

  const newTimeoutId = window.setTimeout(() => {
    element.textContent = element.dataset.originalText || "";
    element.dataset.clipboardTimeoutId = "";
  }, CLIPBOARD_FEEDBACK_DELAY);

  element.dataset.clipboardTimeoutId = String(newTimeoutId);
}

function bindClipboardTriggers() {
  copyTriggers.forEach((trigger) => {
    attachKeyboardActivation(trigger);
    trigger.addEventListener("click", async () => {
      const text = trigger.dataset.copyText;
      const succeeded = await copyToClipboard(text);
      showClipboardFeedback(trigger, succeeded);
    });
  });
}

function syncUrlInputState(isEnabled) {
  if (!urlInput) {
    return;
  }

  const disabled = !isEnabled;
  urlInput.disabled = disabled;
  urlInput.setAttribute("aria-disabled", String(disabled));

  if (urlInputContainer) {
    urlInputContainer.classList.toggle("disabled", disabled);
  }

  if (disabled) {
    urlInput.value = DEFAULT_START_PAGE_URL;
  }
}

function isAllowedUrl(value) {
  try {
    const parsed = new URL(value);
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return true;
    }

    if (
      parsed.protocol === "chrome-extension:" &&
      parsed.origin === `chrome-extension://${chrome.runtime.id}`
    ) {
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
}

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status show ${type}`;
}

function clearStatus() {
  statusBox.textContent = "";
  statusBox.className = "status";
}

function updateCurrentLink(url) {
  currentUrlLink.textContent = url;
  currentUrlLink.href = url;
}

async function loadSettings() {
  try {
    const { customStartUrl, overrideNewTab } = await chrome.storage.local.get([
      "customStartUrl",
      "overrideNewTab",
    ]);
    const resolvedUrl =
      customStartUrl && isAllowedUrl(customStartUrl)
        ? customStartUrl
        : DEFAULT_START_PAGE_URL;
    const overrideEnabled = Boolean(overrideNewTab);

    if (newTabToggle) {
      newTabToggle.checked = overrideEnabled;
    }

    syncUrlInputState(overrideEnabled);

    const displayUrl = overrideEnabled ? resolvedUrl : DEFAULT_START_PAGE_URL;

    urlInput.value = displayUrl;
    updateCurrentLink(displayUrl);

    clearStatus();
  } catch (error) {
    console.error("옵션 불러오기 실패:", error);
    setStatus(
      "설정을 불러오지 못했습니다. 잠시 뒤 다시 시도해주세요.",
      "error"
    );
  }
}

async function persistUrl(url) {
  if (!url || url === DEFAULT_START_PAGE_URL) {
    await chrome.storage.local.remove("customStartUrl");
    return DEFAULT_START_PAGE_URL;
  }

  await chrome.storage.local.set({ customStartUrl: url });
  return url;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rawValue = (urlInput.value || "").trim();

  const overrideEnabled = newTabToggle ? newTabToggle.checked : true;
  const candidate =
    overrideEnabled && rawValue.length ? rawValue : DEFAULT_START_PAGE_URL;

  if (!isAllowedUrl(candidate)) {
    setStatus(
      "유효한 URL을 입력해주세요. http:// 또는 https:// 로 시작해야 합니다.",
      "error"
    );
    urlInput.focus();
    return;
  }

  try {
    const savedUrl = await persistUrl(candidate);
    updateCurrentLink(savedUrl);
    setStatus(
      overrideEnabled
        ? "저장되었습니다. 새 탭에 즉시 적용됩니다."
        : "북마클 대시보드가 새 탭에서 열립니다.",
      overrideEnabled ? "success" : "info"
    );
  } catch (error) {
    console.error("옵션 저장 실패:", error);
    setStatus("저장에 실패했습니다. 다시 시도해주세요.", "error");
  }
});

if (newTabToggle) {
  newTabToggle.addEventListener("change", async (event) => {
    const enabled = event.target.checked;
    try {
      await chrome.storage.local.set({ overrideNewTab: enabled });
      syncUrlInputState(enabled);

      if (!enabled) {
        updateCurrentLink(DEFAULT_START_PAGE_URL);
      }

      setStatus(
        enabled
          ? "새 탭이 이 페이지로 열리도록 설정되었습니다."
          : "북마클 대시보드가 새 탭에서 열립니다.",
        enabled ? "success" : "info"
      );
    } catch (error) {
      console.error("새 탭 설정 저장 실패:", error);
      event.target.checked = !enabled;
      setStatus("설정을 저장하지 못했습니다. 다시 시도해주세요.", "error");
      syncUrlInputState(!enabled);
    }
  });
}

resetButton.addEventListener("click", async () => {
  try {
    await persistUrl(DEFAULT_START_PAGE_URL);

    const removals = [];
    if (newTabToggle) {
      newTabToggle.checked = false;
      removals.push("overrideNewTab");
    }
    if (removals.length) {
      await chrome.storage.local.remove(removals);
    }

    urlInput.value = DEFAULT_START_PAGE_URL;
    updateCurrentLink(DEFAULT_START_PAGE_URL);
    syncUrlInputState(false);
    setStatus("북마클 대시보드가 새 탭에서 열립니다.", "success");
  } catch (error) {
    console.error("기본값 복원 실패:", error);
    setStatus("기본값 복원에 실패했습니다. 다시 시도해주세요.", "error");
  }
});

urlInput.addEventListener("input", () => {
  clearStatus();
});

document.addEventListener("DOMContentLoaded", loadSettings);
bindClipboardTriggers();
