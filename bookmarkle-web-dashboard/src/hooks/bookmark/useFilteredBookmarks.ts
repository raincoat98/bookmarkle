import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Bookmark, Collection } from "../../types";

export type FilteredBookmarksData =
  | {
      isGrouped: true;
      selectedCollectionBookmarks: Bookmark[];
      selectedCollectionName: string;
      groupedBookmarks: {
        collectionId: string;
        collectionName: string;
        bookmarks: Bookmark[];
      }[];
    }
  | {
      isGrouped: false;
      bookmarks: Bookmark[];
    };

export const useFilteredBookmarks = (
  bookmarks: Bookmark[],
  searchTerm: string,
  selectedCollection: string,
  selectedTag: string | null,
  collections: Collection[]
): FilteredBookmarksData => {
  const { t } = useTranslation();

  const getChildCollectionIds = useCallback(
    (parentId: string): string[] => {
      const childIds: string[] = [];
      const collect = (id: string) => {
        collections
          .filter((col) => col.parentId === id)
          .forEach((child) => {
            childIds.push(child.id);
            collect(child.id);
          });
      };
      collect(parentId);
      return childIds;
    },
    [collections]
  );

  return useMemo(() => {
    const filtered = bookmarks.filter((bookmark) => {
      const matchesSearch = searchTerm
        ? bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bookmark.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bookmark.description &&
            bookmark.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
        : true;

      const matchesTag = selectedTag
        ? bookmark.tags && bookmark.tags.includes(selectedTag)
        : true;

      return matchesSearch && matchesTag;
    });

    if (
      selectedCollection !== "all" &&
      selectedCollection !== "none" &&
      selectedCollection !== "favorites" &&
      selectedCollection
    ) {
      const childIds = getChildCollectionIds(selectedCollection);
      if (childIds.length > 0) {
        const selectedCollectionBookmarks = filtered.filter(
          (b) => b.collection === selectedCollection
        );

        const groupedBookmarks = childIds
          .map((childId) => {
            const child = collections.find((col) => col.id === childId);
            if (!child) return null;
            const childBookmarks = filtered.filter(
              (b) => b.collection === childId
            );
            if (childBookmarks.length === 0) return null;
            return {
              collectionId: childId,
              collectionName: child.name,
              bookmarks: childBookmarks,
            };
          })
          .filter(Boolean) as {
          collectionId: string;
          collectionName: string;
          bookmarks: Bookmark[];
        }[];

        return {
          isGrouped: true as const,
          selectedCollectionBookmarks,
          selectedCollectionName:
            collections.find((col) => col.id === selectedCollection)?.name ||
            t("collections.selectedCollection"),
          groupedBookmarks,
        };
      }
    }

    return { isGrouped: false as const, bookmarks: filtered };
  }, [
    bookmarks,
    searchTerm,
    selectedCollection,
    selectedTag,
    collections,
    getChildCollectionIds,
    t,
  ]);
};
