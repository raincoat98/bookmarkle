import React, { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { useFeatureFlagsStore } from "../../stores";
import { announcementStorage } from "../../utils/announcementStorage";

interface Props {
  // 관리자 페이지 미리보기 등에서 강제 표시
  forceShow?: boolean;
  onClose?: () => void;
}

// 정식 오픈 안내 모달
// - !flags.beta && flags.showAnnouncementModal 일 때 자동 표시
// - 한 번 닫으면 localStorage에 저장되어 다시 안 뜸 (관리자에서 reset 가능)
// - forceShow=true이면 위 조건 무시
const SubscriptionAnnouncementModalInner: React.FC<Props> = ({
  forceShow = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const beta = useFeatureFlagsStore((s) => s.flags.beta);
  const showAnnouncementModal = useFeatureFlagsStore(
    (s) => s.flags.showAnnouncementModal
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    if (beta || !showAnnouncementModal) {
      setIsOpen(false);
      return;
    }
    if (announcementStorage.isModalDismissed()) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
  }, [forceShow, beta, showAnnouncementModal]);

  const handleClose = () => {
    setIsOpen(false);
    if (!forceShow) announcementStorage.dismissModal();
    onClose?.();
  };

  const handleLearnMore = () => {
    handleClose();
    navigate("/subscription");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-[#111113] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/[0.06]">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08]"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-8">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            정식 오픈 안내
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            북마클이 정식 오픈했습니다.
            <br />
            앞으로도 안정적인 서비스 제공을 위해 노력하겠습니다.
          </p>

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              나중에
            </button>
            <button
              onClick={handleLearnMore}
              className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
            >
              더 알아보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubscriptionAnnouncementModal = memo(
  SubscriptionAnnouncementModalInner
);
