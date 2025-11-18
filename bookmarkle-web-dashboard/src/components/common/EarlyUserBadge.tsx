import { useTranslation } from "react-i18next";
import { Gift, Crown } from "lucide-react";

interface EarlyUserBadgeProps {
  isEarlyUser: boolean;
  className?: string;
}

export const EarlyUserBadge: React.FC<EarlyUserBadgeProps> = ({
  isEarlyUser,
  className = "",
}) => {
  const { t } = useTranslation();

  if (!isEarlyUser) return null;

  return (
    <div
      className={`inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md ${className}`}
    >
      <Gift className="w-3 h-3" />
      <span>{t("beta.earlyUserBadge")}</span>
      <Crown className="w-3 h-3" />
    </div>
  );
};

