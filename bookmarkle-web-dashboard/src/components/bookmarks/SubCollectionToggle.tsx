import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SubCollectionToggleProps {
  showSubCollections: boolean;
  onToggle: () => void;
  hasSubCollections: boolean;
}

export const SubCollectionToggle: React.FC<SubCollectionToggleProps> = ({
  showSubCollections,
  onToggle,
  hasSubCollections,
}) => {
  const { t } = useTranslation();

  if (!hasSubCollections) return null;

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.08] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none transition-colors"
      title={
        showSubCollections
          ? t("bookmarks.hideSubCollections")
          : t("bookmarks.showSubCollections")
      }
    >
      {showSubCollections ? (
        <>
          <EyeOff className="w-4 h-4" />
          <span className="hidden sm:inline">
            {t("bookmarks.hideSubCollections")}
          </span>
          <span className="sm:hidden">{t("bookmarks.show")}</span>
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">
            {t("bookmarks.showSubCollections")}
          </span>
          <span className="sm:hidden">{t("bookmarks.show")}</span>
        </>
      )}
    </button>
  );
};
