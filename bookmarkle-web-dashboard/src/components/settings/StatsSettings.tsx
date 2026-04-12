import React from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Folder, FileText, Sparkles } from "lucide-react";
import type { Bookmark, Collection } from "../../types";

interface StatsSettingsProps {
  bookmarks: Bookmark[];
  collections: Collection[];
}

export const StatsSettings: React.FC<StatsSettingsProps> = ({
  bookmarks,
  collections,
}) => {
  const { t } = useTranslation();

  const totalBookmarks = bookmarks.length;
  const totalCollections = collections.length;
  const unassignedBookmarks = bookmarks.filter((b) => !b.collection).length;
  const favoriteBookmarks = bookmarks.filter((b) => b.isFavorite).length;

  const StatsCard = ({
    title,
    value,
    icon,
    color,
    description,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}
      >
        <div className="w-4 h-4">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">
        {value.toLocaleString()}
      </p>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-snug">
        {title}
      </p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden lg:block leading-snug">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          {t("settings.bookmarkStatistics")}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <StatsCard
            title={t("settings.totalBookmarks")}
            value={totalBookmarks}
            icon={<BookOpen className="w-full h-full" />}
            color="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            description={t("settings.totalBookmarksDescription")}
          />
          <StatsCard
            title={t("collections.title")}
            value={totalCollections}
            icon={<Folder className="w-full h-full" />}
            color="bg-gradient-to-r from-purple-500 to-purple-600 text-white"
            description={t("settings.totalCollectionsDescription")}
          />
          <StatsCard
            title={t("settings.favorites")}
            value={favoriteBookmarks}
            icon={<Sparkles className="w-full h-full" />}
            color="bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
            description={t("settings.favoritesDescription")}
          />
          <StatsCard
            title={t("settings.unassigned")}
            value={unassignedBookmarks}
            icon={<FileText className="w-full h-full" />}
            color="bg-gradient-to-r from-gray-500 to-gray-600 text-white"
            description={t("settings.unassignedDescription")}
          />
        </div>
      </div>

      {/* 추가 통계 정보 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          {t("settings.detailedAnalysis")}
        </h3>
        <div className="space-y-4">
          {collections.length > 0 && (
            <div>
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white mb-3">
                {t("settings.bookmarkDistributionByCollection")}
              </h4>
              <div className="space-y-2">
                {collections.map((collection) => {
                  const count = bookmarks.filter(
                    (b) => b.collection === collection.id
                  ).length;
                  const percentage =
                    totalBookmarks > 0 ? (count / totalBookmarks) * 100 : 0;

                  return (
                    <div
                      key={collection.id}
                      className="flex items-center gap-2 sm:gap-3"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                        {collection.name}
                      </span>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="w-20 sm:w-28 md:w-36 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[2rem]">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {unassignedBookmarks > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
                      {t("settings.unassigned")}
                    </span>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-20 sm:w-28 md:w-36 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              totalBookmarks > 0
                                ? (unassignedBookmarks / totalBookmarks) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[2rem]">
                        {unassignedBookmarks}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
