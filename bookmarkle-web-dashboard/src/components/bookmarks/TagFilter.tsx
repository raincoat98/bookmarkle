import React from "react";
import { useTranslation } from "react-i18next";

interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTag,
  onSelectTag,
}) => {
  const { t } = useTranslation();

  if (tags.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      <button
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 ${
          selectedTag === null
            ? "bg-violet-600 text-white"
            : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.10]"
        }`}
        onClick={() => onSelectTag(null)}
      >
        {t("collections.all")}
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 ${
            selectedTag === tag
              ? "bg-violet-600 text-white"
              : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.10]"
          }`}
          onClick={() => onSelectTag(tag)}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
};
