// 정식 오픈 후 적용될 플랜 제한
// 베타 기간 동안은 모두 무제한이며, 정식 오픈 시 무료 플랜에 적용 예정

export const FREE_PLAN_LIMITS = {
  bookmarks: 500,
  subCollections: 1, // 부모 컬렉션 당 하위 컬렉션 개수
} as const;

export type BillingCycle = "monthly" | "yearly";

export interface PremiumPricing {
  amount: number; // 결제 금액 (원)
  perMonth: number; // 월 환산 (연결제 비교용)
  label: string;
  periodLabel: string;
  badge?: string;
}

const MONTHLY_PRICE = 4900;
const YEARLY_PRICE = 49000; // 약 2개월 무료 (49000 / 12 ≈ 4083)
const YEARLY_PER_MONTH = Math.round(YEARLY_PRICE / 12);
const YEARLY_DISCOUNT_PERCENT = Math.round(
  ((MONTHLY_PRICE * 12 - YEARLY_PRICE) / (MONTHLY_PRICE * 12)) * 100
);

export const PREMIUM_PRICING: Record<BillingCycle, PremiumPricing> = {
  monthly: {
    amount: MONTHLY_PRICE,
    perMonth: MONTHLY_PRICE,
    label: "월 결제",
    periodLabel: "/월",
  },
  yearly: {
    amount: YEARLY_PRICE,
    perMonth: YEARLY_PER_MONTH,
    label: "연 결제",
    periodLabel: "/년",
    badge: `${YEARLY_DISCOUNT_PERCENT}% 할인`,
  },
};

export const formatKRW = (amount: number): string =>
  `₩${amount.toLocaleString("ko-KR")}`;

// 플랜 카드 표시용 피처 리스트
export const FREE_PLAN_FEATURES: string[] = [
  `북마크 ${FREE_PLAN_LIMITS.bookmarks}개 (베타 기간 중 무제한)`,
  `하위 컬렉션 ${FREE_PLAN_LIMITS.subCollections}개 (베타 기간 중 무제한)`,
  "기본 검색",
];

export const PREMIUM_PLAN_FEATURES: string[] = [
  "북마크 무제한",
  "하위 컬렉션 무제한",
  "자동 백업·복원",
  "고급 검색·필터",
  "추후 기능 우선 제공",
];
