import { ensureFreshToken } from "./auth.js";
import { currentUser, currentIdToken } from "./state.js";
import { addFirestoreDocument } from "./firestore.js";
import { sendBookmarkSavedNotification } from "./notifications.js";
import { getFaviconUrl } from "./utils.js";

// 북마크 저장 처리
export async function handleSaveBookmark(request, sendResponse) {
  try {
    console.log("📚 북마크 저장 요청 처리 시작");

    const tokenReady = await ensureFreshToken();

    if (!tokenReady || !currentUser || !currentUser.uid) {
      sendResponse({
        success: false,
        error: !currentUser ? "확장 프로그램에서 먼저 로그인해주세요." : "인증이 만료되었습니다. 다시 로그인해주세요.",
      });
      return;
    }

    // 2. 현재 활성 탭 정보 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || tabs.length === 0) {
      sendResponse({
        success: false,
        error: "현재 탭 정보를 가져올 수 없습니다.",
      });
      return;
    }

    const currentTab = tabs[0];

    // 3. 탭 정보 검증
    if (!currentTab.url || !currentTab.title) {
      sendResponse({
        success: false,
        error: "현재 페이지의 URL 또는 제목을 가져올 수 없습니다.",
      });
      return;
    }

    // chrome:// 또는 edge:// 등 특수 URL 차단
    if (
      currentTab.url.startsWith("chrome://") ||
      currentTab.url.startsWith("edge://") ||
      currentTab.url.startsWith("about:")
    ) {
      sendResponse({
        success: false,
        error: "이 페이지는 북마크할 수 없습니다.",
      });
      return;
    }

    console.log("📋 현재 탭 정보:", {
      title: currentTab.title,
      url: currentTab.url,
    });

    // 4. 북마크 데이터 준비
    const favicon = getFaviconUrl(currentTab.url);
    const extraData = request?.bookmarkData || {};
    const bookmarkData = {
      title: currentTab.title,
      url: currentTab.url,
      favicon: favicon,
      userId: currentUser.uid,
      description: extraData.description || "",
      collection:
        typeof extraData.collection === "string" && extraData.collection.length
          ? extraData.collection
          : null,
      tags: Array.isArray(extraData.tags)
        ? extraData.tags.filter(
            (tag) => typeof tag === "string" && tag.trim().length > 0
          )
        : [],
    };

    console.log("✅ 북마크 데이터 준비 완료, Firestore REST API 호출");

    if (!currentIdToken) {
      sendResponse({
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      });
      return;
    }

    // 5. Firestore REST API로 북마크 저장
    try {
      console.log("📤 Firestore REST API로 북마크 저장 요청 전송 중...");

      // Timestamp 생성
      const now = new Date();
      const bookmarkDataToSave = {
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description,
        favicon: bookmarkData.favicon,
        collection: bookmarkData.collection,
        order: 0,
        userId: bookmarkData.userId,
        createdAt: now,
        updatedAt: now,
        tags: bookmarkData.tags,
        isFavorite: false,
      };

      const response = await addFirestoreDocument(
        "bookmarks",
        bookmarkDataToSave,
        currentIdToken
      );

      const bookmarkId = response.name?.split("/").pop();
      console.log("✅ 북마크 저장 완료, ID:", bookmarkId);

      // 북마크 알림 및 시스템 알림 처리 (설정 확인 후)
      await sendBookmarkSavedNotification(
        bookmarkId,
        bookmarkData.title,
        bookmarkData.url
      );

      sendResponse({
        success: true,
        bookmarkId: bookmarkId,
      });
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
      return { success: false, error: !currentUser ? "로그인이 필요합니다." : "인증이 만료되었습니다. 다시 로그인해주세요." };
    }

    // 현재 활성 탭 정보 가져오기
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      return { success: false, error: "현재 탭 정보를 가져올 수 없습니다." };
    }

    const currentTab = tabs[0];

    // 탭 정보 검증
    if (!currentTab.url || !currentTab.title) {
      return {
        success: false,
        error: "현재 페이지의 URL 또는 제목을 가져올 수 없습니다.",
      };
    }

    // chrome:// 또는 edge:// 등 특수 URL 차단
    if (
      currentTab.url.startsWith("chrome://") ||
      currentTab.url.startsWith("edge://") ||
      currentTab.url.startsWith("about:")
    ) {
      return { success: false, error: "이 페이지는 북마크할 수 없습니다." };
    }

    // 북마크 데이터 준비
    const favicon = getFaviconUrl(currentTab.url);
    const now = new Date();
    const bookmarkDataToSave = {
      title: currentTab.title,
      url: currentTab.url,
      description: "",
      favicon: favicon,
      collection: null,
      order: 0,
      userId: currentUser.uid,
      createdAt: now,
      updatedAt: now,
      tags: [],
      isFavorite: false,
    };

    if (!currentIdToken) {
      return {
        success: false,
        error: "인증 토큰이 없습니다. 다시 로그인해주세요.",
      };
    }

    // Firestore REST API로 북마크 저장
    const response = await addFirestoreDocument(
      "bookmarks",
      bookmarkDataToSave,
      currentIdToken
    );

    const bookmarkId = response.name?.split("/").pop();
    console.log("✅ 빠른 실행 모드: 북마크 저장 완료, ID:", bookmarkId);

    // 북마크 알림 및 시스템 알림 처리 (설정 확인 후)
    await sendBookmarkSavedNotification(
      bookmarkId,
      bookmarkDataToSave.title,
      bookmarkDataToSave.url
    );

    return { success: true, bookmarkId: bookmarkId };
  } catch (error) {
    console.error("❌ 빠른 실행 모드 북마크 저장 실패:", error);
    return {
      success: false,
      error: error.message || "북마크 저장 중 오류가 발생했습니다.",
    };
  }
}
