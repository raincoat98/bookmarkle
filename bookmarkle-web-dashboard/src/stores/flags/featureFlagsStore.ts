import { create } from "zustand";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export interface FeatureFlags {
  IS_BETA: boolean;
  SHOW_SUBSCRIPTION_BANNER: boolean;
  SHOW_SUBSCRIPTION_MODAL: boolean;
  SHOW_EARLY_USER_BENEFITS: boolean;
}

// Firestore 로드 전까지의 폴백 — 안전한 기본값(모두 false)
const DEFAULT_FLAGS: FeatureFlags = {
  IS_BETA: false,
  SHOW_SUBSCRIPTION_BANNER: false,
  SHOW_SUBSCRIPTION_MODAL: false,
  SHOW_EARLY_USER_BENEFITS: false,
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
    if (get().unsubscribe) return; // 이미 구독 중

    set({ loading: true });
    const ref = doc(db, ...FLAGS_DOC_PATH);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<FeatureFlags>;
          set({
            flags: {
              IS_BETA: data.IS_BETA ?? DEFAULT_FLAGS.IS_BETA,
              SHOW_SUBSCRIPTION_BANNER:
                data.SHOW_SUBSCRIPTION_BANNER ?? DEFAULT_FLAGS.SHOW_SUBSCRIPTION_BANNER,
              SHOW_SUBSCRIPTION_MODAL:
                data.SHOW_SUBSCRIPTION_MODAL ?? DEFAULT_FLAGS.SHOW_SUBSCRIPTION_MODAL,
              SHOW_EARLY_USER_BENEFITS:
                data.SHOW_EARLY_USER_BENEFITS ?? DEFAULT_FLAGS.SHOW_EARLY_USER_BENEFITS,
            },
            loaded: true,
            loading: false,
          });
        } else {
          // 문서가 없으면 기본값 유지
          set({ loaded: true, loading: false });
        }
      },
      (err) => {
        // 권한 없거나 미인증이면 기본값 유지
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
      {
        [key]: value,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  updateFlags: async (partial) => {
    const ref = doc(db, ...FLAGS_DOC_PATH);
    await setDoc(
      ref,
      {
        ...partial,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },
}));

// 동기 접근용 헬퍼 (legacy 호환 — betaUtils 내부에서 사용)
export const getCurrentFlags = (): FeatureFlags =>
  useFeatureFlagsStore.getState().flags;
