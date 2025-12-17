import { auth } from "../firebase";
import { useCollectionStore } from "../stores/collectionStore";
import { useAuthStore } from "../stores/authStore";
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
  const sts = (user as { stsTokenManager?: { refreshToken?: string } })
    .stsTokenManager;
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

// tokenMessageHandler 초기화 상태 추적
let tokenMessageHandlerInitialized = false;
let tokenMessageHandlerCleanup: (() => void) | null = null;

async function waitForAuthInitialization() {
  if (authInitializationComplete) {
    return;
  }

  if (!authInitializationPromise) {
    const internalAuth = auth as InternalAuth;
    if (internalAuth._initializationPromise) {
      authInitializationPromise = internalAuth._initializationPromise.catch(
        (error) => {
          console.warn(
            "⚠️ [tokenMessageHandler] Auth initialization error:",
            error
          );
        }
      );
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
    console.log(
      "📤 [tokenMessageHandler] Emitting auth state for user:",
      user.uid
    );
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
  // 이미 초기화되었으면 기존 cleanup 함수 반환
  if (tokenMessageHandlerInitialized && tokenMessageHandlerCleanup) {
    console.log(
      "⚠️ [tokenMessageHandler] Already initialized, skipping duplicate initialization"
    );
    return tokenMessageHandlerCleanup;
  }

  // 이전 리스너가 있으면 정리
  if (tokenMessageHandlerCleanup) {
    tokenMessageHandlerCleanup();
  }

  console.log(
    "🔐 [tokenMessageHandler] Initialized - listening for AUTH_STATE_CHANGED"
  );

  const isIframeMode =
    new URLSearchParams(window.location.search).get("iframe") === "true";

  if (isIframeMode && window.parent !== window) {
    window.parent.postMessage({ type: "IFRAME_READY" }, "*");
    console.log("📤 [tokenMessageHandler] Sent IFRAME_READY to parent");
  }

  const handleMessage = async (event: MessageEvent) => {
    const data = event.data;
    if (!data) return;

    if (data.type === "AUTH_STATE_CHANGED") {
      // extension에서 받은 인증 정보인 경우
      if (data.fromExtension && data.payload) {
        const { user: extensionUser, idToken } = data.payload;
        const authStore = useAuthStore.getState();
        const currentUser = auth.currentUser;

        // 웹의 로그인 상태가 우선: 웹에 이미 다른 사용자가 로그인되어 있으면 익스텐션 상태 무시
        if (currentUser && extensionUser && currentUser.uid !== extensionUser.uid) {
          console.log(
            "⚠️ [tokenMessageHandler] Extension sent different user, ignoring (web auth state takes priority):",
            {
              webUser: currentUser.uid,
              extensionUser: extensionUser.uid,
            }
          );
          // 웹의 현재 로그인 상태를 익스텐션에 알림
          emitCurrentAuthState().catch((error) => {
            console.error(
              "❌ [tokenMessageHandler] Failed to emit web auth state to extension:",
              error
            );
          });
          return;
        }

        // extension에서 사용자 정보가 있고, 현재 Firebase Auth 상태와 다른 경우
        if (extensionUser) {
          // 현재 사용자가 없거나 다른 사용자인 경우
          if (!currentUser || currentUser.uid !== extensionUser.uid) {
            // 웹에 사용자가 없고 익스텐션에 사용자가 있는 경우에만 동기화
            if (!currentUser) {
              console.log(
                "🔄 [tokenMessageHandler] No web user, syncing auth state from extension:",
                extensionUser.uid
              );

              // extension에서 받은 정보를 사용해서 authStore 상태 업데이트
              // Firebase Auth User 객체는 직접 만들 수 없으므로,
              // extension 정보를 사용해서 임시로 상태를 유지
              // 실제 Firebase Auth 상태는 나중에 동기화됨
              if (idToken) {
                authStore.setIdToken(idToken);
              }

              // loading을 false로 설정하여 로그인 페이지로 이동하지 않도록 함
              authStore.setLoading(false);

              // Firebase Auth 초기화 대기 후 상태 확인
              waitForAuthInitialization()
                .then(() => {
                  const userAfterInit = auth.currentUser;
                  if (
                    !userAfterInit ||
                    userAfterInit.uid !== extensionUser.uid
                  ) {
                    console.log(
                      "⚠️ [tokenMessageHandler] Firebase Auth state mismatch with extension, keeping extension state"
                    );
                    // Firebase Auth 상태가 extension과 다르면, extension 정보를 우선시
                    // authStore의 user는 Firebase Auth의 onAuthStateChanged가 업데이트할 때까지 유지
                  } else {
                    // 같은 사용자인 경우 정상 동기화됨
                    console.log(
                      "✅ [tokenMessageHandler] Firebase Auth state synced with extension"
                    );
                  }
                })
                .catch((error) => {
                  console.warn(
                    "⚠️ [tokenMessageHandler] Failed to check Firebase Auth state:",
                    error
                  );
                });
            } else {
              // 웹에 다른 사용자가 있는 경우 무시 (이미 위에서 처리됨)
              console.log(
                "⚠️ [tokenMessageHandler] Web has different user, ignoring extension state"
              );
            }
          } else {
            // 같은 사용자인 경우 idToken만 업데이트
            if (idToken) {
              authStore.setIdToken(idToken);
            }
          }
        } else {
          // extension에서 로그아웃 상태(null)를 보낸 경우
          // 웹에 사용자가 있으면 익스텐션의 로그아웃 상태를 무시
          if (currentUser) {
            console.log(
              "⚠️ [tokenMessageHandler] Extension sent logout but web is logged in, ignoring (web auth state takes priority)"
            );
            // 웹의 현재 로그인 상태를 익스텐션에 알림
            emitCurrentAuthState().catch((error) => {
              console.error(
                "❌ [tokenMessageHandler] Failed to emit web auth state to extension:",
                error
              );
            });
            return;
          }

          // 웹에도 사용자가 없는 경우에만 익스텐션의 로그아웃 상태를 처리
          console.log(
            "⚠️ [tokenMessageHandler] Extension sent null, ignoring completely (actual logout handled by Firebase Auth)"
          );
          // idToken과 user는 Firebase Auth에서 관리하므로 유지
        }
      } else {
        // 웹에서 직접 보낸 인증 상태 변경 (기존 로직)
        if (!data.idToken && data.user) {
          window.toast?.warn?.("세션 동기화 실패: 다시 로그인 해주세요.");
        }
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
        console.error(
          "❌ [tokenMessageHandler] No MessageChannel port provided"
        );
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
        console.error(
          "❌ [tokenMessageHandler] Error getting fresh token:",
          error
        );
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken: null,
          user: null,
          error: (error as Error).message ?? String(error),
        });
      }
    }

    if (data.type === "EXTENSION_REQUEST_AUTH_STATE") {
      console.log(
        "📨 [tokenMessageHandler] EXTENSION_REQUEST_AUTH_STATE received"
      );
      emitCurrentAuthState().catch((error) => {
        console.error(
          "❌ [tokenMessageHandler] Failed to emit auth state on request:",
          error
        );
      });
      return;
    }
  };

  window.addEventListener("message", handleMessage);

  tokenMessageHandlerInitialized = true;
  tokenMessageHandlerCleanup = () => {
    window.removeEventListener("message", handleMessage);
    tokenMessageHandlerInitialized = false;
    tokenMessageHandlerCleanup = null;
    console.log("🧹 [tokenMessageHandler] Cleaned up");
  };

  return tokenMessageHandlerCleanup;
}
