import { useEffect, useRef } from "react";
import {
  useAuthStore,
  useFeatureFlagsStore,
  initializeTheme,
} from "../../stores";

// 앱 시작 시 1회만 실행: 인증 감시, 테마, feature flags Firestore 구독
export function useAppInitialization() {
  const { initializeAuth } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const unsubscribeAuth = initializeAuth();
    const unsubscribeTheme = initializeTheme();
    useFeatureFlagsStore.getState().subscribe();

    return () => {
      unsubscribeAuth();
      unsubscribeTheme();
      initialized.current = false;
    };
  }, [initializeAuth]);
}
