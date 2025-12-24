import React from "react";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore, useAuthStore } from "../../stores";
import { isBetaPeriod, BETA_END_DATE } from "../../utils/betaFlags";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface UpgradeBannerProps {
  onDismiss?: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ onDismiss }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, isPremium } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isEarlyUser, setIsEarlyUser] = React.useState(false);

  // 얼리유저 확인
  React.useEffect(() => {
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
      const err = error as { code?: string; message?: string };
      // 권한 오류는 조용히 무시 (로그아웃 중일 수 있음)
      if (
        err?.code === "permission-denied" ||
        err?.code === "unauthenticated"
      ) {
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.error("얼리유저 확인 실패:", error);
      }
    }
  };

  // 베타 기간 중이거나 프리미엄 사용자이거나 얼리유저이면 표시하지 않음
  if (
    isBetaPeriod() ||
    isPremium ||
    plan === "premium" ||
    isDismissed ||
    isEarlyUser
  )
    return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
    // 로컬 스토리지에 저장 (7일간 표시 안 함)
    localStorage.setItem("upgradeBannerDismissed", Date.now().toString());
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  return (
    <div className="bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl p-4 shadow-lg mb-6 relative overflow-hidden">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {t("premium.upgradeToPremium")}
            </h3>
            <p className="text-white/90 text-sm">
              {t("premium.unlockAllFeatures")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpgrade}
            className="px-4 py-2 bg-white text-brand-600 rounded-lg font-medium hover:bg-white/90 transition-all shadow-md hover:shadow-lg"
          >
            {t("premium.upgradeNow")}
          </button>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="p-2 text-white/80 hover:text-white rounded-lg transition-all hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
