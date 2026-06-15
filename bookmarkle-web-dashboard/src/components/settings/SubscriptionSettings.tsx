import React from "react";
import { Link } from "react-router-dom";
import { Crown, ArrowRight, Sparkles } from "lucide-react";
import type { User } from "firebase/auth";
import { EarlyUserBenefits } from "../subscription/EarlyUserBenefits";
import { isUserEarly } from "../../utils/earlyUser";
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PRICING,
  formatKRW,
} from "../../constants/planLimits";

interface Props {
  user: User | null;
}

export const SubscriptionSettings: React.FC<Props> = ({ user }) => {
  const userIsEarly = isUserEarly(user);

  return (
    <div className="space-y-4">
      {/* 현재 플랜 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                현재 플랜
              </p>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                무료
              </h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ₩0
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">/월</p>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-5">
          {FREE_PLAN_FEATURES.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>

        <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-4 mb-3">
          <p className="text-xs font-semibold text-violet-900 dark:text-violet-200 mb-2">
            프리미엄 업그레이드
          </p>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {PREMIUM_PRICING.monthly.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatKRW(PREMIUM_PRICING.monthly.amount)}
                {PREMIUM_PRICING.monthly.periodLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {PREMIUM_PRICING.yearly.label}
                {PREMIUM_PRICING.yearly.badge && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    {PREMIUM_PRICING.yearly.badge}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatKRW(PREMIUM_PRICING.yearly.amount)}
                {PREMIUM_PRICING.yearly.periodLabel}
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/subscription"
          className="inline-flex items-center gap-1.5 w-full justify-center py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
        >
          플랜 비교·업그레이드
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 얼리 유저 혜택 (얼리 유저만) */}
      {userIsEarly && <EarlyUserBenefits user={user} forceShow />}

      {/* 결제 안내 */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              결제 시스템 준비 중
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              결제 시스템 오픈 시 이메일로 안내드릴 예정입니다.
              {userIsEarly &&
                " 얼리 유저는 평생 무료 혜택이 자동 적용됩니다."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
