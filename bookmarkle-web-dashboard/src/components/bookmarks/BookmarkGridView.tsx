import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection } from "../../types";
import { SortableBookmarkCard } from "./SortableBookmarkCard";
import { SortableBookmarkListItem } from "./SortableBookmarkListItem";
import { MobileIconView } from "./MobileIconView";

interface BookmarkGridViewProps {
  bookmarks: Bookmark[];
  viewMode: "grid" | "list";
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onDirectDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder: (newBookmarks: Bookmark[]) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoadingStates: Record<string, boolean>;
  collections: Collection[];
  isEditMode?: boolean;
  onEditModeChange?: (v: boolean) => void;
}

export const BookmarkGridView: React.FC<BookmarkGridViewProps> = ({
  bookmarks,
  viewMode,
  onEdit,
  onDelete,
  onDirectDelete,
  onToggleFavorite,
  onReorder,
  onRefreshFavicon,
  faviconLoadingStates,
  collections,
  isEditMode,
  onEditModeChange,
}) => {
  const { t } = useTranslation();

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = bookmarks.findIndex((item) => item.id === active.id);
    const newIndex = bookmarks.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newBookmarks = arrayMove(bookmarks, oldIndex, newIndex);
      onReorder(newBookmarks);

      toast.success(t("bookmarks.bookmarkOrderChanged"), {
        duration: 2000,
        icon: "📌",
      });
    }
  };

  return (
    <>
      {/* 모바일 아이콘 뷰 */}
      <div className="block sm:hidden">
        <MobileIconView
          bookmarks={bookmarks}
          onEdit={onEdit}
          onDirectDelete={onDirectDelete}
          onToggleFavorite={onToggleFavorite}
          onReorder={onReorder}
          isEditMode={isEditMode}
          onEditModeChange={onEditModeChange}
        />
      </div>

      {/* 데스크톱 뷰 */}
      <div className="hidden sm:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={bookmarks.map((item) => item.id)}
            strategy={
              viewMode === "grid"
                ? rectSortingStrategy
                : verticalListSortingStrategy
            }
          >
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5"
                  : "space-y-3"
              }
            >
              {bookmarks.map((bookmark: Bookmark) =>
                viewMode === "grid" ? (
                  <SortableBookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRefreshFavicon={
                      onRefreshFavicon
                        ? () => onRefreshFavicon(bookmark)
                        : async () => {}
                    }
                    faviconLoading={faviconLoadingStates[bookmark.id] || false}
                    collections={collections}
                    onToggleFavorite={onToggleFavorite}
                  />
                ) : (
                  <SortableBookmarkListItem
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRefreshFavicon={
                      onRefreshFavicon
                        ? () => onRefreshFavicon(bookmark)
                        : undefined
                    }
                    faviconLoading={faviconLoadingStates[bookmark.id] || false}
                    collections={collections}
                    onToggleFavorite={onToggleFavorite}
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
};
