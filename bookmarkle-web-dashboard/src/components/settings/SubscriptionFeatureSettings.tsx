import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon, RotateCcw, Eye } from "lucide-react";
import { betaUtils } from "../../utils/betaFlags";
import { SubscriptionAnnouncementModal } from "../SubscriptionAnnouncementModal";

export const SubscriptionFeatureSettings: React.FC = () => {
  const { t } = useTranslation();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const betaStatus = betaUtils.getBetaStatus();

  const handleResetSubscriptionSettings = () => {
    if (
      confirm(
        t("subscription.settings.resetConfirm", {
          defaultValue:
            "구독 설정을 초기화하시겠습니까? 구독 배너와 모달이 다시 표시됩니다.",
        })
      )
    ) {
      betaUtils.resetBetaSettings();
      alert(
        t("subscription.settings.resetSuccess", {
          defaultValue: "구독 설정이 초기화되었습니다.",
        })
      );
      // 로컬 스토리지 변경 이벤트 발생시켜 App.tsx에서 감지하도록 함
      window.dispatchEvent(new Event("storage"));
    }
  };

  return (
    <>
      <div className="bg-transparent rounded-xl border-0">
        <div className="flex items-center space-x-3 mb-4 sm:mb-5">
          <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {t("subscription.settings.subscriptionFeatureSettings", {
              defaultValue: "구독 기능 설정",
            })}
          </h4>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* 현재 상태 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("subscription.settings.subscriptionBanner", {
                  defaultValue: "구독 배너",
                })}
              </span>
              <span
                className={`font-medium text-sm ${
                  betaStatus.storage.bannerDismissed
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.bannerDismissed
                  ? t("subscription.settings.hidden", { defaultValue: "숨김" })
                  : t("subscription.settings.showing", {
                      defaultValue: "표시 중",
                    })}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("subscription.settings.subscriptionModal", {
                  defaultValue: "구독 모달",
                })}
              </span>
              <span
                className={`font-medium text-sm ${
                  betaStatus.storage.modalShown
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.modalShown
                  ? t("subscription.settings.showCompleted", {
                      defaultValue: "표시 완료",
                    })
                  : t("subscription.settings.waiting", {
                      defaultValue: "대기 중",
                    })}
              </span>
            </div>
          </div>

          {/* 구독 모달 보기 및 설정 초기화 버튼 */}
          <div className="pt-4 sm:pt-5 border-t border-gray-200 dark:border-gray-700 space-y-2.5 sm:space-y-3">
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>
                {t("subscription.settings.showSubscriptionModal", {
                  defaultValue: "구독 알림 모달 보기",
                })}
              </span>
            </button>
            <button
              onClick={handleResetSubscriptionSettings}
              className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>
                {t("subscription.settings.resetSettings", {
                  defaultValue: "구독 설정 초기화",
                })}
              </span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-0 sm:ml-6 px-1">
              {t("subscription.settings.resetDescription", {
                defaultValue: "구독 배너와 모달을 다시 표시합니다.",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 구독 알림 모달 */}
      <SubscriptionAnnouncementModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        forceShow={true}
      />
    </>
  );
};
