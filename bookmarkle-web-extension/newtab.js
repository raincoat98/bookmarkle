const DEFAULT_URL = "https://bookmarkhub-5ea6c.web.app";

// 저장된 설정 로드 및 리다이렉트
chrome.storage.local.get(["customNewTabUrl"], (result) => {
  const customUrl = result.customNewTabUrl?.trim() || "";
  const targetUrl = customUrl || DEFAULT_URL;

  // 직접 리다이렉트하여 주소창에 실제 URL이 표시되도록
  window.location.href = targetUrl;
});
