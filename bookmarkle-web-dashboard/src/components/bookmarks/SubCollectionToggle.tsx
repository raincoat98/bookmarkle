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
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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
