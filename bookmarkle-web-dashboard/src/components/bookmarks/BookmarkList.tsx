import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Bookmark, Collection, SortOption } from "../../types";
import { SortableBookmarkCard } from "./SortableBookmarkCard";
import { SortableBookmarkListItem } from "./SortableBookmarkListItem";
import { MobileIconView } from "./MobileIconView";
import { BookmarkSort } from "./BookmarkSort";
import { sortBookmarks } from "../../utils/sortBookmarks";
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
import { BookOpen, Folder, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../ui/Skeleton";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder: (newBookmarks: Bookmark[]) => void;
  onRefreshFavicon?: (bookmarkId: string, url: string) => Promise<string>; // 파비콘 새로고침 함수 추가
  collections?: Collection[];
  searchTerm: string;
  viewMode: "grid" | "list";
  // 정렬 관련 props 추가
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  // 그룹화된 북마크 데이터 추가
  groupedBookmarks?: {
    isGrouped: boolean;
    selectedCollectionBookmarks?: Bookmark[];
    selectedCollectionName?: string;
    groupedBookmarks?: {
      collectionId: string;
      collectionName: string;
      bookmarks: Bookmark[];
    }[];
  };
  loading?: boolean;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onEdit,
  onDelete,
  onToggleFavorite,
  onReorder,
  onRefreshFavicon, // 파비콘 새로고침 함수 추가
  collections = [],
  searchTerm,
  viewMode,
  currentSort,
  onSortChange,
  groupedBookmarks,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [faviconLoadingStates, setFaviconLoadingStates] = useState<
    Record<string, boolean>
  >({});

  // 이동 중인 북마크 상태 추가
  const [movingBookmarkId, setMovingBookmarkId] = useState<string | null>(null);
  const [moveDirection, setMoveDirection] = useState<"up" | "down" | null>(
    null
  );

  // 하위 컬렉션 북마크 보기 토글 상태 (로컬 스토리지에서 초기값 불러오기)
  const [showSubCollections, setShowSubCollections] = useState(() => {
    const stored = localStorage.getItem("showSubCollections");
    if (stored !== null) {
      return stored === "true";
    }
    return true; // 기본값은 true (보기)
  });

  // 로컬 스토리지에 상태 저장
  useEffect(() => {
    localStorage.setItem("showSubCollections", String(showSubCollections));
  }, [showSubCollections]);

  // 필터링 및 정렬된 북마크
  const filteredAndSortedBookmarks = useMemo(() => {
    let filtered = bookmarks;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(term) ||
          bookmark.url.toLowerCase().includes(term) ||
          (bookmark.description &&
            bookmark.description.toLowerCase().includes(term))
      );
    }

    // 정렬 적용 (useBookmarks에서 이미 사용자 순서로 정렬됨)
    return sortBookmarks(filtered, currentSort);
  }, [bookmarks, searchTerm, currentSort]);

  // 그룹화된 북마크 정렬 처리
  const sortedGroupedBookmarks = useMemo(() => {
    if (!groupedBookmarks?.isGrouped) return undefined;

    return {
      ...groupedBookmarks,
      selectedCollectionBookmarks: sortBookmarks(
        groupedBookmarks.selectedCollectionBookmarks || [],
        currentSort
      ),
      groupedBookmarks: showSubCollections
        ? groupedBookmarks.groupedBookmarks?.map((group) => ({
            ...group,
            bookmarks: sortBookmarks(group.bookmarks, currentSort),
          }))
        : [],
    };
  }, [groupedBookmarks, currentSort, showSubCollections]);

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // 드래그 시작 거리를 최소로 설정
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (loading) {
    const skeletonCount = viewMode === "grid" ? 8 : 6;
    const skeletonItems = Array.from({ length: skeletonCount });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5"
              : "space-y-3"
          }
        >
          {skeletonItems.map((_, idx) =>
            viewMode === "grid" ? (
              <div
                key={`bookmark-skeleton-grid-${idx}`}
                className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-3 w-full mt-6" />
                <Skeleton className="h-3 w-5/6 mt-2" />
                <div className="mt-6 flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            ) : (
              <div
                key={`bookmark-skeleton-list-${idx}`}
                className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/90 p-4 flex items-center gap-4 shadow-sm"
              >
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    console.log("Drag end event:", event); // 디버깅 로그
    const { active, over } = event;

    if (!over) {
      console.log("No drop target found"); // 드롭 타겟이 없는 경우
      return;
    }

    if (active.id !== over.id) {
      // 순서 변경을 위해서는 원본 bookmarks 배열을 사용해야 함
      // 정렬된 배열이 아닌 원본 순서를 기준으로 인덱스 찾기
      const oldIndex = bookmarks.findIndex((item) => item.id === active.id);
      const newIndex = bookmarks.findIndex((item) => item.id === over.id);

      console.log("Moving from index", oldIndex, "to", newIndex); // 디버깅 로그
      console.log("Active bookmark:", bookmarks[oldIndex]?.title); // 이동하는 북마크
      console.log("Over bookmark:", bookmarks[newIndex]?.title); // 대상 북마크

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBookmarks = arrayMove(bookmarks, oldIndex, newIndex);
        console.log("New bookmarks array length:", newBookmarks.length); // 새로운 배열 길이

        // 부모 컴포넌트에 알림
        onReorder(newBookmarks);

        // 즉시 UI 업데이트를 위한 토스트 메시지
        toast.success(t("bookmarks.bookmarkOrderChanged"), {
          duration: 2000,
          icon: "📌",
        });
      } else {
        console.log("Bookmark not found in original array"); // 북마크를 찾을 수 없는 경우
      }
    } else {
      console.log("Same position, no reorder needed"); // 같은 위치인 경우
    }
  };

  // 순서 변경 함수들 - 애니메이션 효과 추가
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

  // 파비콘 새로고침 핸들러
  const handleRefreshFavicon = async (bookmark: Bookmark) => {
    if (!onRefreshFavicon) return;

    setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: true }));
    try {
      await onRefreshFavicon(bookmark.id, bookmark.url);
    } catch (error) {
      console.error("파비콘 새로고침 실패:", error);
    } finally {
      setFaviconLoadingStates((prev) => ({ ...prev, [bookmark.id]: false }));
    }
  };

  // 북마크 섹션 렌더링 함수
  const renderBookmarkSection = (
    bookmarks: Bookmark[],
    sectionTitle?: string,
    sectionIcon?: string,
    isSubSection: boolean = false
  ) => {
    if (bookmarks.length === 0) return null;

    return (
      <div
        className={`space-y-4 ${
          isSubSection
            ? "ml-4 border-l-2 border-purple-200 dark:border-purple-700 pl-6"
            : ""
        }`}
      >
        {/* 섹션 헤더 */}
        {sectionTitle && (
          <div
            className={`flex items-center gap-3 ${isSubSection ? "mt-6" : ""}`}
          >
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isSubSection
                  ? "bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700"
                  : "bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800"
              }`}
            >
              {sectionIcon && <span className="text-lg">{sectionIcon}</span>}
              <h3
                className={`font-semibold text-sm ${
                  isSubSection
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {sectionTitle}
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  isSubSection
                    ? "bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-300"
                    : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400"
                }`}
              >
                {t("bookmarks.count", { count: bookmarks.length })}
              </span>
            </div>
          </div>
        )}

        {/* 북마크 그리드/리스트 */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5"
              : "space-y-3"
          }
        >
          {bookmarks.map((bookmark, idx) =>
            viewMode === "grid" ? (
              <SortableBookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshFavicon={
                  onRefreshFavicon ? handleRefreshFavicon : async () => {}
                }
                faviconLoading={faviconLoadingStates[bookmark.id] || false}
                collections={collections}
                onToggleFavorite={onToggleFavorite}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={idx === 0}
                isLast={idx === bookmarks.length - 1}
                isMoving={movingBookmarkId === bookmark.id}
                moveDirection={moveDirection}
              />
            ) : (
              <SortableBookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshFavicon={
                  onRefreshFavicon ? handleRefreshFavicon : undefined
                }
                faviconLoading={faviconLoadingStates[bookmark.id] || false}
                collections={collections}
                onToggleFavorite={onToggleFavorite}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={idx === 0}
                isLast={idx === bookmarks.length - 1}
                isMoving={movingBookmarkId === bookmark.id}
                moveDirection={moveDirection}
              />
            )
          )}
        </div>
      </div>
    );
  };

  // 그룹화된 북마크가 있는 경우 그룹화된 뷰 렌더링
  if (sortedGroupedBookmarks?.isGrouped) {
    // 그룹화된 뷰에서 사용할 모든 북마크 목록 (드래그 앤 드롭용)
    const allGroupedBookmarks = [
      ...(sortedGroupedBookmarks.selectedCollectionBookmarks || []),
      ...(sortedGroupedBookmarks.groupedBookmarks?.flatMap(
        (group) => group.bookmarks
      ) || []),
    ];

    return (
      <div className="space-y-6">
        {/* 정렬 컨트롤 */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("bookmarks.totalBookmarks", {
              count: allGroupedBookmarks.length,
            })}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 하위 컬렉션 토글 버튼 */}
            {groupedBookmarks?.groupedBookmarks &&
              groupedBookmarks.groupedBookmarks.length > 0 && (
                <button
                  onClick={() => setShowSubCollections(!showSubCollections)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  title={
                    showSubCollections
                      ? t("bookmarks.hideSubCollections")
                      : t("bookmarks.showSubCollections")
                  }
                >
                  {showSubCollections ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {t("bookmarks.hideSubCollections")}
                      </span>
                      <span className="sm:hidden">{t("bookmarks.show")}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {t("bookmarks.showSubCollections")}
                      </span>
                      <span className="sm:hidden">{t("bookmarks.show")}</span>
                    </>
                  )}
                </button>
              )}
            <BookmarkSort
              currentSort={currentSort}
              onSortChange={onSortChange}
            />
          </div>
        </div>

        {/* 모바일 그룹화된 아이콘 뷰 */}
        <div className="block sm:hidden">
          <div className="space-y-6">
            {/* 상위 컬렉션 북마크 모바일 뷰 */}
            {sortedGroupedBookmarks.selectedCollectionBookmarks &&
              sortedGroupedBookmarks.selectedCollectionBookmarks.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                      {collections.find(
                        (col) =>
                          col.name ===
                          sortedGroupedBookmarks.selectedCollectionName
                      )?.icon && (
                        <span className="text-lg">
                          {
                            collections.find(
                              (col) =>
                                col.name ===
                                sortedGroupedBookmarks.selectedCollectionName
                            )?.icon
                          }
                        </span>
                      )}
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                        {sortedGroupedBookmarks.selectedCollectionName}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400">
                        {t("bookmarks.count", {
                          count:
                            sortedGroupedBookmarks.selectedCollectionBookmarks
                              .length,
                        })}
                      </span>
                    </div>
                  </div>
                  <MobileIconView
                    bookmarks={
                      sortedGroupedBookmarks.selectedCollectionBookmarks
                    }
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onReorder={onReorder}
                  />
                </div>
              )}

            {/* 하위 컬렉션 북마크 모바일 뷰 */}
            <AnimatePresence>
              {!showSubCollections &&
                groupedBookmarks?.groupedBookmarks &&
                groupedBookmarks.groupedBookmarks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Folder className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          {t("bookmarks.hiddenSubCollectionBookmarks", {
                            count: groupedBookmarks.groupedBookmarks.length,
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSubCollections(true)}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex-shrink-0 ml-2"
                      >
                        {t("bookmarks.show")}
                      </button>
                    </div>
                  </motion.div>
                )}
              {showSubCollections &&
                sortedGroupedBookmarks.groupedBookmarks &&
                sortedGroupedBookmarks.groupedBookmarks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 shadow-sm border border-purple-200 dark:border-purple-700 overflow-hidden"
                  >
                    <div className="mb-4">
                      <h2 className="text-lg font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        <Folder className="w-5 h-5" />
                        {t("bookmarks.subCollectionBookmarks")}
                      </h2>
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        {t("bookmarks.subCollectionBookmarksDescription")}
                      </p>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                      className="space-y-4"
                    >
                      {sortedGroupedBookmarks.groupedBookmarks.map((group) => (
                        <div key={group.collectionId} className="space-y-3">
                          <div className="ml-4 border-l-2 border-purple-200 dark:border-purple-700 pl-4">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700">
                              {collections.find(
                                (col) => col.id === group.collectionId
                              )?.icon && (
                                <span className="text-lg">
                                  {
                                    collections.find(
                                      (col) => col.id === group.collectionId
                                    )?.icon
                                  }
                                </span>
                              )}
                              <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                                {group.collectionName}
                              </h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-300">
                                {t("bookmarks.count", {
                                  count: group.bookmarks.length,
                                })}
                              </span>
                            </div>
                            <div className="mt-3">
                              <MobileIconView
                                bookmarks={group.bookmarks}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onToggleFavorite={onToggleFavorite}
                                onReorder={onReorder}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </div>

        {/* 데스크톱 그룹화된 뷰 */}
        <div className="hidden sm:block">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={(event) => {
              console.log("Drag start event:", event);
            }}
            onDragOver={(event) => {
              console.log("Drag over event:", event);
            }}
          >
            <SortableContext
              items={allGroupedBookmarks.map((item) => item.id)}
              strategy={
                viewMode === "grid"
                  ? rectSortingStrategy
                  : verticalListSortingStrategy
              }
            >
              <div className="space-y-8">
                {/* 상위 컬렉션 북마크 */}
                {sortedGroupedBookmarks.selectedCollectionBookmarks &&
                  sortedGroupedBookmarks.selectedCollectionBookmarks.length >
                    0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                      {renderBookmarkSection(
                        sortedGroupedBookmarks.selectedCollectionBookmarks,
                        sortedGroupedBookmarks.selectedCollectionName,
                        collections.find(
                          (col) =>
                            col.name ===
                            sortedGroupedBookmarks.selectedCollectionName
                        )?.icon,
                        false
                      )}
                    </div>
                  )}

                {/* 하위 컬렉션 북마크들 */}
                <AnimatePresence>
                  {!showSubCollections &&
                    groupedBookmarks?.groupedBookmarks &&
                    groupedBookmarks.groupedBookmarks.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Folder className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">
                              {t("bookmarks.hiddenSubCollectionBookmarks", {
                                count: groupedBookmarks.groupedBookmarks.length,
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowSubCollections(true)}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex-shrink-0 ml-2"
                          >
                            {t("bookmarks.show")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  {showSubCollections &&
                    sortedGroupedBookmarks.groupedBookmarks &&
                    sortedGroupedBookmarks.groupedBookmarks.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-700 overflow-hidden"
                      >
                        <div className="mb-4">
                          <h2 className="text-lg font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                            <Folder className="w-5 h-5" />
                            {t("bookmarks.subCollectionBookmarks")}
                          </h2>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            {t("bookmarks.subCollectionBookmarksDescription")}
                          </p>
                        </div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.2 }}
                          className="space-y-6"
                        >
                          {sortedGroupedBookmarks.groupedBookmarks.map(
                            (group) =>
                              renderBookmarkSection(
                                group.bookmarks,
                                group.collectionName,
                                collections.find(
                                  (col) => col.id === group.collectionId
                                )?.icon,
                                true
                              )
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  }

  // 일반 북마크 리스트 렌더링
  return (
    <div className="space-y-6">
      {/* 정렬 컨트롤 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t("bookmarks.totalBookmarks", {
            count: filteredAndSortedBookmarks.length,
          })}
        </div>
        <BookmarkSort currentSort={currentSort} onSortChange={onSortChange} />
      </div>

      {/* 북마크 그리드/리스트 */}
      {filteredAndSortedBookmarks.length > 0 ? (
        <>
          {/* 모바일 아이콘 뷰 */}
          <div className="block sm:hidden">
            <MobileIconView
              bookmarks={filteredAndSortedBookmarks}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onReorder={onReorder}
            />
          </div>

          {/* 데스크톱 뷰 */}
          <div className="hidden sm:block">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={(event) => {
                console.log("Drag start event:", event); // 디버깅 로그
              }}
              onDragOver={(event) => {
                console.log("Drag over event:", event); // 디버깅 로그
              }}
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
                  {filteredAndSortedBookmarks.map(
                    (bookmark: Bookmark, idx: number) =>
                      viewMode === "grid" ? (
                        <SortableBookmarkCard
                          key={bookmark.id}
                          bookmark={bookmark}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onRefreshFavicon={
                            onRefreshFavicon
                              ? handleRefreshFavicon
                              : async () => {}
                          }
                          faviconLoading={
                            faviconLoadingStates[bookmark.id] || false
                          }
                          collections={collections}
                          onToggleFavorite={onToggleFavorite}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          isFirst={idx === 0}
                          isLast={idx === filteredAndSortedBookmarks.length - 1}
                          isMoving={movingBookmarkId === bookmark.id}
                          moveDirection={moveDirection}
                        />
                      ) : (
                        <SortableBookmarkListItem
                          key={bookmark.id}
                          bookmark={bookmark}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onRefreshFavicon={
                            onRefreshFavicon ? handleRefreshFavicon : undefined
                          }
                          faviconLoading={
                            faviconLoadingStates[bookmark.id] || false
                          }
                          collections={collections}
                          onToggleFavorite={onToggleFavorite}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          isFirst={idx === 0}
                          isLast={idx === filteredAndSortedBookmarks.length - 1}
                          isMoving={movingBookmarkId === bookmark.id}
                          moveDirection={moveDirection}
                        />
                      )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            {t("bookmarks.noBookmarksFound")}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
            {searchTerm
              ? t("bookmarks.noSearchResults")
              : t("bookmarks.addFirstBookmark")}
          </p>
        </div>
      )}
    </div>
  );
};
