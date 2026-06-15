import type { User } from "firebase/auth";
import toast from "react-hot-toast";
import { getCurrentFlags } from "../stores";
import { isUserEarly } from "./earlyUser";
import { FREE_PLAN_LIMITS } from "../constants/planLimits";
import type { Collection } from "../types";

// 무제한 접근 가능 여부
// - 베타 모드: 모든 사용자 무제한
// - 얼리 유저: 평생 무료 프리미엄 혜택
// - (추후) Firestore subscription 활성 사용자
export function hasUnlimitedAccess(user: User | null | undefined): boolean {
  if (getCurrentFlags().beta) return true;
  if (isUserEarly(user)) return true;
  return false;
}

export type GateResult = { ok: true } | { ok: false; reason: string };

export function gateAddBookmark(
  user: User | null | undefined,
  currentCount: number
): GateResult {
  if (hasUnlimitedAccess(user)) return { ok: true };
  if (currentCount >= FREE_PLAN_LIMITS.bookmarks) {
    return {
      ok: false,
      reason: `무료 플랜은 북마크 ${FREE_PLAN_LIMITS.bookmarks}개까지 저장할 수 있어요.`,
    };
  }
  return { ok: true };
}

export function gateAddSubCollection(
  user: User | null | undefined,
  parentId: string | null | undefined,
  collections: Collection[]
): GateResult {
  if (!parentId) return { ok: true }; // 루트 컬렉션은 제한 없음
  if (hasUnlimitedAccess(user)) return { ok: true };
  const siblingCount = collections.filter((c) => c.parentId === parentId).length;
  if (siblingCount >= FREE_PLAN_LIMITS.subCollections) {
    return {
      ok: false,
      reason: `무료 플랜은 부모 컬렉션 당 하위 컬렉션을 ${FREE_PLAN_LIMITS.subCollections}개까지 만들 수 있어요.`,
    };
  }
  return { ok: true };
}

export function canBackup(user: User | null | undefined): boolean {
  return hasUnlimitedAccess(user);
}

// 한도 도달 토스트 (업그레이드 안내 포함)
export function showLimitToast(reason: string): void {
  toast.error(`${reason} 프리미엄으로 업그레이드하면 무제한 이용할 수 있어요.`, {
    duration: 5000,
  });
}
