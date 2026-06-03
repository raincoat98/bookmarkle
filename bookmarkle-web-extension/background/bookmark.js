import { ensureFreshToken } from "./auth.js";
import { currentUser, currentIdToken } from "./state.js";
import { addFirestoreDocument } from "./firestore.js";
import { sendBookmarkSavedNotification } from "./notifications.js";
import { getFaviconUrl } from "./utils.js";

async function getValidatedTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    return { error: "현재 탭 정보를 가져올 수 없습니다." };
  }
  const tab = tabs[0];
  if (!tab.url || !tab.title) {
    return { error: "현재 페이지의 URL 또는 제목을 가져올 수 없습니다." };
  }
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    return { error: "이 페이지는 북마크할 수 없습니다." };
  }
  return { tab };
}

function buildBookmarkData(tab, userId, extraData = {}) {
  const now = new Date();
  return {
    title: tab.title,
    url: tab.url,
    description: extraData.description || "",
    favicon: getFaviconUrl(tab.url),
    collection:
      typeof extraData.collection === "string" && extraData.collection.length
        ? extraData.collection
        : null,
    order: 0,
    userId,
    createdAt: now,
    updatedAt: now,
    tags: Array.isArray(extraData.tags)
      ? extraData.tags.filter(
          (tag) => typeof tag === "string" && tag.trim().length > 0
        )
      : [],
    isFavorite: false,
  };
}

// 북마크 저장 처리
export async function handleSaveBookmark(request, sendResponse) {
  try {
    console.log("📚 북마크 저장 요청 처리 시작");

    const tokenReady = await ensureFreshToken();
    if (!tokenReady || !currentUser || !currentUser.uid) {
      sendResponse({
        success: false,
        error: !currentUser
          ? "확장 프로그램에서 먼저 로그인해주세요."
          : "인증이 만료되었습니다. 다시 로그인해주세요.",
      });
      return;
    }

    const { tab, error: tabError } = await getValidatedTab();
    if (tabError) {
      sendResponse({ success: false, error: tabError });
      return;
    }

    console.log("📋 현재 탭 정보:", { title: tab.title, url: tab.url });

    if (!currentIdToken) {
      sendResponse({
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      });
      return;
    }

    try {
      console.log("📤 Firestore REST API로 북마크 저장 요청 전송 중...");
      const bookmarkDataToSave = buildBookmarkData(
        tab,
        currentUser.uid,
        request?.bookmarkData
      );
      const response = await addFirestoreDocument(
        "bookmarks",
        bookmarkDataToSave,
        currentIdToken
      );

      const bookmarkId = response.name?.split("/").pop();
      console.log("✅ 북마크 저장 완료, ID:", bookmarkId);

      await sendBookmarkSavedNotification(
        bookmarkId,
        bookmarkDataToSave.title,
        bookmarkDataToSave.url
      );

      sendResponse({ success: true, bookmarkId });
    } catch (error) {
      console.error("❌ Firestore 문서 추가 실패:", error);
      sendResponse({
        success: false,
        error: error.message || "북마크 저장 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    console.error("❌ handleSaveBookmark 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "북마크 저장 중 오류가 발생했습니다.",
    });
  }
}

// 빠른 실행 모드로 북마크 저장 (popup 없이)
export async function quickSaveBookmark() {
  try {
    const tokenReady = await ensureFreshToken();
    if (!tokenReady || !currentUser || !currentUser.uid) {
      console.log("⚠️ 빠른 실행 모드: 로그인되지 않음 또는 토큰 만료");
      return {
        success: false,
        error: !currentUser
          ? "로그인이 필요합니다."
          : "인증이 만료되었습니다. 다시 로그인해주세요.",
      };
    }

    const { tab, error: tabError } = await getValidatedTab();
    if (tabError) {
      return { success: false, error: tabError };
    }

    if (!currentIdToken) {
      return {
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      };
    }

    const bookmarkDataToSave = buildBookmarkData(tab, currentUser.uid);
    const response = await addFirestoreDocument(
      "bookmarks",
      bookmarkDataToSave,
      currentIdToken
    );

    const bookmarkId = response.name?.split("/").pop();
    console.log("✅ 빠른 실행 모드: 북마크 저장 완료, ID:", bookmarkId);

    await sendBookmarkSavedNotification(
      bookmarkId,
      bookmarkDataToSave.title,
      bookmarkDataToSave.url
    );

    return { success: true, bookmarkId };
  } catch (error) {
    console.error("❌ 빠른 실행 모드 북마크 저장 실패:", error);
    return {
      success: false,
      error: error.message || "북마크 저장 중 오류가 발생했습니다.",
    };
  }
}
