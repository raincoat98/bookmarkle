import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore, useBookmarkStore } from "../../stores";
import { toast } from "react-hot-toast";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { auth } from "../../firebase";

export const TrashSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    trashBookmarks,
    trashLoading,
    subscribeToTrash,
    restoreBookmark,
    permanentlyDeleteBookmark,
    emptyTrash,
  } = useBookmarkStore();

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) return;
    const unsubscribe = subscribeToTrash(user.uid);
    return unsubscribe;
  }, [user?.uid, subscribeToTrash]);

  const handleRestore = async (bookmarkId: string) => {
    setRestoringId(bookmarkId);
    try {
      await restoreBookmark(bookmarkId);
      toast.success(t("settings.restoreSuccess"));
      setShowRestoreConfirm(null);
    } catch (error) {
      console.error("복원 오류:", error);
      toast.error(t("settings.restoreError"));
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentlyDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId);
    try {
      await permanentlyDeleteBookmark(bookmarkId);
      toast.success(t("settings.permanentlyDeleteSuccess"));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("삭제 오류:", error);
      toast.error(t("settings.permanentlyDeleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!user?.uid) return;
    setEmptying(true);
    try {
      await emptyTrash(user.uid);
      toast.success(t("settings.emptyTrashSuccess"));
      setShowEmptyConfirm(false);
    } catch (error) {
      console.error("휴지통 비우기 오류:", error);
      toast.error(t("settings.emptyTrashError"));
    } finally {
      setEmptying(false);
    }
  };

  const getDaysUntilPermanentDelete = (deletedAt: Date | null | undefined): number => {
    if (!deletedAt) return 0;
    const diffTime = deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(date);
  };

  if (trashLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("settings.trashTitle")}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t("settings.trashDescription")}
            </p>
          </div>
          {trashBookmarks.length > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("settings.emptyTrash")}
            </button>
          )}
        </div>

        {trashBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Trash2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("settings.trashEmpty")}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t("settings.trashEmptyDescription")}
            </p>
          </div>
        ) : (
          <>
            {/* 자동 삭제 안내 */}
            <div className="flex items-start gap-2.5 px-5 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("settings.autoDeleteInfo")}
              </p>
            </div>

            {/* 북마크 목록 */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {trashBookmarks.map((bookmark) => {
                const daysLeft = getDaysUntilPermanentDelete(bookmark.deletedAt);
                return (
                  <div key={bookmark.id} className="flex items-start gap-3 px-5 py-3.5">
                    {/* 파비콘 */}
                    <div className="shrink-0 mt-0.5">
                      {bookmark.favicon ? (
                        <img
                          src={bookmark.favicon}
                          alt=""
                          className="w-4 h-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {bookmark.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {bookmark.url}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(bookmark.deletedAt)}
                        </span>
                        <span className={`text-xs ${daysLeft > 0 ? "text-amber-500 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                          {daysLeft > 0
                            ? t("settings.daysUntilPermanentDelete", { days: daysLeft })
                            : "곧 자동 삭제됩니다"}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setShowRestoreConfirm(bookmark.id)}
                        disabled={restoringId === bookmark.id}
                        className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors disabled:opacity-40"
                        title={t("settings.restore")}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(bookmark.id)}
                        disabled={deletingId === bookmark.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-40"
                        title={t("settings.permanentlyDelete")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 복원 확인 모달 */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {t("settings.restoreBookmark")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t("settings.restoreBookmarkConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleRestore(showRestoreConfirm)}
                disabled={restoringId === showRestoreConfirm}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {restoringId === showRestoreConfirm ? t("common.processing") : t("settings.restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완전 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {t("settings.permanentlyDeleteBookmark")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t("settings.permanentlyDeleteBookmarkConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handlePermanentlyDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingId === showDeleteConfirm ? t("common.processing") : t("settings.permanentlyDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴지통 비우기 확인 모달 */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {t("settings.emptyTrash")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t("settings.emptyTrashConfirm")}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={emptying}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {emptying ? t("common.processing") : t("settings.emptyTrash")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
