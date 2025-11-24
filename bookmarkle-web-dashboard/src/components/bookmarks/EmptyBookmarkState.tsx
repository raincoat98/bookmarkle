import React from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyBookmarkStateProps {
  searchTerm?: string;
}

export const EmptyBookmarkState: React.FC<EmptyBookmarkStateProps> = ({
  searchTerm,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <BookOpen className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        {t("bookmarks.noBookmarksFound")}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
        {searchTerm
          ? t("bookmarks.noSearchResults")
          : t("bookmarks.addFirstBookmark")}
      </p>
    </div>
  );
};
