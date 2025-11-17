import React from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Gift,
  Calendar,
  Info,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "../../stores";
import {
  betaUtils,
  isBetaPeriod,
  getDaysUntilLaunch,
} from "../../utils/betaFlags";
import { isEarlyUser } from "../../utils/earlyUser";
import { useState, useEffect, useCallback } from "react";

export const BetaSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [userIsEarly, setUserIsEarly] = useState(false);
  const [loading, setLoading] = useState(true);

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
    if (user) {
      checkUserStatus();
    }
  }, [user, checkUserStatus]);

  const betaStatus = betaUtils.getBetaStatus();
  const daysUntilLaunch = getDaysUntilLaunch();

  const handleFeedback = () => {
    window.open("https://github.com/raincoat98/bookmarkle/issues/new", "_blank");
  };

  if (!betaUtils.shouldShowBetaSettings()) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-gradient-to-r from-brand-500 to-accent-500 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("beta.settings.betaVersionInfo")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("beta.settings.description")}
          </p>
        </div>
      </div>

      {/* 베타 상태 카드 */}
      <div className="bg-gradient-to-r from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 rounded-xl p-6 border border-brand-200 dark:border-brand-800">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t("beta.settings.betaStatus")}
            </h4>
            {isBetaPeriod() ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {t("beta.settings.betaActive")}
                  </span>
                  {" • "}
                  {daysUntilLaunch > 1000
                    ? t("beta.settings.launchDateTBD")
                    : t("beta.settings.daysRemaining", {
                        days: daysUntilLaunch,
                      })}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t("beta.settings.allFreeFeatures")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {t("beta.settings.officialLaunch")}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 얼리유저 상태 */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-xl ${
                userIsEarly
                  ? "bg-yellow-100 dark:bg-yellow-900/20"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
            >
              <Gift
                className={`w-6 h-6 ${
                  userIsEarly
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {t("beta.settings.earlyUserStatus")}
              </h4>
              {userIsEarly ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {t("beta.settings.earlyUserVerified")}
                    </span>
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      {t("beta.settings.earlyUserSpecialBenefit")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("beta.settings.notEarlyUser")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 피드백 섹션 */}
      {betaUtils.isFeedbackEnabled() && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {t("beta.settings.betaFeedback")}
            </h4>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("beta.settings.feedbackDescription")}
            </p>

            <button
              onClick={handleFeedback}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t("beta.settings.sendFeedback")}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 개발자 정보 */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start space-x-3">
          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>{t("beta.settings.devModeDescription")}</p>
            <p>
              {t("beta.settings.betaEndDateInfo", {
                date: betaStatus.betaEndDate.toLocaleDateString("ko-KR"),
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
