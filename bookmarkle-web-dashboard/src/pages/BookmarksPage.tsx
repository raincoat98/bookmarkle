import React from "react";
import { useTranslation } from "react-i18next";
import { Drawer } from "../components/layout/Drawer";
import { BookmarkList } from "../components/bookmarks/BookmarkList";
import { BookmarksTopBar } from "../components/bookmarks/BookmarksTopBar";
import { TagFilter } from "../components/bookmarks/TagFilter";
import { AddBookmarkModal } from "../components/bookmarks/AddBookmarkModal";
import { EditBookmarkModal } from "../components/bookmarks/EditBookmarkModal";
import { DeleteBookmarkModal } from "../components/bookmarks/DeleteBookmarkModal";
import { AddCollectionModal } from "../components/collections/AddCollectionModal";
import { EditCollectionModal } from "../components/collections/EditCollectionModal";
import { DeleteCollectionModal } from "../components/collections/DeleteCollectionModal";
import { DisabledUserMessage } from "../components/common/DisabledUserMessage";
import { UpgradeModal } from "../components/subscription/UpgradeModal";
import { useBookmarksPage } from "../hooks/useBookmarksPage";

export const BookmarksPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    user,
    isActive,
    collections,
    bookmarks,
    limits,
    deferredLoading,
    selectedCollection,
    setSelectedCollection,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    currentSort,
    setCurrentSort,
    isAddModalOpen,
    setIsAddModalOpen,
    editingBookmark,
    setEditingBookmark,
    deleteBookmarkModal,
    setDeleteBookmarkModal,
    isDeletingBookmark,
    editingCollection,
    setEditingCollection,
    showDeleteModal,
    setShowDeleteModal,
    targetCollectionId,
    targetCollectionName,
    deletingCollectionId,
    isAddCollectionModalOpen,
    setIsAddCollectionModalOpen,
    isAddSubCollectionModalOpen,
    setIsAddSubCollectionModalOpen,
    subCollectionParentId,
    setSubCollectionParentId,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeReason,
    filteredBookmarksData,
    bookmarksToDisplay,
    visibleTags,
    handleAddBookmark,
    handleUpdateBookmark,
    handleDeleteBookmark,
    handleToggleFavorite,
    handleRefreshFavicon,
    handleDeleteCollection,
    handleUpdateCollection,
    handleReorderBookmarks,
    handleAddCollection,
    openDeleteCollectionModal,
    openEditCollectionModal,
  } = useBookmarksPage();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("auth.loginRequired")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("auth.loginRequiredDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (isActive === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <DisabledUserMessage />
      </div>
    );
  }

  return (
    <Drawer
      collections={collections}
      selectedCollection={selectedCollection}
      onCollectionChange={setSelectedCollection}
      onDeleteCollectionRequest={openDeleteCollectionModal}
      onEditCollection={openEditCollectionModal}
      onOpenAddCollectionModal={() => setIsAddCollectionModalOpen(true)}
      onOpenAddSubCollectionModal={(parentId) => {
        setSubCollectionParentId(parentId);
        setIsAddSubCollectionModalOpen(true);
      }}
    >
      <div className="flex flex-col min-h-0 bg-gray-50 dark:bg-[#0d0d10]">
        <BookmarksTopBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddCollection={() => setIsAddCollectionModalOpen(true)}
          onAddBookmark={() => setIsAddModalOpen(true)}
        />
        <div className="flex-1 p-4 lg:p-6 w-full min-w-0">
          <BookmarkList
            bookmarks={bookmarksToDisplay}
            onEdit={setEditingBookmark}
            onDelete={(bookmark) =>
              setDeleteBookmarkModal({ isOpen: true, bookmark })
            }
            onToggleFavorite={handleToggleFavorite}
            onReorder={handleReorderBookmarks}
            onRefreshFavicon={handleRefreshFavicon}
            collections={collections}
            searchTerm=""
            viewMode={viewMode}
            currentSort={currentSort}
            onSortChange={setCurrentSort}
            groupedBookmarks={
              filteredBookmarksData.isGrouped ? filteredBookmarksData : undefined
            }
            loading={deferredLoading}
            collectionLabel={
              selectedCollection === "all"
                ? undefined
                : selectedCollection === "favorites"
                ? t("bookmarks.favorites")
                : selectedCollection === "none"
                ? t("collections.noCollection")
                : collections.find((c) => c.id === selectedCollection)?.name
            }
          />
          <TagFilter
            tags={visibleTags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
        </div>
      </div>

      <AddBookmarkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={({ title, url, description, collection, tags, isFavorite }) =>
          handleAddBookmark({
            title,
            url,
            description: description || "",
            collection: collection || "",
            tags,
            isFavorite,
          })
        }
        collections={collections}
      />

      <EditBookmarkModal
        isOpen={!!editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onUpdate={handleUpdateBookmark}
        bookmark={editingBookmark}
        collections={collections}
      />

      <DeleteBookmarkModal
        isOpen={deleteBookmarkModal.isOpen}
        onClose={() => setDeleteBookmarkModal({ isOpen: false, bookmark: null })}
        onDelete={handleDeleteBookmark}
        bookmark={deleteBookmarkModal.bookmark}
        isDeleting={isDeletingBookmark}
      />

      <EditCollectionModal
        isOpen={!!editingCollection}
        onClose={() => {
          setEditingCollection(null);
        }}
        onUpdate={handleUpdateCollection}
        collection={editingCollection}
        collections={collections}
      />

      <DeleteCollectionModal
        isOpen={showDeleteModal}
        collectionName={targetCollectionName}
        isDeleting={deletingCollectionId === targetCollectionId}
        onConfirm={() =>
          targetCollectionId && handleDeleteCollection(targetCollectionId)
        }
        onClose={() => setShowDeleteModal(false)}
      />

      <AddCollectionModal
        isOpen={isAddCollectionModalOpen}
        onClose={() => setIsAddCollectionModalOpen(false)}
        onAdd={handleAddCollection}
      />

      <AddCollectionModal
        isOpen={isAddSubCollectionModalOpen}
        onClose={() => {
          setIsAddSubCollectionModalOpen(false);
          setSubCollectionParentId(null);
        }}
        onAdd={handleAddCollection}
        parentId={subCollectionParentId}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        currentCount={
          upgradeReason === "bookmark_limit"
            ? bookmarks.length
            : upgradeReason === "collection_limit"
            ? collections.length
            : undefined
        }
        limit={
          upgradeReason === "bookmark_limit"
            ? limits.maxBookmarks
            : upgradeReason === "collection_limit"
            ? limits.maxCollections
            : undefined
        }
      />
    </Drawer>
  );
};
