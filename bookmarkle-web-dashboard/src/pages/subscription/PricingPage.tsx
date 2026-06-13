import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore } from "../../stores";
import { Header } from "../../components/layout/Header";
import {
  Check,
  Sparkles,
  ArrowLeft,
  Bookmark,
  FolderTree,
  Search,
  CloudUpload,
  Palette,
  RotateCcw,
  Trash2,
  BarChart3,
  Users,
  Headphones,
  Zap,
  Crown,
  Shield,
} from "lucide-react";
import { isBetaPeriod } from "../../utils/betaFlags";

// ─── Plan 데이터 ────────────────────────────────────────────────────────────────

type PlanKey = "free" | "premium" | "business";
type BillingCycle = "monthly" | "yearly";

interface FeatureItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  bold?: boolean;
}

interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badge?: { text: string; color: string };
  highlight?: boolean;
  features: FeatureItem[];
  cta: string;
  disabled?: boolean;
}

const PLANS: Plan[] = [
  {
    key: "free",
    name: "무료",
    tagline: "개인 사용자를 위한 기본 기능",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { icon: Bookmark, text: "북마크 500개" },
      { icon: FolderTree, text: "컬렉션 10개 (2단계 하위 포함)" },
      { icon: Search, text: "기본 검색 (제목·URL)" },
      { icon: CloudUpload, text: "주 1회 자동 백업" },
      { icon: Palette, text: "라이트·다크 테마" },
      { icon: RotateCcw, text: "휴지통 30일 보관" },
    ],
    cta: "현재 플랜",
  },
  {
    key: "premium",
    name: "프리미엄",
    tagline: "북마크를 적극적으로 활용하는 분",
    monthlyPrice: 4900,
    yearlyPrice: 49000,
    highlight: true,
    badge: { text: "인기", color: "bg-white text-violet-600" },
    features: [
      { icon: Bookmark, text: "북마크 무제한", bold: true },
      { icon: FolderTree, text: "컬렉션 무제한 (5단계 하위)", bold: true },
      { icon: Search, text: "AI 검색 + 태그·내용 검색", bold: true },
      { icon: CloudUpload, text: "매일 자동 백업 + 수동 백업 무제한" },
      { icon: BarChart3, text: "북마크 통계·인사이트 대시보드" },
      { icon: RotateCcw, text: "휴지통 90일 + 복구 히스토리" },
      { icon: Palette, text: "전체 테마 + 위젯 모두 잠금 해제" },
      { icon: Zap, text: "Chrome 확장 우선 동기화" },
      { icon: Headphones, text: "프리미엄 이메일 지원 (24h)" },
    ],
    cta: "프리미엄 시작",
  },
  {
    key: "business",
    name: "비즈니스",
    tagline: "팀과 조직을 위한 협업 기능",
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    features: [
      { icon: Check, text: "프리미엄의 모든 기능 포함", bold: true },
      { icon: Users, text: "최대 10명 팀 멤버" },
      { icon: FolderTree, text: "팀 공유 컬렉션 무제한" },
      { icon: Shield, text: "역할 기반 권한 관리 (관리/편집/뷰)" },
      { icon: BarChart3, text: "팀 활동 분석 리포트" },
      { icon: Zap, text: "REST API 액세스" },
      { icon: Palette, text: "커스텀 브랜딩 (로고·도메인)" },
      { icon: Headphones, text: "전담 매니저 지원" },
    ],
    cta: "곧 출시",
    disabled: true,
  },
];

// ─── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "언제든지 해지할 수 있나요?",
    a: "네, 언제든지 해지 가능합니다. 해지 후에도 결제한 기간이 끝날 때까지 프리미엄 기능을 사용할 수 있고, 이후 자동으로 무료 플랜으로 전환됩니다.",
  },
  {
    q: "결제 수단은 어떤 것을 지원하나요?",
    a: "신용/체크카드, 카카오페이, 토스페이를 지원합니다. 모든 결제는 Stripe를 통해 안전하게 처리됩니다.",
  },
  {
    q: "무료 플랜에서 데이터가 삭제되나요?",
    a: "아니요. 프리미엄에서 무료로 다운그레이드해도 데이터는 그대로 보존됩니다. 단, 무료 플랜 한도(500개)를 초과하는 항목은 읽기 전용으로 전환됩니다.",
  },
  {
    q: "얼리 유저는 어떤 혜택을 받나요?",
    a: "베타 기간 중 가입하신 얼리 유저는 정식 출시 후에도 기존 사용하던 기능을 무료로 계속 이용하실 수 있습니다.",
  },
  {
    q: "팀 플랜은 언제 출시되나요?",
    a: "2026년 하반기 출시 예정입니다. 출시 알림을 받으려면 프리미엄 가입 후 이메일 수신 동의를 해주세요.",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, isPremium } = useSubscriptionStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (isBetaPeriod()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubscribe = (planType: PlanKey) => {
    console.log("구독 요청:", { planType, cycle: billingCycle });
    alert(t("premium.stripeIntegrationPending"));
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "0";
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const monthlySavings = Math.round(
    ((PLANS[1].monthlyPrice * 12 - PLANS[1].yearlyPrice) /
      (PLANS[1].monthlyPrice * 12)) *
      100
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d10]">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* 뒤로가기 */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>대시보드로 돌아가기</span>
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">정식 오픈 기념</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            나에게 맞는 플랜 선택하기
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            모든 플랜은 7일 무료 체험으로 시작할 수 있어요. <br className="hidden sm:block" />
            언제든지 해지 가능합니다.
          </p>
        </div>

        {/* 결제 주기 토글 */}
        <div className="flex justify-center mb-8 lg:mb-10">
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.06]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              월간
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                billingCycle === "yearly"
                  ? "bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              연간 결제
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500 text-white">
                -{monthlySavings}%
              </span>
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((planData) => {
            const isCurrent =
              (planData.key === "free" && plan === "free") ||
              (planData.key === "premium" && isPremium);

            const price =
              billingCycle === "monthly"
                ? planData.monthlyPrice
                : Math.round(planData.yearlyPrice / 12);

            return (
              <div
                key={planData.key}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col transition-all duration-200 ${
                  planData.highlight
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/20 scale-100 lg:scale-105"
                    : "bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/[0.06] hover:border-gray-200 dark:hover:border-white/[0.10] hover:-translate-y-1"
                }`}
              >
                {/* 배지 */}
                {planData.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-md ${planData.badge.color}`}
                    >
                      <Crown className="w-3 h-3" />
                      {planData.badge.text}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">
                      <Check className="w-3 h-3" />
                      이용 중
                    </span>
                  </div>
                )}

                {/* 플랜 정보 */}
                <div className="mb-6">
                  <h3
                    className={`text-xl font-bold mb-1 ${
                      planData.highlight ? "text-white" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {planData.name}
                  </h3>
                  <p
                    className={`text-xs ${
                      planData.highlight ? "text-white/80" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {planData.tagline}
                  </p>
                </div>

                {/* 가격 */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                        planData.highlight ? "text-white" : "text-gray-900 dark:text-white"
                      }`}
                    >
                      ₩{formatPrice(price)}
                    </span>
                    <span
                      className={`text-sm ${
                        planData.highlight ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      /월
                    </span>
                  </div>
                  {billingCycle === "yearly" && planData.yearlyPrice > 0 && (
                    <p
                      className={`text-xs mt-1.5 ${
                        planData.highlight ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      연 ₩{formatPrice(planData.yearlyPrice)} 일시 결제
                    </p>
                  )}
                  {planData.yearlyPrice === 0 && (
                    <p
                      className={`text-xs mt-1.5 ${
                        planData.highlight ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      평생 무료
                    </p>
                  )}
                </div>

                {/* CTA 버튼 */}
                <button
                  onClick={() => {
                    if (planData.disabled) return;
                    if (isCurrent && planData.key !== "free") {
                      navigate("/subscription");
                    } else if (planData.key === "premium") {
                      handleSubscribe("premium");
                    } else if (planData.key === "free" && plan !== "free") {
                      navigate("/subscription");
                    }
                  }}
                  disabled={planData.disabled || (isCurrent && planData.key === "free")}
                  className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all duration-150 mb-6 ${
                    planData.disabled
                      ? "bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : isCurrent
                      ? planData.highlight
                        ? "bg-white/20 text-white hover:bg-white/30"
                        : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 cursor-default"
                      : planData.highlight
                      ? "bg-white text-violet-600 hover:bg-violet-50 shadow-lg hover:shadow-xl"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90"
                  }`}
                >
                  {isCurrent && planData.key !== "free" ? "구독 관리" : planData.cta}
                </button>

                {/* 기능 목록 */}
                <div
                  className={`pt-5 border-t ${
                    planData.highlight ? "border-white/20" : "border-gray-100 dark:border-white/[0.06]"
                  } space-y-3 flex-1`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${
                      planData.highlight ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {planData.key === "business" ? "팀 협업 기능" : "주요 기능"}
                  </p>
                  {planData.features.map((feat, idx) => {
                    const Icon = feat.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            planData.highlight
                              ? "bg-white/20"
                              : "bg-violet-50 dark:bg-violet-500/10"
                          }`}
                        >
                          <Icon
                            className={`w-3 h-3 ${
                              planData.highlight
                                ? "text-white"
                                : "text-violet-600 dark:text-violet-400"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-sm leading-tight ${
                            feat.bold ? "font-semibold" : ""
                          } ${
                            planData.highlight ? "text-white" : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {feat.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 신뢰 배지 */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>안전한 결제 (Stripe)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>7일 무료 체험</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            <span>언제든지 해지 가능</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 lg:mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              자주 묻는 질문
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              궁금한 점이 더 있으신가요?{" "}
              <a
                href="mailto:support@bookmarkle.com"
                className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
              >
                문의하기
              </a>
            </p>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">
                      {faq.q}
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isOpen
                          ? "bg-violet-100 dark:bg-violet-500/20 rotate-45"
                          : "bg-gray-100 dark:bg-white/[0.06]"
                      }`}
                    >
                      <svg
                        className={`w-3 h-3 ${
                          isOpen
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 -mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-violet-50 via-indigo-50/50 to-violet-50 dark:from-violet-500/[0.08] dark:via-indigo-500/[0.04] dark:to-violet-500/[0.08] rounded-3xl border border-violet-100 dark:border-violet-500/20 p-8 sm:p-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            지금 시작해 보세요
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            7일 무료 체험으로 모든 프리미엄 기능을 경험해 보세요. <br className="hidden sm:block" />
            카드 정보 입력 없이 시작할 수 있습니다.
          </p>
          {!isPremium && (
            <button
              onClick={() => handleSubscribe("premium")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Crown className="w-4 h-4" />
              프리미엄 무료로 시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
