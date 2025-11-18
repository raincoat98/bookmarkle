import React, { useState, useEffect, useRef } from "react";
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
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // 드래그 앤 드롭 센서 설정 - 수정모드에서만 드래그 활성화
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 0, // 즉시 드래그 시작
        tolerance: 10, // 10px 이동 허용
      },
    }),
    useSensor(KeyboardSensor)
  );

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !onReorder) return;

    if (active.id !== over.id) {
      const oldIndex = bookmarks.findIndex((item) => item.id === active.id);
      const newIndex = bookmarks.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBookmarks = arrayMove(bookmarks, oldIndex, newIndex);
        onReorder(newBookmarks);
      }
    }
  };

  // 수정 모드 종료
  const handleExitEditMode = () => {
    setIsEditMode(false);
    setSelectedBookmark(null);
  };

  const handleSettingsClick = (
    e: React.MouseEvent | React.PointerEvent,
    bookmark: Bookmark
  ) => {
    e.stopPropagation();
    setSelectedBookmark(bookmark);
  };

  const handleCloseSettings = () => {
    setSelectedBookmark(null);
  };

  const handleEdit = (bookmark: Bookmark) => {
    onEdit(bookmark);
    setSelectedBookmark(null);
  };

  const handleDelete = (bookmark: Bookmark) => {
    onDelete(bookmark);
    setSelectedBookmark(null);
  };

  const handleToggleFavorite = (bookmark: Bookmark) => {
    onToggleFavorite(bookmark.id, !bookmark.isFavorite);
    setSelectedBookmark(null);
  };

  const getFaviconBackground = (bookmark: Bookmark) => {
    if (bookmark.favicon) return "bg-white";

    // URL 기반 색상 생성
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

  const getInitials = (title: string) => {
    return title
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // 드래그 가능한 북마크 아이템 컴포넌트
  const DraggableBookmarkItem = ({ bookmark }: { bookmark: Bookmark }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const touchStartTimeRef = useRef<number>(0);
    const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mouseStartTimeRef = useRef<number>(0);
    const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMouseDeviceRef = useRef(false);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: dndIsDragging,
    } = useSortable({
      id: bookmark.id,
      data: {
        bookmark: bookmark,
      },
    });

    // 마우스 이벤트 처리 - PC에서만
    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      // 수정모드일 때는 마우스 이벤트를 완전히 비활성화 (드래그로 대체)
      if (isEditMode) {
        return;
      }

      const handleMouseDown = (e: MouseEvent) => {
        isMouseDeviceRef.current = true;
        mouseStartTimeRef.current = Date.now();

        // 왼쪽 클릭만 처리
        if (e.button !== 0) {
          return;
        }

        // 1초 후에 수정모드 진입을 위한 타이머 설정
        const timeoutId = setTimeout(() => {
          if (!isEditMode) {
            setIsEditMode(true);
          }
        }, 1000);
        mouseTimeoutRef.current = timeoutId;
      };

      const handleMouseMove = () => {
        // 마우스 이동 시 타이머 클리어 (드래그로 판단)
        if (mouseTimeoutRef.current) {
          clearTimeout(mouseTimeoutRef.current);
          mouseTimeoutRef.current = null;
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        // 왼쪽 클릭만 처리
        if (e.button !== 0) {
          return;
        }

        const mouseDuration = Date.now() - mouseStartTimeRef.current;

        // 타이머 클리어
        if (mouseTimeoutRef.current) {
          clearTimeout(mouseTimeoutRef.current);
          mouseTimeoutRef.current = null;
        }

        // 짧은 클릭인 경우 링크로 이동
        if (mouseDuration < 1000 && !isEditMode) {
          window.open(bookmark.url, "_blank", "noopener,noreferrer");
        }
      };

      element.addEventListener("mousedown", handleMouseDown);
      element.addEventListener("mousemove", handleMouseMove);
      element.addEventListener("mouseup", handleMouseUp);

      return () => {
        element.removeEventListener("mousedown", handleMouseDown);
        element.removeEventListener("mousemove", handleMouseMove);
        element.removeEventListener("mouseup", handleMouseUp);

        // 컴포넌트 언마운트 시 타이머 클리어
        if (mouseTimeoutRef.current) {
          clearTimeout(mouseTimeoutRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode]);

    // 터치 이벤트 처리 - 모바일에서만
    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      // 수정모드일 때는 터치 이벤트를 완전히 비활성화
      if (isEditMode) {
        return;
      }

      const handleTouchStart = (e: TouchEvent) => {
        touchStartTimeRef.current = Date.now();

        // 1초 후에 수정모드 진입을 위한 타이머 설정
        touchTimeoutRef.current = setTimeout(() => {
          if (!isEditMode) {
            e.preventDefault(); // 롱프레스 시에만 브라우저 기본 동작 방지
            setIsEditMode(true);
          }
        }, 1000);
      };

      const handleTouchEnd = () => {
        const touchDuration = Date.now() - touchStartTimeRef.current;

        // 타이머 클리어
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }

        // 짧은 터치인 경우 링크로 이동
        if (touchDuration < 1000 && !isEditMode) {
          window.open(bookmark.url, "_blank", "noopener,noreferrer");
        }
      };

      const handleTouchMove = () => {
        // 터치 이동 시 타이머 클리어 (롱프레스 취소)
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
      };

      // non-passive 이벤트 리스너 추가
      element.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      element.addEventListener("touchend", handleTouchEnd, {
        passive: false,
      });
      element.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });

      return () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchmove", handleTouchMove);

        // 컴포넌트 언마운트 시 타이머 클리어
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode]);

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          elementRef.current = node;
        }}
        style={style}
        className={`relative group flex flex-col items-center w-full ${
          dndIsDragging ? "opacity-50 scale-95 pointer-events-none" : ""
        }`}
      >
        {/* 아이콘 */}
        <div className="relative p-1 group">
          <div
            {...attributes}
            {...(isEditMode ? listeners : {})}
            className={`block w-10 h-10 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 transition-all duration-300 overflow-hidden shadow-lg touch-manipulation ${
              isEditMode
                ? "cursor-grab active:cursor-grabbing border-2 border-blue-400 dark:border-blue-500 scale-105"
                : "cursor-pointer hover:scale-105 hover:shadow-2xl active:scale-95"
            }`}
            style={{
              touchAction: isEditMode ? "none" : "manipulation",
            }}
          >
            {isEditMode ? (
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full pointer-events-none"
              >
                {/* 파비콘 또는 초기 */}
                <div
                  className={`w-full h-full flex items-center justify-center ${getFaviconBackground(
                    bookmark
                  )}`}
                >
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt={t("common.favicon")}
                      className="w-8 h-8 rounded shadow-lg"
                      draggable="false"
                      onContextMenu={(e) => e.preventDefault()}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden"
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`text-white font-bold text-sm shadow-lg ${
                      bookmark.favicon ? "hidden" : ""
                    }`}
                  >
                    {getInitials(bookmark.title)}
                  </div>
                </div>
              </a>
            ) : (
              <div className="block w-full h-full">
                {/* 파비콘 또는 초기 */}
                <div
                  className={`w-full h-full flex items-center justify-center ${getFaviconBackground(
                    bookmark
                  )}`}
                >
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt={t("common.favicon")}
                      className="w-8 h-8 rounded shadow-lg"
                      draggable="false"
                      onContextMenu={(e) => e.preventDefault()}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden"
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`text-white font-bold text-sm shadow-lg ${
                      bookmark.favicon ? "hidden" : ""
                    }`}
                  >
                    {getInitials(bookmark.title)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 수정 모드일 때만 설정 버튼 표시 */}
          {isEditMode && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSettingsClick(e, bookmark);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 터치를 뗄 때만 모달 열기
                setSelectedBookmark(bookmark);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 마우스를 뗄 때만 모달 열기
                handleSettingsClick(e, bookmark);
              }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 z-50 touch-manipulation cursor-pointer"
              style={{
                pointerEvents: "auto",
                touchAction: "manipulation",
              }}
            >
              <Settings className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* 제목 */}
        <div className="mt-1 text-center w-full px-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight overflow-hidden text-ellipsis whitespace-nowrap w-full">
            {bookmark.title}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* 수정 모드 안내 */}
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

      {/* 아이콘 그리드 */}
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
              <DraggableBookmarkItem key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 설정 모달 */}
      {selectedBookmark && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-3xl w-full max-w-sm p-6 space-y-6 border-t border-slate-200/50 dark:border-slate-700/50">
            {/* 북마크 정보 */}
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto rounded-3xl ${getFaviconBackground(
                  selectedBookmark
                )} flex items-center justify-center mb-4 shadow-xl`}
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

            {/* 액션 버튼들 */}
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
                  className={`w-5 h-5 mr-3 ${
                    selectedBookmark.isFavorite ? "fill-current" : ""
                  }`}
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

            {/* 취소 버튼 */}
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
