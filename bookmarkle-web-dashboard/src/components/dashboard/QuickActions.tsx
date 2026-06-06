import React from "react";
import { Plus, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QuickActionsProps {
  onAddBookmark: () => void;
  onAddCollection: () => void;
  loading?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddBookmark,
  onAddCollection,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200/80 dark:border-white/[0.06] p-6 flex items-center justify-center">
        <span className="text-sm text-gray-400">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200/80 dark:border-white/[0.06] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("dashboard.quickActions")}
        </h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
        <button
          onClick={onAddBookmark}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="w-8 h-8 bg-violet-100 dark:bg-violet-950/50 rounded-lg flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("dashboard.addBookmark")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("dashboard.addBookmarkDescription")}
            </p>
          </div>
        </button>
        <button
          onClick={onAddCollection}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center shrink-0">
            <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("dashboard.addCollection")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("dashboard.addCollectionDescription")}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
