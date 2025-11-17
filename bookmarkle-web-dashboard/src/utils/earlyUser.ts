import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// 베타 종료일 (정식 오픈 예정일)
// 이 날짜 이전에 가입한 사용자는 얼리유저로 간주
export const BETA_END_DATE = new Date("2025-12-31"); // 실제 날짜로 변경 필요

/**
 * 사용자가 얼리유저인지 확인
 * @param userId 사용자 ID
 * @returns 얼리유저 여부
 */
export async function isEarlyUser(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const createdAt = userData.createdAt?.toDate();

    if (!createdAt) {
      return false;
    }

    // 베타 종료일 이전에 가입한 사용자는 얼리유저
    return createdAt < BETA_END_DATE;
  } catch (error) {
    console.error("얼리유저 확인 실패:", error);
    return false;
  }
}

/**
 * 얼리유저에게 적용되는 제한 (영구 무료)
 * 얼리유저는 무료 플랜이지만 제한이 없거나 완화됨
 */
export const EARLY_USER_LIMITS = {
  maxBookmarks: Infinity, // 무제한
  maxCollections: Infinity, // 무제한
  maxBackupsPerWeek: 7, // 일 1회 = 주 7회
  canUseAdvancedSearch: true,
  canExportData: true,
  canUseCustomTheme: true,
  canRestoreDeletedBookmarks: true,
  canShareBookmarks: true,
  canUseAllWidgets: true,
};

