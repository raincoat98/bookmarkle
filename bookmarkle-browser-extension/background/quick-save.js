import { getCurrentUser } from "./auth.js";
import { sendToOffscreen } from "./offscreen.js";
import { showSystemNotification } from "./messaging.js";

export function initQuickSave() {
  chrome.action.onClicked.addListener(handleActionClick);
}

async function handleActionClick(tab) {
  console.log("🚀 Icon clicked - quick save mode");

  if (!tab || !tab.url) {
    console.error("No active tab URL");
    showBadge("✗", "#EF4444");
    return;
  }

  if (!getCurrentUser()) {
    console.log("Not logged in");
    showBadge("?", "#F59E0B");
    return;
  }

  try {
    const response = await sendToOffscreen({
      type: "OFFSCREEN_SAVE_BOOKMARK",
      payload: {
        url: tab.url,
        title: tab.title || "",
        collectionId: null,
        description: "",
        tags: [],
        favicon: tab.favIconUrl || "",
      },
    });

    if (response?.ok) {
      console.log("✅ Quick save success");
      showBadge("✓", "#10B981");

      // 북마크 저장 성공 후 시스템 알림 확인 및 표시
      if (response?.result?.notificationSettings) {
        const { notificationSettings } = response.result;

        // 시스템 알림이 활성화되어 있으면 OS 알림 센터로 알림 표시
        if (notificationSettings.systemNotifications) {
          showSystemNotification(tab.title || "북마크 저장됨", tab.url || "");
        }
      }
    } else {
      console.error("Quick save failed:", response?.error);
      showBadge("✗", "#EF4444");
    }
  } catch (error) {
    console.error("Quick save error:", error);
    showBadge("✗", "#EF4444");
  }
}

function showBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}
