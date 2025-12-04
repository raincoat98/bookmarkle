import type { Collection, Bookmark } from "../types";

// ============================================================================
// REQUEST TYPES (from Extension/offscreen)
// ============================================================================

export interface GetCollectionsRequest {
  getCollections: true;
}

export interface GetBookmarksRequest {
  getBookmarks: true;
  collectionId: string | null;
}

export interface SaveBookmarkRequest {
  saveBookmark: true;
  bookmarkData: {
    title: string;
    url: string;
    description?: string;
    collectionId?: string | null;
    tags?: string[];
    favicon?: string;
    isFavorite?: boolean;
    userId?: string;
  };
}

export interface CreateCollectionRequest {
  createCollection: true;
  collectionData: {
    name: string;
    description?: string;
    icon?: string;
    userId?: string;
  };
}

export interface GetNotificationSettingsRequest {
  getNotificationSettings: true;
}

export type ExtensionRequest =
  | GetCollectionsRequest
  | GetBookmarksRequest
  | SaveBookmarkRequest
  | CreateCollectionRequest
  | GetNotificationSettingsRequest;

// ============================================================================
// RESPONSE TYPES (to Extension/offscreen)
// ============================================================================

export interface IframeReadyResponse {
  type: "IFRAME_READY";
}

export interface LoginSuccessResponse {
  type: "LOGIN_SUCCESS";
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
  };
  idToken: string;
  collections: Collection[];
}

export interface CollectionsDataResponse {
  type: "COLLECTIONS_DATA";
  collections: Collection[];
}

export interface CollectionsErrorResponse {
  type: "COLLECTIONS_ERROR";
  message: string;
}

export interface BookmarksDataResponse {
  type: "BOOKMARKS_DATA";
  bookmarks: Bookmark[];
  collectionId: string | null;
}

export interface BookmarksErrorResponse {
  type: "BOOKMARKS_ERROR";
  message: string;
}

export interface BookmarkSavedResponse {
  type: "BOOKMARK_SAVED";
  bookmarkId: string;
}

export interface BookmarkSaveErrorResponse {
  type: "BOOKMARK_SAVE_ERROR";
  message: string;
}

export interface CollectionCreatedResponse {
  type: "COLLECTION_CREATED";
  collectionId: string;
}

export interface CollectionCreateErrorResponse {
  type: "COLLECTION_CREATE_ERROR";
  message: string;
}

export interface NotificationSettingsDataResponse {
  type: "NOTIFICATION_SETTINGS_DATA";
  [key: string]: unknown;
}

export interface NotificationSettingsErrorResponse {
  type: "NOTIFICATION_SETTINGS_ERROR";
  message: string;
}

export type ExtensionResponse =
  | IframeReadyResponse
  | LoginSuccessResponse
  | CollectionsDataResponse
  | CollectionsErrorResponse
  | BookmarksDataResponse
  | BookmarksErrorResponse
  | BookmarkSavedResponse
  | BookmarkSaveErrorResponse
  | CollectionCreatedResponse
  | CollectionCreateErrorResponse
  | NotificationSettingsDataResponse
  | NotificationSettingsErrorResponse;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isFirebaseInternalMessage(data: string): boolean {
  return typeof data === "string" && data.startsWith("!_{");
}

export function isExtensionRequest(data: unknown): data is ExtensionRequest {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    (typeof obj.getCollections === "boolean" && obj.getCollections) ||
    (typeof obj.getBookmarks === "boolean" && obj.getBookmarks) ||
    (typeof obj.saveBookmark === "boolean" && obj.saveBookmark) ||
    (typeof obj.createCollection === "boolean" && obj.createCollection) ||
    (typeof obj.getNotificationSettings === "boolean" && obj.getNotificationSettings)
  );
}

export function parseMessageData(data: unknown): ExtensionRequest | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ExtensionRequest;
    } catch {
      return null;
    }
  }

  if (typeof data === "object" && data !== null) {
    if (isExtensionRequest(data)) {
      return data;
    }
  }

  return null;
}

// ============================================================================
// MESSAGE HELPERS
// ============================================================================

export function createIframeReadyMessage(): IframeReadyResponse {
  return { type: "IFRAME_READY" };
}

export function createLoginSuccessMessage(
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  },
  idToken: string,
  collections: Collection[]
): LoginSuccessResponse {
  return {
    type: "LOGIN_SUCCESS",
    user: {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
    },
    idToken,
    collections,
  };
}

export function createSuccessResponse(
  type: string,
  payload: Record<string, unknown>
): ExtensionResponse {
  return {
    type: type as ExtensionResponse["type"],
    ...payload,
  } as ExtensionResponse;
}

export function createErrorResponse(
  type: string,
  message: string
): ExtensionResponse {
  return {
    type: type as ExtensionResponse["type"],
    message,
  } as ExtensionResponse;
}

// ============================================================================
// MESSAGE SENDER
// ============================================================================

export function sendToExtensionParent(
  message: ExtensionResponse,
  targetOrigin: string = "*"
): void {
  try {
    window.parent.postMessage(message, targetOrigin);
  } catch (error) {
    console.error("Failed to send message to extension parent:", error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getExtensionId(location: { search: string }): string | null {
  try {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("extensionId");
  } catch {
    return null;
  }
}

export function getExtensionSource(location: { search: string }): string | null {
  try {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("source");
  } catch {
    return null;
  }
}

export function isExtensionContext(location: { search: string }): boolean {
  return getExtensionSource(location) === "extension";
}
