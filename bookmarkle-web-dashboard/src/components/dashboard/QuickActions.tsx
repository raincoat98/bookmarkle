import React from "react";
import { Plus, FolderPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../ui/Skeleton";

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
      <div className="card-glass p-6">
        <Skeleton className="h-5 w-36 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`quick-action-skeleton-${idx}`}
              className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 bg-white/60 dark:bg-gray-800/60"
            >
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {t("dashboard.quickActions")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onAddBookmark}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-soft">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addBookmark")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addBookmarkDescription")}
            </p>
          </div>
        </button>
        <button
          onClick={onAddCollection}
          className="flex items-center space-x-4 p-4 rounded-2xl border border-white/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-soft">
            <FolderPlus className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("dashboard.addCollection")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dashboard.addCollectionDescription")}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
