import { OFFSCREEN_URL } from "./constants.js";
import { backgroundState } from "./state.js";

export async function ensureOffscreenDocument() {
  if (!chrome.offscreen) {
    console.warn("chrome.offscreen is not available in this context. Skipping offscreen document creation.");
    return;
  }

  try {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) return;


    const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_URL);
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: "Firestore bookmark backend operations",
    });

    backgroundState.offscreenSynced = false;
  } catch (error) {
    if (!error.message?.includes("Only a single offscreen")) {
      console.error("Failed to create offscreen document:", error);
    }
  }
}

export async function sendToOffscreen(message) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

export function isOffscreenSynced() {
  return backgroundState.offscreenSynced;
}

export function markOffscreenSynced(value) {
  backgroundState.offscreenSynced = value;
}
