import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon, RotateCcw, Eye } from "lucide-react";
import { betaUtils } from "../../utils/betaFlags";
import { BetaAnnouncementModal } from "../BetaAnnouncementModal";

export const BetaFeatureSettings: React.FC = () => {
  const { t } = useTranslation();
  const [showBetaModal, setShowBetaModal] = useState(false);

  const betaStatus = betaUtils.getBetaStatus();

  const handleResetBetaSettings = () => {
    if (confirm(t("beta.settings.resetConfirm"))) {
      betaUtils.resetBetaSettings();
      alert(t("beta.settings.resetSuccess"));
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
            {t("beta.settings.betaFeatureSettings")}
          </h4>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {/* 현재 상태 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("beta.settings.betaBanner")}
              </span>
              <span
                className={`font-medium text-sm ${
                  betaStatus.storage.bannerDismissed
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.bannerDismissed
                  ? t("beta.settings.hidden")
                  : t("beta.settings.showing")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t("beta.settings.betaModal")}
              </span>
              <span
                className={`font-medium text-sm ${
                  betaStatus.storage.modalShown
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.modalShown
                  ? t("beta.settings.showCompleted")
                  : t("beta.settings.waiting")}
              </span>
            </div>
          </div>

          {/* 베타 모달 보기 및 설정 초기화 버튼 */}
          <div className="pt-4 sm:pt-5 border-t border-gray-200 dark:border-gray-700 space-y-2.5 sm:space-y-3">
            <button
              onClick={() => setShowBetaModal(true)}
              className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>{t("beta.settings.showBetaModal")}</span>
            </button>
            <button
              onClick={handleResetBetaSettings}
              className="w-full sm:w-auto flex items-center justify-center sm:justify-start space-x-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span>{t("beta.settings.resetSettings")}</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-0 sm:ml-6 px-1">
              {t("beta.settings.resetDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* 베타 모달 */}
      <BetaAnnouncementModal
        isOpen={showBetaModal}
        onClose={() => setShowBetaModal(false)}
        forceShow={true}
      />
    </>
  );
};
