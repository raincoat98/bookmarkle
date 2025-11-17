import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore } from "../stores";
import { Header } from "../components/Header";
import { ArrowLeft, Check, Calendar, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export const SubscriptionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, isPremium, subscription, limits } = useSubscriptionStore();
  const [isCanceling, setIsCanceling] = useState(false);

  const handleCancelSubscription = async () => {
    if (!confirm(t("premium.confirmCancel"))) {
      return;
    }

    setIsCanceling(true);
    try {
      // TODO: Stripe 구독 취소 API 호출
      // 현재는 임시로 알림만 표시
      toast.success(t("premium.cancelPending"));

      // 실제 구현 시:
      // 1. Stripe API로 구독 취소
      // 2. 웹훅으로 구독 상태 업데이트
      // 3. 사용자에게 확인 메시지 표시
    } catch (error) {
      console.error("구독 취소 실패:", error);
      toast.error(t("premium.cancelError"));
    } finally {
      setIsCanceling(false);
    }
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 뒤로가기 버튼 */}
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Link>

        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("premium.subscriptionManagement")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("premium.manageYourSubscription")}
          </p>
        </div>

        {/* 현재 구독 상태 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {plan === "premium"
                  ? t("premium.premiumPlan")
                  : t("premium.freePlan")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {plan === "premium"
                  ? t("premium.activeSubscription")
                  : t("premium.freeAccount")}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                isPremium
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {isPremium ? t("premium.active") : t("premium.free")}
            </div>
          </div>

          {subscription && plan === "premium" && (
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("premium.billingCycle")}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {subscription.billingCycle === "monthly"
                      ? t("premium.monthly")
                      : t("premium.yearly")}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {subscription.cancelAtPeriodEnd
                      ? t("premium.cancelsOn")
                      : t("premium.renewsOn")}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(subscription.endDate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 사용량 표시 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t("premium.currentUsage")}
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("premium.bookmarks")}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {/* TODO: 실제 북마크 개수 가져오기 */}
                    {limits.maxBookmarks === Infinity
                      ? "∞"
                      : `0 / ${limits.maxBookmarks}`}
                  </span>
                </div>
                {limits.maxBookmarks !== Infinity && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: "0%" }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("premium.collections")}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {limits.maxCollections === Infinity
                      ? "∞"
                      : `0 / ${limits.maxCollections}`}
                  </span>
                </div>
                {limits.maxCollections !== Infinity && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: "0%" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-4">
          {plan === "free" ? (
            <button
              onClick={handleUpgrade}
              className="w-full px-6 py-4 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-medium hover:from-brand-600 hover:to-accent-600 transition-all shadow-lg hover:shadow-xl"
            >
              {t("premium.upgradeToPremium")}
            </button>
          ) : (
            <>
              {subscription?.cancelAtPeriodEnd ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                        {t("premium.cancellationScheduled")}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {t("premium.cancellationMessage", {
                          date: formatDate(subscription.endDate),
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                  className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  {isCanceling
                    ? t("common.processing")
                    : t("premium.cancelSubscription")}
                </button>
              )}
              <Link
                to="/pricing"
                className="block w-full px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-center"
              >
                {t("premium.changePlan")}
              </Link>
            </>
          )}
        </div>

        {/* 프리미엄 기능 목록 */}
        {plan === "premium" && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("premium.premiumFeatures")}
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                t("premium.features.unlimitedBookmarks"),
                t("premium.features.unlimitedCollections"),
                t("premium.features.advancedSearch"),
                t("premium.features.dailyBackup"),
                t("premium.features.bookmarkStats"),
                t("premium.features.exportData"),
                t("premium.features.customTheme"),
                t("premium.features.restoreDeleted"),
                t("premium.features.shareBookmarks"),
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
