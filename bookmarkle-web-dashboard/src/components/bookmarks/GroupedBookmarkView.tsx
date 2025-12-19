import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection, SortOption } from "../../types";
import { BookmarkListHeader } from "./BookmarkListHeader";
import { SubCollectionToggle } from "./SubCollectionToggle";
import { BookmarkSection } from "./BookmarkSection";
import { MobileIconView } from "./MobileIconView";
import { MobileIconSkeleton } from "./MobileIconSkeleton";

interface GroupedBookmarkViewProps {
  sortedGroupedBookmarks: {
    isGrouped: boolean;
    selectedCollectionBookmarks?: Bookmark[];
    selectedCollectionName?: string;
    groupedBookmarks?: {
      collectionId: string;
      collectionName: string;
      bookmarks: Bookmark[];
    }[];
  };
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
  collections: Collection[];
  viewMode: "grid" | "list";
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  loading?: boolean;
  // 북마크 액션 props
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onReorder: (newBookmarks: Bookmark[]) => void;
  onRefreshFavicon?: (bookmark: Bookmark) => Promise<void>;
  faviconLoadingStates: Record<string, boolean>;
  onMoveUp: (bookmark: Bookmark) => void;
  onMoveDown: (bookmark: Bookmark) => void;
  movingBookmarkId: string | null;
  moveDirection: "up" | "down" | null;
}

export const GroupedBookmarkView: React.FC<GroupedBookmarkViewProps> = ({
  sortedGroupedBookmarks,
  groupedBookmarks,
  collections,
  viewMode,
  currentSort,
  onSortChange,
  loading = false,
  onEdit,
  onDelete,
  onToggleFavorite,
  onReorder,
  onRefreshFavicon,
  faviconLoadingStates,
  onMoveUp,
  onMoveDown,
  movingBookmarkId,
  moveDirection,
}) => {
  const { t } = useTranslation();

  // 하위 컬렉션 북마크 보기 토글 상태
  const [showSubCollections, setShowSubCollections] = useState(() => {
    const stored = localStorage.getItem("showSubCollections");
    if (stored !== null) {
      return stored === "true";
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("showSubCollections", String(showSubCollections));
  }, [showSubCollections]);

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

    const allGroupedBookmarks = [
      ...(sortedGroupedBookmarks.selectedCollectionBookmarks || []),
      ...(sortedGroupedBookmarks.groupedBookmarks?.flatMap(
        (group) => group.bookmarks
      ) || []),
    ];

    const oldIndex = allGroupedBookmarks.findIndex(
      (item) => item.id === active.id
    );
    const newIndex = allGroupedBookmarks.findIndex(
      (item) => item.id === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newBookmarks = arrayMove(allGroupedBookmarks, oldIndex, newIndex);
      onReorder(newBookmarks);

      toast.success(t("bookmarks.bookmarkOrderChanged"), {
        duration: 2000,
        icon: "📌",
      });
    }
  };

  // 그룹화된 뷰에서 사용할 모든 북마크 목록
  const allGroupedBookmarks = [
    ...(sortedGroupedBookmarks.selectedCollectionBookmarks || []),
    ...(sortedGroupedBookmarks.groupedBookmarks?.flatMap(
      (group) => group.bookmarks
    ) || []),
  ];

  const hasSubCollections =
    groupedBookmarks?.groupedBookmarks &&
    groupedBookmarks.groupedBookmarks.length > 0;

  return (
    <div className="space-y-6">
      {/* 정렬 컨트롤 */}
      <BookmarkListHeader
        totalCount={allGroupedBookmarks.length}
        currentSort={currentSort}
        onSortChange={onSortChange}
        loading={loading}
        rightContent={
          <SubCollectionToggle
            showSubCollections={showSubCollections}
            onToggle={() => setShowSubCollections(!showSubCollections)}
            hasSubCollections={!!hasSubCollections}
          />
        }
      />

      {/* 모바일 그룹화된 아이콘 뷰 */}
      <div className="block sm:hidden">
        <div className="space-y-6">
          {/* 상위 컬렉션 북마크 모바일 뷰 */}
          {(loading ||
            (sortedGroupedBookmarks.selectedCollectionBookmarks &&
              sortedGroupedBookmarks.selectedCollectionBookmarks.length >
                0)) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                  {collections.find(
                    (col) =>
                      col.name === sortedGroupedBookmarks.selectedCollectionName
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
                    {loading
                      ? t("common.loading")
                      : t("bookmarks.count", {
                          count:
                            sortedGroupedBookmarks.selectedCollectionBookmarks
                              ?.length || 0,
                        })}
                  </span>
                </div>
              </div>
              {loading ? (
                <div className="grid grid-cols-5 gap-2 p-3 justify-items-center">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <MobileIconSkeleton key={`skeleton-mobile-${idx}`} />
                  ))}
                </div>
              ) : (
                <MobileIconView
                  bookmarks={
                    sortedGroupedBookmarks.selectedCollectionBookmarks || []
                  }
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onReorder={onReorder}
                />
              )}
            </div>
          )}

          {/* 하위 컬렉션 북마크 모바일 뷰 */}
          <AnimatePresence>
            {!showSubCollections && hasSubCollections && (
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
                        count: groupedBookmarks?.groupedBookmarks?.length || 0,
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
                    {loading
                      ? Array.from({ length: 2 }).map((_, idx) => (
                          <div
                            key={`skeleton-mobile-group-${idx}`}
                            className="space-y-3"
                          >
                            <div className="ml-4 border-l-2 border-purple-200 dark:border-purple-700 pl-4">
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700">
                                <span className="text-lg">📁</span>
                                <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                                  {t("common.loading")}
                                </h3>
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-200 dark:bg-purple-700 text-purple-700 dark:text-purple-300">
                                  {t("common.loading")}
                                </span>
                              </div>
                              <div className="mt-3">
                                <div className="grid grid-cols-5 gap-2 p-3 justify-items-center">
                                  {Array.from({ length: 10 }).map(
                                    (_, iconIdx) => (
                                      <MobileIconSkeleton
                                        key={`skeleton-mobile-group-icon-${idx}-${iconIdx}`}
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      : sortedGroupedBookmarks.groupedBookmarks.map((group) => (
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
              {loading ||
              (sortedGroupedBookmarks.selectedCollectionBookmarks &&
                sortedGroupedBookmarks.selectedCollectionBookmarks.length >
                  0) ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <BookmarkSection
                    bookmarks={
                      sortedGroupedBookmarks.selectedCollectionBookmarks || []
                    }
                    sectionTitle={
                      loading
                        ? undefined
                        : sortedGroupedBookmarks.selectedCollectionName ||
                          undefined
                    }
                    sectionIcon={
                      loading
                        ? undefined
                        : collections.find(
                            (col) =>
                              col.name ===
                              sortedGroupedBookmarks.selectedCollectionName
                          )?.icon
                    }
                    isSubSection={false}
                    isLoading={loading}
                    showSectionSkeleton={true}
                    viewMode={viewMode}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRefreshFavicon={onRefreshFavicon}
                    faviconLoadingStates={faviconLoadingStates}
                    collections={collections}
                    onToggleFavorite={onToggleFavorite}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    movingBookmarkId={movingBookmarkId}
                    moveDirection={moveDirection}
                  />
                </div>
              ) : null}
              {/* 하위 컬렉션 북마크들 */}
              <AnimatePresence>
                {!showSubCollections && hasSubCollections && (
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
                            count:
                              groupedBookmarks?.groupedBookmarks?.length || 0,
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
                {(loading ||
                  (showSubCollections &&
                    sortedGroupedBookmarks.groupedBookmarks &&
                    sortedGroupedBookmarks.groupedBookmarks.length > 0)) && (
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
                      {loading
                        ? Array.from({ length: 2 }).map((_, idx) => (
                            <div key={`skeleton-section-${idx}`}>
                              <BookmarkSection
                                bookmarks={[]}
                                isSubSection={true}
                                isLoading={true}
                                showSectionSkeleton={true}
                                viewMode={viewMode}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onRefreshFavicon={onRefreshFavicon}
                                faviconLoadingStates={faviconLoadingStates}
                                collections={collections}
                                onToggleFavorite={onToggleFavorite}
                                onMoveUp={onMoveUp}
                                onMoveDown={onMoveDown}
                                movingBookmarkId={movingBookmarkId}
                                moveDirection={moveDirection}
                              />
                            </div>
                          ))
                        : (sortedGroupedBookmarks.groupedBookmarks || []).map(
                            (group) => (
                              <BookmarkSection
                                key={group.collectionId}
                                bookmarks={group.bookmarks}
                                sectionTitle={group.collectionName}
                                sectionIcon={
                                  collections.find(
                                    (col) => col.id === group.collectionId
                                  )?.icon
                                }
                                isSubSection={true}
                                isLoading={false}
                                showSectionSkeleton={false}
                                viewMode={viewMode}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onRefreshFavicon={onRefreshFavicon}
                                faviconLoadingStates={faviconLoadingStates}
                                collections={collections}
                                onToggleFavorite={onToggleFavorite}
                                onMoveUp={onMoveUp}
                                onMoveDown={onMoveDown}
                                movingBookmarkId={movingBookmarkId}
                                moveDirection={moveDirection}
                              />
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
};
