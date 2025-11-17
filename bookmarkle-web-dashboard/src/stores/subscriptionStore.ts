import { create } from "zustand";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Subscription, SubscriptionPlan, UserLimits } from "../types";
import { getUserLimits } from "../utils/subscriptionLimits";

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  limits: UserLimits;
  plan: SubscriptionPlan;
  isPremium: boolean;
}

interface SubscriptionActions {
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  fetchSubscription: (userId: string) => Promise<void>;
  subscribeToSubscription: (userId: string) => () => void;
  checkSubscriptionStatus: () => boolean; // 구독이 활성 상태인지 확인
}

/**
 * 구독 상태 관리 Store
 */
export const useSubscriptionStore = create<
  SubscriptionState & SubscriptionActions
>((set, get) => ({
  // State
  subscription: null,
  loading: true,
  limits: getUserLimits("free"),
  plan: "free",
  isPremium: false,

  // Actions
  setSubscription: (subscription) => {
    const plan = subscription?.plan || "free";
    const limits = getUserLimits(plan);
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

          get().setSubscription(subscription);
        } else {
          // 구독 정보가 없으면 무료 플랜으로 설정
          get().setSubscription(null);
        }
      } else {
        get().setSubscription(null);
      }
    } catch (error) {
      console.error("구독 정보 가져오기 실패:", error);
      get().setSubscription(null);
    } finally {
      set({ loading: false });
    }
  },

  // 구독 정보 실시간 구독
  subscribeToSubscription: (userId: string) => {
    const unsubscribe = onSnapshot(
      doc(db, "users", userId),
      (docSnapshot) => {
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

            get().setSubscription(subscription);
          } else {
            get().setSubscription(null);
          }
        } else {
          get().setSubscription(null);
        }
      },
      (error) => {
        console.error("구독 정보 실시간 구독 실패:", error);
        set({ loading: false });
      }
    );

    return unsubscribe;
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
