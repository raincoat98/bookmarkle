import { useEffect, useRef, useCallback } from "react";
import {
  isFirebaseInternalMessage,
  parseMessageData,
  sendToExtensionParent,
  createErrorResponse,
  createIframeReadyMessage,
  type CollectionsDataResponse,
  type BookmarksDataResponse,
  type BookmarkSavedResponse,
  type CollectionCreatedResponse,
  type NotificationSettingsDataResponse,
} from "../utils/extensionMessaging";
import { auth } from "../firebase";
import type { User } from "firebase/auth";
import type { Collection, Bookmark } from "../types";

interface UseExtensionMessageOptions {
  user: User | null;
}

// ==============================
// Firestore REST API types
// ==============================
interface FirestoreField {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: {
    values?: FirestoreField[];
  };
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreField>;
  createTime?: string;
  updateTime?: string;
}

interface FirestoreQueryResult {
  document?: FirestoreDocument;
  readTime?: string;
}

interface BookmarkData {
  title: string;
  url: string;
  description?: string;
  collectionId?: string | null;
  favicon?: string | null;
  tags?: string[];
  userId?: string;
}

interface CollectionData {
  name: string;
  description?: string;
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
  order?: number;
  userId?: string;
}

// ==============================
// 공통 Helpers
// ==============================

const getProjectId = () => import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

const authHeader = (idToken: string) => ({
  Authorization: `Bearer ${idToken}`,
});

/**
 * 공통 fetch wrapper (에러 메시지에 context 포함)
 */
async function fireFetch<T>(
  url: string,
  options: RequestInit,
  context: string
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorData: unknown = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new Error(
      `[${context}] Firestore API error: ${JSON.stringify(errorData)}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * runQuery 공통 함수
 */
async function runFirestoreQuery(
  idToken: string,
  body: unknown,
  context: string
): Promise<FirestoreQueryResult[]> {
  const projectId = getProjectId();

  return fireFetch<FirestoreQueryResult[]>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        ...authHeader(idToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    context
  );
}

/**
 * 단일 컬렉션에 document 생성
 */
async function createFirestoreDocument(
  collectionPath: string,
  idToken: string,
  fields: Record<string, FirestoreField>,
  context: string
): Promise<{ id: string }> {
  const projectId = getProjectId();

  const result = await fireFetch<{ name: string }>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`,
    {
      method: "POST",
      headers: {
        ...authHeader(idToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
    context
  );

  const id = result.name.split("/").pop()!;
  return { id };
}

/**
 * FirestoreDocument → Collection 매핑
 */
function mapCollectionDocument(doc: FirestoreDocument): Collection {
  const fields = doc.fields || {};
  const id = doc.name.split("/").pop()!;

  return {
    id,
    name: fields.name?.stringValue || "",
    userId: fields.userId?.stringValue || "",
    description: fields.description?.stringValue || "",
    icon: fields.icon?.stringValue || "",
    parentId: (fields as Record<string, FirestoreField>).parentId?.stringValue || null,
    isPinned: fields.isPinned?.booleanValue || false,
    createdAt: fields.createdAt?.timestampValue
      ? new Date(fields.createdAt.timestampValue)
      : new Date(),
    updatedAt: fields.updatedAt?.timestampValue
      ? new Date(fields.updatedAt.timestampValue)
      : new Date(),
  };
}

/**
 * FirestoreDocument → Bookmark 매핑
 */
function mapBookmarkDocument(doc: FirestoreDocument): Bookmark {
  const fields = doc.fields || {};
  const id = doc.name.split("/").pop()!;

  const tags =
    fields.tags?.arrayValue?.values
      ?.map((v) => v.stringValue || "")
      .filter((t): t is string => !!t) || [];

  return {
    id,
    userId: fields.userId?.stringValue || "",
    title: fields.title?.stringValue || "",
    url: fields.url?.stringValue || "",
    description: fields.description?.stringValue || "",
    collection: fields.collection?.stringValue || null,
    order: fields.order?.integerValue
      ? parseInt(fields.order.integerValue, 10)
      : 0,
    favicon: fields.favicon?.stringValue || undefined,
    tags,
    isFavorite: fields.isFavorite?.booleanValue || false,
    deletedAt: fields.deletedAt?.timestampValue
      ? new Date(fields.deletedAt.timestampValue)
      : undefined,
    createdAt: fields.createdAt?.timestampValue
      ? new Date(fields.createdAt.timestampValue)
      : new Date(),
    updatedAt: fields.updatedAt?.timestampValue
      ? new Date(fields.updatedAt.timestampValue)
      : new Date(),
  };
}

/**
 * 공통 인증 체크 helper
 * - 부족하면 에러 메시지 전송 후 null 반환
 */
function ensureAuth(
  userId: string | null | undefined,
  idToken: string | null | undefined,
  errorType: string
): { userId: string; idToken: string } | null {
  if (!userId || !idToken) {
    console.error(`❌ Missing userId or idToken for ${errorType}`);
    sendToExtensionParent(
      createErrorResponse(errorType, "Missing authentication")
    );
    return null;
  }

  return { userId, idToken };
}

// =======================================================
// Hook
// =======================================================

export function useExtensionMessage({ user }: UseExtensionMessageOptions) {
  const userRef = useRef(user);

  // keep latest user
  useEffect(() => {
    console.log("🔄 useExtensionMessage user updated:", user?.uid);
    userRef.current = user;
  }, [user]);

  // --------------------------
  // HANDLERS
  // --------------------------

  const handleGetCollections = useCallback(
    async (userId?: string | null, idToken?: string | null) => {
      console.log("📬 Received getCollections request from offscreen");
      console.log("📬 Request userId:", userId);
      console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

      const effectiveUserId = userId || userRef.current?.uid || null;
      
      // 항상 최신 토큰 가져오기 (401 에러 방지)
      let validToken: string | null = null;
      if (auth.currentUser) {
        console.log("🔄 Always fetching fresh idToken from Firebase Auth...");
        try {
          validToken = await auth.currentUser.getIdToken(true);
          console.log("✅ Fresh idToken obtained:", validToken ? "✅ Present" : "❌ Missing");
        } catch (error) {
          console.error("❌ Failed to refresh idToken:", error);
          // 폴백: 전달받은 토큰 사용
          validToken = idToken || null;
        }
      } else {
        // 현재 사용자가 없으면 전달받은 토큰 사용
        validToken = idToken || null;
      }
      
      const authInfo = ensureAuth(
        effectiveUserId,
        validToken,
        "COLLECTIONS_ERROR"
      );
      if (!authInfo) return;

      const { userId: uid, idToken: token } = authInfo;

      try {
        console.log("📬 Fetching collections via Firestore REST API...");
        
        // 갱신된 토큰을 background에 전송하여 저장
        if (validToken !== idToken && validToken) {
          console.log("🔄 Sending refreshed token to background...");
          sendToExtensionParent({
            type: "TOKEN_REFRESHED",
            idToken: validToken,
          } as any);
        }

        const requestBody = {
          structuredQuery: {
            from: [{ collectionId: "collections" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "userId" },
                op: "EQUAL",
                value: { stringValue: uid },
              },
            },
          },
        };


        const results = await runFirestoreQuery(
          token,
          requestBody,
          "getCollections"
        );

        const collections: Collection[] = results
          .filter((r) => {
            const hasDoc = r.document !== undefined && r.document !== null;
            return hasDoc;
          })
          .map((r) => mapCollectionDocument(r.document!));

        console.log("✅ Collections data:", collections);

        const collectionsResponse: CollectionsDataResponse = {
          type: "COLLECTIONS_DATA",
          collections,
        };
        sendToExtensionParent(collectionsResponse);
        console.log("✅ Collections data sent back to offscreen");
      } catch (error) {
        console.error("❌ Error fetching collections:", error);
        console.error("❌ Error details:", {
          message: error instanceof Error ? error.message : String(error),
        });
        sendToExtensionParent(
          createErrorResponse(
            "COLLECTIONS_ERROR",
            error instanceof Error ? error.message : "Unknown error"
          )
        );
      }
    },
    []
  );

  const handleGetBookmarks = useCallback(
    async (
      collectionId: string | null,
      userId?: string | null,
      idToken?: string | null
    ) => {
      console.log(
        "📬 Received getBookmarks request from offscreen, collectionId:",
        collectionId
      );
      console.log("📬 Request userId:", userId);
      console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

      const effectiveUserId = userId || userRef.current?.uid || null;
      
      // 항상 최신 토큰 가져오기
      let validToken: string | null = null;
      if (auth.currentUser) {
        console.log("🔄 Always fetching fresh idToken from Firebase Auth...");
        try {
          validToken = await auth.currentUser.getIdToken(true);
          console.log("✅ Fresh idToken obtained");
        } catch (error) {
          console.error("❌ Failed to refresh idToken:", error);
          validToken = idToken || null;
        }
      } else {
        validToken = idToken || null;
      }
      
      const authInfo = ensureAuth(
        effectiveUserId,
        validToken,
        "BOOKMARKS_ERROR"
      );
      if (!authInfo) return;

      const { userId: uid, idToken: token } = authInfo;

      try {
        console.log("📬 Fetching bookmarks via Firestore REST API...");

        interface FieldFilter {
          fieldFilter: {
            field: { fieldPath: string };
            op: string;
            value: { stringValue: string };
          };
        }

        const filters: FieldFilter[] = [
          {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
        ];

        if (collectionId !== null) {
          filters.push({
            fieldFilter: {
              field: { fieldPath: "collection" },
              op: "EQUAL",
              value: { stringValue: collectionId },
            },
          });
        }

        const requestBody = {
          structuredQuery: {
            from: [{ collectionId: "bookmarks" }],
            where: {
              compositeFilter: {
                op: "AND",
                filters,
              },
            },
            orderBy: [
              { field: { fieldPath: "order" }, direction: "DESCENDING" },
            ],
          },
        };

        const results = await runFirestoreQuery(
          token,
          requestBody,
          "getBookmarks"
        );

        const bookmarks: Bookmark[] = results
          .filter((r) => r.document)
          .map((r) => mapBookmarkDocument(r.document!));

        console.log("✅ Bookmarks fetched successfully:", bookmarks.length);

        const bookmarksResponse: BookmarksDataResponse = {
          type: "BOOKMARKS_DATA",
          bookmarks,
          collectionId,
        };
        sendToExtensionParent(bookmarksResponse);
        console.log("✅ Bookmarks message sent to offscreen");
      } catch (error) {
        console.error("❌ Error fetching bookmarks:", error);
        console.error("❌ Error details:", {
          message: error instanceof Error ? error.message : String(error),
        });
        sendToExtensionParent(
          createErrorResponse(
            "BOOKMARKS_ERROR",
            error instanceof Error ? error.message : "Unknown error"
          )
        );
      }
    },
    []
  );

  const handleSaveBookmark = useCallback(
    async (
      bookmarkData: unknown,
      userId?: string | null,
      idToken?: string | null
    ) => {
      console.log("📬 Received saveBookmark request from offscreen");
      console.log("📬 Bookmark data:", bookmarkData);
      console.log("📬 Request userId parameter:", userId);
      console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

      const effectiveUserId =
        userId || userRef.current?.uid || auth.currentUser?.uid || null;
      
      // 항상 최신 토큰 가져오기
      let validToken: string | null = null;
      if (auth.currentUser) {
        console.log("🔄 Always fetching fresh idToken from Firebase Auth...");
        try {
          validToken = await auth.currentUser.getIdToken(true);
          console.log("✅ Fresh idToken obtained");
        } catch (error) {
          console.error("❌ Failed to refresh idToken:", error);
          validToken = idToken || null;
        }
      } else {
        validToken = idToken || null;
      }
      
      const authInfo = ensureAuth(
        effectiveUserId,
        validToken,
        "BOOKMARK_SAVE_ERROR"
      );
      if (!authInfo) return;

      const { userId: uid, idToken: token } = authInfo;
      const bookmark = bookmarkData as BookmarkData;

      try {
        console.log("📬 Saving bookmark via Firestore REST API with idToken...");

        const fields: Record<string, FirestoreField> = {
          userId: { stringValue: uid },
          title: { stringValue: bookmark.title || "" },
          url: { stringValue: bookmark.url || "" },
          description: { stringValue: bookmark.description || "" },
          collection: bookmark.collectionId
            ? { stringValue: bookmark.collectionId }
            : { nullValue: null },
          favicon: bookmark.favicon
            ? { stringValue: bookmark.favicon }
            : { nullValue: null },
          order: { integerValue: String(Date.now()) }, // Use timestamp as order
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        };

        const { id } = await createFirestoreDocument(
          "bookmarks",
          token,
          fields,
          "saveBookmark"
        );

        console.log("✅ Bookmark saved successfully with ID:", id);
        console.log("📦 Sending bookmark saved confirmation to offscreen");

        const saveResponse: BookmarkSavedResponse = {
          type: "BOOKMARK_SAVED",
          bookmarkId: id,
        };
        sendToExtensionParent(saveResponse);
        console.log("✅ Bookmark saved message sent to offscreen");
      } catch (error) {
        console.error("❌ Error saving bookmark:", error);
        console.error("❌ Error details:", {
          message: error instanceof Error ? error.message : String(error),
        });
        sendToExtensionParent(
          createErrorResponse(
            "BOOKMARK_SAVE_ERROR",
            error instanceof Error ? error.message : "Unknown error"
          )
        );
      }
    },
    []
  );

  const handleCreateCollection = useCallback(
    async (
      collectionData: unknown,
      userId?: string | null,
      idToken?: string | null
    ) => {
      console.log("📬 Received createCollection request from offscreen");
      console.log("📬 Collection data:", collectionData);
      console.log("📬 Request userId:", userId);
      console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

      const effectiveUserId = userId || userRef.current?.uid || null;
      
      // 항상 최신 토큰 가져오기
      let validToken: string | null = null;
      if (auth.currentUser) {
        console.log("🔄 Always fetching fresh idToken from Firebase Auth...");
        try {
          validToken = await auth.currentUser.getIdToken(true);
          console.log("✅ Fresh idToken obtained");
        } catch (error) {
          console.error("❌ Failed to refresh idToken:", error);
          validToken = idToken || null;
        }
      } else {
        validToken = idToken || null;
      }
      
      const authInfo = ensureAuth(
        effectiveUserId,
        validToken,
        "COLLECTION_CREATE_ERROR"
      );
      if (!authInfo) return;

      const { userId: uid, idToken: token } = authInfo;
      const collection = collectionData as CollectionData;

      try {
        console.log("📬 Creating collection via Firestore REST API...");

        const fields: Record<string, FirestoreField> = {
          userId: { stringValue: uid },
          name: { stringValue: collection.name || "" },
          description: { stringValue: collection.description || "" },
          icon: collection.icon
            ? { stringValue: collection.icon }
            : { nullValue: null },
          color: collection.color
            ? { stringValue: collection.color }
            : { nullValue: null },
          isDefault: { booleanValue: collection.isDefault || false },
          order: { integerValue: String(collection.order ?? 0) },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        };

        const { id } = await createFirestoreDocument(
          "collections",
          token,
          fields,
          "createCollection"
        );

        console.log("✅ Collection created successfully with ID:", id);
        console.log("📦 Sending collection created confirmation to offscreen");

        const createResponse: CollectionCreatedResponse = {
          type: "COLLECTION_CREATED",
          collectionId: id,
        };
        sendToExtensionParent(createResponse);
        console.log("✅ Collection created message sent to offscreen");
      } catch (error) {
        console.error("❌ Error creating collection:", error);
        console.error("❌ Error details:", {
          message: error instanceof Error ? error.message : String(error),
        });
        sendToExtensionParent(
          createErrorResponse(
            "COLLECTION_CREATE_ERROR",
            error instanceof Error ? error.message : "Unknown error"
          )
        );
      }
    },
    []
  );

  const handleGetNotificationSettings = useCallback(async (userId?: string | null, idToken?: string | null) => {
    console.log("📬 Received getNotificationSettings request from offscreen");
    console.log("📬 Request userId:", userId);
    console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

    const effectiveUserId = userId || userRef.current?.uid || null;
    
    // 항상 최신 토큰 가져오기
    let validToken: string | null = null;
    if (auth.currentUser) {
      console.log("🔄 Always fetching fresh idToken from Firebase Auth...");
      try {
        validToken = await auth.currentUser.getIdToken(true);
        console.log("✅ Fresh idToken obtained");
      } catch (error) {
        console.error("❌ Failed to refresh idToken:", error);
        validToken = idToken || null;
      }
    } else {
      validToken = idToken || null;
    }
    
    const authInfo = ensureAuth(
      effectiveUserId,
      validToken,
      "NOTIFICATION_SETTINGS_ERROR"
    );
    if (!authInfo) return;

    const { userId: uid, idToken: token } = authInfo;

    try {
      console.log("📬 Fetching notification settings via Firestore REST API for user:", uid);
      
      const projectId = getProjectId();
      const docPath = `users/${uid}/settings/main`;
      
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`,
        {
          method: "GET",
          headers: authHeader(token),
        }
      );

      let notificationsEnabled = true;
      let systemNotificationsEnabled = true;
      let bookmarkNotifications = true;

      if (response.ok) {
        const docData: FirestoreDocument = await response.json();
        const fields = docData.fields || {};
        
        notificationsEnabled = fields.notifications?.booleanValue ?? true;
        systemNotificationsEnabled = fields.systemNotifications?.booleanValue ?? notificationsEnabled;
        bookmarkNotifications = fields.bookmarkNotifications?.booleanValue ?? notificationsEnabled;
      } else if (response.status !== 404) {
        // 404는 문서가 없는 것이므로 기본값 사용, 다른 에러는 throw
        const errorData = await response.json();
        throw new Error(`Firestore API error: ${JSON.stringify(errorData)}`);
      }

      const settings = {
        notifications: notificationsEnabled,
        systemNotifications: systemNotificationsEnabled,
        bookmarkNotifications: bookmarkNotifications,
      };

      console.log("✅ Notification settings fetched successfully:", settings);

      const settingsResponse: NotificationSettingsDataResponse = {
        type: "NOTIFICATION_SETTINGS_DATA",
        ...settings,
      };
      sendToExtensionParent(settingsResponse);
      console.log("✅ Notification settings message sent to offscreen");
    } catch (error) {
      console.error("❌ Error fetching notification settings:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
      });
      sendToExtensionParent(
        createErrorResponse(
          "NOTIFICATION_SETTINGS_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }, []);

  // --------------------------
  // message listener
  // --------------------------
  useEffect(() => {
    console.log("📌 useExtensionMessage hook mounted, initial user:", {
      hasUser: !!user,
      userId: user?.uid,
      userEmail: user?.email,
    });

    const handleMessage = async (event: MessageEvent) => {
      console.log("🔔 [iframe] Message received:", {
        origin: event.origin,
        data: event.data,
        dataType: typeof event.data,
        rawData: JSON.stringify(event.data).substring(0, 200),
      });

      if (
        typeof event.data === "string" &&
        isFirebaseInternalMessage(event.data)
      ) {
        console.log("⏭️ [iframe] Skipping Firebase internal message");
        return;
      }

      try {
        const data = parseMessageData(event.data);

        if (!data) {
          console.log("⚠️ [iframe] No valid data after parsing");
          console.log("⚠️ [iframe] Raw data was:", event.data);
          console.log(
            "⚠️ [iframe] Data properties:",
            Object.keys(typeof event.data === "object" && event.data !== null ? event.data : {})
          );
          return;
        }

        console.log("✅ [iframe] Parsed message data:", data);

        if ("getCollections" in data && data.getCollections) {
          await handleGetCollections(
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("getBookmarks" in data && data.getBookmarks) {
          await handleGetBookmarks(
            ("collectionId" in data
              ? data.collectionId
              : null) as string | null,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("saveBookmark" in data && data.saveBookmark) {
          console.log("🔍 saveBookmark message data:", data);
          console.log(
            "🔍 userId in message:",
            "userId" in data ? data.userId : "NOT FOUND"
          );
          console.log(
            "🔍 idToken in message:",
            "idToken" in data ? "✅ Present" : "❌ Missing"
          );
          await handleSaveBookmark(
            ("bookmarkData" in data
              ? data.bookmarkData
              : null) as unknown,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("createCollection" in data && data.createCollection) {
          await handleCreateCollection(
            ("collectionData" in data
              ? data.collectionData
              : null) as unknown,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("getNotificationSettings" in data && data.getNotificationSettings) {
          await handleGetNotificationSettings(
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        }
      } catch (error) {
        console.error("🔥 Error processing message from offscreen:", error);
        console.error("🔥 Error details:", {
          message: error instanceof Error ? error.message : String(error),
          type: typeof error,
        });
      }
    };

    console.log("📌 Message listener attached to ExtensionLoginPage");
    window.addEventListener("message", handleMessage);

    try {
      sendToExtensionParent(createIframeReadyMessage());
      console.log("✅ IFRAME_READY signal sent to offscreen");
    } catch (error) {
      console.error("Failed to send IFRAME_READY signal:", error);
    }

    return () => {
      console.log("📌 Message listener removed from ExtensionLoginPage");
      window.removeEventListener("message", handleMessage);
    };
  }, [
    user,
    handleGetCollections,
    handleGetBookmarks,
    handleSaveBookmark,
    handleCreateCollection,
    handleGetNotificationSettings,
  ]);

  // hook 자체는 아무것도 리턴하지 않음
}