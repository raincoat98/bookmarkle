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

    // IFRAME_READY 전송 시 현재 인증 상태도 함께 전송 (초기 부트스트랩)
    // 웹에서 이미 로그인되어 있으면 offscreen이 즉시 토큰을 받을 수 있도록
    waitForFirebaseUser()
      .then((user) => {
        if (user) {
          return user.getIdToken().then((idToken) => {
            window.parent.postMessage(
              {
                type: "AUTH_STATE_CHANGED",
                user: {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                },
                idToken,
              },
              "*"
            );
            console.log(
              "📤 [tokenMessageHandler] Sent initial auth state to parent:",
              user.email || user.uid
            );
          });
        }
      })
      .catch((error) => {
        console.warn(
          "⚠️ [tokenMessageHandler] Failed to send initial auth state:",
          error
        );
      });
  }

  // 중복 처리 방지를 위한 마지막 처리된 상태 추적
  let lastProcessedExtensionState: {
    userId?: string;
    idToken?: string;
  } | null = null;

  const handleMessage = async (event: MessageEvent) => {
    const data = event.data;
    if (!data) return;

    if (data.type === "AUTH_STATE_CHANGED") {
      // extension에서 받은 인증 정보인 경우 authStore에 직접 동기화
      if (data.fromExtension && data.payload) {
        const { user: extensionUser, idToken } = data.payload;
        const authStore = useAuthStore.getState();

        // 중복 처리 방지: 같은 상태면 무시
        const currentStateKey = extensionUser
          ? `${extensionUser.uid}:${idToken?.slice(0, 20)}`
          : "null";
        const lastStateKey = lastProcessedExtensionState
          ? lastProcessedExtensionState.userId
            ? `${lastProcessedExtensionState.userId}:${lastProcessedExtensionState.idToken?.slice(0, 20)}`
            : "null"
          : null;

        if (currentStateKey === lastStateKey) {
          console.log(
            "⏭️ [tokenMessageHandler] Skipping duplicate extension auth state:",
            currentStateKey
          );
          return;
        }

        // extension에서 사용자 정보가 있고, 현재 Firebase Auth 상태와 다른 경우
        if (extensionUser) {
          const currentUser = auth.currentUser;

          // 현재 사용자가 없거나 다른 사용자인 경우
          if (!currentUser || currentUser.uid !== extensionUser.uid) {
            console.log(
              "🔄 [tokenMessageHandler] Syncing auth state from extension:",
              extensionUser.uid
            );

            // extension에서 받은 정보를 사용해서 authStore 상태 업데이트
            // Firebase Auth User 객체는 직접 만들 수 없으므로,
            // extension에서 받은 직렬화된 사용자 정보를 authStore에 저장
            // (User 타입이 아니지만, 최소한의 정보를 유지)
            if (idToken) {
              authStore.setIdToken(idToken);
            }
            
            // extension에서 받은 사용자 정보를 authStore에 저장
            // serializeUser로 직렬화된 객체이므로, User 타입으로 캐스팅
            authStore.setUser(extensionUser as User);

            // loading을 false로 설정하여 로그인 페이지로 이동하지 않도록 함
            authStore.setLoading(false);

            // 처리된 상태 기록
            lastProcessedExtensionState = {
              userId: extensionUser.uid,
              idToken: idToken || undefined,
            };

            // Firebase Auth 상태 확인 및 동기화 시도
            if (!currentUser) {
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
            }
          } else {
            // 같은 사용자인 경우 idToken만 업데이트 (변경된 경우에만)
            if (idToken && idToken !== authStore.idToken) {
              authStore.setIdToken(idToken);
              lastProcessedExtensionState = {
                userId: extensionUser.uid,
                idToken: idToken,
              };
            }
          }
        } else {
          // extension에서 로그아웃 상태(null)를 보낸 경우
          // 이미 로그아웃 상태면 중복 처리 방지 (웹에서 직접 로그아웃한 경우)
          if (authStore.user === null && authStore.idToken === null) {
            console.log(
              "ℹ️ [tokenMessageHandler] Extension sent null (logout), but already logged out, skipping duplicate cleanup"
            );
            return;
          }

          console.log(
            "🔄 [tokenMessageHandler] Extension sent null (logout), clearing auth state"
          );
          useAuthStore.setState({
            user: null,
            idToken: null,
            loading: false,
          });
          lastProcessedExtensionState = null;
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
