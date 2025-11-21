import React, { useState, useEffect } from "react";
import { Settings } from "../components/Settings";
import { useAuthStore, useBookmarkStore, useCollectionStore } from "../stores";
import type { Bookmark, Collection } from "../types";
import { Drawer } from "../components/layout/Drawer";
import type { ImportPreviewData } from "../hooks/useSettings";

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    rawBookmarks,
    addBookmark,
    deleteBookmark,
    subscribeToBookmarks,
    setSelectedCollection: setBookmarkSelectedCollection,
    setCollections: setBookmarkCollections,
  } = useBookmarkStore();
  const { collections, addCollection, deleteCollection, fetchCollections } =
    useCollectionStore();
  const [isRestoring, setIsRestoring] = useState(false);

  // 북마크 스토어 상태 동기화 (설정 페이지는 "all" 컬렉션 사용)
  useEffect(() => {
    setBookmarkSelectedCollection("all");
    setBookmarkCollections(collections);
  }, [collections, setBookmarkSelectedCollection, setBookmarkCollections]);

  // 컬렉션 데이터 가져오기
  useEffect(() => {
    if (user?.uid) {
      fetchCollections(user.uid);
    }
  }, [user?.uid, fetchCollections]);

  // 북마크 구독 설정
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToBookmarks(user.uid);
      return unsubscribe;
    }
  }, [user?.uid, subscribeToBookmarks]);

  // 데이터 가져오기 함수
  const handleImportData = async (importData: ImportPreviewData) => {
    try {
      // 북마크 데이터 가져오기
      if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
        for (const bookmark of importData.bookmarks) {
          // 기존 북마크와 중복되지 않는 경우에만 추가
          const existingBookmark = rawBookmarks.find(
            (b) => b.url === bookmark.url
          );
          if (!existingBookmark) {
            await addBookmark(
              {
                title: (bookmark.title as string) || "",
                url: (bookmark.url as string) || "",
                description: (bookmark.description as string) || "",
                favicon: (bookmark.favicon as string) || "",
                collection: (bookmark.collection as string) || "",
                tags: (bookmark.tags as string[]) || [],
                isFavorite: (bookmark.isFavorite as boolean) || false,
              },
              user?.uid || ""
            );
          }
        }
      }

      // 컬렉션 데이터 가져오기
      if (importData.collections && Array.isArray(importData.collections)) {
        for (const collection of importData.collections) {
          // 기존 컬렉션과 중복되지 않는 경우에만 추가
          const existingCollection = collections.find(
            (c) => c.name === collection.name
          );
          if (!existingCollection) {
            await addCollection(
              {
                name: (collection.name as string) || "",
                description: (collection.description as string) || "",
                icon: (collection.icon as string) || "Folder",
                parentId: (collection.parentId as string) || null,
              },
              user?.uid || ""
            );
          }
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  };

  // 데이터 복원 함수
  const handleRestoreBackup = async (backupData: {
    bookmarks: Bookmark[];
    collections: Collection[];
  }) => {
    // 중복 복원 방지
    if (isRestoring) {
      console.log("이미 복원 중입니다.");
      return;
    }

    try {
      setIsRestoring(true);
      console.log("백업 복원 시작:", backupData);

      // 기존 데이터 전체 삭제
      console.log("기존 데이터 삭제 중...");
      for (const bookmark of rawBookmarks) {
        if (bookmark.id) await deleteBookmark(bookmark.id);
      }
      for (const collection of collections) {
        if (collection.id)
          await deleteCollection(collection.id, user?.uid || "");
      }

      // 컬렉션 ID 매핑을 위한 맵 생성
      const collectionIdMap = new Map<string, string>();

      // 1단계: 컬렉션 먼저 복원 (부모 컬렉션부터)
      if (backupData.collections && Array.isArray(backupData.collections)) {
        console.log("컬렉션 복원 중...");

        // 부모 컬렉션을 먼저 복원하기 위해 정렬
        const sortedCollections = [...backupData.collections].sort((a, b) => {
          // parentId가 null이거나 undefined인 컬렉션을 먼저
          if (!a.parentId && b.parentId) return -1;
          if (a.parentId && !b.parentId) return 1;
          return 0;
        });

        for (const collection of sortedCollections) {
          // 부모 컬렉션의 새 ID로 매핑
          const newParentId = collection.parentId
            ? collectionIdMap.get(collection.parentId) || null
            : null;

          const newCollectionId = await addCollection(
            {
              name: collection.name,
              description: collection.description ?? "",
              icon: collection.icon ?? "Folder",
              parentId: newParentId,
            },
            user?.uid || ""
          );

          // 원본 ID와 새 ID 매핑 저장
          if (collection.id) {
            collectionIdMap.set(collection.id, newCollectionId);
            console.log(
              `컬렉션 ID 매핑: ${collection.id} -> ${newCollectionId} (${collection.name})`
            );
          }
        }
      }

      // 2단계: 북마크 복원 (컬렉션 ID 매핑 적용)
      if (backupData.bookmarks && Array.isArray(backupData.bookmarks)) {
        console.log("북마크 복원 중...");

        for (const bookmark of backupData.bookmarks) {
          // 컬렉션 ID 매핑 적용
          const newCollectionId = bookmark.collection
            ? collectionIdMap.get(bookmark.collection) || null
            : null;

          await addBookmark(
            {
              title: bookmark.title,
              url: bookmark.url,
              description: bookmark.description ?? "",
              favicon: bookmark.favicon,
              collection: newCollectionId ?? "",
              tags: bookmark.tags ?? [],
              isFavorite: bookmark.isFavorite ?? false,
              order: bookmark.order ?? 0,
            },
            user?.uid || ""
          );
        }
      }

      console.log("백업 복원 완료");
    } catch (error) {
      console.error("Restore error:", error);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            로그인이 필요합니다
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            설정을 변경하려면 먼저 로그인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Drawer>
      <Settings
        onBack={() => window.history.back()}
        onImportData={handleImportData}
        onRestoreBackup={handleRestoreBackup}
        isRestoring={isRestoring}
      />
    </Drawer>
  );
};
