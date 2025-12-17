(() => {
  const env = window.OffscreenEnv;
  const auth = window.OffscreenAuth;

  if (!env || !auth) {
    console.error(
      "❌ [offscreen] Missing environment/auth modules for Firestore operations"
    );
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
    return fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/${path}`,
      payload
    );
  }

  async function addCollection({ name, icon }) {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const { user, idToken } = requireAuthState();
    const userId = user.uid;

    // 보안: 입력 검증
    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length === 0 ||
      name.length > 100
    ) {
      throw new Error("컬렉션 이름이 유효하지 않습니다.");
    }

    if (icon && (typeof icon !== "string" || icon.length > 50)) {
      throw new Error("컬렉션 아이콘이 유효하지 않습니다.");
    }

    const now = new Date().toISOString();
    const fields = {
      name: { stringValue: name.trim() },
      icon: { stringValue: (icon || "Folder").trim() },
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
        Authorization: `Bearer ${idToken}`,
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

  async function getUserNotificationSettings() {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const { user, idToken } = requireAuthState();
    const userId = user.uid;

    const getPayload = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    };

    let response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${userId}/settings/main`,
      getPayload
    );

    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      getPayload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${userId}/settings/main`,
        getPayload
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        // 설정이 없으면 기본값 반환
        return {
          notifications: true,
          bookmarkNotifications: true,
          systemNotifications: true,
        };
      }
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "알림 설정 조회 실패");
    }

    const doc = await response.json();
    const fields = doc.fields || {};

    return {
      notifications:
        fields.notifications?.booleanValue !== undefined
          ? fields.notifications.booleanValue
          : true,
      bookmarkNotifications:
        fields.bookmarkNotifications?.booleanValue !== undefined
          ? fields.bookmarkNotifications.booleanValue
          : true,
      systemNotifications:
        fields.systemNotifications?.booleanValue !== undefined
          ? fields.systemNotifications.booleanValue
          : fields.notifications?.booleanValue !== undefined
          ? fields.notifications.booleanValue
          : true,
    };
  }

  async function saveBookmark({
    url,
    title,
    collectionId,
    description,
    tags,
    favicon,
  }) {
    await auth.ensureAuthReady();
    await auth.ensureFreshIdToken();

    const { user, idToken } = requireAuthState();
    const userId = user.uid;

    // 보안: URL 검증
    if (!url || typeof url !== "string") {
      throw new Error("URL이 필요합니다.");
    }

    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("유효하지 않은 URL 프로토콜입니다.");
      }
    } catch (error) {
      throw new Error("유효하지 않은 URL 형식입니다.");
    }

    // 보안: 제목 길이 제한
    if (title && typeof title === "string" && title.length > 500) {
      title = title.substring(0, 500);
    }

    // 보안: 설명 길이 제한
    if (
      description &&
      typeof description === "string" &&
      description.length > 2000
    ) {
      description = description.substring(0, 2000);
    }

    // 보안: 태그 검증
    if (tags) {
      if (!Array.isArray(tags)) {
        throw new Error("태그는 배열이어야 합니다.");
      }
      if (tags.length > 20) {
        throw new Error("태그는 최대 20개까지 가능합니다.");
      }
      // 각 태그 검증
      for (const tag of tags) {
        if (
          typeof tag !== "string" ||
          tag.trim().length === 0 ||
          tag.length > 50
        ) {
          throw new Error("유효하지 않은 태그입니다.");
        }
      }
    }
    const fields = {
      userId: { stringValue: userId },
      url: { stringValue: url.trim() },
      title: { stringValue: (title || "").trim() },
      description: { stringValue: (description || "").trim() },
      isFavorite: { booleanValue: false },
      createdAt: { timestampValue: new Date().toISOString() },
    };

    if (collectionId) {
      fields.collection = { stringValue: collectionId };
    }
    if (tags && Array.isArray(tags) && tags.length > 0) {
      // 보안: 태그 sanitization
      fields.tags = {
        arrayValue: {
          values: tags.map((tag) => ({ stringValue: String(tag).trim() })),
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
        Authorization: `Bearer ${idToken}`,
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

    // 북마크 ID 추출 (result.name은 "projects/xxx/databases/(default)/documents/bookmarks/abc123" 형식)
    const bookmarkId = result.name.split("/").pop();

    // 북마크 저장 후 알림 설정 확인
    let notificationSettings = null;
    try {
      notificationSettings = await getUserNotificationSettings();
    } catch (error) {
      console.warn("⚠️ Failed to get notification settings:", error);
    }

    // 북마크 알림이 활성화되어 있으면 알림 센터에 알림 저장
    if (notificationSettings?.bookmarkNotifications) {
      try {
        await createBookmarkNotification(
          userId,
          bookmarkId,
          title,
          url,
          idToken
        );
      } catch (error) {
        console.warn("⚠️ Failed to create bookmark notification:", error);
        // 알림 생성 실패해도 북마크 저장은 성공한 것으로 처리
      }
    }

    return {
      ...result,
      notificationSettings,
    };
  }

  async function createBookmarkNotification(
    userId,
    bookmarkId,
    title,
    url,
    idToken
  ) {
    const now = new Date().toISOString();
    const notificationFields = {
      userId: { stringValue: userId },
      type: { stringValue: "bookmark_added" },
      title: { stringValue: "북마크 추가됨" },
      message: { stringValue: `"${title}" 북마크가 추가되었습니다` },
      isRead: { booleanValue: false },
      createdAt: { timestampValue: now },
      bookmarkId: { stringValue: bookmarkId },
      metadata: { nullValue: null },
    };

    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: notificationFields }),
    };

    let response = await saveToFirestore("documents/notifications", payload);
    if (response.status === 401) {
      await auth.ensureFreshIdToken();
      payload.headers.Authorization = `Bearer ${auth.getCurrentIdToken()}`;
      response = await saveToFirestore("documents/notifications", payload);
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "알림 생성 실패");
    }
    const notificationResult = await response.json();
    console.log("✅ Bookmark notification created:", notificationResult.name);
    return notificationResult;
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
        Authorization: `Bearer ${idToken}`,
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
        Authorization: `Bearer ${idToken}`,
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
    getUserNotificationSettings,
  };
})();
