import { useState, useEffect } from "react";
import { X, Sparkles, Gift } from "lucide-react";
import { useAuthStore } from "../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { betaUtils, BETA_END_DATE } from "../utils/betaFlags";

interface BetaAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BetaAnnouncementModal: React.FC<BetaAnnouncementModalProps> = ({
  isOpen,
  onClose,
}) => {
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

  const handleGetStarted = () => {
    betaUtils.markModalShown();
    onClose();
    navigate("/dashboard");
  };

  const handleClose = () => {
    betaUtils.markModalShown();
    onClose();
  };

  // 베타 모달을 표시하지 않는 경우
  if (!isOpen || !betaUtils.shouldShowModal()) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 헤더 */}
          <div className="bg-gradient-to-r from-brand-500 to-accent-500 p-6 text-white">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bookmarkle 베타 안내</h2>
              </div>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6 space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              현재 북마클은{" "}
              <strong className="text-brand-600 dark:text-brand-400">
                베타 기간
              </strong>
              으로
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              모든 기능을{" "}
              <strong className="text-brand-600 dark:text-brand-400">
                무료로 제한 없이
              </strong>{" "}
              사용할 수 있습니다.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              정식 오픈 이후 일부 기능은 프리미엄으로 전환될 수 있으나,
            </p>
            {betaUtils.shouldShowEarlyUserBenefits() && (
              <>
                {isEarlyUser && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <Gift className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                          🎉 얼리유저 혜택 적용 중!
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          지금 가입한 얼리유저는 기존 기능을 계속 무료로 이용할
                          수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!isEarlyUser && (
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    지금 가입한 얼리유저는 기존 기능을 계속 무료로 이용할 수
                    있습니다.
                  </p>
                )}
              </>
            )}
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              더 나은 서비스를 위해 언제든 피드백을 보내주세요!
            </p>
          </div>

          {/* 버튼 */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleGetStarted}
              className="w-full px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-xl font-medium hover:from-brand-600 hover:to-accent-600 transition-all shadow-lg hover:shadow-xl"
            >
              지금 바로 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
