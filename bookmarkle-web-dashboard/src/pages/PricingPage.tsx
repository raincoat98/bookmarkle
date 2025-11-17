import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore } from "../stores";
import { Header } from "../components/Header";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, isPremium } = useSubscriptionStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const handleSubscribe = async (
    planType: "premium",
    cycle: "monthly" | "yearly"
  ) => {
    // TODO: Stripe 결제 연동
    // 현재는 임시로 알림만 표시
    // planType과 cycle은 실제 구현 시 사용됨
    console.log("구독 요청:", { planType, cycle });
    alert(t("premium.stripeIntegrationPending"));

    // 실제 구현 시:
    // 1. Stripe Checkout 세션 생성 (planType, cycle 사용)
    // 2. 결제 페이지로 리다이렉트
    // 3. 웹훅으로 구독 상태 업데이트
  };

  const freeFeatures = [
    t("premium.features.free.bookmarks", { count: 100 }),
    t("premium.features.free.collections", { count: 10 }),
    t("premium.features.free.basicSearch"),
    t("premium.features.free.weeklyBackup"),
    t("premium.features.free.basicWidgets"),
  ];

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

  const monthlyPrice = 3.99;
  const yearlyPrice = 39.99;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savings = Math.round(
    ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 뒤로가기 버튼 */}
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.back")}</span>
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t("premium.upgradeToPremium")}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("premium.chooseYourPlan")}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t("premium.pricingDescription")}
          </p>
        </div>

        {/* 결제 주기 선택 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 relative ${
                billingCycle === "monthly"
                  ? "bg-brand-500 text-white shadow-md scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {t("premium.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 relative ${
                billingCycle === "yearly"
                  ? "bg-brand-500 text-white shadow-md scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {t("premium.yearly")}
              <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg animate-pulse">
                {t("premium.save", { percent: savings })}
              </span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 무료 플랜 */}
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-600">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">
                {t("premium.freePlan")}
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  $0
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  /{t("premium.month")}
                </span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 transition-all duration-200 group-hover:translate-x-1"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            {plan === "free" ? (
              <button
                disabled
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl font-medium cursor-not-allowed transition-all"
              >
                {t("premium.currentPlan")}
              </button>
            ) : (
              <button
                onClick={() => navigate("/subscription")}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                {t("premium.downgrade")}
              </button>
            )}
          </div>

          {/* 프리미엄 플랜 */}
          <div className="group relative bg-brand-500 dark:bg-brand-600 rounded-2xl shadow-2xl border-2 border-brand-400 dark:border-brand-500 p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] hover:border-brand-300 dark:hover:border-brand-400">
            {/* 인기 배지 */}
            {isPremium && (
              <div className="absolute top-4 right-4 bg-white text-brand-600 px-3 py-1 rounded-full text-xs font-semibold shadow-md animate-pulse">
                {t("premium.currentPlan")}
              </div>
            )}
            {!isPremium && (
              <div className="absolute top-4 right-4 bg-white text-brand-600 px-3 py-1 rounded-full text-xs font-semibold shadow-md animate-pulse">
                {t("premium.popular")}
              </div>
            )}

            {/* 배경 장식 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
            </div>

            <div className="relative text-center mb-8 text-white">
              <h3 className="text-2xl font-bold mb-2 transition-transform duration-300 group-hover:scale-105">
                {t("premium.premiumPlan")}
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold transition-transform duration-300 group-hover:scale-110">
                  $
                  {billingCycle === "monthly"
                    ? monthlyPrice
                    : yearlyMonthlyEquivalent.toFixed(2)}
                </span>
                <span className="ml-2 opacity-90">/{t("premium.month")}</span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-sm opacity-90 mt-2">
                  {t("premium.billedAs")} ${yearlyPrice} {t("premium.perYear")}
                </p>
              )}
            </div>
            <ul className="relative space-y-4 mb-8 text-white">
              {premiumFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start space-x-3 transition-all duration-200 group-hover:translate-x-1"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="transition-colors duration-200">{feature}</span>
                </li>
              ))}
            </ul>
            {isPremium ? (
              <button
                onClick={() => navigate("/subscription")}
                className="relative w-full px-6 py-3 bg-white text-brand-600 rounded-xl font-medium transition-all duration-200 shadow-lg hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100"
              >
                {t("premium.manageSubscription")}
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe("premium", billingCycle)}
                className="relative w-full px-6 py-3 bg-white text-brand-600 rounded-xl font-medium transition-all duration-200 shadow-lg hover:bg-gray-50 hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100"
              >
                {t("premium.upgradeNow")}
              </button>
            )}
          </div>
        </div>

        {/* FAQ 섹션 */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {t("premium.faq")}
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-brand-300 dark:hover:border-brand-600">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                {t("premium.faq1.question")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("premium.faq1.answer")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-brand-300 dark:hover:border-brand-600">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                {t("premium.faq2.question")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("premium.faq2.answer")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-brand-300 dark:hover:border-brand-600">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 transition-colors duration-200">
                {t("premium.faq3.question")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("premium.faq3.answer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
