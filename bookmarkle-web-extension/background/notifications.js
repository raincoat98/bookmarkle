import { FIREBASE_PROJECT_ID } from "./constants.js";
import {
  notificationUrlMap,
  getCurrentUser,
  getCurrentIdToken,
} from "./state.js";

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
      // 문서가 없거나 권한 오류인 경우 기본값 반환
      if (response.status === 404 || response.status === 403) {
        console.log("⚠️ 알림 설정 문서를 찾을 수 없음, 기본값 사용");
        return {
          bookmarkNotifications: true,
          systemNotifications: true,
        };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const fields = data.fields || {};

    // bookmarkNotifications 필드 확인
    let bookmarkNotifications = true; // 기본값
    if (fields.bookmarkNotifications?.booleanValue !== undefined) {
      bookmarkNotifications = fields.bookmarkNotifications.booleanValue;
    } else if (fields.notifications?.booleanValue !== undefined) {
      // bookmarkNotifications가 없으면 notifications 필드 확인
      bookmarkNotifications = fields.notifications.booleanValue;
    }

    // systemNotifications 필드 확인
    let systemNotifications = true; // 기본값
    if (fields.systemNotifications?.booleanValue !== undefined) {
      systemNotifications = fields.systemNotifications.booleanValue;
    } else if (fields.notifications?.booleanValue !== undefined) {
      // systemNotifications가 없으면 notifications 필드 확인
      systemNotifications = fields.notifications.booleanValue;
    }

    return {
      bookmarkNotifications,
      systemNotifications,
    };
  } catch (error) {
    console.error("❌ 알림 설정 가져오기 실패:", error);
    // 에러 발생 시 기본값 반환 (알림 활성화)
    return {
      bookmarkNotifications: true,
      systemNotifications: true,
    };
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

    // 북마크 URL이 있으면 URL을 매핑에 저장
    if (bookmarkUrl) {
      notificationUrlMap.set(notificationId, bookmarkUrl);
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
      body: JSON.stringify({
        fields: notificationData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firestore 알림 저장 오류: ${
          errorData.error?.message || response.statusText
        }`
      );
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
    const currentUser = getCurrentUser();
    const currentIdToken = getCurrentIdToken();

    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.log("⚠️ 사용자 정보 또는 토큰 없음, 알림 건너뜀");
      return;
    }

    // 알림 설정 확인
    const notificationSettings = await getNotificationSettings(
      currentUser.uid,
      currentIdToken
    );

    // 북마크 알림이 켜져있으면 Firestore에 알림 저장
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
        // 알림 저장 실패해도 시스템 알림은 보내도록 계속 진행
      }
    } else {
      console.log("ℹ️ 북마크 알림이 비활성화되어 있음, Firestore 알림 건너뜀");
    }

    // 시스템 알림이 켜져있으면 시스템 알림으로 전송
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
