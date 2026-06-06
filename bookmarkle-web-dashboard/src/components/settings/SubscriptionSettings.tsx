import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useSubscriptionStore,
  useBookmarkStore,
  useCollectionStore,
  useAuthStore,
} from "../../stores";
import {
  Crown,
  Check,
  AlertCircle,
  ArrowRight,
  Gift,
  Bookmark,
  FolderTree,
  Infinity as InfinityIcon,
  TrendingUp,
} from "lucide-react";
import {
  checkBookmarkLimit,
  checkCollectionLimit,
} from "../../utils/subscriptionLimits";
import { isBetaPeriod } from "../../utils/betaFlags";
import { isEarlyUser } from "../../utils/earlyUser";

// ─── 사용량 막대 ────────────────────────────────────────────────────────────────

interface UsageBarProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  limit: number;
  exceeded: boolean;
  iconBg: string;
  iconColor: string;
}

const UsageBar: React.FC<UsageBarProps> = ({
  label,
  icon: Icon,
  current,
  limit,
  exceeded,
  iconBg,
  iconColor,
}) => {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          {isUnlimited ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <InfinityIcon className="w-4 h-4" />
              <span className="text-xs">({current.toLocaleString()})</span>
            </span>
          ) : (
            <>
              <span className={`text-sm font-bold tabular-nums ${
                exceeded ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
              }`}>
                {current.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                / {limit.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-100 dark:bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                exceeded
                  ? "bg-red-500"
                  : pct > 80
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-violet-500 to-indigo-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {exceeded && (
            <p className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400">
              <AlertCircle className="w-3 h-3" />
              한도 초과: 업그레이드가 필요합니다
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ─── 메인 ──────────────────────────────────────────────────────────────────────

const PREMIUM_FEATURES = [
  { icon: Bookmark, text: "북마크 무제한 저장" },
  { icon: FolderTree, text: "컬렉션 무제한 (5단계 하위)" },
  { icon: TrendingUp, text: "AI 검색 · 통계 · 인사이트" },
  { icon: Crown, text: "전체 위젯 · 테마 잠금 해제" },
];

export const SubscriptionSettings: React.FC = () => {
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
    if (user) checkUserStatus();
  }, [user, checkUserStatus]);

  if (isBetaPeriod()) return null;

  return (
    <div className="space-y-3">
      {/* 현재 플랜 카드 */}
      <div
        className={`relative rounded-2xl overflow-hidden border ${
          isPremium
            ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-transparent shadow-lg shadow-violet-500/20"
            : "bg-white dark:bg-[#111113] border-gray-100 dark:border-white/[0.06]"
        }`}
      >
        {/* 장식 글로우 (프리미엄) */}
        {isPremium && (
          <>
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
          </>
        )}

        <div className="relative p-5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isPremium
                    ? "bg-white/20 backdrop-blur-sm"
                    : "bg-gray-100 dark:bg-white/[0.06]"
                }`}
              >
                <Crown
                  className={`w-5 h-5 ${
                    isPremium ? "text-white" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-base font-bold ${
                    isPremium ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {isPremium ? "프리미엄" : "무료 플랜"}
                </p>
                <p
                  className={`text-xs ${
                    isPremium ? "text-white/80" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {isPremium
                    ? "모든 기능을 이용 중입니다"
                    : "기본 기능을 사용하고 있어요"}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                isPremium
                  ? "bg-white/20 text-white backdrop-blur-sm"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPremium ? "bg-emerald-300" : "bg-gray-400"
                }`}
              />
              {isPremium ? "활성" : "무료"}
            </span>
          </div>

          {/* 사용량 */}
          <div
            className={`space-y-4 pt-4 ${
              isPremium ? "border-t border-white/20" : "border-t border-gray-100 dark:border-white/[0.06]"
            }`}
          >
            <UsageBar
              label="북마크"
              icon={Bookmark}
              current={rawBookmarks.length}
              limit={limits.maxBookmarks}
              exceeded={!bookmarkLimit.allowed}
              iconBg={isPremium ? "bg-white/20" : "bg-blue-50 dark:bg-blue-500/10"}
              iconColor={isPremium ? "text-white" : "text-blue-600 dark:text-blue-400"}
            />
            <UsageBar
              label="컬렉션"
              icon={FolderTree}
              current={collections.length}
              limit={limits.maxCollections}
              exceeded={!collectionLimit.allowed}
              iconBg={isPremium ? "bg-white/20" : "bg-emerald-50 dark:bg-emerald-500/10"}
              iconColor={isPremium ? "text-white" : "text-emerald-600 dark:text-emerald-400"}
            />
          </div>

          {/* 구독 관리 버튼 */}
          <button
            onClick={() => navigate(isPremium ? "/subscription" : "/pricing")}
            className={`mt-5 w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isPremium
                ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            <span>{isPremium ? "구독 관리" : "프리미엄 시작하기"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 얼리유저 혜택 */}
      {!loading && userIsEarly && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-amber-50 dark:from-amber-500/[0.08] dark:via-orange-500/[0.04] dark:to-amber-500/[0.08] border border-amber-100 dark:border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
                얼리 유저 혜택
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                베타 기간 중 가입하신 얼리 유저로 인증되었습니다. 베타 때 사용하던 기능을 계속 무료로 이용하실 수 있어요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 무료 사용자 → 프리미엄 안내 */}
      {!isPremium && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              프리미엄으로 얻을 수 있는 것
            </p>
          </div>
          <div className="px-2 pb-2 space-y-0.5">
            {PREMIUM_FEATURES.map(({ icon: Icon, text }, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3">
            <button
              onClick={() => navigate("/pricing")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              플랜 비교하기
            </button>
          </div>
        </div>
      )}

      {/* 프리미엄 기능 목록 */}
      {isPremium && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              이용 중인 프리미엄 기능
            </p>
          </div>
          <div className="px-2 pb-2 space-y-0.5">
            {PREMIUM_FEATURES.map(({ icon: Icon, text }, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
