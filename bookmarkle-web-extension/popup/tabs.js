// 탭 관련 유틸리티
export function queryActiveTab() {
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

export async function loadCurrentTabInfo() {
  try {
    const tabs = await queryActiveTab();
    if (tabs && tabs.length > 0) {
      return tabs[0];
    }
    return null;
  } catch (error) {
    console.error("현재 탭 정보 로드 실패:", error);
    throw error;
  }
}

export function openExternalLink(url) {
  chrome.tabs.create({ url });
}

