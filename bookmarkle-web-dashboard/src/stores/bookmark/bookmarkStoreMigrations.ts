import { writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { getFaviconUrl } from "../../utils/favicon";
import type { BookmarkActions, BookmarkStoreGet } from "./bookmarkStoreTypes";
import { bookmarkDocRef } from "./bookmarkStoreHelpers";

type BookmarkMigrationActions = Pick<
  BookmarkActions,
  "migrateFavicons" | "migrateIsFavorite"
>;

export const createBookmarkMigrations = (
  get: BookmarkStoreGet
): BookmarkMigrationActions => ({
  migrateFavicons: async (userId: string) => {
    if (!userId) return;

    const { rawBookmarks } = get();
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const bookmark of rawBookmarks) {
      if (!bookmark.favicon && bookmark.url) {
        try {
          const faviconUrl = getFaviconUrl(bookmark.url);
          batch.update(bookmarkDocRef(bookmark.id), { favicon: faviconUrl });
          updatedCount++;
        } catch (error) {
          console.error(
            `북마크 ${bookmark.id}의 파비콘 마이그레이션 실패:`,
            error
          );
        }
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`${updatedCount}개의 북마크 파비콘이 마이그레이션되었습니다.`);
    }
  },

  migrateIsFavorite: async (userId: string) => {
    if (!userId) return;

    const { rawBookmarks } = get();
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const bookmark of rawBookmarks) {
      if (bookmark.isFavorite === undefined) {
        try {
          batch.update(bookmarkDocRef(bookmark.id), { isFavorite: false });
          updatedCount++;
        } catch (error) {
          console.error(
            `북마크 ${bookmark.id}의 isFavorite 마이그레이션 실패:`,
            error
          );
        }
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(
        `${updatedCount}개의 북마크 isFavorite 필드가 마이그레이션되었습니다.`
      );
    }
  },
});
