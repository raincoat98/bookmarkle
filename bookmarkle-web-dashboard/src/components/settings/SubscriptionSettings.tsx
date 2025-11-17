import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useSubscriptionStore,
  useBookmarkStore,
  useCollectionStore,
  useAuthStore,
} from "../../stores";
import { Crown, Check, AlertCircle, ArrowRight, Gift } from "lucide-react";
import {
  checkBookmarkLimit,
  checkCollectionLimit,
} from "../../utils/subscriptionLimits";
import { isBetaPeriod } from "../../utils/betaFlags";
import { isEarlyUser } from "../../utils/earlyUser";

export const SubscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, isPremium, limits } = useSubscriptionStore();
  const { rawBookmarks } = useBookmarkStore();
  const { collections } = useCollectionStore();
  const { user } = useAuthStore();
  const [userIsEarly, setUserIsEarly] = useState(false);
  const [loading, setLoading] = useState(true);

  const bookmarkLimit = checkBookmarkLimit(rawBookmarks.length, plan);
  const collectionLimit = checkCollectionLimit(collections.length, plan);

  const checkUserStatus = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const earlyStatus = await isEarlyUser(user.uid);
      setUserIsEarly(earlyStatus);
    } catch (error) {
      console.error("사용자 상태 확인 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkUserStatus();
    }
  }, [user, checkUserStatus]);

  const premiumFeatures = [
    t("premium.features.unlimitedBookmarks"),
    t("premium.features.unlimitedCollections"),
    t("premium.features.advancedSearch"),
    t("premium.features.bookmarkStats"),
    t("premium.features.exportData"),
    t("premium.features.customTheme"),
    t("premium.features.restoreDeleted"),
    t("premium.features.shareBookmarks"),
  ];

  // 베타 기간 중에는 아무것도 표시하지 않음
  if (isBetaPeriod()) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 현재 구독 상태 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                isPremium
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
            >
              <Crown
                className={`w-5 h-5 ${
                  isPremium
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan === "premium"
                  ? t("premium.premiumPlan")
                  : t("premium.freePlan")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isPremium
                  ? t("premium.activeSubscription")
                  : t("premium.freeAccount")}
              </p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isPremium
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {isPremium ? t("premium.active") : t("premium.free")}
          </div>
        </div>

        {/* 사용량 표시 */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("premium.bookmarks")}
              </span>
              <span
                className={`font-medium ${
                  bookmarkLimit.allowed
                    ? "text-gray-900 dark:text-white"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {limits.maxBookmarks === Infinity
                  ? `∞ (${rawBookmarks.length}개)`
                  : `${rawBookmarks.length} / ${limits.maxBookmarks}`}
              </span>
            </div>
            {limits.maxBookmarks !== Infinity && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    !bookmarkLimit.allowed ? "bg-red-500" : "bg-brand-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (rawBookmarks.length / limits.maxBookmarks) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
            {!bookmarkLimit.allowed && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {t("premium.limitExceeded", {
                    current: rawBookmarks.length,
                    limit: limits.maxBookmarks,
                  })}
                </span>
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("premium.collections")}
              </span>
              <span
                className={`font-medium ${
                  collectionLimit.allowed
                    ? "text-gray-900 dark:text-white"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {limits.maxCollections === Infinity
                  ? `∞ (${collections.length}개)`
                  : `${collections.length} / ${limits.maxCollections}`}
              </span>
            </div>
            {limits.maxCollections !== Infinity && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    !collectionLimit.allowed ? "bg-red-500" : "bg-brand-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (collections.length / limits.maxCollections) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            )}
            {!collectionLimit.allowed && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {t("premium.limitExceeded", {
                    current: collections.length,
                    limit: limits.maxCollections,
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* 구독 관리 버튼 */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => navigate("/subscription")}
            className="w-full flex items-center justify-between px-4 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
          >
            <span className="font-medium">
              {t("premium.subscriptionManagement")}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 얼리유저 정보 */}
      {!loading && userIsEarly && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
              <Gift className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                얼리 유저 혜택
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                베타 기간 중 가입하신 얼리 유저로 인증되었습니다.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mt-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  베타 기간 중 사용하던 기능들을 계속 무료로 이용하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프리미엄 기능 목록 */}
      {isPremium ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("premium.premiumFeatures")}
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t("premium.upgradeToPremium")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t("premium.unlockAllFeatures")}
              </p>
              <ul className="space-y-2 mb-4">
                {premiumFeatures.slice(0, 3).map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Check className="w-4 h-4 text-brand-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="w-full px-4 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-lg font-medium hover:from-brand-600 hover:to-accent-600 transition-all shadow-md hover:shadow-lg"
          >
            {t("premium.upgradeNow")}
          </button>
        </div>
      )}
    </div>
  );
};
