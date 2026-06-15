import React, { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useFeatureFlagsStore } from "../../stores";
import { announcementStorage } from "../../utils/announcementStorage";

interface Props {
  // 관리자 미리보기 등에서 강제 표시
  forceShow?: boolean;
  onClose?: () => void;
}

// 정식 오픈 안내 상단 가로 배너
// - !flags.beta && flags.showAnnouncementBanner 일 때 자동 표시
// - 닫으면 localStorage에 저장되어 다시 안 뜸 (관리자에서 reset 가능)
const SubscriptionAnnouncementBannerInner: React.FC<Props> = ({
  forceShow = false,
  onClose,
}) => {
  // primitive 단위 선택자로 불필요한 재렌더 방지
  const beta = useFeatureFlagsStore((s) => s.flags.beta);
  const showAnnouncementBanner = useFeatureFlagsStore(
    (s) => s.flags.showAnnouncementBanner
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    if (beta || !showAnnouncementBanner) {
      setVisible(false);
      return;
    }
    if (announcementStorage.isBannerDismissed()) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [forceShow, beta, showAnnouncementBanner]);

  const handleClose = () => {
    setVisible(false);
    if (!forceShow) announcementStorage.dismissBanner();
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3 pr-10">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs sm:text-sm font-medium text-center">
          북마클이 정식 오픈했습니다.
        </p>
        <Link
          to="/subscription"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold underline-offset-2 hover:underline whitespace-nowrap"
        >
          자세히 보기
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <button
        onClick={handleClose}
        aria-label="배너 닫기"
        className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 p-1 rounded-md hover:bg-white/15 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const SubscriptionAnnouncementBanner = memo(
  SubscriptionAnnouncementBannerInner
);
