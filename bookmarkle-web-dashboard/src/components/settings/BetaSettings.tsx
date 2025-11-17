import React from "react";
import {
  Sparkles,
  Gift,
  Calendar,
  Settings as SettingsIcon,
  Info,
  RotateCcw,
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

  const handleResetBetaSettings = () => {
    if (
      confirm(
        "베타 설정을 초기화하시겠습니까? 베타 배너와 모달이 다시 표시됩니다."
      )
    ) {
      betaUtils.resetBetaSettings();
      alert("베타 설정이 초기화되었습니다.");
      window.location.reload();
    }
  };

  const handleFeedback = () => {
    // 피드백 제출 로직 (추후 구현)
    window.open("https://github.com/your-repo/issues", "_blank");
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
            베타 버전 정보
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            현재 베타 기간 중이며, 모든 기능을 무료로 사용할 수 있습니다.
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
              베타 기간 현황
            </h4>
            {isBetaPeriod() ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    베타 진행 중
                  </span>
                  {" • "}정식 오픈까지 약 {daysUntilLaunch}일 남음
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  모든 기능을 무료로 사용할 수 있습니다.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  정식 오픈 완료
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
                얼리유저 상태
              </h4>
              {userIsEarly ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      🎉 얼리유저 인증됨
                    </span>
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      <strong>특별 혜택:</strong> 정식 오픈 후에도 현재 사용
                      중인 모든 기능을 계속 무료로 이용할 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  얼리유저 혜택 대상이 아닙니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 베타 기능 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            베타 기능 설정
          </h4>
        </div>

        <div className="space-y-4">
          {/* 현재 상태 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                베타 배너
              </span>
              <span
                className={`font-medium ${
                  betaStatus.storage.bannerDismissed
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.bannerDismissed ? "숨김" : "표시 중"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                베타 모달
              </span>
              <span
                className={`font-medium ${
                  betaStatus.storage.modalShown
                    ? "text-gray-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {betaStatus.storage.modalShown ? "표시 완료" : "대기 중"}
              </span>
            </div>
          </div>

          {/* 설정 초기화 버튼 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleResetBetaSettings}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>베타 설정 초기화</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              베타 배너와 모달을 다시 표시합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 피드백 섹션 */}
      {betaUtils.isFeedbackEnabled() && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              베타 피드백
            </h4>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              베타 버전을 사용하시면서 불편한 점이나 개선 아이디어가 있으시면
              언제든 피드백을 보내주세요.
            </p>

            <button
              onClick={handleFeedback}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>피드백 보내기</span>
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
            <p>
              <strong>개발 모드:</strong> 환경 변수를 통해 베타 기능들을
              개별적으로 제어할 수 있습니다.
            </p>
            <p>
              베타 종료일: {betaStatus.betaEndDate.toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
