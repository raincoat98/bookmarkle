import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  RotateCcw,
  Eye,
  Loader2,
  AlertCircle,
  Crown,
  Megaphone,
  Bell,
  Gift,
} from "lucide-react";
import { useFeatureFlagsStore, type FeatureFlags } from "../../stores";
import { betaUtils } from "../../utils/betaFlags";
import { SubscriptionAnnouncementModal } from "../subscription/SubscriptionAnnouncementModal";
import toast from "react-hot-toast";

interface FlagDef {
  key: keyof FeatureFlags;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
}

const FLAG_DEFS: FlagDef[] = [
  {
    key: "IS_BETA",
    icon: Crown,
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "베타 모드",
    desc: "켜면 가격 페이지·구독 메뉴·배너·모달이 모두 숨겨집니다. 정식 출시 전까지 유지.",
  },
  {
    key: "SHOW_SUBSCRIPTION_BANNER",
    icon: Megaphone,
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "구독 배너 표시",
    desc: "상단 가로 배너 (베타 모드 OFF 시에만 적용).",
  },
  {
    key: "SHOW_SUBSCRIPTION_MODAL",
    icon: Bell,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "구독 안내 모달",
    desc: "정식 출시 안내 모달 (베타 모드 OFF 시에만 적용).",
  },
  {
    key: "SHOW_EARLY_USER_BENEFITS",
    icon: Gift,
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    title: "얼리 유저 혜택 표시",
    desc: "얼리 유저 카드·배지 (베타 모드 OFF 시에만 적용).",
  },
];

// 토글
const Toggle: React.FC<{
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-75 ${
      enabled && !disabled ? "bg-violet-600" : "bg-gray-200 dark:bg-white/[0.08]"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        enabled && !disabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

export const SubscriptionFeatureSettings: React.FC = () => {
  const { flags, loaded, updateFlag } = useFeatureFlagsStore();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [pendingKey, setPendingKey] = useState<keyof FeatureFlags | null>(null);

  const handleToggle = async (key: keyof FeatureFlags) => {
    try {
      setPendingKey(key);
      const next = !flags[key];
      await updateFlag(key, next);
      toast.success(`${FLAG_DEFS.find((f) => f.key === key)?.title} ${next ? "ON" : "OFF"}`);
    } catch (err) {
      console.error("플래그 업데이트 실패:", err);
      toast.error("플래그 업데이트에 실패했습니다");
    } finally {
      setPendingKey(null);
    }
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "로컬 dismiss 상태를 초기화하시겠습니까? 구독 배너와 모달이 다시 표시됩니다."
      )
    )
      return;
    betaUtils.resetBetaSettings();
    toast.success("구독 안내 상태가 초기화되었습니다");
    window.dispatchEvent(new Event("storage"));
  };

  const status = betaUtils.getBetaStatus();

  return (
    <>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              구독 기능 플래그 관리
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Firestore <code className="px-1 py-0.5 bg-gray-100 dark:bg-white/[0.06] rounded text-[10px]">config/featureFlags</code>에 저장
            </p>
          </div>
        </div>

        {/* IS_BETA 경고 */}
        {flags.IS_BETA && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              현재 <strong>베타 모드</strong>입니다. 가격 페이지 / 구독 메뉴 / 배너 / 모달이 모두 숨겨져 있어요. 정식 출시 시 베타 모드를 OFF로 변경하세요.
            </p>
          </div>
        )}

        {/* 플래그 목록 */}
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-2 py-2 space-y-0.5">
            {FLAG_DEFS.map(({ key, icon: Icon, iconBg, iconColor, title, desc }) => {
              const isBetaDependent = key !== "IS_BETA";
              const disabled = isBetaDependent && flags.IS_BETA;
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {desc}
                    </p>
                    {disabled && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1 italic">
                        베타 모드일 때는 효과가 적용되지 않음
                      </p>
                    )}
                  </div>
                  {pendingKey === key ? (
                    <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                  ) : (
                    <Toggle
                      enabled={flags[key]}
                      onChange={() => handleToggle(key)}
                      disabled={!loaded}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 로컬 상태 */}
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              내 브라우저 상태 (localStorage)
            </p>
          </div>
          <div className="px-5 pb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">배너</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  status.storage.bannerDismissed
                    ? "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {status.storage.bannerDismissed ? "닫힘" : "표시 중"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">모달</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  status.storage.modalShown
                    ? "bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {status.storage.modalShown ? "표시 완료" : "대기 중"}
              </span>
            </div>
          </div>

          <div className="px-3 pb-3 pt-1 border-t border-gray-50 dark:border-white/[0.04] flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors"
            >
              <Eye className="w-4 h-4" />
              모달 미리보기
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              로컬 상태 초기화
            </button>
          </div>
        </div>
      </div>

      <SubscriptionAnnouncementModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        forceShow={true}
      />
    </>
  );
};
