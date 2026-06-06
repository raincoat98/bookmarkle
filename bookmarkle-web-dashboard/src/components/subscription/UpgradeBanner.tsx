import React from "react";
import { Sparkles, X, ArrowRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStore, useAuthStore, useFeatureFlagsStore } from "../../stores";
import { isBetaPeriod, BETA_END_DATE } from "../../utils/betaFlags";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface UpgradeBannerProps {
  onDismiss?: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const { plan, isPremium } = useSubscriptionStore();
  const { user } = useAuthStore();
  useFeatureFlagsStore((s) => s.flags);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isEarlyUser, setIsEarlyUser] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const createdAt = userDoc.data().createdAt?.toDate();
          if (createdAt && createdAt < BETA_END_DATE) setIsEarlyUser(true);
        }
      } catch (err) {
        const e = err as { code?: string };
        if (e?.code === "permission-denied" || e?.code === "unauthenticated") return;
      }
    })();
  }, [user]);

  if (
    isBetaPeriod() ||
    isPremium ||
    plan === "premium" ||
    isDismissed ||
    isEarlyUser
  )
    return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    onDismiss?.();
    localStorage.setItem("upgradeBannerDismissed", Date.now().toString());
  };

  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden border border-violet-100 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-indigo-50/40 to-violet-50 dark:from-violet-500/[0.08] dark:via-indigo-500/[0.04] dark:to-violet-500/[0.08]">
      {/* 장식 글로우 */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-300/30 dark:bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* 아이콘 */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          {/* 메시지 */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              프리미엄으로 더 많은 기능 잠금 해제
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              무제한 북마크 · AI 검색 · 통계 인사이트 · 7일 무료 체험
            </p>
          </div>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate("/pricing")}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <Crown className="w-3 h-3" />
            <span className="hidden sm:inline">업그레이드</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              aria-label="닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
