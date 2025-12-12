import { getCurrentUser } from "./auth.js";
import { sendToOffscreen } from "./offscreen.js";

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
