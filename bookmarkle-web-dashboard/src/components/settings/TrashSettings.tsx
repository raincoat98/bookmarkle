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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(
    null
  );

  // 휴지통 구독
  useEffect(() => {
    if (!user?.uid) return;

    // 실제 Firebase Auth 상태 확인 (authStore의 user만으로는 부족)
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) {
      return;
    }

    const unsubscribe = subscribeToTrash(user.uid);
    return unsubscribe;
  }, [user?.uid, subscribeToTrash]);

  // 북마크 복원
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

  // 북마크 완전 삭제
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

  // 휴지통 비우기
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

  // 삭제일로부터 경과 일수 계산
  const getDaysUntilPermanentDelete = (
    deletedAt: Date | null | undefined
  ): number => {
    if (!deletedAt) return 0;
    const now = new Date();
    const diffTime =
      deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000 - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // 날짜 포맷팅
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (trashLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t("settings.trashTitle")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t("settings.trashDescription")}
        </p>

        {/* 휴지통 비우기 버튼 */}
        {trashBookmarks.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t("settings.emptyTrash")}</span>
            </button>
          </div>
        )}

        {/* 휴지통이 비어있을 때 */}
        {trashBookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {t("settings.trashEmpty")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              {t("settings.trashEmptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 자동 삭제 안내 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200 break-words">
                {t("settings.autoDeleteInfo")}
              </p>
            </div>

            {/* 휴지통 목록 */}
            <div className="space-y-3">
              {trashBookmarks.map((bookmark) => {
                const daysLeft = getDaysUntilPermanentDelete(
                  bookmark.deletedAt
                );
                return (
                  <div
                    key={bookmark.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {bookmark.favicon ? (
                            <img
                              src={bookmark.favicon}
                              alt=""
                              className="w-5 h-5 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                          )}
                          <h4 className="font-medium text-gray-900 dark:text-white break-words">
                            {bookmark.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 break-all mb-2">
                          {bookmark.url}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 sm:gap-0 text-xs text-gray-500 dark:text-gray-400">
                          <span className="break-words">
                            {t("settings.deletedAt")}:{" "}
                            {formatDate(bookmark.deletedAt)}
                          </span>
                          {daysLeft > 0 ? (
                            <span className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                              {t("settings.daysUntilPermanentDelete", {
                                days: daysLeft,
                              })}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 whitespace-nowrap">
                              곧 자동 삭제됩니다
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end sm:justify-start space-x-2 sm:ml-4 flex-shrink-0">
                        <button
                          onClick={() => setShowRestoreConfirm(bookmark.id)}
                          disabled={restoringId === bookmark.id}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t("settings.restore")}
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(bookmark.id)}
                          disabled={deletingId === bookmark.id}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t("settings.permanentlyDelete")}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 복원 확인 모달 */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("settings.restoreBookmark")}
            </h3>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              {t("settings.restoreBookmarkConfirm")}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleRestore(showRestoreConfirm)}
                disabled={restoringId === showRestoreConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoringId === showRestoreConfirm
                  ? t("common.processing")
                  : t("settings.restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 완전 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("settings.permanentlyDeleteBookmark")}
            </h3>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              {t("settings.permanentlyDeleteBookmarkConfirm")}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handlePermanentlyDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === showDeleteConfirm
                  ? t("common.processing")
                  : t("settings.permanentlyDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴지통 비우기 확인 모달 */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t("settings.emptyTrash")}
            </h3>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              {t("settings.emptyTrashConfirm")}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={emptying}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
