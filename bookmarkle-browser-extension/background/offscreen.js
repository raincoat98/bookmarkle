import { OFFSCREEN_URL } from "./constants.js";
import { backgroundState } from "./state.js";

const OFFSCREEN_RETRY_ERRORS = [
  "The message port closed before a response was received.",
  "Could not establish connection",
];

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

export async function sendToOffscreen(message, attempt = 0) {
  await ensureOffscreenDocument();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || "";
        if (attempt < 3 && shouldRetryOffscreenMessage(errorMessage)) {
          setTimeout(() => {
            sendToOffscreen(message, attempt + 1).then(resolve).catch(reject);
          }, 200);
          return;
        }
        reject(new Error(errorMessage));
      } else {
        resolve(response);
      }
    });
  });
}

function shouldRetryOffscreenMessage(message) {
  return OFFSCREEN_RETRY_ERRORS.some((snippet) => message.includes(snippet));
}

export function isOffscreenSynced() {
  return backgroundState.offscreenSynced;
}

export function markOffscreenSynced(value) {
  backgroundState.offscreenSynced = value;
}

export async function ensureFirebaseAuthUser() {
  await ensureOffscreenDocument();
  return sendToOffscreen({ type: "OFFSCREEN_GET_AUTH_STATE" }).then((response) => response?.payload ?? null);
}
