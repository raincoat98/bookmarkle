import React from "react";
import { X, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore } from "../stores";
import { isBetaPeriod } from "../utils/betaFlags";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "bookmark_limit" | "collection_limit" | "premium_feature";
  currentCount?: number;
  limit?: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
  currentCount,
  limit,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, limits } = useSubscriptionStore();

  // 베타 기간 중이거나 모달이 열리지 않았으면 표시하지 않음
  if (!isOpen || isBetaPeriod()) return null;

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  const getReasonMessage = () => {
    switch (reason) {
      case "bookmark_limit":
        return t("premium.bookmarkLimitReached", {
          current: currentCount,
          limit: limit,
        });
      case "collection_limit":
        return t("premium.collectionLimitReached", {
          current: currentCount,
          limit: limit,
        });
      case "premium_feature":
        return t("premium.premiumFeatureRequired");
      default:
        return t("premium.upgradeToPremium");
    }
  };

  const premiumFeatures = [
    t("premium.features.unlimitedBookmarks"),
    t("premium.features.unlimitedCollections"),
    t("premium.features.advancedSearch"),
    t("premium.features.dailyBackup"),
    t("premium.features.bookmarkStats"),
    t("premium.features.exportData"),
    t("premium.features.customTheme"),
    t("premium.features.restoreDeleted"),
    t("premium.features.shareBookmarks"),
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg animate-slide-up">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* 헤더 */}
            <div className="relative bg-gradient-to-r from-brand-500 to-accent-500 p-6 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-xl transition-all hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {t("premium.upgradeToPremium")}
                  </h2>
                  <p className="text-white/90 text-sm mt-1">
                    {getReasonMessage()}
                  </p>
                </div>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-6 space-y-6">
              {/* 현재 플랜 표시 */}
              {plan === "free" && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("premium.currentPlan")}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("premium.freePlan")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("premium.bookmarks")}: {currentCount || 0} /{" "}
                        {limit || limits.maxBookmarks}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("premium.collections")}: {limits.maxCollections}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 프리미엄 기능 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t("premium.premiumFeatures")}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {premiumFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        <Check className="w-5 h-5 text-brand-500" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 가격 정보 */}
              <div className="bg-gradient-to-r from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 rounded-xl p-4 border border-brand-200 dark:border-brand-800">
                <div className="flex items-baseline justify-center space-x-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    $4.99
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    / {t("premium.month")}
                  </span>
                </div>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t("premium.or")}{" "}
                  <span className="font-semibold">$49.99</span> /{" "}
                  {t("premium.year")} ({t("premium.save17")})
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {t("common.maybeLater")}
                </button>
                <button
                  onClick={handleUpgrade}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-medium hover:from-brand-600 hover:to-accent-600 transition-all shadow-lg hover:shadow-xl"
                >
                  {t("premium.upgradeNow")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
