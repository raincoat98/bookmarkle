(() => {
  const { firebaseConfig } = window.OffscreenEnv || {};

  if (!firebaseConfig) {
    console.error("❌ [offscreen] Missing firebaseConfig for auth module");
    return;
  }

  let currentUser = null;
  let currentIdToken = null;
  let currentRefreshToken = null;
  let tokenExpiresAt = 0;
  let authRestorePromise = restoreAuthFromStorage();
  let refreshingTokenPromise = null;
  let iframeReady = false;
  const iframeReadyWaiters = [];
  const IFRAME_READY_TIMEOUT = 5000;

  document.addEventListener("DOMContentLoaded", configureIframeSrc);
  window.addEventListener("message", handleIframeMessage);

  function parseJwtExp(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000;
    } catch {
      return 0;
    }
  }

  function persistAuthSnapshot() {
    if (!chrome.storage?.local) return;
    if (!currentUser && !currentIdToken && !currentRefreshToken) {
      chrome.storage.local.remove([
        "currentUser",
        "currentIdToken",
        "currentRefreshToken",
        "lastLoginTime",
      ]);
      return;
    }

    chrome.storage.local.set({
      currentUser,
      currentIdToken,
      currentRefreshToken,
      lastLoginTime: Date.now(),
    });
  }

  function restoreAuthFromStorage() {
    if (!chrome.storage?.local) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          "currentUser",
          "currentIdToken",
          "currentRefreshToken",
          "lastLoginTime",
        ],
        async (result) => {
          if (!result.currentUser) {
            resolve(false);
            return;
          }

          const hoursSinceLogin =
            (Date.now() - result.lastLoginTime) / (1000 * 60 * 60);
          if (hoursSinceLogin >= 24) {
            chrome.storage.local.remove([
              "currentUser",
              "currentIdToken",
              "currentRefreshToken",
              "lastLoginTime",
            ]);
            resolve(false);
            return;
          }

          currentUser = result.currentUser;
          currentIdToken = result.currentIdToken || null;
          currentRefreshToken = result.currentRefreshToken || null;
          if (currentIdToken) {
            tokenExpiresAt = parseJwtExp(currentIdToken);
          }

          if (!currentIdToken && currentRefreshToken) {
            try {
              await refreshIdTokenUsingRefreshToken();
            } catch (error) {
              console.warn(
                "⚠️ [offscreen] Failed to refresh token during restore:",
                error.message
              );
            }
          }

          if (currentUser) {
            console.log(
              "🔄 [offscreen] Restored auth from storage:",
              currentUser.email || currentUser.uid
            );
          }
          resolve(!!currentIdToken);
        }
      );
    });
  }

  async function ensureAuthReady() {
    if (authRestorePromise) {
      await authRestorePromise;
      authRestorePromise = null;
    }
  }

  function configureIframeSrc() {
    const iframe = document.getElementById("auth-iframe");
    if (!iframe) return;

    try {
      const baseSrc = iframe.getAttribute("src") || "";
      const url = new URL(baseSrc, location.origin);
      url.searchParams.set("extension", "true");
      url.searchParams.set("iframe", "true");
      const extId = chrome.runtime?.id || "";
      if (extId) {
        url.searchParams.set("extensionId", extId);
      }
      iframe.setAttribute("src", url.toString());
    } catch (error) {
      console.warn("⚠️ [offscreen] Failed to configure iframe src:", error);
    }
  }

  function markIframeReady() {
    if (iframeReady) return;
    iframeReady = true;
    while (iframeReadyWaiters.length) {
      const waiter = iframeReadyWaiters.shift();
      if (!waiter) continue;
      clearTimeout(waiter.timeoutId);
      waiter.resolve();
    }
  }

  function waitForIframeReady() {
    if (iframeReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = iframeReadyWaiters.findIndex(
          (entry) => entry.timeoutId === timeoutId
        );
        if (index >= 0) {
          iframeReadyWaiters.splice(index, 1);
        }
        reject(new Error("IFRAME_READY_TIMEOUT"));
      }, IFRAME_READY_TIMEOUT);

      iframeReadyWaiters.push({ resolve, reject, timeoutId });
    });
  }

  function handleIframeMessage(event) {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === "IFRAME_READY") {
      markIframeReady();
      return;
    }

    if (msg.type === "AUTH_STATE_CHANGED") {
      const payload = msg.payload ?? msg;
      const nextUser = payload?.user ?? null;
      const nextIdToken = payload?.idToken ?? null;
      const nextRefreshToken = payload?.refreshToken ?? null;

      if (nextUser && nextIdToken) {
        currentUser = nextUser;
        currentIdToken = nextIdToken;
        tokenExpiresAt = parseJwtExp(currentIdToken);
        if (nextRefreshToken) currentRefreshToken = nextRefreshToken;
        persistAuthSnapshot();
        console.log(
          "✅ [offscreen] AUTH_STATE_CHANGED received from iframe:",
          currentUser.email || currentUser.uid
        );
      } else {
        clearAuthState();
        console.log(
          "✅ [offscreen] AUTH_STATE_CHANGED logout received from iframe"
        );
      }

      // background로 실시간 인증 상태 변경 알림 전송
      notifyBackgroundAuthStateChanged({
        user: currentUser,
        idToken: currentIdToken,
        refreshToken: currentRefreshToken,
      });
    }
  }

  function notifyBackgroundAuthStateChanged(authState) {
    chrome.runtime.sendMessage(
      {
        type: "OFFSCREEN_AUTH_STATE_CHANGED_TO_BACKGROUND",
        user: authState.user,
        idToken: authState.idToken,
        refreshToken: authState.refreshToken,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "⚠️ [offscreen] Failed to notify background of auth state change:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log(
            "✅ [offscreen] Auth state change notified to background"
          );
        }
      }
    );
  }

  function clearAuthState() {
    currentUser = null;
    currentIdToken = null;
    currentRefreshToken = null;
    tokenExpiresAt = 0;
    persistAuthSnapshot();
  }

  async function getFreshIdTokenFromIframe() {
    await waitForIframeReady();
    return new Promise((resolve, reject) => {
      const iframe = document.getElementById("auth-iframe");
      if (!iframe || !iframe.contentWindow) {
        return reject(new Error("IFRAME_NOT_READY"));
      }

      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        reject(new Error("IFRAME_TOKEN_TIMEOUT"));
      }, 5000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        const { type, idToken, refreshToken, error, user } = event.data || {};
        if (type === "FRESH_ID_TOKEN" && idToken) {
          resolve({
            idToken,
            refreshToken: refreshToken || null,
            user: user || null,
          });
        } else {
          reject(new Error(error || "IFRAME_NO_TOKEN"));
        }
      };

      iframe.contentWindow.postMessage({ type: "GET_FRESH_ID_TOKEN" }, "*", [
        channel.port2,
      ]);
    });
  }

  async function refreshIdTokenUsingRefreshToken() {
    if (!currentRefreshToken) throw new Error("NO_REFRESH_TOKEN");
    if (refreshingTokenPromise) return refreshingTokenPromise;

    const url = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
    });

    refreshingTokenPromise = (async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const data = await response.json();
      if (!response.ok || !data.id_token) {
        throw new Error(data.error?.message || "REFRESH_FAILED");
      }
      currentIdToken = data.id_token;
      tokenExpiresAt = parseJwtExp(currentIdToken);
      if (data.refresh_token) {
        currentRefreshToken = data.refresh_token;
      }
      persistAuthSnapshot();
      console.log("✅ [offscreen] Token refreshed via refresh_token");
      return currentIdToken;
    })().finally(() => {
      refreshingTokenPromise = null;
    });

    return refreshingTokenPromise;
  }

  async function ensureFreshIdToken() {
    await ensureAuthReady();

    const now = Date.now();
    const needsBootstrap = !currentUser;
    const isExpired =
      !currentIdToken || (tokenExpiresAt && tokenExpiresAt <= now);
    const isExpiringSoon =
      tokenExpiresAt && tokenExpiresAt - now < 5 * 60 * 1000;

    if (!needsBootstrap && !isExpired && !isExpiringSoon) {
      return;
    }

    if (!needsBootstrap && currentRefreshToken) {
      try {
        await refreshIdTokenUsingRefreshToken();
        return;
      } catch (error) {
        console.warn(
          "⚠️ [offscreen] Refresh via refresh_token failed:",
          error.message
        );
      }
    }

    try {
      const { idToken, refreshToken, user } = await getFreshIdTokenFromIframe();
      currentIdToken = idToken;
      tokenExpiresAt = parseJwtExp(currentIdToken);
      if (refreshToken) currentRefreshToken = refreshToken;
      if (user) {
        currentUser = user;
      }
      persistAuthSnapshot();
      console.log("✅ [offscreen] Token refreshed via iframe");
    } catch (error) {
      if (error.message === "NO_USER" || error.message === "IFRAME_NO_TOKEN") {
        if (needsBootstrap) {
          clearAuthState();
        }
        return;
      }
      throw error;
    }
  }

  function postAuthStateToIframe() {
    const iframe = document.getElementById("auth-iframe");
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        type: "AUTH_STATE_CHANGED",
        user: currentUser,
        idToken: currentIdToken,
        refreshToken: currentRefreshToken,
      },
      "*"
    );
  }

  async function handleBackgroundAuthUpdate(msg) {
    if (!msg.user) {
      clearAuthState();
      postAuthStateToIframe();
      return;
    }

    currentUser = msg.user;
    if (msg.idToken) {
      currentIdToken = msg.idToken;
      tokenExpiresAt = parseJwtExp(currentIdToken);
    } else {
      currentIdToken = null;
      tokenExpiresAt = 0;
    }
    if (msg.refreshToken) {
      currentRefreshToken = msg.refreshToken;
    }
    if (!currentIdToken) {
      try {
        await ensureFreshIdToken();
      } catch (error) {
        console.warn(
          "⚠️ [offscreen] Failed to refresh token from background payload:",
          error.message
        );
      }
    }
    persistAuthSnapshot();
    console.log(
      "🔐 Received auth payload:",
      currentUser.email || currentUser.uid
    );
    postAuthStateToIframe();
  }

  async function applyInitAuth(initPayload) {
    if (!initPayload?.user) return;

    if (!currentUser) {
      currentUser = initPayload.user;
      console.log(
        "✅ [offscreen] Initial user info received from background:",
        currentUser.email || currentUser.uid
      );
    }
    if (initPayload.refreshToken) {
      currentRefreshToken = initPayload.refreshToken;
    }
    if (!currentIdToken && currentRefreshToken) {
      try {
        await ensureFreshIdToken();
      } catch (error) {
        console.warn(
          "⚠️ [offscreen] Failed to refresh token from INIT_AUTH:",
          error.message
        );
      }
    }
    persistAuthSnapshot();
  }

  async function getAuthSnapshot() {
    await ensureAuthReady();

    console.log(
      "📸 [offscreen] getAuthSnapshot called (currentUser:",
      currentUser ? currentUser.uid : "null",
      ")"
    );

    // currentUser가 없어도 웹 iframe에서 토큰 요청 시도 (웹에서 로그인되어 있을 수 있음)
    if (!currentUser) {
      console.log(
        "🔍 [offscreen] No currentUser, attempting to get token from iframe"
      );
      try {
        // 웹 iframe에서 토큰 가져오기 시도
        const tokenData = await getFreshIdTokenFromIframe();
        if (tokenData?.idToken && tokenData?.user) {
          // 토큰이 있으면 상태 업데이트
          currentUser = tokenData.user;
          currentIdToken = tokenData.idToken;
          currentRefreshToken = tokenData.refreshToken || null;
          tokenExpiresAt = parseJwtExp(currentIdToken);
          persistAuthSnapshot();
          console.log(
            "✅ [offscreen] Token retrieved from iframe:",
            currentUser.email || currentUser.uid
          );
          return {
            user: currentUser,
            idToken: currentIdToken,
            refreshToken: currentRefreshToken,
          };
        } else {
          console.log(
            "⚠️ [offscreen] getFreshIdTokenFromIframe returned but no token/user"
          );
        }
      } catch (error) {
        // 웹에서도 토큰이 없으면 로그아웃 상태
        console.log(
          "ℹ️ [offscreen] No token available from iframe:",
          error.message
        );
      }
      console.log("❌ [offscreen] Returning null snapshot (no user found)");
      return {
        user: null,
        idToken: null,
        refreshToken: null,
      };
    }

    try {
      await ensureFreshIdToken();
    } catch (error) {
      console.warn(
        "⚠️ [offscreen] Failed to ensure fresh token while snapshotting:",
        error
      );
      // 토큰 새로고침 실패 시 로그아웃 상태로 간주
      if (error.message === "NO_USER" || error.message === "IFRAME_NO_TOKEN") {
        clearAuthState();
        return {
          user: null,
          idToken: null,
          refreshToken: null,
        };
      }
    }
    return {
      user: currentUser,
      idToken: currentIdToken,
      refreshToken: currentRefreshToken,
    };
  }

  window.OffscreenAuth = {
    ensureAuthReady,
    ensureFreshIdToken,
    handleBackgroundAuthUpdate,
    applyInitAuth,
    getCurrentUser: () => currentUser,
    getCurrentIdToken: () => currentIdToken,
    getAuthSnapshot,
  };
})();
