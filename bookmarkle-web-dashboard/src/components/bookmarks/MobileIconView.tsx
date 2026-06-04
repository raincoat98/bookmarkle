import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Bookmark } from "../../types";
import { Settings, Edit, Trash2, Heart, ExternalLink, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";

// ─── 순수 헬퍼 함수 ────────────────────────────────────────────────────────────

const getFaviconBackground = (bookmark: Bookmark): string => {
  if (bookmark.favicon) return "bg-white";

  const hash = bookmark.url.split("").reduce((a: number, b: string) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const colors = [
    "bg-gradient-to-br from-emerald-400 to-emerald-600",
    "bg-gradient-to-br from-blue-400 to-blue-600",
    "bg-gradient-to-br from-purple-400 to-purple-600",
    "bg-gradient-to-br from-pink-400 to-pink-600",
    "bg-gradient-to-br from-orange-400 to-orange-600",
    "bg-gradient-to-br from-teal-400 to-teal-600",
    "bg-gradient-to-br from-indigo-400 to-indigo-600",
    "bg-gradient-to-br from-rose-400 to-rose-600",
    "bg-gradient-to-br from-cyan-400 to-cyan-600",
    "bg-gradient-to-br from-violet-400 to-violet-600",
    "bg-gradient-to-br from-lime-400 to-lime-600",
    "bg-gradient-to-br from-amber-400 to-amber-600",
  ];

  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (title: string): string =>
  title
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ─── BookmarkFavicon ────────────────────────────────────────────────────────────

interface BookmarkFaviconProps {
  bookmark: Bookmark;
  faviconAlt: string;
}

const BookmarkFavicon = React.memo(
  ({ bookmark, faviconAlt }: BookmarkFaviconProps) => (
    <div
      className={`w-full h-full flex items-center justify-center ${getFaviconBackground(bookmark)}`}
    >
      {bookmark.favicon && (
        <img
          src={bookmark.favicon}
          alt={faviconAlt}
          className="w-8 h-8 rounded shadow-lg"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
            next?.classList.remove("hidden");
          }}
        />
      )}
      <div
        className={`text-white font-bold text-sm shadow-lg ${bookmark.favicon ? "hidden" : ""}`}
      >
        {getInitials(bookmark.title)}
      </div>
    </div>
  )
);

// ─── DraggableBookmarkItem ──────────────────────────────────────────────────────

interface DraggableBookmarkItemProps {
  bookmark: Bookmark;
  isEditMode: boolean;
  onSettingsClick: (bookmark: Bookmark) => void;
  onEnterEditMode: () => void;
  faviconAlt: string;
}

const DraggableBookmarkItem = React.memo(
  ({
    bookmark,
    isEditMode,
    onSettingsClick,
    onEnterEditMode,
    faviconAlt,
  }: DraggableBookmarkItemProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const pressStartTimeRef = useRef<number>(0);
    const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: bookmark.id, data: { bookmark } });

    // 롱프레스: 터치와 마우스 공통 로직
    useEffect(() => {
      const element = elementRef.current;
      if (!element || isEditMode) return;

      const cancelPress = () => {
        if (pressTimeoutRef.current) {
          clearTimeout(pressTimeoutRef.current);
          pressTimeoutRef.current = null;
        }
      };

      // 터치
      const handleTouchStart = (e: TouchEvent) => {
        pressStartTimeRef.current = Date.now();
        pressTimeoutRef.current = setTimeout(() => {
          e.preventDefault();
          onEnterEditMode();
        }, 1000);
      };

      const handleTouchEnd = () => {
        const duration = Date.now() - pressStartTimeRef.current;
        cancelPress();
        if (duration < 1000) {
          window.open(bookmark.url, "_blank", "noopener,noreferrer");
        }
      };

      // 마우스 (PC)
      const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        pressStartTimeRef.current = Date.now();
        pressTimeoutRef.current = setTimeout(() => onEnterEditMode(), 1000);
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const duration = Date.now() - pressStartTimeRef.current;
        cancelPress();
        if (duration < 1000) {
          window.open(bookmark.url, "_blank", "noopener,noreferrer");
        }
      };

      element.addEventListener("touchstart", handleTouchStart, { passive: false });
      element.addEventListener("touchend", handleTouchEnd, { passive: false });
      element.addEventListener("touchmove", cancelPress, { passive: false });
      element.addEventListener("mousedown", handleMouseDown);
      element.addEventListener("mouseup", handleMouseUp);
      element.addEventListener("mousemove", cancelPress);

      return () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchmove", cancelPress);
        element.removeEventListener("mousedown", handleMouseDown);
        element.removeEventListener("mouseup", handleMouseUp);
        element.removeEventListener("mousemove", cancelPress);
        cancelPress();
      };
    }, [isEditMode, bookmark.url, onEnterEditMode]);

    const handleSettingsTrigger = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "pointerup") onSettingsClick(bookmark);
      },
      [bookmark, onSettingsClick]
    );

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          elementRef.current = node;
        }}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`relative flex flex-col items-center w-full ${
          isDragging ? "opacity-50 scale-95 pointer-events-none" : ""
        }`}
      >
        <div className="relative p-1">
          <div
            {...attributes}
            {...(isEditMode ? listeners : {})}
            className={`block w-10 h-10 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 transition-all duration-300 overflow-hidden shadow-lg touch-manipulation ${
              isEditMode
                ? "cursor-grab active:cursor-grabbing border-2 border-blue-400 dark:border-blue-500 scale-105"
                : "cursor-pointer hover:scale-105 hover:shadow-2xl active:scale-95"
            }`}
            style={{ touchAction: isEditMode ? "none" : "manipulation" }}
          >
            <BookmarkFavicon bookmark={bookmark} faviconAlt={faviconAlt} />
          </div>

          {isEditMode && (
            <div
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onPointerUp={handleSettingsTrigger}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 z-50 touch-manipulation cursor-pointer"
              style={{ pointerEvents: "auto", touchAction: "manipulation" }}
            >
              <Settings className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="mt-1 text-center w-full px-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight overflow-hidden text-ellipsis whitespace-nowrap w-full">
            {bookmark.title}
          </p>
        </div>
      </div>
    );
  }
);

// ─── MobileIconView ─────────────────────────────────────────────────────────────

interface MobileIconViewProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder?: (newBookmarks: Bookmark[]) => void;
}

export const MobileIconView: React.FC<MobileIconViewProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  onReorder,
}) => {
  const { t } = useTranslation();
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 0, tolerance: 10 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !onReorder || active.id === over.id) return;

    const oldIndex = bookmarks.findIndex((item) => item.id === active.id);
    const newIndex = bookmarks.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(bookmarks, oldIndex, newIndex));
    }
  };

  const handleEnterEditMode = useCallback(() => setIsEditMode(true), []);

  const handleExitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSelectedBookmark(null);
  }, []);

  const handleSettingsClick = useCallback((bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
  }, []);

  const handleCloseSettings = useCallback(() => setSelectedBookmark(null), []);

  const handleEdit = useCallback(
    (bookmark: Bookmark) => {
      onEdit(bookmark);
      setSelectedBookmark(null);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (bookmark: Bookmark) => {
      onDelete(bookmark);
      setSelectedBookmark(null);
    },
    [onDelete]
  );

  const handleToggleFavorite = useCallback(
    (bookmark: Bookmark) => {
      onToggleFavorite(bookmark.id, !bookmark.isFavorite);
      setSelectedBookmark(null);
    },
    [onToggleFavorite]
  );

  const faviconAlt = t("common.favicon");

  return (
    <div className="relative">
      {isEditMode && (
        <div className="mb-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center rounded-lg relative">
          <p className="text-xs font-medium">
            {t("settings.mobileIconView.editModeDescription")}
          </p>
          <button
            onClick={handleExitEditMode}
            className="absolute top-1 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bookmarks.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-5 gap-2 p-3 justify-items-center">
            {bookmarks.map((bookmark) => (
              <DraggableBookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                isEditMode={isEditMode}
                onSettingsClick={handleSettingsClick}
                onEnterEditMode={handleEnterEditMode}
                faviconAlt={faviconAlt}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 설정 바텀시트 */}
      {selectedBookmark && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-3xl w-full max-w-sm p-6 space-y-6 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto rounded-3xl ${getFaviconBackground(selectedBookmark)} flex items-center justify-center mb-4 shadow-xl`}
              >
                {selectedBookmark.favicon ? (
                  <img
                    src={selectedBookmark.favicon}
                    alt="파비콘"
                    className="w-12 h-12 rounded-2xl shadow-lg"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="text-white font-bold text-3xl shadow-lg">
                    {getInitials(selectedBookmark.title)}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">
                {selectedBookmark.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {selectedBookmark.url}
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={selectedBookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                onClick={handleCloseSettings}
              >
                <ExternalLink className="w-5 h-5 mr-3" />
                {t("common.visit")}
              </a>

              <button
                onClick={() => handleToggleFavorite(selectedBookmark)}
                className={`flex items-center justify-center w-full px-4 py-4 rounded-2xl transition-all duration-200 font-medium ${
                  selectedBookmark.isFavorite
                    ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg hover:shadow-xl"
                    : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 hover:shadow-lg"
                }`}
              >
                <Heart
                  className={`w-5 h-5 mr-3 ${selectedBookmark.isFavorite ? "fill-current" : ""}`}
                />
                {selectedBookmark.isFavorite
                  ? t("bookmarks.removeFromFavorites")
                  : t("bookmarks.addToFavorites")}
              </button>

              <button
                onClick={() => handleEdit(selectedBookmark)}
                className="flex items-center justify-center w-full px-4 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <Edit className="w-5 h-5 mr-3" />
                {t("common.edit")}
              </button>

              <button
                onClick={() => handleDelete(selectedBookmark)}
                className="flex items-center justify-center w-full px-4 py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                {t("common.delete")}
              </button>
            </div>

            <button
              onClick={handleCloseSettings}
              className="w-full px-4 py-4 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-200 font-medium"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
