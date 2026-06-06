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
    cardBg: "bg-gradient-to-br from-violet-50 via-white to-indigo-50/60 dark:from-violet-500/[0.12] dark:via-[#111113] dark:to-indigo-500/[0.06]",
    iconBg: "bg-gradient-to-br from-violet-500 to-indigo-500",
    glowColor: "bg-violet-400/20 dark:bg-violet-500/15",
    iconColor: "text-white",
    titleKey: "settings.totalBookmarks",
  },
  {
    key: "collections",
    icon: Folder,
    cardBg: "bg-gradient-to-br from-purple-50 via-white to-fuchsia-50/60 dark:from-purple-500/[0.12] dark:via-[#111113] dark:to-fuchsia-500/[0.06]",
    iconBg: "bg-gradient-to-br from-purple-500 to-fuchsia-500",
    glowColor: "bg-purple-400/20 dark:bg-purple-500/15",
    iconColor: "text-white",
    titleKey: "collections.title",
  },
  {
    key: "favorites",
    icon: Sparkles,
    cardBg: "bg-gradient-to-br from-amber-50 via-white to-orange-50/60 dark:from-amber-500/[0.12] dark:via-[#111113] dark:to-orange-500/[0.06]",
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    glowColor: "bg-amber-400/20 dark:bg-amber-500/15",
    iconColor: "text-white",
    titleKey: "settings.favorites",
  },
  {
    key: "unassigned",
    icon: FileText,
    cardBg: "bg-gradient-to-br from-slate-50 via-white to-gray-50/60 dark:from-slate-500/[0.08] dark:via-[#111113] dark:to-gray-500/[0.04]",
    iconBg: "bg-gradient-to-br from-slate-400 to-gray-500",
    glowColor: "bg-slate-400/15 dark:bg-slate-500/10",
    iconColor: "text-white",
    titleKey: "settings.unassigned",
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

  const distributionRows = [
    ...collections.map((col) => ({
      id: col.id,
      name: col.name,
      count: bookmarks.filter((b) => b.collection === col.id).length,
      isUnassigned: false,
    })),
    ...(values.unassigned > 0
      ? [
          {
            id: "__unassigned__",
            name: t("settings.unassigned"),
            count: values.unassigned,
            isUnassigned: true,
          },
        ]
      : []),
  ].sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...distributionRows.map((r) => r.count), 1);

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CONFIGS.map(({ key, icon: Icon, cardBg, iconBg, glowColor, iconColor, titleKey }) => (
          <div
            key={key}
            className={`relative rounded-2xl border border-white/80 dark:border-white/[0.06] p-3 sm:p-5 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${cardBg}`}
          >
            {/* 장식 글로우 원 */}
            <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl ${glowColor}`} />
            <div className={`absolute -bottom-6 -right-2 w-16 h-16 rounded-full blur-xl ${glowColor} opacity-60`} />

            <div className="relative">
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 shadow-sm ${iconBg}`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconColor}`} strokeWidth={2} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none mb-1">
                {values[key].toLocaleString()}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-medium">
                {t(titleKey)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 컬렉션별 분포 */}
      {distributionRows.length > 0 && (
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("settings.bookmarkDistributionByCollection")}
            </h3>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/[0.05] px-2.5 py-1 rounded-full">
              {totalBookmarks.toLocaleString()}
            </span>
          </div>

          <div className="px-6 pb-5 space-y-3">
            {distributionRows.map((row) => {
              const pct = totalBookmarks > 0 ? (row.count / totalBookmarks) * 100 : 0;
              const barWidth = (row.count / maxCount) * 100;

              return (
                <div key={row.id} className="group/row">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium truncate max-w-[60%] ${
                      row.isUnassigned
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {row.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white w-6 text-right tabular-nums">
                        {row.count}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        row.isUnassigned
                          ? "bg-gray-300 dark:bg-white/20"
                          : "bg-gradient-to-r from-violet-500 to-indigo-500"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
