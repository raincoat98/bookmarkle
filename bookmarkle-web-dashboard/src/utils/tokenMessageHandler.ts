import { auth } from "../firebase";
import { useCollectionStore } from "../stores/collectionStore";

declare global {
  interface Window {
    toast?: {
      warn?: (msg: string) => void;
      error?: (msg: string) => void;
    };
  }
}

function getRefreshTokenFromUser(user: typeof auth.currentUser | null): string | null {
  if (!user) return null;
  const sts = (user as { stsTokenManager?: { refreshToken?: string } }).stsTokenManager;
  if (sts?.refreshToken) return sts.refreshToken;
  return (user as { refreshToken?: string }).refreshToken ?? null;
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
        const user = auth.currentUser;
        if (!user) {
          port.postMessage({
            type: "FRESH_ID_TOKEN",
            idToken: null,
            error: "NO_USER",
          });
          return;
        }

        const idToken = await user.getIdToken(true);
        const refreshToken = getRefreshTokenFromUser(user);
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken,
          refreshToken,
        });
      } catch (error) {
        console.error("❌ [tokenMessageHandler] Error getting fresh token:", error);
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken: null,
          error: (error as Error).message ?? String(error),
        });
      }
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}
