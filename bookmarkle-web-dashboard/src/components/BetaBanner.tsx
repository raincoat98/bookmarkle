import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Gift } from "lucide-react";
import { useAuthStore } from "../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect } from "react";

// 베타 종료일 (정식 오픈 예정일)
const BETA_END_DATE = new Date("2025-12-31"); // 예시 날짜, 실제 날짜로 변경 필요

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

  // 로컬 스토리지에서 닫힘 상태 확인
  useEffect(() => {
    const dismissed = localStorage.getItem("betaBannerDismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("betaBannerDismissed", "true");
  };

  if (isDismissed || !user) return null;

  return (
    <div className="relative bg-gradient-to-r from-brand-500 to-accent-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isEarlyUser ? t("beta.earlyUserBenefit") : t("beta.currentBeta")}
            </p>
            {isEarlyUser && (
              <p className="text-xs opacity-90 mt-1 flex items-center space-x-1">
                <Gift className="w-3 h-3" />
                <span>{t("beta.earlyUserLifetime")}</span>
              </p>
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
