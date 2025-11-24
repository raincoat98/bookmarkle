import { useEffect, useCallback } from "react";
import type { Bookmark } from "../../types";
import { useTranslation } from "react-i18next";

interface DeleteBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  bookmark: Bookmark | null;
  isDeleting: boolean;
}

export const DeleteBookmarkModal = ({
  isOpen,
  onClose,
  onDelete,
  bookmark,
  isDeleting,
}: DeleteBookmarkModalProps) => {
  const { t } = useTranslation();

  const handleDelete = useCallback(() => {
    if (bookmark) {
      onDelete(bookmark.id);
    }
  }, [bookmark, onDelete]);

  // 엔터키로 삭제, ESC키로 취소 기능
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !isDeleting && bookmark) {
        handleDelete();
      } else if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isDeleting, handleDelete, onClose, bookmark]);

  if (!isOpen || !bookmark) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40 transition-opacity duration-200 animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md scale-95 animate-fade-in-up min-w-0 transition-transform duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("bookmarks.deleteBookmark")}
        </h3>
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            {t("bookmarks.deleteBookmarkConfirm")}
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4 overflow-hidden">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 break-words">
              {bookmark.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
              {bookmark.url}
            </p>
            {bookmark.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-words">
                {bookmark.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-150 hover:scale-105 active:scale-95"
            disabled={isDeleting}
            title={t("bookmarks.cancelWithEsc")}
          >
            {t("common.cancel")}{" "}
            <span className="text-xs opacity-70">(ESC)</span>
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors duration-150 hover:scale-105 active:scale-95"
            disabled={isDeleting}
            title={t("bookmarks.deleteWithEnter")}
          >
            {isDeleting ? (
              t("bookmarks.deleting")
            ) : (
              <>
                {t("common.delete")}{" "}
                <span className="text-xs opacity-70">(Enter)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
