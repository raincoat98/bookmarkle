import React from "react";
import { X, Sparkles, Check, Crown, Bookmark, FolderTree, Search, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscriptionStore, useFeatureFlagsStore } from "../../stores";
import { isBetaPeriod } from "../../utils/betaFlags";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: "bookmark_limit" | "collection_limit" | "premium_feature";
  currentCount?: number;
  limit?: number;
}

const PREMIUM_FEATURES = [
  { icon: Bookmark, text: "북마크 무제한 저장" },
  { icon: FolderTree, text: "컬렉션 무제한 (5단계 하위)" },
  { icon: Search, text: "AI 검색 + 태그·내용 검색" },
  { icon: BarChart3, text: "통계 대시보드 + 인사이트" },
];

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
  useFeatureFlagsStore((s) => s.flags);

  if (!isOpen || isBetaPeriod()) return null;

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  const getReason = () => {
    switch (reason) {
      case "bookmark_limit":
        return {
          title: "북마크 한도에 도달했어요",
          desc: `현재 ${currentCount ?? 0}/${limit ?? limits.maxBookmarks}개 사용 중. 프리미엄에서는 무제한으로 저장할 수 있어요.`,
        };
      case "collection_limit":
        return {
          title: "컬렉션 한도에 도달했어요",
          desc: `현재 ${currentCount ?? 0}/${limit ?? limits.maxCollections}개 사용 중. 프리미엄에서는 무제한으로 만들 수 있어요.`,
        };
      case "premium_feature":
        return {
          title: "프리미엄 기능입니다",
          desc: "프리미엄 플랜에서 이용할 수 있는 기능이에요.",
        };
      default:
        return {
          title: "프리미엄으로 업그레이드",
          desc: "더 많은 기능을 잠금 해제해보세요.",
        };
    }
  };

  const { title, desc } = getReason();

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 z-[10001]">
        <div className="relative w-full max-w-md bg-white dark:bg-[#111113] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {/* 닫기 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 그라데이션 헤더 */}
          <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 px-6 pt-8 pb-7 text-white overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1">{title}</h2>
              <p className="text-xs text-white/80 max-w-[280px] leading-relaxed">{desc}</p>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="px-6 pt-5 pb-6 space-y-4">
            {/* 현재 사용량 (free 플랜만) */}
            {plan === "free" && (currentCount !== undefined && limit !== undefined) && (
              <div className="bg-gray-50 dark:bg-white/[0.04] rounded-2xl p-3 border border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">현재 사용량</span>
                  <span className="text-xs font-semibold text-red-500 dark:text-red-400 tabular-nums">
                    {currentCount} / {limit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min((currentCount / limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* 프리미엄 핵심 기능 */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                프리미엄에서 이용 가능
              </p>
              <div className="space-y-2">
                {PREMIUM_FEATURES.map(({ icon: Icon, text }, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* 가격 */}
            <div className="bg-gradient-to-br from-violet-50 via-indigo-50/50 to-violet-50 dark:from-violet-500/[0.08] dark:via-indigo-500/[0.04] dark:to-violet-500/[0.08] rounded-2xl p-4 border border-violet-100 dark:border-violet-500/20 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  ₩4,083
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500">/월</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                연간 ₩49,000 일시 결제 · <span className="font-semibold text-violet-600 dark:text-violet-400">17% 할인</span>
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                {t("common.maybeLater") || "나중에"}
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                업그레이드
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
