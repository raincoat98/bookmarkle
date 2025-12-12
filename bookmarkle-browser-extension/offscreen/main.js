(() => {
  const auth = window.OffscreenAuth;
  const firestore = window.OffscreenFirestore;

  if (!auth || !firestore) {
    console.error("❌ [offscreen] Missing required modules");
    return;
  }

  console.log("🚀 [offscreen] Document loaded and ready");

  chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    if (!msg?.type) {
      return false;
    }

    if (msg.type === "OFFSCREEN_AUTH_STATE_CHANGED") {
      auth
        .handleBackgroundAuthUpdate(msg)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (!msg.type.startsWith("OFFSCREEN_")) {
      return false;
    }

    const handlers = {
      OFFSCREEN_ADD_COLLECTION: () =>
        firestore
          .addCollection(msg.payload || {})
          .then((result) => sendResponse({ ok: true, result })),
      OFFSCREEN_SAVE_BOOKMARK: () =>
        firestore
          .saveBookmark(msg.payload || {})
          .then((result) => sendResponse({ ok: true, result })),
      OFFSCREEN_LIST_BOOKMARKS: () =>
        firestore
          .listBookmarks()
          .then(() => sendResponse({ ok: true })),
      OFFSCREEN_GET_COLLECTIONS: () =>
        firestore
          .getCollections()
          .then((collections) => sendResponse({ ok: true, collections })),
    };

    const handler = handlers[msg.type];
    if (!handler) {
      return false;
    }

    handler().catch((error) => {
      console.error(`[offscreen] ${msg.type} error:`, error);
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  });

  (async () => {
    await auth.ensureAuthReady();
    try {
      chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" }, async (response) => {
        if (chrome.runtime.lastError) {
          console.warn("⚠️ [offscreen] OFFSCREEN_READY failed:", chrome.runtime.lastError.message);
          return;
        }

        if (response?.type === "INIT_AUTH") {
          await auth.applyInitAuth(response);
        }
      });
    } catch (error) {
      console.warn("⚠️ [offscreen] Failed to send OFFSCREEN_READY:", error);
    }
  })();
})();
