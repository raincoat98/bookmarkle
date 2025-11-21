const DEFAULT_START_PAGE_URL = "https://bookmarkhub-5ea6c.web.app";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isAllowedUrl(value) {
  if (typeof value !== "string" || !value.trim().length) {
    return false;
  }

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

async function resolveStartUrl() {
  try {
    const { customStartUrl } = await chrome.storage.local.get([
      "customStartUrl",
    ]);
    if (isAllowedUrl(customStartUrl)) {
      return customStartUrl;
    }
  } catch (error) {
    console.warn("시작 페이지 조회 실패 - 기본값 사용:", error);
  }

  return DEFAULT_START_PAGE_URL;
}

function performRedirect(targetUrl) {
  try {
    if (document.visibilityState === "prerender") {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.visibilityState === "visible") {
            window.location.replace(targetUrl);
          }
        },
        { once: true }
      );
      return;
    }

    window.location.replace(targetUrl);
  } catch (error) {
    console.error("시작 페이지 전환 실패:", error);
  }
}

async function handleNewTabRedirect() {
  const targetUrl = await resolveStartUrl();
  performRedirect(targetUrl);
}

document.addEventListener("DOMContentLoaded", handleNewTabRedirect, {
  once: true,
});
