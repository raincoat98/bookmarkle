import { useEffect, useRef } from "react";
import {
  isFirebaseInternalMessage,
  parseMessageData,
  sendToExtensionParent,
  createErrorResponse,
  createIframeReadyMessage,
} from "../utils/extensionMessaging";
import {
  fetchCollections,
  fetchBookmarks,
  saveBookmarkDirect,
  createCollection,
  getUserNotificationSettings,
} from "../utils/firestoreService";
import type { User } from "firebase/auth";

interface UseExtensionMessageOptions {
  user: User | null;
}

export function useExtensionMessage({ user }: UseExtensionMessageOptions) {
  const userRef = useRef(user);

  // Keep userRef in sync with current user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Setup message listener once on mount
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Filter Firebase internal messages
      if (typeof event.data === "string" && isFirebaseInternalMessage(event.data)) {
        return;
      }

      try {
        const data = parseMessageData(event.data);

        if (!data) {
          return;
        }

        // Route to appropriate handler
        if ("getCollections" in data && data.getCollections) {
          await handleGetCollections();
        } else if ("getBookmarks" in data && data.getBookmarks) {
          await handleGetBookmarks(("collectionId" in data ? data.collectionId : null) as string | null);
        } else if ("saveBookmark" in data && data.saveBookmark) {
          await handleSaveBookmark(("bookmarkData" in data ? data.bookmarkData : null) as unknown);
        } else if ("createCollection" in data && data.createCollection) {
          await handleCreateCollection(("collectionData" in data ? data.collectionData : null) as unknown);
        } else if ("getNotificationSettings" in data && data.getNotificationSettings) {
          await handleGetNotificationSettings();
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

    // Send IFRAME_READY signal
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
  }, []);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  async function handleGetCollections() {
    console.log("📬 Received getCollections request from offscreen");
    console.log("📬 User ID check:", userRef.current?.uid ? "✅ Available" : "❌ Missing");

    if (!userRef.current?.uid) {
      console.error("❌ No user ID to fetch collections");
      sendToExtensionParent(
        createErrorResponse("COLLECTIONS_ERROR", "No user ID")
      );
      return;
    }

    try {
      console.log("📬 Fetching collections for user:", userRef.current.uid);
      const collections = await fetchCollections(userRef.current.uid);
      console.log(
        "✅ Collections fetched successfully:",
        collections.length,
        "items"
      );
      console.log("📦 Sending collections to offscreen:", collections);

      sendToExtensionParent({
        type: "COLLECTIONS_DATA",
        collections: collections,
      } as any);
      console.log("✅ Collections message sent to offscreen");
    } catch (error) {
      console.error("❌ Error fetching collections:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      sendToExtensionParent(
        createErrorResponse(
          "COLLECTIONS_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }

  async function handleGetBookmarks(collectionId: string | null) {
    console.log(
      "📬 Received getBookmarks request from offscreen, collectionId:",
      collectionId
    );
    console.log("📬 User ID check:", userRef.current?.uid ? "✅ Available" : "❌ Missing");

    if (!userRef.current?.uid) {
      console.error("❌ No user ID to fetch bookmarks");
      sendToExtensionParent(
        createErrorResponse("BOOKMARKS_ERROR", "No user ID")
      );
      return;
    }

    try {
      console.log(
        "📬 Fetching bookmarks for user:",
        userRef.current.uid,
        "collection:",
        collectionId
      );
      const bookmarks = await fetchBookmarks(userRef.current.uid, collectionId);
      console.log(
        "✅ Bookmarks fetched successfully:",
        bookmarks.length,
        "items"
      );
      console.log("📦 Sending bookmarks to offscreen:", bookmarks);

      sendToExtensionParent({
        type: "BOOKMARKS_DATA",
        bookmarks: bookmarks,
        collectionId: collectionId,
      } as any);
      console.log("✅ Bookmarks message sent to offscreen");
    } catch (error) {
      console.error("❌ Error fetching bookmarks:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      sendToExtensionParent(
        createErrorResponse(
          "BOOKMARKS_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }

  async function handleSaveBookmark(bookmarkData: unknown) {
    console.log("📬 Received saveBookmark request from offscreen");
    console.log("📬 Bookmark data:", bookmarkData);
    console.log("📬 User ID check:", userRef.current?.uid ? "✅ Available" : "❌ Missing");

    if (!userRef.current?.uid) {
      console.error("❌ No user ID to save bookmark");
      sendToExtensionParent(
        createErrorResponse("BOOKMARK_SAVE_ERROR", "No user ID")
      );
      return;
    }

    try {
      console.log("📬 Saving bookmark for user:", userRef.current.uid);
      const bookmarkPayload = {
        ...(bookmarkData as Record<string, unknown>),
        userId: userRef.current.uid,
      };

      const bookmarkId = await saveBookmarkDirect(bookmarkPayload as Parameters<typeof saveBookmarkDirect>[0]);
      console.log("✅ Bookmark saved successfully with ID:", bookmarkId);
      console.log("📦 Sending bookmark saved confirmation to offscreen");

      sendToExtensionParent({
        type: "BOOKMARK_SAVED",
        bookmarkId: bookmarkId,
      } as any);
      console.log("✅ Bookmark saved message sent to offscreen");
    } catch (error) {
      console.error("❌ Error saving bookmark:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      sendToExtensionParent(
        createErrorResponse(
          "BOOKMARK_SAVE_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }

  async function handleCreateCollection(collectionData: unknown) {
    console.log("📬 Received createCollection request from offscreen");
    console.log("📬 Collection data:", collectionData);
    console.log("📬 User ID check:", userRef.current?.uid ? "✅ Available" : "❌ Missing");

    if (!userRef.current?.uid) {
      console.error("❌ No user ID to create collection");
      sendToExtensionParent(
        createErrorResponse("COLLECTION_CREATE_ERROR", "No user ID")
      );
      return;
    }

    try {
      console.log("📬 Creating collection for user:", userRef.current.uid);
      const collectionPayload = {
        ...(collectionData as Record<string, unknown>),
        userId: userRef.current.uid,
      };

      const collectionId = await createCollection(collectionPayload as Parameters<typeof createCollection>[0]);
      console.log("✅ Collection created successfully with ID:", collectionId);
      console.log("📦 Sending collection created confirmation to offscreen");

      sendToExtensionParent({
        type: "COLLECTION_CREATED",
        collectionId: collectionId,
      } as any);
      console.log("✅ Collection created message sent to offscreen");
    } catch (error) {
      console.error("❌ Error creating collection:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      sendToExtensionParent(
        createErrorResponse(
          "COLLECTION_CREATE_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }

  async function handleGetNotificationSettings() {
    console.log("📬 Received getNotificationSettings request from offscreen");
    console.log("📬 User ID check:", userRef.current?.uid ? "✅ Available" : "❌ Missing");

    if (!userRef.current?.uid) {
      console.error("❌ No user ID to fetch notification settings");
      sendToExtensionParent(
        createErrorResponse("NOTIFICATION_SETTINGS_ERROR", "No user ID")
      );
      return;
    }

    try {
      console.log(
        "📬 Fetching notification settings for user:",
        userRef.current.uid
      );
      const settings = await getUserNotificationSettings(userRef.current.uid);
      console.log("✅ Notification settings fetched successfully:", settings);
      console.log("📦 Sending notification settings to offscreen:", settings);

      sendToExtensionParent({
        type: "NOTIFICATION_SETTINGS_DATA",
        ...settings,
      } as any);
      console.log("✅ Notification settings message sent to offscreen");
    } catch (error) {
      console.error("❌ Error fetching notification settings:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      sendToExtensionParent(
        createErrorResponse(
          "NOTIFICATION_SETTINGS_ERROR",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }
}
