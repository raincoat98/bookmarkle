import { FIREBASE_PROJECT_ID } from "./constants.js";
import {
  notificationUrlMap,
  currentUser,
  currentIdToken,
} from "./state.js";
import { parseErrorResponse } from "./utils.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  bookmarkNotifications: true,
  systemNotifications: true,
};

// 알림 URL을 메모리 + storage에 저장 (서비스 워커 재시작 후 복원용)
export async function persistNotificationUrl(notificationId, url) {
  notificationUrlMap.set(notificationId, url);
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    const notificationUrls = stored.notificationUrls || {};
    notificationUrls[notificationId] = url;
    await chrome.storage.local.set({ notificationUrls });
  } catch (e) {
    console.warn("⚠️ 알림 URL 저장 실패:", e);
  }
}

// 알림 URL 조회: 메모리 → storage 순으로 fallback
export async function getNotificationUrl(notificationId) {
  const memUrl = notificationUrlMap.get(notificationId);
  if (memUrl) return memUrl;
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    return stored.notificationUrls?.[notificationId] || null;
  } catch {
    return null;
  }
}

// 알림 URL 삭제
export async function deleteNotificationUrl(notificationId) {
  notificationUrlMap.delete(notificationId);
  try {
    const stored = await chrome.storage.local.get(["notificationUrls"]);
    const notificationUrls = stored.notificationUrls || {};
    delete notificationUrls[notificationId];
    await chrome.storage.local.set({ notificationUrls });
  } catch (e) {
    console.warn("⚠️ 알림 URL 삭제 실패:", e);
  }
}

// Firestore 알림 설정 필드 추출 (booleanValue, notifications 필드 fallback)
function getNotificationField(fields, primaryKey) {
  if (fields[primaryKey]?.booleanValue !== undefined) return fields[primaryKey].booleanValue;
  if (fields.notifications?.booleanValue !== undefined) return fields.notifications.booleanValue;
  return true;
}

// Firestore에서 알림 설정 가져오기
export async function getNotificationSettings(uid, idToken) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/settings/main`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        console.log("⚠️ 알림 설정 문서를 찾을 수 없음, 기본값 사용");
        return DEFAULT_NOTIFICATION_SETTINGS;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const fields = data.fields || {};

    return {
      bookmarkNotifications: getNotificationField(fields, "bookmarkNotifications"),
      systemNotifications: getNotificationField(fields, "systemNotifications"),
    };
  } catch (error) {
    console.error("❌ 알림 설정 가져오기 실패:", error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

// 시스템 알림 보내기
export async function sendSystemNotification(
  title,
  message,
  bookmarkUrl = null
) {
  try {
    const notificationId = `bookmark-${Date.now()}`;
    const notificationOptions = {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon48.png"),
      title: title,
      message: message,
      priority: 1,
    };

    if (bookmarkUrl) {
      await persistNotificationUrl(notificationId, bookmarkUrl);
      notificationOptions.buttons = [{ title: "북마크 보기" }];
    }

    await chrome.notifications.create(notificationId, notificationOptions);
    console.log("✅ 시스템 알림 전송 완료:", notificationId);
  } catch (error) {
    console.error("❌ 시스템 알림 전송 실패:", error);
  }
}

// Firestore에 북마크 알림 저장
export async function createBookmarkNotification(
  userId,
  bookmarkId,
  bookmarkTitle,
  idToken
) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications`;

    const now = new Date();
    const notificationData = {
      userId: { stringValue: userId },
      type: { stringValue: "bookmark_added" },
      title: { stringValue: "북마크 추가" },
      message: {
        stringValue: `"${bookmarkTitle}" 북마크가 추가되었습니다`,
      },
      isRead: { booleanValue: false },
      createdAt: { timestampValue: now.toISOString() },
      bookmarkId: bookmarkId
        ? { stringValue: bookmarkId }
        : { nullValue: null },
      metadata: { nullValue: null },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: notificationData }),
    });

    if (!response.ok) {
      throw new Error(`Firestore 알림 저장 오류: ${await parseErrorResponse(response)}`);
    }

    const data = await response.json();
    const notificationId = data.name?.split("/").pop();
    console.log("✅ 북마크 알림 저장 완료, ID:", notificationId);
    return notificationId;
  } catch (error) {
    console.error("❌ 북마크 알림 저장 실패:", error);
    throw error;
  }
}

// 북마크 저장 성공 시 알림 처리 (북마크 알림 + 시스템 알림)
export async function sendBookmarkSavedNotification(
  bookmarkId,
  bookmarkTitle,
  bookmarkUrl
) {
  try {
    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.log("⚠️ 사용자 정보 또는 토큰 없음, 알림 건너뜀");
      return;
    }

    const notificationSettings = await getNotificationSettings(
      currentUser.uid,
      currentIdToken
    );

    if (notificationSettings.bookmarkNotifications) {
      try {
        await createBookmarkNotification(
          currentUser.uid,
          bookmarkId,
          bookmarkTitle,
          currentIdToken
        );
        console.log("✅ 북마크 알림 저장 완료");
      } catch (error) {
        console.error("❌ 북마크 알림 저장 실패 (계속 진행):", error);
      }
    } else {
      console.log("ℹ️ 북마크 알림이 비활성화되어 있음, Firestore 알림 건너뜀");
    }

    if (notificationSettings.systemNotifications) {
      await sendSystemNotification(
        "북마크 저장 완료",
        `"${bookmarkTitle}" 북마크가 저장되었습니다.`,
        bookmarkUrl
      );
    } else {
      console.log("ℹ️ 시스템 알림이 비활성화되어 있음, 시스템 알림 건너뜀");
    }
  } catch (error) {
    console.error("❌ 북마크 저장 알림 처리 실패:", error);
  }
}
