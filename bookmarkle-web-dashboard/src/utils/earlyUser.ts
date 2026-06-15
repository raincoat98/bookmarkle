import type { User } from "firebase/auth";

// 이 날짜 이전 가입자는 얼리 유저로 간주
export const BETA_END_DATE = new Date("2025-12-31");

export function isUserEarly(user: User | null | undefined): boolean {
  const created = user?.metadata?.creationTime;
  if (!created) return false;
  const createdDate = new Date(created);
  if (Number.isNaN(createdDate.getTime())) return false;
  return createdDate < BETA_END_DATE;
}
