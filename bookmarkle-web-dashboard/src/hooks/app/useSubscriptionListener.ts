import { useEffect } from "react";
import { useAuthStore, useSubscriptionStore } from "../../stores";
import { auth } from "../../firebase";

// 로그인한 사용자의 구독 정보를 Firestore에서 실시간 구독
export function useSubscriptionListener() {
  const { user } = useAuthStore();
  const { subscribeToSubscription } = useSubscriptionStore();

  useEffect(() => {
    if (!user?.uid) return;

    // Firebase Auth와 store의 user 동기화 확인
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) return;

    const unsubscribe = subscribeToSubscription(user.uid);
    return () => unsubscribe();
  }, [user?.uid, subscribeToSubscription]);
}
