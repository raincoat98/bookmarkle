import { useState, useEffect } from "react";
import { X, Crown, Gift, Sparkles, Check } from "lucide-react";
import { useAuthStore, useFeatureFlagsStore } from "../../stores";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { betaUtils, BETA_END_DATE } from "../../utils/betaFlags";

interface SubscriptionAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceShow?: boolean;
}

const HIGHLIGHTS = [
  "북마크 · 컬렉션 무제한 저장",
  "AI 기반 고급 검색 + 태그·내용 검색",
  "북마크 통계 및 인사이트 대시보드",
  "전체 위젯 + 커스텀 테마 잠금 해제",
];

export const SubscriptionAnnouncementModal: React.FC<
  SubscriptionAnnouncementModalProps
> = ({ isOpen, onClose, forceShow = false }) => {
  const { user } = useAuthStore();
  useFeatureFlagsStore((s) => s.flags);
  const navigate = useNavigate();
  const [isEarly, setIsEarly] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const createdAt = userDoc.data().createdAt?.toDate();
          if (createdAt && createdAt < BETA_END_DATE) setIsEarly(true);
        }
      } catch (err) {
        const e = err as { code?: string };
        if (e?.code === "permission-denied" || e?.code === "unauthenticated") return;
      }
    })();
  }, [user, isOpen]);

  const handleSubscribe = () => {
    betaUtils.markModalShown();
    onClose();
    navigate("/pricing");
  };

  const handleClose = () => {
    if (!forceShow) betaUtils.markModalShown();
    onClose();
  };

  if (!isOpen || (!forceShow && !betaUtils.shouldShowModal())) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 z-[10001]">
        <div className="relative w-full max-w-md bg-white dark:bg-[#111113] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {/* 닫기 */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 그라데이션 헤더 */}
          <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 px-6 pt-8 pb-10 text-white overflow-hidden">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-3 shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold mb-2">
                <Sparkles className="w-3 h-3" />
                정식 출시
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-1">
                북마클이 정식 오픈됐어요
              </h2>
              <p className="text-xs text-white/80">
                프리미엄으로 더 강력한 기능을 만나보세요
              </p>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="px-6 pt-5 pb-6 space-y-4">
            {/* 핵심 혜택 */}
            <div className="space-y-2.5">
              {HIGHLIGHTS.map((h, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                    {h}
                  </p>
                </div>
              ))}
            </div>

            {/* 얼리유저 혜택 */}
            {betaUtils.shouldShowEarlyUserBenefits() && isEarly && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-500/[0.08] dark:to-orange-500/[0.04] border border-amber-100 dark:border-amber-500/20 rounded-2xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-0.5">
                      얼리 유저 혜택 적용
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                      베타 기간 가입자는 기존 기능을 계속 무료로 이용하실 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                나중에
              </button>
              <button
                onClick={handleSubscribe}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                플랜 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
