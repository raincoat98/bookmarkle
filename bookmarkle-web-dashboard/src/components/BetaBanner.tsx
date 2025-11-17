import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Gift } from "lucide-react";
import { useAuthStore } from "../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { betaUtils, BETA_END_DATE } from "../utils/betaFlags";

export const BetaBanner = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEarlyUser, setIsEarlyUser] = useState(false);

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

  // 베타 배너 표시 상태 확인
  useEffect(() => {
    if (!betaUtils.shouldShowBanner()) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    betaUtils.dismissBanner();
  };

  // 베타 배너를 표시하지 않는 경우 또는 사용자가 로그인하지 않은 경우
  if (isDismissed || !user || !betaUtils.shouldShowBanner()) return null;

  return (
    <div className="relative bg-gradient-to-r from-brand-500 to-accent-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t("beta.banner.title")}</p>
            {betaUtils.shouldShowEarlyUserBenefits() && (
              <>
                {isEarlyUser ? (
                  <p className="text-xs opacity-90 mt-1 flex items-center space-x-1">
                    <Gift className="w-3 h-3" />
                    <span>{t("beta.banner.earlyUserBenefit")}</span>
                  </p>
                ) : (
                  <p className="text-xs opacity-90 mt-1">
                    {t("beta.banner.earlyUserBenefit")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          aria-label={t("common.close")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
