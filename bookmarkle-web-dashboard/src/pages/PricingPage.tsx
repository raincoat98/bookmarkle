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
  const { plan, isPremium, subscription } = useSubscriptionStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleSubscribe = async (planType: "premium", cycle: "monthly" | "yearly") => {
    // TODO: Stripe 결제 연동
    // 현재는 임시로 알림만 표시
    alert(t("premium.stripeIntegrationPending"));
    
    // 실제 구현 시:
    // 1. Stripe Checkout 세션 생성
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
  const savings = ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100;

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
            <span className="text-sm font-medium">{t("premium.upgradeToPremium")}</span>
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
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("premium.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                billingCycle === "yearly"
                  ? "bg-brand-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t("premium.yearly")}
              <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs px-2 py-0.5 rounded-full">
                {t("premium.save17")}
              </span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 무료 플랜 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t("premium.freePlan")}
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/{t("premium.month")}</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            {plan === "free" ? (
              <button
                disabled
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl font-medium cursor-not-allowed"
              >
                {t("premium.currentPlan")}
              </button>
            ) : (
              <button
                onClick={() => navigate("/subscription")}
                className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                {t("premium.downgrade")}
              </button>
            )}
          </div>

          {/* 프리미엄 플랜 */}
          <div className="bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl shadow-2xl border-2 border-brand-400 p-8 relative overflow-hidden">
            {/* 인기 배지 */}
            {isPremium && (
              <div className="absolute top-4 right-4 bg-white text-brand-600 px-3 py-1 rounded-full text-xs font-semibold">
                {t("premium.currentPlan")}
              </div>
            )}
            {!isPremium && (
              <div className="absolute top-4 right-4 bg-white text-brand-600 px-3 py-1 rounded-full text-xs font-semibold">
                {t("premium.popular")}
              </div>
            )}

            <div className="text-center mb-8 text-white">
              <h3 className="text-2xl font-bold mb-2">{t("premium.premiumPlan")}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold">
                  ${billingCycle === "monthly" ? monthlyPrice : yearlyMonthlyEquivalent.toFixed(2)}
                </span>
                <span className="ml-2 opacity-90">/{t("premium.month")}</span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-sm opacity-90 mt-2">
                  {t("premium.billedAs")} ${yearlyPrice} {t("premium.perYear")}
                </p>
              )}
            </div>
            <ul className="space-y-4 mb-8 text-white">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {isPremium ? (
              <button
                onClick={() => navigate("/subscription")}
                className="w-full px-6 py-3 bg-white text-brand-600 rounded-xl font-medium hover:bg-gray-100 transition-all shadow-lg"
              >
                {t("premium.manageSubscription")}
              </button>
            ) : (
              <button
                onClick={() => handleSubscribe("premium", billingCycle)}
                className="w-full px-6 py-3 bg-white text-brand-600 rounded-xl font-medium hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("premium.faq1.question")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("premium.faq1.answer")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("premium.faq2.question")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("premium.faq2.answer")}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
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

