import React, { useState, useCallback, useRef, useEffect } from "react";
import type { Bookmark } from "../../types";
import { X, ExternalLink, Edit, Trash2, Heart } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  DragOverlay,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

const getGradient = (url: string): string => {
  const gradients = [
    "from-violet-400 to-violet-600",
    "from-blue-400 to-blue-600",
    "from-emerald-400 to-emerald-600",
    "from-rose-400 to-rose-600",
    "from-amber-400 to-amber-600",
    "from-teal-400 to-teal-600",
    "from-pink-400 to-pink-600",
    "from-indigo-400 to-indigo-600",
    "from-cyan-400 to-cyan-600",
    "from-orange-400 to-orange-600",
  ];
  const hash = url.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return gradients[Math.abs(hash) % gradients.length];
};

const getInitial = (title: string): string =>
  title.trim().charAt(0).toUpperCase() || "B";

// ─── SortableIcon ───────────────────────────────────────────────────────────────

interface SortableIconProps {
  bookmark: Bookmark;
  isEditMode: boolean;
  onLongPress: () => void;
  onTap: (bookmark: Bookmark) => void;
  onDeleteBadge: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

const SortableIcon = React.memo(
  ({ bookmark, isEditMode, onLongPress, onTap, onDeleteBadge, onToggleFavorite }: SortableIconProps) => {
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: bookmark.id });

    // 롱프레스 핸들러 — dnd-kit 노드와 동일 요소에 직접 등록
    useEffect(() => {
      const el = document.getElementById(`icon-${bookmark.id}`);
      if (!el) return;

      const cancel = () => {
        if (pressTimer.current) {
          clearTimeout(pressTimer.current);
          pressTimer.current = null;
        }
      };

      const onStart = (e: TouchEvent | MouseEvent) => {
        if (isEditMode) return;
        didLongPress.current = false;
        const pos = "touches" in e ? e.touches[0] : e;
        startPos.current = { x: pos.clientX, y: pos.clientY };
        pressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          if (navigator.vibrate) navigator.vibrate(30);
          onLongPress();
        }, 500);
      };

      const onMove = (e: TouchEvent | MouseEvent) => {
        const pos = "touches" in e ? e.touches[0] : e;
        const dx = Math.abs(pos.clientX - startPos.current.x);
        const dy = Math.abs(pos.clientY - startPos.current.y);
        if (dx > 8 || dy > 8) cancel();
      };

      const onEnd = () => {
        cancel();
        // 롱프레스가 아닌 경우 탭 처리는 onClick이 담당
      };

      el.addEventListener("touchstart", onStart, { passive: true });
      el.addEventListener("touchmove", onMove, { passive: true });
      el.addEventListener("touchend", onEnd);
      el.addEventListener("mousedown", onStart as EventListener);
      el.addEventListener("mousemove", onMove as EventListener);
      el.addEventListener("mouseup", onEnd);

      return () => {
        cancel();
        el.removeEventListener("touchstart", onStart);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("touchend", onEnd);
        el.removeEventListener("mousedown", onStart as EventListener);
        el.removeEventListener("mousemove", onMove as EventListener);
        el.removeEventListener("mouseup", onEnd);
      };
    }, [bookmark.id, isEditMode, onLongPress]);

    const handleClick = useCallback(() => {
      if (didLongPress.current) return;
      // 편집 모드 여부 관계없이 항상 액션 시트 표시
      onTap(bookmark);
    }, [bookmark, onTap]);

    return (
      <div
        ref={setNodeRef}
        id={`icon-${bookmark.id}`}
        {...attributes}
        {...(isEditMode ? listeners : {})}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          touchAction: isEditMode ? "none" : "manipulation",
        }}
        onClick={handleClick}
        className={`relative flex flex-col items-center w-full select-none ${
          isDragging ? "opacity-40 scale-95 z-50" : ""
        } ${isEditMode ? "cursor-grab" : ""}`}
      >
        {/* 아이콘 */}
        <div className="relative p-1">
          <div
            className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-150 ${
              bookmark.favicon
                ? "bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]"
                : `bg-gradient-to-br ${getGradient(bookmark.url)}`
            } ${isEditMode ? "ring-2 ring-violet-400 dark:ring-violet-500" : ""}`}
          >
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-9 h-9 object-contain"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`items-center justify-center w-full h-full text-white font-bold text-xl ${
                bookmark.favicon ? "hidden" : "flex"
              }`}
            >
              {getInitial(bookmark.title)}
            </div>
          </div>

          {/* 삭제 배지 (편집 모드) */}
          {isEditMode && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteBadge(bookmark);
              }}
              className="absolute -top-2 -left-2 w-7 h-7 bg-gray-700 dark:bg-gray-300 rounded-full flex items-center justify-center z-10 shadow-lg border-2 border-white dark:border-[#0d0d10] active:scale-90 transition-transform touch-manipulation"
            >
              <X className="w-4 h-4 text-white dark:text-gray-900" />
            </button>
          )}

          {/* 즐겨찾기 버튼 */}
          {!isEditMode && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(bookmark.id, !bookmark.isFavorite);
              }}
              className={`absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#0d0d10] transition-transform active:scale-90 touch-manipulation ${
                bookmark.isFavorite
                  ? "bg-red-500"
                  : "bg-white dark:bg-[#1a1a1d] border-gray-200 dark:border-white/[0.12]"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  bookmark.isFavorite
                    ? "text-white fill-white"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            </button>
          )}
        </div>

        {/* 제목 */}
        <p className="mt-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-full px-0.5 truncate">
          {bookmark.title}
        </p>
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
  isEditMode?: boolean;
  onEditModeChange?: (v: boolean) => void;
}

export const MobileIconView: React.FC<MobileIconViewProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  onReorder,
  isEditMode: externalEditMode,
  onEditModeChange,
}) => {
  const { t } = useTranslation();
  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode = externalEditMode ?? internalEditMode;
  const setIsEditMode = (v: boolean) => {
    setInternalEditMode(v);
    onEditModeChange?.(v);
  };
  const [sheet, setSheet] = useState<Bookmark | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeBookmark = bookmarks.find((b) => b.id === activeId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || !onReorder || active.id === over.id) return;
      const oldIdx = bookmarks.findIndex((b) => b.id === active.id);
      const newIdx = bookmarks.findIndex((b) => b.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorder(arrayMove(bookmarks, oldIdx, newIdx));
      }
    },
    [bookmarks, onReorder]
  );

  const enterEditMode = useCallback(() => setIsEditMode(true), []);
  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setSheet(null);
    setDeleteTarget(null);
  }, []);

  const handleTap = useCallback((b: Bookmark) => setSheet(b), []);

  const handleDeleteBadge = useCallback((b: Bookmark) => setDeleteTarget(b), []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  return (
    <div className="relative">
      {/* 편집 모드 상단 바 */}
      {isEditMode && (
        <div className="flex items-center justify-between px-4 py-2 mb-1 bg-violet-600 text-white text-sm font-medium">
          <span>{t("bookmarks.editMode") ?? "편집 모드"}</span>
          <button
            onClick={exitEditMode}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
          >
            <X className="w-3 h-3" />
            {t("common.done") ?? "완료"}
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={bookmarks.map((b) => b.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-5 gap-x-2 gap-y-4 px-3 py-4">
            {bookmarks.map((b) => (
              <SortableIcon
                key={b.id}
                bookmark={b}
                isEditMode={isEditMode}
                onLongPress={enterEditMode}
                onTap={handleTap}
                onDeleteBadge={handleDeleteBadge}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </SortableContext>

        {/* 드래그 미리보기 오버레이 */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeBookmark && (
            <div className="flex flex-col items-center w-16 select-none">
              <div className="p-1">
                <div
                  className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl scale-110 ring-2 ring-violet-500 ring-offset-2 ${
                    activeBookmark.favicon
                      ? "bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]"
                      : `bg-gradient-to-br ${getGradient(activeBookmark.url)}`
                  }`}
                >
                  {activeBookmark.favicon ? (
                    <img
                      src={activeBookmark.favicon}
                      alt=""
                      className="w-9 h-9 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-white font-bold text-xl">
                      {getInitial(activeBookmark.title)}
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center leading-tight max-w-full px-0.5 truncate">
                {activeBookmark.title}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 편집 모드 힌트 (비편집 시) */}
      {!isEditMode && bookmarks.length > 0 && (
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pb-2">
          {t("bookmarks.longPressHint") ?? "길게 눌러 편집 모드"}
        </p>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${
                deleteTarget.favicon ? "bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]" : `bg-gradient-to-br ${getGradient(deleteTarget.url)}`
              }`}>
                {deleteTarget.favicon ? (
                  <img src={deleteTarget.favicon} alt="" className="w-7 h-7 object-contain" />
                ) : (
                  <span className="text-white font-bold">{getInitial(deleteTarget.title)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{deleteTarget.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t("bookmarks.deleteConfirm") ?? "삭제하시겠습니까?"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 rounded-lg"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 액션 바텀시트 */}
      {sheet && (
        <div className="fixed inset-0 z-[10001] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSheet(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/[0.06] rounded-t-2xl overflow-hidden">
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 bg-gray-300 dark:bg-white/20 rounded-full" />
            </div>

            {/* 북마크 정보 */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
              <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center ${
                sheet.favicon ? "bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08]" : `bg-gradient-to-br ${getGradient(sheet.url)}`
              }`}>
                {sheet.favicon ? (
                  <img src={sheet.favicon} alt="" className="w-7 h-7 object-contain" />
                ) : (
                  <span className="text-white font-bold text-lg">{getInitial(sheet.title)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{sheet.title}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sheet.url}</p>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="px-4 py-3 space-y-2">
              <a
                href={sheet.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSheet(null)}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                {t("common.visit") ?? "방문"}
              </a>

              <button
                onClick={() => {
                  onToggleFavorite(sheet.id, !sheet.isFavorite);
                  setSheet(null);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  sheet.isFavorite ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-100 dark:bg-white/[0.06]"
                }`}>
                  <Heart className={`w-4 h-4 ${sheet.isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 dark:text-gray-400"}`} />
                </div>
                {sheet.isFavorite
                  ? (t("bookmarks.removeFromFavorites") ?? "즐겨찾기 해제")
                  : (t("bookmarks.addToFavorites") ?? "즐겨찾기 추가")}
              </button>

              <button
                onClick={() => {
                  onEdit(sheet);
                  setSheet(null);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                {t("common.edit")}
              </button>

              <button
                onClick={() => {
                  setDeleteTarget(sheet);
                  setSheet(null);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                </div>
                {t("common.delete")}
              </button>
            </div>

            <div className="px-4 pb-6">
              <button
                onClick={() => setSheet(null)}
                className="w-full py-3 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] rounded-xl"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
