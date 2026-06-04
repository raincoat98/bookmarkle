import React from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Folder, FileText, Sparkles } from "lucide-react";
import type { Bookmark, Collection } from "../../types";

interface StatsSettingsProps {
  bookmarks: Bookmark[];
  collections: Collection[];
}

const STAT_CONFIGS = [
  {
    key: "total",
    icon: BookOpen,
    iconClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    titleKey: "settings.totalBookmarks",
    descKey: "settings.totalBookmarksDescription",
  },
  {
    key: "collections",
    icon: Folder,
    iconClass: "text-purple-500 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    titleKey: "collections.title",
    descKey: "settings.totalCollectionsDescription",
  },
  {
    key: "favorites",
    icon: Sparkles,
    iconClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-900/20",
    titleKey: "settings.favorites",
    descKey: "settings.favoritesDescription",
  },
  {
    key: "unassigned",
    icon: FileText,
    iconClass: "text-gray-400 dark:text-gray-500",
    bgClass: "bg-gray-100 dark:bg-gray-700/60",
    titleKey: "settings.unassigned",
    descKey: "settings.unassignedDescription",
  },
] as const;

export const StatsSettings: React.FC<StatsSettingsProps> = ({
  bookmarks,
  collections,
}) => {
  const { t } = useTranslation();

  const values: Record<string, number> = {
    total: bookmarks.length,
    collections: collections.length,
    favorites: bookmarks.filter((b) => b.isFavorite).length,
    unassigned: bookmarks.filter((b) => !b.collection).length,
  };

  const totalBookmarks = bookmarks.length;

  return (
    <div className="space-y-4">
      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CONFIGS.map(({ key, icon: Icon, iconClass, bgClass, titleKey }) => (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bgClass}`}>
              <Icon className={`w-4 h-4 ${iconClass}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
              {values[key].toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t(titleKey)}
            </p>
          </div>
        ))}
      </div>

      {/* 컬렉션별 분포 */}
      {collections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("settings.bookmarkDistributionByCollection")}
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {collections.map((collection) => {
              const count = bookmarks.filter(
                (b) => b.collection === collection.id
              ).length;
              const pct = totalBookmarks > 0 ? (count / totalBookmarks) * 100 : 0;

              return (
                <div key={collection.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">
                    {collection.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white w-5 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
            {values.unassigned > 0 && (
              <div className="flex items-center gap-3 px-5 py-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                  {t("settings.unassigned")}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${totalBookmarks > 0 ? (values.unassigned / totalBookmarks) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white w-5 text-right">
                    {values.unassigned}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
