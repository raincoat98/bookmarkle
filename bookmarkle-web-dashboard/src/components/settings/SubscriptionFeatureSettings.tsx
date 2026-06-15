import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  RotateCcw,
  Eye,
  Crown,
  Bell,
  Megaphone,
  Gift,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore, useFeatureFlagsStore } from "../../stores";
import type { FeatureFlags } from "../../stores";
import { announcementStorage } from "../../utils/announcementStorage";
import { SubscriptionAnnouncementModal } from "../subscription/SubscriptionAnnouncementModal";
import { SubscriptionAnnouncementBanner } from "../subscription/SubscriptionAnnouncementBanner";
import { EarlyUserBenefits } from "../subscription/EarlyUserBenefits";

type SubFlagKey = Exclude<keyof FeatureFlags, "beta">;

interface SubFlagDef {
  key: SubFlagKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const SUB_FLAGS: SubFlagDef[] = [
  {
    key: "showAnnouncementBanner",
    label: "정식 출시 안내 배너",
    description: "상단 가로 배너 (베타 모드 OFF 시에만 적용).",
    icon: Megaphone,
    iconBg: "bg-violet-100 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "showAnnouncementModal",
    label: "정식 출시 안내 팝업",
    description: "1회 표시 후 사용자가 닫으면 다시 안 뜸 (베타 모드 OFF 시에만 적용).",
    icon: Bell,
    iconBg: "bg-blue-100 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "showEarlyUserBenefits",
    label: "얼리 유저 혜택 표시",
    description: "얼리 유저 카드·배지 (베타 모드 OFF 시에만 적용).",
    icon: Gift,
    iconBg: "bg-orange-100 dark:bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

export const SubscriptionFeatureSettings: React.FC = () => {
  const { flags, loaded, updateFlag } = useFeatureFlagsStore(
    useShallow((s) => ({
      flags: s.flags,
      loaded: s.loaded,
      updateFlag: s.updateFlag,
    }))
  );
  const user = useAuthStore((s) => s.user);
  const [previewKind, setPreviewKind] = useState<
    "modal" | "banner" | "earlyUser" | null
  >(null);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    announcementStorage.isBannerDismissed()
  );
  const [modalDismissed, setModalDismissed] = useState(() =>
    announcementStorage.isModalDismissed()
  );

  const toggle = async <K extends keyof FeatureFlags>(
    key: K,
    value: FeatureFlags[K]
  ) => {
    await updateFlag(key, value);
  };

  const resetLocalState = () => {
    announcementStorage.resetAll();
    setBannerDismissed(false);
    setModalDismissed(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <SettingsIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              구독 기능 플래그 관리
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Firestore{" "}
              <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-white/[0.08]">
                config/featureFlags
              </code>{" "}
              에 저장
            </p>
          </div>
        </div>

        {!loaded ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            플래그 로드 중...
          </div>
        ) : (
          <div className="space-y-3">
            {/* 베타 모드 마스터 토글 */}
            <div className="bg-white dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    베타 모드
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    켜면 배너·팝업·얼리유저 카드가 모두 숨겨집니다. 정식 출시 전까지 유지.
                  </p>
                </div>
                <Switch
                  checked={flags.beta}
                  onChange={(v) => toggle("beta", v)}
                />
              </div>
            </div>

            {/* 하위 토글 */}
            {SUB_FLAGS.map(({ key, label, description, icon: Icon, iconBg, iconColor }) => {
              const disabled = flags.beta;
              return (
                <div
                  key={key}
                  className={`bg-white dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4 ${
                    disabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {description}
                      </p>
                    </div>
                    <Switch
                      checked={flags[key]}
                      disabled={disabled}
                      onChange={(v) => toggle(key, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 로컬 상태 */}
      <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          내 브라우저 상태 (localStorage)
        </h3>
        <div className="space-y-1.5">
          <LocalRow label="배너" dismissed={bannerDismissed} />
          <LocalRow label="안내 모달" dismissed={modalDismissed} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <PreviewButton onClick={() => setPreviewKind("banner")}>
            배너 미리보기
          </PreviewButton>
          <PreviewButton onClick={() => setPreviewKind("modal")}>
            모달 미리보기
          </PreviewButton>
          <PreviewButton onClick={() => setPreviewKind("earlyUser")}>
            얼리유저 카드 미리보기
          </PreviewButton>
          <button
            onClick={resetLocalState}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            로컬 상태 초기화
          </button>
        </div>
      </div>

      {/* 미리보기 */}
      {previewKind === "banner" && (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.06]">
          <SubscriptionAnnouncementBanner
            forceShow
            onClose={() => setPreviewKind(null)}
          />
        </div>
      )}
      {previewKind === "modal" && (
        <SubscriptionAnnouncementModal
          forceShow
          onClose={() => setPreviewKind(null)}
        />
      )}
      {previewKind === "earlyUser" && (
        <div className="relative">
          <EarlyUserBenefits user={user} forceShow />
          <button
            onClick={() => setPreviewKind(null)}
            className="absolute top-2 right-2 text-xs text-gray-500 hover:underline"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
};

const Switch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, disabled, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:cursor-not-allowed ${
      checked ? "bg-violet-600" : "bg-gray-300 dark:bg-white/[0.12]"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

const LocalRow: React.FC<{ label: string; dismissed: boolean }> = ({
  label,
  dismissed,
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-700 dark:text-gray-300">{label}</span>
    <span
      className={`px-2 py-0.5 rounded-full text-xs ${
        dismissed
          ? "bg-gray-200 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400"
          : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {dismissed ? "닫음" : "표시 가능"}
    </span>
  </div>
);

const PreviewButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline"
  >
    <Eye className="w-3.5 h-3.5" />
    {children}
  </button>
);
