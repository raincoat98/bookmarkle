import { useEffect } from "react";
import { useAuthStore } from "../../stores";

// Extension에서 보낸 EXTENSION_LOGOUT postMessage를 받아 로그아웃 처리
export function useExtensionLogoutListener() {
  const { logout } = useAuthStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 보안: 동일 출처에서만 수신
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "EXTENSION_LOGOUT") {
        console.log("🔓 Extension으로부터 로그아웃 메시지 수신");
        logout().catch((error) => {
          console.error("Extension 로그아웃 처리 중 오류:", error);
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [logout]);
}
