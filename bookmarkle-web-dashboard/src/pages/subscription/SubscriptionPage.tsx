import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Check, Sparkles, ArrowLeft } from "lucide-react";
import { Drawer } from "../../components/layout/Drawer";
import { EarlyUserBenefits } from "../../components/subscription/EarlyUserBenefits";
import { useAuthStore } from "../../stores";
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
  PREMIUM_PRICING,
  formatKRW,
  type BillingCycle,
} from "../../constants/planLimits";

const CYCLES: BillingCycle[] = ["monthly", "yearly"];

export const SubscriptionPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const premium = PREMIUM_PRICING[cycle];

  return (
    <Drawer>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로
          </Link>

          <header className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-500/15 mb-4">
              <Crown className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              북마클 프리미엄
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              북마클이 정식 오픈했습니다. 더 강력한 기능으로 북마크 관리를 한층 업그레이드하세요.
            </p>
          </header>

          {/* 결제 주기 토글 */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-white/[0.05]">
              {CYCLES.map((c) => {
                const active = cycle === c;
                const info = PREMIUM_PRICING[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-white dark:bg-white/[0.12] text-violet-600 dark:text-violet-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {info.label}
                    {info.badge && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        {info.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <EarlyUserBenefits user={user} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlanCard
              name="무료"
              price="₩0"
              period="/월"
              features={FREE_PLAN_FEATURES}
              cta="현재 플랜"
              ctaDisabled
            />
            <PlanCard
              highlighted
              name="프리미엄"
              price={formatKRW(premium.amount)}
              period={premium.periodLabel}
              priceSubtext={
                cycle === "yearly"
                  ? `월 ${formatKRW(premium.perMonth)} 상당`
                  : undefined
              }
              features={PREMIUM_PLAN_FEATURES}
              cta="결제 시스템 준비 중"
              ctaDisabled
            />
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  결제 시스템 준비 중
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  현재 결제 시스템을 준비하고 있습니다. 정식 결제 오픈 시 이메일로 안내드릴 예정이며,
                  베타 기간 동안 가입하신 얼리 유저는 평생 무료로 프리미엄 기능을 이용하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  priceSubtext?: string;
  features: string[];
  cta: string;
  ctaDisabled?: boolean;
  highlighted?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  name,
  price,
  period,
  priceSubtext,
  features,
  cta,
  ctaDisabled,
  highlighted,
}) => {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlighted
          ? "bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border-violet-200 dark:border-violet-500/30"
          : "bg-white dark:bg-[#111113] border-gray-200 dark:border-white/[0.06]"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {name}
        </h2>
        {highlighted && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
            추천
          </span>
        )}
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {price}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{period}</span>
        </div>
        {priceSubtext && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {priceSubtext}
          </p>
        )}
      </div>

      <ul className="space-y-2.5 mb-6">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Check
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                highlighted
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={ctaDisabled}
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed ${
          highlighted
            ? "bg-violet-600 hover:bg-violet-700 text-white disabled:bg-violet-300 dark:disabled:bg-violet-500/40"
            : "bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 disabled:opacity-60"
        }`}
      >
        {cta}
      </button>
    </div>
  );
};
