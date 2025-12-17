import { create } from "zustand";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Subscription, SubscriptionPlan, UserLimits } from "../types";
import { getUserLimits, getUserLimitsSync } from "../utils/subscriptionLimits";

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  limits: UserLimits;
  plan: SubscriptionPlan;
  isPremium: boolean;
}

interface SubscriptionActions {
  setSubscription: (
    subscription: Subscription | null,
    userId?: string
  ) => Promise<void>;
  setLoading: (loading: boolean) => void;
  fetchSubscription: (userId: string) => Promise<void>;
  subscribeToSubscription: (userId: string) => () => void;
  cleanupAllListeners: () => void;
  checkSubscriptionStatus: () => boolean; // 구독이 활성 상태인지 확인
}

// 활성 리스너 추적
let activeSubscriptionListeners: (() => void)[] = [];

/**
 * 구독 상태 관리 Store
 */
export const useSubscriptionStore = create<
  SubscriptionState & SubscriptionActions
>((set, get) => ({
  // State
  subscription: null,
  loading: true,
  limits: getUserLimitsSync("free"),
  plan: "free",
  isPremium: false,

  // Actions
  setSubscription: async (subscription, userId) => {
    const plan = subscription?.plan || "free";
    const limits = await getUserLimits(plan, userId);
    const isPremium = plan === "premium" && get().checkSubscriptionStatus();

    set({
      subscription,
      plan,
      limits,
      isPremium,
    });
  },

  setLoading: (loading) => set({ loading }),

  // 구독 정보 가져오기
  fetchSubscription: async (userId: string) => {
    try {
      set({ loading: true });
      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const subscriptionData = userData.subscription;

        if (subscriptionData) {
          const subscription: Subscription = {
            plan: subscriptionData.plan || "free",
            status: subscriptionData.status || "expired",
            billingCycle: subscriptionData.billingCycle || "monthly",
            startDate: subscriptionData.startDate?.toDate() || new Date(),
            endDate: subscriptionData.endDate?.toDate(),
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
            subscriptionId: subscriptionData.subscriptionId,
            customerId: subscriptionData.customerId,
            trialEndDate: subscriptionData.trialEndDate?.toDate(),
          };

          await get().setSubscription(subscription, userId);
        } else {
          // 구독 정보가 없으면 무료 플랜으로 설정
          await get().setSubscription(null, userId);
        }
      } else {
        await get().setSubscription(null, userId);
      }
    } catch (error) {
      console.error("구독 정보 가져오기 실패:", error);
      await get().setSubscription(null, userId);
    } finally {
      set({ loading: false });
    }
  },

  // 구독 정보 실시간 구독
  subscribeToSubscription: (userId: string) => {
    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const subscriptionData = userData.subscription;

          if (subscriptionData) {
            const subscription: Subscription = {
              plan: subscriptionData.plan || "free",
              status: subscriptionData.status || "expired",
              billingCycle: subscriptionData.billingCycle || "monthly",
              startDate: subscriptionData.startDate?.toDate() || new Date(),
              endDate: subscriptionData.endDate?.toDate(),
              cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
              subscriptionId: subscriptionData.subscriptionId,
              customerId: subscriptionData.customerId,
              trialEndDate: subscriptionData.trialEndDate?.toDate(),
            };

            await get().setSubscription(subscription, userId);
          } else {
            await get().setSubscription(null, userId);
          }
        } else {
          await get().setSubscription(null, userId);
        }
      },
      (error) => {
        const err = error as { code?: string; message?: string };
        // 권한 오류 시 리스너 자동 정리
        if (
          err?.code === "permission-denied" ||
          err?.code === "unauthenticated"
        ) {
          // 권한 오류는 조용히 처리 (로그아웃 중일 수 있음)
          try {
            unsubscribe();
          } catch {
            // 리스너 정리 중 발생하는 에러는 무시
          }
          // cleanupAllListeners에서 정리됨
        } else {
          console.error("구독 정보 실시간 구독 실패:", error);
        }
        set({ loading: false });
      }
    );

    // 래핑된 unsubscribe 함수: 배열에서도 제거
    const wrappedUnsubscribe = () => {
      unsubscribe();
      activeSubscriptionListeners = activeSubscriptionListeners.filter(
        (listener) => listener !== wrappedUnsubscribe
      );
    };

    activeSubscriptionListeners.push(wrappedUnsubscribe);
    return wrappedUnsubscribe;
  },

  cleanupAllListeners: () => {
    if (process.env.NODE_ENV === "development") {
      console.log("🧹 구독 리스너 정리 중...");
    }
    activeSubscriptionListeners.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("구독 리스너 정리 중 오류:", error);
        }
      }
    });
    activeSubscriptionListeners = [];
    if (process.env.NODE_ENV === "development") {
      console.log("✅ 구독 리스너 정리 완료");
    }
  },

  // 구독 상태 확인 (활성 상태인지)
  checkSubscriptionStatus: () => {
    const { subscription } = get();
    if (!subscription) return false;

    // 프리미엄 플랜이고 활성 상태인지 확인
    if (subscription.plan !== "premium") return false;
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      return false;
    }

    // 종료일이 있고 지났는지 확인
    if (subscription.endDate) {
      const endDate =
        subscription.endDate instanceof Date
          ? subscription.endDate
          : new Date(subscription.endDate);
      if (endDate < new Date()) {
        return false;
      }
    }

    return true;
  },
}));
