import { auth } from "../firebase";
import { useCollectionStore } from "../stores/collectionStore";
import { onAuthStateChanged, type User } from "firebase/auth";

declare global {
  interface Window {
    toast?: {
      warn?: (msg: string) => void;
      error?: (msg: string) => void;
    };
  }
}

function getRefreshTokenFromUser(user: User | null): string | null {
  if (!user) return null;
  const sts = (user as { stsTokenManager?: { refreshToken?: string } }).stsTokenManager;
  if (sts?.refreshToken) return sts.refreshToken;
  return (user as { refreshToken?: string }).refreshToken ?? null;
}

function serializeUser(user: User | null) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
  };
}

type InternalAuth = typeof auth & {
  _initializationPromise?: Promise<void>;
};

let authInitializationComplete = false;
let authInitializationPromise: Promise<void> | null = null;

async function waitForAuthInitialization() {
  if (authInitializationComplete) {
    return;
  }

  if (!authInitializationPromise) {
    const internalAuth = auth as InternalAuth;
    if (internalAuth._initializationPromise) {
      authInitializationPromise = internalAuth._initializationPromise.catch((error) => {
        console.warn("⚠️ [tokenMessageHandler] Auth initialization error:", error);
      });
    } else {
      authInitializationPromise = new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, () => {
          unsubscribe();
          resolve();
        });
      });
    }
  }

  await authInitializationPromise;
  authInitializationComplete = true;
}

async function waitForFirebaseUser(): Promise<User | null> {
  await waitForAuthInitialization();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function emitCurrentAuthState() {
  try {
    const user = await waitForFirebaseUser();
    if (!user) {
      console.log("📤 [tokenMessageHandler] Emitting auth state: no user");
      window.postMessage(
        {
          source: "bookmarkhub",
          type: "AUTH_STATE_CHANGED",
          payload: {
            user: null,
            idToken: null,
            refreshToken: null,
          },
        },
        window.location.origin
      );
      return;
    }

    const idToken = await user.getIdToken();
    const refreshToken = getRefreshTokenFromUser(user);
    console.log("📤 [tokenMessageHandler] Emitting auth state for user:", user.uid);
    window.postMessage(
      {
        source: "bookmarkhub",
        type: "AUTH_STATE_CHANGED",
        payload: {
          user: serializeUser(user),
          idToken,
          refreshToken,
        },
      },
      window.location.origin
    );
  } catch (error) {
    console.error("❌ [tokenMessageHandler] Failed to emit auth state:", error);
    window.postMessage(
      {
        source: "bookmarkhub",
        type: "AUTH_STATE_CHANGED",
        payload: {
          user: null,
          idToken: null,
          refreshToken: null,
        },
      },
      window.location.origin
    );
  }
}

export function initializeTokenMessageHandler() {
  console.log("🔐 [tokenMessageHandler] Initialized - listening for AUTH_STATE_CHANGED");

  const isIframeMode = new URLSearchParams(window.location.search).get("iframe") === "true";

  if (isIframeMode && window.parent !== window) {
    window.parent.postMessage({ type: "IFRAME_READY" }, "*");
    console.log("📤 [tokenMessageHandler] Sent IFRAME_READY to parent");
  }

  const handleMessage = async (event: MessageEvent) => {
    const data = event.data;
    if (!data) return;

    if (data.type === "AUTH_STATE_CHANGED") {
      if (!data.idToken && data.user) {
        window.toast?.warn?.("세션 동기화 실패: 다시 로그인 해주세요.");
      }
      return;
    }

    if (data.type === "COLLECTIONS_UPDATED") {
      if (!data.fromExtension) {
        return;
      }
      const user = auth.currentUser;
      if (user) {
        const { fetchCollections } = useCollectionStore.getState();
        await fetchCollections(user.uid);
      }
      return;
    }

    if (data.type === "GET_FRESH_ID_TOKEN") {
      const port = event.ports[0];
      if (!port) {
        console.error("❌ [tokenMessageHandler] No MessageChannel port provided");
        return;
      }

      try {
        console.log("📨 [tokenMessageHandler] GET_FRESH_ID_TOKEN received");
        const user = await waitForFirebaseUser();
        if (!user) {
          port.postMessage({
            type: "FRESH_ID_TOKEN",
            idToken: null,
            user: null,
            error: "NO_USER",
          });
          return;
        }

        const idToken = await user.getIdToken(true);
        const refreshToken = getRefreshTokenFromUser(user);
        const serializedUser = serializeUser(user);
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken,
          refreshToken,
          user: serializedUser,
        });
      } catch (error) {
        console.error("❌ [tokenMessageHandler] Error getting fresh token:", error);
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken: null,
          user: null,
          error: (error as Error).message ?? String(error),
        });
      }
    }

    if (data.type === "EXTENSION_REQUEST_AUTH_STATE") {
      console.log("📨 [tokenMessageHandler] EXTENSION_REQUEST_AUTH_STATE received");
      emitCurrentAuthState().catch((error) => {
        console.error("❌ [tokenMessageHandler] Failed to emit auth state on request:", error);
      });
      return;
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
