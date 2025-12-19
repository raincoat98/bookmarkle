import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Bookmark } from "../types";

interface UseBookmarkActionsProps {
  bookmarks: Bookmark[];
  onReorder: (newBookmarks: Bookmark[]) => void;
  onRefreshFavicon?: (bookmarkId: string, url: string) => Promise<string>;
}

export const useBookmarkActions = ({
  bookmarks,
  onReorder,
  onRefreshFavicon,
}: UseBookmarkActionsProps) => {
  const { t } = useTranslation();
  const [faviconLoadingStates, setFaviconLoadingStates] = useState<
    Record<string, boolean>
  >({});
  const [movingBookmarkId, setMovingBookmarkId] = useState<string | null>(null);
  const [moveDirection, setMoveDirection] = useState<"up" | "down" | null>(
    null
  );

  const handleMoveUp = async (bookmark: Bookmark) => {
    const currentIndex = bookmarks.findIndex((b) => b.id === bookmark.id);
    if (currentIndex > 0) {
      // 이동 시작 상태 설정
      setMovingBookmarkId(bookmark.id);
      setMoveDirection("up");

      // 약간의 지연 후 실제 이동 수행 (애니메이션 효과)
      setTimeout(() => {
        const newOrder = arrayMove(bookmarks, currentIndex, currentIndex - 1);
        onReorder(newOrder);

        // 이동 완료 후 상태 초기화 및 토스트
        setTimeout(() => {
          setMovingBookmarkId(null);
          setMoveDirection(null);
          toast.success(
            t("bookmarks.bookmarkMovedUp", { title: bookmark.title }),
            {
              duration: 2000,
              icon: "📌",
            }
          );
        }, 300);
      }, 100);
    }
  };

  const handleMoveDown = async (bookmark: Bookmark) => {
    const currentIndex = bookmarks.findIndex((b) => b.id === bookmark.id);
    if (currentIndex < bookmarks.length - 1) {
      // 이동 시작 상태 설정
      setMovingBookmarkId(bookmark.id);
      setMoveDirection("down");

      // 약간의 지연 후 실제 이동 수행 (애니메이션 효과)
      setTimeout(() => {
        const newOrder = arrayMove(bookmarks, currentIndex, currentIndex + 1);
        onReorder(newOrder);

        // 이동 완료 후 상태 초기화 및 토스트
        setTimeout(() => {
          setMovingBookmarkId(null);
          setMoveDirection(null);
          toast.success(
            t("bookmarks.bookmarkMovedDown", { title: bookmark.title }),
            {
              duration: 2000,
              icon: "📌",
            }
          );
        }, 300);
      }, 100);
    }
  };

  const handleRefreshFavicon = async (bookmark: Bookmark) => {
    if (!onRefreshFavicon) return;

    setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: true }));
    try {
      await onRefreshFavicon(bookmark.id, bookmark.url);
    } catch {
      toast.error(t("bookmarks.faviconRefreshError"));
    } finally {
      setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: false }));
    }
  };

  return {
    faviconLoadingStates,
    movingBookmarkId,
    moveDirection,
    handleMoveUp,
    handleMoveDown,
    handleRefreshFavicon,
  };
};
