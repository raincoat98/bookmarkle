// window.toast 타입 선언 (toast가 window에 있을 수 있도록)
declare global {
  interface Window {
    toast?: {
      warn?: (msg: string) => void;
      error?: (msg: string) => void;
    };
  }
}
/**
 * Extension Offscreen의 fresh token 요청을 처리하는 핸들러
 *
 * offscreen에서 토큰이 만료되었을 때 GET_FRESH_ID_TOKEN 메시지를 보내면,
 * Firebase Auth의 getIdToken(true)로 fresh 토큰을 생성하여 응답함.
 *
 * - MessageChannel을 사용한 명확한 요청/응답 구조
 * - 필요할 때만 토큰 갱신 (효율적)
 */

import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

/**
 * offscreen으로부터 fresh token 요청 메시지를 수신하고 응답
 */
export function initializeTokenMessageHandler() {
  console.log("🔐 [tokenMessageHandler] Initialized - listening for GET_FRESH_ID_TOKEN");

  // iframe 모드인지 확인 (URL에 extension=true 파라미터가 있으면 iframe)
  const isIframeMode = new URLSearchParams(window.location.search).get("extension") === "true";

  if (isIframeMode) {
    // iframe이 준비되었음을 parent(offscreen)에게 알림
    if (window.parent !== window) {
      window.parent.postMessage({ type: "IFRAME_READY" }, "*");
      console.log("📤 [tokenMessageHandler] Sent IFRAME_READY to parent");
    }
  }

  // AUTH_STATE_CHANGED 메시지 수신 시 세션 동기화 (idToken 유무 및 에러 안내 강화)
  const handleAuthStateChanged = async (event: MessageEvent) => {
    console.log("[tokenMessageHandler] Message received:", event.data);

    const data = event.data;
    if (data?.type === "AUTH_STATE_CHANGED") {
      if (!data.idToken) {
        // idToken이 없으면 로그아웃 처리
        if (data.user === null) {
          console.log("✅ [tokenMessageHandler] Logout received from extension");
          // 필요시 로그아웃 처리
          return;
        }

        console.warn("⚠️ [tokenMessageHandler] AUTH_STATE_CHANGED: idToken 없음, 세션 동기화 불가");
        return;
      }

      // 이미 로그인된 상태가 아니면 강제 로그인
      if (!auth.currentUser) {
        try {
          await signInWithCustomToken(auth, data.idToken);
          console.log("✅ [tokenMessageHandler] Firebase Auth 세션 동기화 완료 (from extension)");
        } catch (err) {
          console.error("❌ [tokenMessageHandler] 세션 동기화 실패:", err);
          if (!isIframeMode && window.toast) {
            window.toast.error?.("세션 동기화 실패: 다시 로그인 해주세요.");
          }
        }
      } else {
        console.log("✅ [tokenMessageHandler] User already logged in, skipping signInWithCustomToken");
      }
    }
  };
  window.addEventListener("message", handleAuthStateChanged);

  const handleMessage = async (event: MessageEvent) => {
    const data = event.data;

    if (data?.type === "GET_FRESH_ID_TOKEN") {
      console.log("📨 [tokenMessageHandler] Received GET_FRESH_ID_TOKEN request");

      const port = event.ports[0];
      if (!port) {
        console.error("❌ [tokenMessageHandler] No MessageChannel port provided");
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          console.warn("⚠️ [tokenMessageHandler] No user logged in");
          port.postMessage({
            type: "FRESH_ID_TOKEN",
            idToken: null,
            error: "NO_USER",
          });
          return;
        }

        // ✅ getIdToken(true) - 강제로 토큰 갱신
        const idToken = await user.getIdToken(true);
        console.log("✅ [tokenMessageHandler] Fresh token generated successfully");

        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken,
        });
      } catch (err) {
        console.error("❌ [tokenMessageHandler] Error getting fresh token:", err);
        port.postMessage({
          type: "FRESH_ID_TOKEN",
          idToken: null,
          error: String(err),
        });
      }
    }
  };

  window.addEventListener("message", handleMessage);

  // Cleanup 함수 반환
  return () => {
    window.removeEventListener("message", handleAuthStateChanged);
    window.removeEventListener("message", handleMessage);
  };
}
