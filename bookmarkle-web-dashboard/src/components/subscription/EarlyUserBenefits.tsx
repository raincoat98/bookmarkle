import React, { memo, useMemo } from "react";
import { Gift } from "lucide-react";
import type { User } from "firebase/auth";
import { useFeatureFlagsStore } from "../../stores";
import { isUserEarly } from "../../utils/earlyUser";

interface Props {
  user: User | null;
  // 관리자 미리보기 등에서 강제 표시
  forceShow?: boolean;
}

// 얼리 유저 혜택 카드
// - !flags.beta && flags.showEarlyUserBenefits && isUserEarly 일 때만 표시
const EarlyUserBenefitsInner: React.FC<Props> = ({ user, forceShow = false }) => {
  const beta = useFeatureFlagsStore((s) => s.flags.beta);
  const showEarlyUserBenefits = useFeatureFlagsStore(
    (s) => s.flags.showEarlyUserBenefits
  );

  const userIsEarly = useMemo(() => isUserEarly(user), [user]);

  if (!forceShow) {
    if (beta || !showEarlyUserBenefits) return null;
    if (!userIsEarly) return null;
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              얼리 유저
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
              평생 무료
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            정식 오픈 전에 가입해 주셔서 감사합니다. 얼리 유저 혜택으로 프리미엄 기능을
            평생 무료로 이용하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export const EarlyUserBenefits = memo(EarlyUserBenefitsInner);
