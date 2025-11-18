import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Crown, Gift } from "lucide-react";
import { useAuthStore } from "../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { betaUtils, BETA_END_DATE } from "../utils/betaFlags";

interface SubscriptionBannerProps {
  onViewClick?: () => void;
}

export const SubscriptionBanner = ({
  onViewClick,
}: SubscriptionBannerProps) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEarlyUser, setIsEarlyUser] = useState(false);

  console.log("[SubscriptionBanner] 컴포넌트 렌더링:", { user: !!user });

  useEffect(() => {
    if (user) {
      checkEarlyUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkEarlyUser = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt?.toDate();
        if (createdAt && createdAt < BETA_END_DATE) {
          setIsEarlyUser(true);
        }
      }
    } catch (error) {
      console.error("얼리유저 확인 실패:", error);
    }
  };

  // 구독 알림 배너 표시 상태 확인
  useEffect(() => {
    const shouldShow = betaUtils.shouldShowBanner();
    console.log("[SubscriptionBanner] shouldShowBanner:", shouldShow);
    if (!shouldShow) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, [user]); // user가 변경될 때마다 다시 체크

  const handleDismiss = () => {
    setIsDismissed(true);
    betaUtils.dismissBanner();
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewClick) {
      onViewClick();
    }
  };

  // 구독 알림 배너를 표시하지 않는 경우 체크
  const shouldShow = betaUtils.shouldShowBanner();
  console.log("[SubscriptionBanner] 렌더링 체크:", {
    isDismissed,
    user: !!user,
    shouldShow,
    최종결과: !(isDismissed || !user || !shouldShow),
  });

  if (isDismissed || !user || !shouldShow) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-brand-500 to-accent-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Crown className="w-5 h-5 flex-shrink-0" />
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {t("premium.subscription.banner.title", {
                defaultValue: "프리미엄 구독으로 더 많은 기능을 이용하세요!",
              })}
            </span>
            {betaUtils.shouldShowEarlyUserBenefits() && (
              <>
                {isEarlyUser ? (
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Gift className="w-3 h-3" />
                    <span className="text-xs opacity-90 hidden md:inline">
                      {t("premium.subscription.banner.earlyUserBenefit", {
                        defaultValue: "얼리유저 특별 혜택 적용 중",
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs opacity-90 hidden md:inline">
                    {t("premium.subscription.banner.earlyUserBenefitCheck", {
                      defaultValue: "얼리유저 특별 혜택 확인하기",
                    })}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onViewClick && (
            <button
              onClick={handleViewClick}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
            >
              {t("premium.subscription.banner.viewDetails", {
                defaultValue: "자세히 보기",
              })}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
