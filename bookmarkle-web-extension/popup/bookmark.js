import { elements } from "./dom.js";
import { t } from "./i18n.js";
import { updateStatus } from "./status.js";
import { loadCurrentTabInfo } from "./tabs.js";
import { getTags } from "./tags.js";
import { getCollections, showCollectionModal } from "./collection.js";

let isSaving = false;
let userIsLoggedIn = false;
let currentTabInfo = null;

export function setUserLoggedIn(isLoggedIn) {
  userIsLoggedIn = isLoggedIn;
}

export function setSaveButtonState() {
  const { saveBookmarkBtn } = elements;
  if (!saveBookmarkBtn) return;
  saveBookmarkBtn.disabled = !userIsLoggedIn || isSaving;
}

export async function saveCurrentPageBookmark() {
  if (isSaving) return;
  if (!userIsLoggedIn) {
    updateStatus(await t("common.loginRequired"), "error");
    return;
  }

  currentTabInfo = await loadCurrentTabInfo();
  if (!currentTabInfo || !currentTabInfo.url || !currentTabInfo.title) {
    updateStatus(await t("common.pageInfoError"), "error");
    return;
  }

  const { selectedCollectionId, collectionInput, memoTextarea } = elements;
  let collectionId = selectedCollectionId?.value || null;
  let collectionName = collectionInput?.value?.trim() || "";

  if (collectionName) {
    const parts = collectionName.split(/\s+/);
    if (parts.length > 1 && parts[0].length === 1) {
      collectionName = parts.slice(1).join(" ");
    }
  }

  if (collectionName && !collectionId) {
    const collections = getCollections();
    const existingCollection = collections.find(
      (col) => col.name.toLowerCase() === collectionName.toLowerCase()
    );

    if (existingCollection) {
      collectionId = existingCollection.id;
    } else {
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
    tags: getTags(),
  };

  isSaving = true;
  setSaveButtonState();
  const { saveBookmarkBtn } = elements;
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

export async function copyCurrentUrl() {
  const { currentPageInput } = elements;
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

export async function loadCurrentTabInfoToInput() {
  try {
    currentTabInfo = await loadCurrentTabInfo();
    if (currentTabInfo && elements.currentPageInput) {
      elements.currentPageInput.value = currentTabInfo.url || "";
    }
  } catch (error) {
    console.error("현재 탭 정보 로드 실패:", error);
    updateStatus("현재 탭 정보를 가져오지 못했습니다.", "error");
  }
}
