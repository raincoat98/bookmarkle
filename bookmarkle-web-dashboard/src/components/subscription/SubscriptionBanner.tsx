import { useState, useEffect } from "react";
import { X, Sparkles, Gift, ArrowRight } from "lucide-react";
import { useAuthStore, useDrawerStore, useFeatureFlagsStore } from "../../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { betaUtils, BETA_END_DATE } from "../../utils/betaFlags";

interface SubscriptionBannerProps {
  onViewClick?: () => void;
}

export const SubscriptionBanner = ({ onViewClick }: SubscriptionBannerProps) => {
  const { user } = useAuthStore();
  const { isDrawerCollapsed } = useDrawerStore();
  // flags 변경 시 자동 리렌더링
  useFeatureFlagsStore((s) => s.flags);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEarly, setIsEarly] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const createdAt = userDoc.data().createdAt?.toDate();
          if (createdAt && createdAt < BETA_END_DATE) setIsEarly(true);
        }
      } catch (err) {
        const e = err as { code?: string };
        if (e?.code === "permission-denied" || e?.code === "unauthenticated") return;
      }
    })();
  }, [user]);

  useEffect(() => {
    setIsDismissed(!betaUtils.shouldShowBanner());
  }, [user]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    betaUtils.dismissBanner();
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewClick?.();
  };

  if (isDismissed || !user || !betaUtils.shouldShowBanner()) return null;

  const showEarly = betaUtils.shouldShowEarlyUserBenefits() && isEarly;

  // 사이드바 너비 만큼 배너를 밀어줌 (데스크톱)
  const paddingLeft = isDesktop ? (isDrawerCollapsed ? 64 : 300) : 0;

  return (
    <div
      className="relative bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 text-white overflow-hidden transition-[padding] duration-200"
      style={{ paddingLeft }}
    >
      {/* 장식 글로우 */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/3 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* 아이콘 */}
          <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            {showEarly ? (
              <Gift className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </div>

          {/* 메시지 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showEarly ? (
              <>
                <span className="text-sm font-semibold truncate">얼리 유저 혜택 적용 중</span>
                <span className="hidden sm:inline text-xs text-white/80 truncate">
                  · 베타 기능을 무료로 계속 이용하실 수 있어요
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold truncate">
                  프리미엄으로 더 많은 기능 잠금 해제
                </span>
                <span className="hidden md:inline text-xs text-white/80 truncate">
                  · 7일 무료 체험 · 언제든지 해지 가능
                </span>
              </>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onViewClick && (
            <button
              onClick={handleViewClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-50 transition-colors shadow-sm"
            >
              <span>자세히</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
