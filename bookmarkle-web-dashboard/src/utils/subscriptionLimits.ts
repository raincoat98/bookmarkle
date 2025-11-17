import type { SubscriptionPlan, UserLimits } from "../types";

/**
 * 플랜별 제한 설정
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, UserLimits> = {
  free: {
    maxBookmarks: 100, // 무료 플랜: 300~500개 (500으로 설정)
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
 */
export function getUserLimits(plan: SubscriptionPlan = "free"): UserLimits {
  return PLAN_LIMITS[plan];
}

/**
 * 북마크 개수 제한 체크
 */
export function checkBookmarkLimit(
  currentCount: number,
  plan: SubscriptionPlan = "free"
): { allowed: boolean; limit: number; remaining: number } {
  const limits = getUserLimits(plan);
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
  const limits = getUserLimits(plan);
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
  const limits = getUserLimits(plan);
  return limits[feature] === true;
}
