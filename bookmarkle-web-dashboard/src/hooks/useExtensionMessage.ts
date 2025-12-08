import { useEffect, useRef } from "react";
import {
  isFirebaseInternalMessage,
  parseMessageData,
  sendToExtensionParent,
  createErrorResponse,
  createIframeReadyMessage,
} from "../utils/extensionMessaging";
import {
  getUserNotificationSettings,
} from "../utils/firestoreService";
import { auth } from "../firebase";
import type { User } from "firebase/auth";

interface UseExtensionMessageOptions {
  user: User | null;
}

export function useExtensionMessage({ user }: UseExtensionMessageOptions) {
  const userRef = useRef(user);

  // Keep userRef in sync with current user
  useEffect(() => {
    console.log("🔄 useExtensionMessage user updated:", user?.uid);
    userRef.current = user;
  }, [user]);

  // Setup message listener once on mount
  useEffect(() => {
    console.log("📌 useExtensionMessage hook mounted, initial user:", {
      hasUser: !!user,
      userId: user?.uid,
      userEmail: user?.email,
    });

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
          await handleGetCollections(
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("getBookmarks" in data && data.getBookmarks) {
          await handleGetBookmarks(
            ("collectionId" in data ? data.collectionId : null) as string | null,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("saveBookmark" in data && data.saveBookmark) {
          console.log("🔍 saveBookmark message data:", data);
          console.log("🔍 userId in message:", "userId" in data ? data.userId : "NOT FOUND");
          console.log("🔍 idToken in message:", "idToken" in data ? "✅ Present" : "❌ Missing");
          await handleSaveBookmark(
            ("bookmarkData" in data ? data.bookmarkData : null) as unknown,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
        } else if ("createCollection" in data && data.createCollection) {
          await handleCreateCollection(
            ("collectionData" in data ? data.collectionData : null) as unknown,
            ("userId" in data ? data.userId : null) as string | null,
            ("idToken" in data ? data.idToken : null) as string | null
          );
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

  async function handleGetCollections(userId?: string | null, idToken?: string | null) {
    console.log("📬 Received getCollections request from offscreen");
    console.log("📬 Request userId:", userId);
    console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

    const effectiveUserId = userId || userRef.current?.uid;

    if (!effectiveUserId || !idToken) {
      console.error("❌ Missing userId or idToken for collections");
      sendToExtensionParent(
        createErrorResponse("COLLECTIONS_ERROR", "Missing authentication")
      );
      return;
    }

    try {
      console.log("📬 Fetching collections via Firestore REST API...");
      
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/collections?pageSize=1000`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Firestore API error: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const documents = result.documents || [];
      
      // Convert Firestore REST format to collection objects
      const collections = documents
        .map((doc: any) => {
          const fields = doc.fields || {};
          const docId = doc.name.split("/").pop();
          
          // Only return collections for this user
          if (fields.userId?.stringValue !== effectiveUserId) {
            return null;
          }
          
          return {
            id: docId,
            name: fields.name?.stringValue || "",
            userId: fields.userId?.stringValue || "",
            description: fields.description?.stringValue || "",
            icon: fields.icon?.stringValue || null,
            color: fields.color?.stringValue || null,
            isDefault: fields.isDefault?.booleanValue || false,
            order: fields.order?.integerValue ? parseInt(fields.order.integerValue) : 0,
            createdAt: fields.createdAt?.timestampValue 
              ? new Date(fields.createdAt.timestampValue) 
              : new Date(),
            updatedAt: fields.updatedAt?.timestampValue 
              ? new Date(fields.updatedAt.timestampValue) 
              : new Date(),
          };
        })
        .filter((c: any) => c !== null);

      console.log("✅ Collections fetched successfully:", collections.length, "items");

      sendToExtensionParent({
        type: "COLLECTIONS_DATA",
        collections: collections,
      } as any);
      console.log("✅ Collections data sent back to offscreen");
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

  async function handleGetBookmarks(collectionId: string | null, userId?: string | null, idToken?: string | null) {
    console.log(
      "📬 Received getBookmarks request from offscreen, collectionId:",
      collectionId
    );
    console.log("📬 Request userId:", userId);
    console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

    const effectiveUserId = userId || userRef.current?.uid;

    if (!effectiveUserId || !idToken) {
      console.error("❌ Missing userId or idToken for bookmarks");
      sendToExtensionParent(
        createErrorResponse("BOOKMARKS_ERROR", "Missing authentication")
      );
      return;
    }

    try {
      console.log("📬 Fetching bookmarks via Firestore REST API...");
      
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      
      // Query with userId filter (and optionally collectionId)
      let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bookmarks?pageSize=1000`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Firestore API error: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const documents = result.documents || [];
      
      // Convert Firestore REST format to bookmark objects and filter
      const bookmarks = documents
        .map((doc: any) => {
          const fields = doc.fields || {};
          const docId = doc.name.split("/").pop();
          
          // Filter by userId
          if (fields.userId?.stringValue !== effectiveUserId) {
            return null;
          }
          
          // Filter by collectionId if specified
          if (collectionId !== null) {
            const bookmarkCollectionId = fields.collectionId?.stringValue || null;
            if (bookmarkCollectionId !== collectionId) {
              return null;
            }
          }
          
          return {
            id: docId,
            userId: fields.userId?.stringValue || "",
            title: fields.title?.stringValue || "",
            url: fields.url?.stringValue || "",
            description: fields.description?.stringValue || "",
            collectionId: fields.collectionId?.stringValue || null,
            favicon: fields.favicon?.stringValue || null,
            tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
            createdAt: fields.createdAt?.timestampValue 
              ? new Date(fields.createdAt.timestampValue) 
              : new Date(),
            updatedAt: fields.updatedAt?.timestampValue 
              ? new Date(fields.updatedAt.timestampValue) 
              : new Date(),
          };
        })
        .filter((b: any) => b !== null);

      console.log("✅ Bookmarks fetched successfully:", bookmarks.length, "items");

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

  async function handleSaveBookmark(bookmarkData: unknown, userId?: string | null, idToken?: string | null) {
    console.log("📬 Received saveBookmark request from offscreen");
    console.log("📬 Bookmark data:", bookmarkData);
    console.log("📬 Request userId parameter:", userId);
    console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

    const effectiveUserId = userId || userRef.current?.uid || auth.currentUser?.uid;
    console.log("📬 Effective userId:", effectiveUserId);

    if (!effectiveUserId || !idToken) {
      console.error("❌ Missing userId or idToken");
      sendToExtensionParent(
        createErrorResponse("BOOKMARK_SAVE_ERROR", "Missing authentication")
      );
      return;
    }

    try {
      console.log("📬 Saving bookmark via Firestore REST API with idToken...");
      
      // Firestore REST API를 사용하여 idToken으로 인증된 요청 보내기
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const bookmarkPayload = {
        fields: {
          userId: { stringValue: effectiveUserId },
          title: { stringValue: (bookmarkData as any).title || "" },
          url: { stringValue: (bookmarkData as any).url || "" },
          description: { stringValue: (bookmarkData as any).description || "" },
          collectionId: (bookmarkData as any).collectionId 
            ? { stringValue: (bookmarkData as any).collectionId }
            : { nullValue: null },
          favicon: (bookmarkData as any).favicon
            ? { stringValue: (bookmarkData as any).favicon }
            : { nullValue: null },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      };

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bookmarks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify(bookmarkPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Firestore API error: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const bookmarkId = result.name.split("/").pop();
      
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

  async function handleCreateCollection(collectionData: unknown, userId?: string | null, idToken?: string | null) {
    console.log("📬 Received createCollection request from offscreen");
    console.log("📬 Collection data:", collectionData);
    console.log("📬 Request userId:", userId);
    console.log("📬 Request idToken:", idToken ? "✅ Present" : "❌ Missing");

    const effectiveUserId = userId || userRef.current?.uid;

    if (!effectiveUserId || !idToken) {
      console.error("❌ Missing userId or idToken for collection creation");
      sendToExtensionParent(
        createErrorResponse("COLLECTION_CREATE_ERROR", "Missing authentication")
      );
      return;
    }

    try {
      console.log("📬 Creating collection via Firestore REST API...");
      
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const collectionPayload = {
        fields: {
          userId: { stringValue: effectiveUserId },
          name: { stringValue: (collectionData as any).name || "" },
          description: { stringValue: (collectionData as any).description || "" },
          icon: (collectionData as any).icon
            ? { stringValue: (collectionData as any).icon }
            : { nullValue: null },
          color: (collectionData as any).color
            ? { stringValue: (collectionData as any).color }
            : { nullValue: null },
          isDefault: { booleanValue: (collectionData as any).isDefault || false },
          order: { integerValue: (collectionData as any).order || 0 },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      };

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/collections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify(collectionPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Firestore API error: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const collectionId = result.name.split("/").pop();
      
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
