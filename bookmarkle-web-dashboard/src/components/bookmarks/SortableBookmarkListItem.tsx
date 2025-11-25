import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Bookmark, Collection } from "../../types";
import { renderCollectionIcon } from "../../utils/iconRenderer";
import { useTranslation } from "react-i18next";

interface SortableBookmarkListItemProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  collections: Collection[];
  onMoveUp?: (bookmark: Bookmark) => void;
  onMoveDown?: (bookmark: Bookmark) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoading?: boolean;
  isMoving?: boolean;
  moveDirection?: "up" | "down" | null;
}

interface MenuPosition {
  top: number;
  right: number;
  isAbove: boolean;
}

const MENU_HEIGHT = 300;
const MENU_OFFSET = 8;

export const SortableBookmarkListItem = ({
  bookmark,
  onEdit,
  onDelete,
  collections,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  onToggleFavorite, // 즐겨찾기 토글 함수 추가
  onRefreshFavicon, // 파비콘 새로고침 함수 추가
  faviconLoading = false, // 파비콘 로딩 상태 추가
  isMoving = false, // 이동 중인지 여부
  moveDirection = null, // 이동 방향
}: SortableBookmarkListItemProps) => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bookmark.id });

  // 이벤트 전파 차단 유틸리티
  const stopEventPropagation = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    },
    []
  );

  // 메뉴 위치 계산 함수
  const calculateMenuPosition = useCallback((): MenuPosition | null => {
    if (!menuButtonRef.current) return null;

    const rect = menuButtonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const isAbove = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;

    return {
      top: isAbove
        ? rect.top - MENU_HEIGHT - MENU_OFFSET
        : rect.bottom + MENU_OFFSET,
      right: window.innerWidth - rect.right,
      isAbove,
    };
  }, []);

  // 모바일 메뉴 위치 계산 및 외부 클릭 처리
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMenuPosition(null);
      return;
    }

    const updateMenuPosition = () => {
      const position = calculateMenuPosition();
      if (position) {
        setMenuPosition(position);
      }
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
        setMenuPosition(null);
      }
    };

    // 즉시 위치 계산
    updateMenuPosition();

    // 렌더링 후 재계산
    const timeoutId = setTimeout(updateMenuPosition, 10);

    // 스크롤 시 메뉴 닫기
    const handleScroll = () => {
      setIsMobileMenuOpen(false);
      setMenuPosition(null);
    };

    // 이벤트 리스너 지연 등록 (메뉴 렌더링 후)
    const listenerTimeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true);
      document.addEventListener("touchstart", handleClickOutside, true);
    }, 100);

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(listenerTimeoutId);
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isMobileMenuOpen, calculateMenuPosition]);

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      stopEventPropagation(e);
      onEdit(bookmark);
    },
    [bookmark, onEdit, stopEventPropagation]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      stopEventPropagation(e);
      onDelete(bookmark);
    },
    [bookmark, onDelete, stopEventPropagation]
  );

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      stopEventPropagation(e);
      onMoveUp?.(bookmark);
    },
    [bookmark, onMoveUp, stopEventPropagation]
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      stopEventPropagation(e);
      onMoveDown?.(bookmark);
    },
    [bookmark, onMoveDown, stopEventPropagation]
  );

  const handleRefreshFavicon = useCallback(
    async (e: React.MouseEvent) => {
      stopEventPropagation(e);
      if (onRefreshFavicon) {
        await onRefreshFavicon(bookmark);
      }
    },
    [bookmark, onRefreshFavicon, stopEventPropagation]
  );

  const handleToggleMenu = useCallback(
    (e: React.MouseEvent) => {
      stopEventPropagation(e);
      const newState = !isMobileMenuOpen;
      setIsMobileMenuOpen(newState);

      if (newState) {
        const position = calculateMenuPosition();
        if (position) {
          setMenuPosition(position);
          // 렌더링 후 재확인
          requestAnimationFrame(() => {
            const updatedPosition = calculateMenuPosition();
            if (updatedPosition) {
              setMenuPosition(updatedPosition);
            }
          });
        }
      } else {
        setMenuPosition(null);
      }
    },
    [isMobileMenuOpen, calculateMenuPosition, stopEventPropagation]
  );

  const handleCloseMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setMenuPosition(null);
  }, []);

  const collection = useMemo(
    () => collections.find((col) => col.id === bookmark.collection),
    [collections, bookmark.collection]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden min-w-0 backdrop-blur-sm ${
        isDragging ? "opacity-50 shadow-2xl z-50" : ""
      } hover:z-30 z-10 ${
        isMoving
          ? `animate-pulse shadow-2xl ring-4 ${
              moveDirection === "up"
                ? "ring-green-300 dark:ring-green-600 -translate-y-2"
                : "ring-blue-300 dark:ring-blue-600 translate-y-2"
            }`
          : ""
      }`}
    >
      {/* 이동 방향 인디케이터 */}
      {isMoving && (
        <div
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 ${
            moveDirection === "up" ? "animate-bounce" : ""
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              moveDirection === "up"
                ? "bg-green-500 text-white"
                : "bg-blue-500 text-white"
            } shadow-lg`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={moveDirection === "up" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
              />
            </svg>
          </div>
        </div>
      )}

      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 리스트 아이템 내용 - 한 줄 레이아웃 */}
      <div className="p-4 sm:p-6 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* 드래그 핸들러 - 왼쪽에 항상 표시 */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing z-20 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            </svg>
          </div>

          {/* 파비콘 */}
          <div className="flex-shrink-0">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/30 dark:to-accent-900/30 flex items-center justify-center shadow-sm">
              {bookmark.favicon ? (
                <div
                  className="relative w-8 h-8 rounded-lg overflow-hidden hover:scale-110 transition-all duration-200 cursor-pointer [&:hover_>_.overlay]:opacity-100"
                  onClick={handleRefreshFavicon}
                  title={t("common.refreshFavicon")}
                >
                  <img
                    src={bookmark.favicon}
                    alt={t("common.favicon")}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* 호버 오버레이 - 새로고침 아이콘 */}
                  {onRefreshFavicon && (
                    <div className="overlay absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 transition-all duration-200 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="relative w-6 h-6 hover:scale-110 transition-all duration-200 cursor-pointer [&:hover_>_.overlay]:opacity-100"
                  onClick={handleRefreshFavicon}
                  title={t("common.refreshFavicon")}
                >
                  <svg
                    className="w-full h-full text-gray-500 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  {/* 호버 오버레이 - 새로고침 아이콘 */}
                  {onRefreshFavicon && (
                    <div className="overlay absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center opacity-0 transition-all duration-200 pointer-events-none">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              {/* 로딩 오버레이 */}
              {faviconLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>

          {/* 제목 및 URL - 한 줄로, 반응형 최적화 */}
          <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3 overflow-hidden">
            <div className="relative group/title flex-shrink-0 min-w-[80px] md:min-w-[140px] max-w-[200px] md:max-w-[400px]">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm md:text-base font-semibold text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer block truncate"
                title={bookmark.title}
              >
                {bookmark.title}
              </a>
              {/* 호버 시 전체 제목 툴팁 */}
              {bookmark.title.length > 5 && (
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/title:block z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                  {bookmark.title}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:inline">
              •
            </span>
            <div className="relative group/url flex-1 min-w-0 hidden sm:block">
              <p
                className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate"
                title={bookmark.url}
              >
                {bookmark.url}
              </p>
              {/* 호버 시 전체 URL 툴팁 */}
              {bookmark.url.length > 30 && (
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/url:block z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md shadow-lg whitespace-nowrap pointer-events-none max-w-[400px] truncate">
                  {bookmark.url}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              )}
            </div>
          </div>

          {/* 컬렉션 정보 및 날짜 */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {collection ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm">
                {renderCollectionIcon(collection.icon, "w-3 h-3")}
                <span>{collection.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 shadow-sm">
                <span>{t("collections.noCollection")}</span>
              </span>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-md whitespace-nowrap hidden sm:block">
              {bookmark.createdAt.toLocaleDateString()}
            </div>
          </div>

          {/* 액션 버튼들 - md 이상: 항상 표시, md 미만: 메뉴 버튼 */}
          <div className="flex-shrink-0 relative">
            {/* 모바일/태블릿: 메뉴 버튼 (md 미만) */}
            <button
              ref={menuButtonRef}
              onClick={handleToggleMenu}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center"
              title={t("common.moreActions")}
              aria-label={t("common.moreActions")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* 모바일/태블릿 메뉴 드롭다운 (md 미만) - Portal 사용 */}
            {isMobileMenuOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={menuRef}
                  className="md:hidden fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-300 dark:border-gray-600 z-[99999] overflow-hidden w-48 sm:w-48 max-w-[280px]"
                  style={
                    menuPosition
                      ? {
                          top: `${Math.max(
                            MENU_OFFSET,
                            Math.min(
                              menuPosition.top,
                              window.innerHeight - MENU_HEIGHT - MENU_OFFSET
                            )
                          )}px`,
                          right: `${Math.max(
                            MENU_OFFSET,
                            Math.min(
                              menuPosition.right,
                              window.innerWidth - 200
                            )
                          )}px`,
                          position: "fixed",
                        }
                      : {
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          position: "fixed",
                        }
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseMenu();
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    {t("common.visit")}
                  </a>
                  <button
                    onClick={(e) => {
                      stopEventPropagation(e);
                      handleEdit(e);
                      handleCloseMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {t("common.edit")}
                  </button>
                  <button
                    onClick={(e) => {
                      stopEventPropagation(e);
                      onToggleFavorite(bookmark.id, !bookmark.isFavorite);
                      handleCloseMenu();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      bookmark.isFavorite
                        ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={bookmark.isFavorite ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {bookmark.isFavorite
                      ? t("bookmarks.removeFromFavorites")
                      : t("bookmarks.addToFavorites")}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={(e) => {
                      stopEventPropagation(e);
                      handleMoveUp(e);
                      handleCloseMenu();
                    }}
                    disabled={isFirst}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    {t("common.moveUp")}
                  </button>
                  <button
                    onClick={(e) => {
                      stopEventPropagation(e);
                      handleMoveDown(e);
                      handleCloseMenu();
                    }}
                    disabled={isLast}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    {t("common.moveDown")}
                  </button>
                  <div className="border-t border-red-200 dark:border-red-900/50 my-1"></div>
                  <button
                    onClick={(e) => {
                      stopEventPropagation(e);
                      handleDelete(e);
                      handleCloseMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    {t("common.delete")}
                  </button>
                </div>,
                document.body
              )}

            {/* 데스크톱: 모든 버튼 표시 (md 이상) */}
            <div className="hidden md:flex items-center gap-2">
              {/* 방문하기 버튼 - 아이콘만 표시 */}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center p-1.5 text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                title={t("common.visit")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              {/* 수정 버튼 */}
              <button
                onClick={handleEdit}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center"
                title={t("common.edit")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              {/* 즐겨찾기 버튼 */}
              <button
                onClick={(e) => {
                  stopEventPropagation(e);
                  onToggleFavorite(bookmark.id, !bookmark.isFavorite);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={`p-1.5 rounded-lg transition-all duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                  bookmark.isFavorite
                    ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
                title={
                  bookmark.isFavorite
                    ? t("bookmarks.removeFromFavorites")
                    : t("bookmarks.addToFavorites")
                }
              >
                <svg
                  className="w-4 h-4"
                  fill={bookmark.isFavorite ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>

              {/* 상하 이동 버튼들 - 덜 자주 사용하는 액션 */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={handleMoveUp}
                  disabled={isFirst}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="p-1 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 min-w-[24px] min-h-[24px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title={t("common.moveUp")}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleMoveDown}
                  disabled={isLast}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="p-1 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 min-w-[24px] min-h-[24px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title={t("common.moveDown")}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* 구분선 - 위험한 액션과 일반 액션 구분 */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

              {/* 삭제 버튼 - 위험한 액션이므로 오른쪽 끝에 분리 */}
              <button
                onClick={handleDelete}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 min-w-[32px] min-h-[32px] flex items-center justify-center"
                title={t("common.delete")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
