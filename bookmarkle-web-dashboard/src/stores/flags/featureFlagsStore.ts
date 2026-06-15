import { create } from "zustand";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export interface FeatureFlags {
  // 베타 모드. true면 가격·구독 관련 UI(배너/모달/얼리유저 카드)를 모두 숨김
  beta: boolean;
  // 상단 가로 안내 배너 (beta === false일 때만 적용)
  showAnnouncementBanner: boolean;
  // 정식 오픈 안내 팝업 (beta === false일 때만 적용)
  showAnnouncementModal: boolean;
  // 얼리 유저 혜택 카드 (beta === false일 때만 적용)
  showEarlyUserBenefits: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  beta: true,
  showAnnouncementBanner: false,
  showAnnouncementModal: false,
  showEarlyUserBenefits: false,
};

const FLAGS_DOC_PATH = ["config", "featureFlags"] as const;

interface FeatureFlagsState {
  flags: FeatureFlags;
  loaded: boolean;
  loading: boolean;
  unsubscribe: (() => void) | null;
  subscribe: () => void;
  updateFlag: <K extends keyof FeatureFlags>(
    key: K,
    value: FeatureFlags[K]
  ) => Promise<void>;
  updateFlags: (partial: Partial<FeatureFlags>) => Promise<void>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FLAGS,
  loaded: false,
  loading: false,
  unsubscribe: null,

  subscribe: () => {
    if (get().unsubscribe) return;

    set({ loading: true });
    const ref = doc(db, ...FLAGS_DOC_PATH);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<FeatureFlags>;
          set({
            flags: {
              beta: data.beta ?? DEFAULT_FLAGS.beta,
              showAnnouncementBanner:
                data.showAnnouncementBanner ?? DEFAULT_FLAGS.showAnnouncementBanner,
              showAnnouncementModal:
                data.showAnnouncementModal ?? DEFAULT_FLAGS.showAnnouncementModal,
              showEarlyUserBenefits:
                data.showEarlyUserBenefits ?? DEFAULT_FLAGS.showEarlyUserBenefits,
            },
            loaded: true,
            loading: false,
          });
        } else {
          set({ loaded: true, loading: false });
        }
      },
      (err) => {
        const e = err as { code?: string };
        if (e?.code === "permission-denied" || e?.code === "unauthenticated") {
          set({ loaded: true, loading: false });
          return;
        }
        console.warn("Feature flags 구독 실패:", err);
        set({ loaded: true, loading: false });
      }
    );

    set({ unsubscribe });
  },

  updateFlag: async (key, value) => {
    const ref = doc(db, ...FLAGS_DOC_PATH);
    await setDoc(
      ref,
      { [key]: value, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },

  updateFlags: async (partial) => {
    const ref = doc(db, ...FLAGS_DOC_PATH);
    await setDoc(
      ref,
      { ...partial, updatedAt: serverTimestamp() },
      { merge: true }
    );
  },
}));

// 동기 접근용 헬퍼
export const getCurrentFlags = (): FeatureFlags =>
  useFeatureFlagsStore.getState().flags;

export const isBetaMode = (): boolean => getCurrentFlags().beta;
