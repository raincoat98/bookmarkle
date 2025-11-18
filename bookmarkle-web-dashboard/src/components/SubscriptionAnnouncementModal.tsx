import { useState, useEffect } from "react";
import { X, Crown, Gift } from "lucide-react";
import { useAuthStore } from "../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { betaUtils, BETA_END_DATE } from "../utils/betaFlags";

interface SubscriptionAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceShow?: boolean; // 수동으로 열 때 사용
}

export const SubscriptionAnnouncementModal: React.FC<
  SubscriptionAnnouncementModalProps
> = ({ isOpen, onClose, forceShow = false }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isEarlyUser, setIsEarlyUser] = useState(false);

  const checkEarlyUser = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const createdAt = userData.createdAt?.toDate();
        if (createdAt && createdAt < BETA_END_DATE) {
          setIsEarlyUser(true);
        }
      }
    } catch (error) {
      console.error("얼리유저 확인 실패:", error);
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      checkEarlyUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen]);

  const handleSubscribe = () => {
    betaUtils.markModalShown();
    onClose();
    navigate("/pricing");
  };

  const handleClose = () => {
    if (!forceShow) {
      betaUtils.markModalShown();
    }
    onClose();
  };

  // 구독 알림 모달을 표시하지 않는 경우 (수동으로 열 때는 체크 우회)
  if (!isOpen || (!forceShow && !betaUtils.shouldShowModal())) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-[10000] bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 컨테이너 */}
      <div className="relative min-h-full flex items-center justify-center p-4 z-[10001]">
        <div className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] my-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 헤더 */}
          <div className="bg-gradient-to-r from-brand-500 to-accent-500 p-6 text-white flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {t("premium.subscription.modal.title", {
                    defaultValue: "프리미엄 구독으로 업그레이드하세요!",
                  })}
                </h2>
              </div>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("premium.subscription.modal.description", {
                defaultValue:
                  "Bookmarkle이 정식 오픈되었습니다! 프리미엄 구독으로 더 많은 기능을 이용하실 수 있습니다.",
              })}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("premium.subscription.modal.features", {
                defaultValue:
                  "프리미엄 구독으로 무제한 북마크, 고급 검색 기능, 커스텀 테마 등 다양한 기능을 이용하세요.",
              })}
            </p>
            {betaUtils.shouldShowEarlyUserBenefits() && (
              <>
                {isEarlyUser && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <Gift className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                          {t(
                            "premium.subscription.modal.earlyUserBenefitApplied",
                            {
                              defaultValue:
                                "얼리유저 특별 혜택이 적용되었습니다!",
                            }
                          )}
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          {t(
                            "premium.subscription.modal.earlyUserBenefitDesc",
                            {
                              defaultValue:
                                "베타 기간 중 가입하신 얼리유저는 특별 할인 혜택을 받으실 수 있습니다.",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!isEarlyUser && (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t("premium.subscription.modal.earlyUserBenefitDesc", {
                      defaultValue:
                        "베타 기간 중 가입하신 얼리유저는 특별 할인 혜택을 받으실 수 있습니다.",
                    })}
                  </p>
                )}
              </>
            )}
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              {t("premium.subscription.modal.betterService", {
                defaultValue:
                  "더 나은 서비스를 제공하기 위해 계속 노력하겠습니다.",
              })}
            </p>
          </div>

          {/* 버튼 */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                {t("premium.subscription.modal.close", {
                  defaultValue: "닫기",
                })}
              </button>
              <button
                onClick={handleSubscribe}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-medium hover:from-brand-600 hover:to-accent-600 transition-all shadow-lg hover:shadow-xl"
              >
                {t("premium.subscription.modal.goToPricing", {
                  defaultValue: "바로가기",
                })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
