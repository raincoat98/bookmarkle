(() => {
  const env = window.OffscreenEnv;
  const auth = window.OffscreenAuth;

  if (!env || !auth) {
    console.error("❌ [offscreen] Missing environment/auth modules for Firestore operations");
    return;
  }

  const { firebaseConfig } = env;

  function requireAuthState() {
    const user = auth.getCurrentUser();
    const idToken = auth.getCurrentIdToken();

    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }
    if (!idToken) {
      throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
    }

    return { user, idToken };
  }

  function saveToFirestore(path, payload) {
    return fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/${path}`, payload);
  }

  async function addCollection({ name, icon }) {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const { user, idToken } = requireAuthState();
    const userId = user.uid;
    const now = new Date().toISOString();
    const fields = {
      name: { stringValue: name },
      icon: { stringValue: icon || "Folder" },
      description: { stringValue: "" },
      isPinned: { booleanValue: false },
      parentId: { nullValue: null },
      userId: { stringValue: userId },
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
    };

    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    };

    let response = await saveToFirestore("documents/collections", payload);
    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      payload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await saveToFirestore("documents/collections", payload);
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 컬렉션 추가 실패");
    }
    const result = await response.json();
    console.log("✅ Collection added:", { name, id: result.name });
    return result;
  }

  async function saveBookmark({ url, title, collectionId, description, tags, favicon }) {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const { user, idToken } = requireAuthState();
    const userId = user.uid;
    const fields = {
      userId: { stringValue: userId },
      url: { stringValue: url },
      title: { stringValue: title },
      description: { stringValue: description || "" },
      isFavorite: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() },
    };

    if (collectionId) {
      fields.collection = { stringValue: collectionId };
    }
    if (tags && Array.isArray(tags) && tags.length > 0) {
      fields.tags = {
        arrayValue: {
          values: tags.map((tag) => ({ stringValue: tag })),
        },
      };
    }
    if (favicon) {
      fields.favicon = { stringValue: favicon };
    }

    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    };

    let response = await saveToFirestore("documents/bookmarks", payload);
    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      payload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await saveToFirestore("documents/bookmarks", payload);
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 저장 실패");
    }
    const result = await response.json();
    console.log("✅ Bookmark saved:", { url, title, id: result.name });
    return result;
  }

  async function listBookmarks() {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const user = auth.getCurrentUser();
    const idToken = auth.getCurrentIdToken();

    if (!user) {
      chrome.runtime.sendMessage({ type: "BOOKMARKS_SYNC", bookmarks: [] });
      return;
    }

    if (!idToken) {
      console.warn("⚠️ No idToken for listing bookmarks");
      chrome.runtime.sendMessage({ type: "BOOKMARKS_SYNC", bookmarks: [] });
      return;
    }

    const userId = user.uid;
    const queryPayload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "bookmarks" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: userId },
            },
          },
        },
      }),
    };

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
      queryPayload
    );

    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      queryPayload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
        queryPayload
      );
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 조회 실패");
    }

    const data = await response.json();
    const bookmarks = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const fields = doc.fields || {};
        return {
          id: doc.name.split("/").pop(),
          url: fields.url?.stringValue || "",
          title: fields.title?.stringValue || "",
          userId: fields.userId?.stringValue || "",
          createdAt: fields.createdAt?.timestampValue || null,
        };
      });

    chrome.runtime.sendMessage({ type: "BOOKMARKS_SYNC", bookmarks });
    console.log("✅ Bookmarks loaded:", bookmarks.length);
  }

  async function getCollections() {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const user = auth.getCurrentUser();
    const idToken = auth.getCurrentIdToken();

    if (!user) return [];
    if (!idToken) {
      console.warn("⚠️ No idToken for getting collections");
      return [];
    }

    const userId = user.uid;
    const queryPayload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "collections" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: userId },
            },
          },
        },
      }),
    };

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
      queryPayload
    );

    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      queryPayload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`,
        queryPayload
      );
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Firestore 컬렉션 조회 실패");
    }

    const data = await response.json();
    const collections = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const fields = doc.fields || {};
        return {
          id: doc.name.split("/").pop(),
          name: fields.name?.stringValue || "",
          icon: fields.icon?.stringValue || "📁",
          order: fields.order?.integerValue || 0,
          userId: fields.userId?.stringValue || "",
        };
      });

    console.log("✅ Collections loaded:", collections.length);
    return collections;
  }

  window.OffscreenFirestore = {
    addCollection,
    saveBookmark,
    listBookmarks,
    getCollections,
  };
})();
