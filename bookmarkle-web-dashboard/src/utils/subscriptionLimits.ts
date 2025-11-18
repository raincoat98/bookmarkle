import type { SubscriptionPlan, UserLimits } from "../types";
import { EARLY_USER_LIMITS, isEarlyUser } from "./earlyUser";

/**
 * 플랜별 제한 설정
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, UserLimits> = {
  free: {
    maxBookmarks: 500, // 무료 플랜: 500개
    maxCollections: 10,
    maxBackupsPerWeek: 1, // 주 1회
    canUseAdvancedSearch: false,
    canExportData: false,
    canUseCustomTheme: false,
    canRestoreDeletedBookmarks: false,
    canShareBookmarks: false,
    canUseAllWidgets: false,
  },
  premium: {
    maxBookmarks: Infinity, // 무제한
    maxCollections: Infinity, // 무제한
    maxBackupsPerWeek: 7, // 일 1회 = 주 7회
    canUseAdvancedSearch: true,
    canExportData: true,
    canUseCustomTheme: true,
    canRestoreDeletedBookmarks: true,
    canShareBookmarks: true,
    canUseAllWidgets: true,
  },
};

/**
 * 사용자의 현재 플랜에 따른 제한 반환
 * @param plan 구독 플랜
 * @param userId 사용자 ID (얼리유저 확인용, 선택적)
 */
export async function getUserLimits(
  plan: SubscriptionPlan = "free",
  userId?: string
): Promise<UserLimits> {
  // 얼리유저는 영구 무료 혜택 (프리미엄과 동일한 제한)
  if (userId) {
    const earlyUser = await isEarlyUser(userId);
    if (earlyUser) {
      return EARLY_USER_LIMITS;
    }
  }
  return PLAN_LIMITS[plan];
}

/**
 * 동기 버전 (얼리유저 확인 없이)
 */
export function getUserLimitsSync(plan: SubscriptionPlan = "free"): UserLimits {
  return PLAN_LIMITS[plan];
}

/**
 * 북마크 개수 제한 체크
 */
export function checkBookmarkLimit(
  currentCount: number,
  plan: SubscriptionPlan = "free"
): { allowed: boolean; limit: number; remaining: number } {
  const limits = getUserLimitsSync(plan);
  const limit = limits.maxBookmarks;
  const remaining = limit === Infinity ? Infinity : limit - currentCount;

  return {
    allowed: limit === Infinity || currentCount < limit,
    limit,
    remaining,
  };
}

/**
 * 컬렉션 개수 제한 체크
 */
export function checkCollectionLimit(
  currentCount: number,
  plan: SubscriptionPlan = "free"
): { allowed: boolean; limit: number; remaining: number } {
  const limits = getUserLimitsSync(plan);
  const limit = limits.maxCollections;
  const remaining = limit === Infinity ? Infinity : limit - currentCount;

  return {
    allowed: limit === Infinity || currentCount < limit,
    limit,
    remaining,
  };
}

/**
 * 프리미엄 기능 사용 가능 여부 체크
 */
export function canUsePremiumFeature(
  feature: keyof Omit<
    UserLimits,
    "maxBookmarks" | "maxCollections" | "maxBackupsPerWeek"
  >,
  plan: SubscriptionPlan = "free"
): boolean {
  const limits = getUserLimitsSync(plan);
  return limits[feature] === true;
}
