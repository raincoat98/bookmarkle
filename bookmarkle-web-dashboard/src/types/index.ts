import type { Timestamp } from "firebase/firestore";

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  provider?: string;
}

// Firestore에 저장되는 사용자 데이터 타입
export interface FirestoreUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: Timestamp; // serverTimestamp
  updatedAt: Timestamp; // serverTimestamp
  provider: string;
  isActive?: boolean; // 사용자 활성화 상태
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  collection: string | null;
  order: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[]; // 태그 필드 추가
  isFavorite: boolean; // 즐겨찾기 필드 추가
  deletedAt?: Date | null; // 휴지통 기능을 위한 삭제 시간 필드
}

export interface BookmarkFormData {
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  collection: string;
  tags: string[]; // 태그 필드 추가
  isFavorite: boolean; // 즐겨찾기 필드 추가
  order?: number; // 순서 필드 추가
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null; // 하위 컬렉션 지원
  isPinned?: boolean; // 핀 기능 추가
}

export interface CollectionFormData {
  name: string;
  description?: string;
  icon: string;
  parentId: string | null; // 하위 컬렉션 지원
  isPinned?: boolean; // 핀 기능 추가
}

// 기존 하드코딩된 컬렉션 타입은 호환성을 위해 유지
export type LegacyCollection = "all" | "default" | "work" | "personal";

// 정렬 관련 타입 추가
export type SortField =
  | "title"
  | "url"
  | "createdAt"
  | "updatedAt"
  | "isFavorite"
  | "order";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

// 구독 정보 (관리자 페이지에서 Firestore 문서 읽기 전용)
export type SubscriptionPlan = "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "trialing";
export type SubscriptionBillingCycle = "monthly" | "yearly";

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  startDate: Date;
  endDate?: Date;
  cancelAtPeriodEnd?: boolean;
  subscriptionId?: string;
  customerId?: string;
  trialEndDate?: Date;
}

// 관리자 관련 타입
export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  bookmarkCount: number;
  collectionCount: number;
  lastLoginAt?: Date;
  isActive: boolean;
  isEarlyUser: boolean;
  subscription?: Subscription;
}

// 알림 관련 타입
export type NotificationType =
  | "bookmark_added"
  | "bookmark_updated"
  | "bookmark_deleted"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  bookmarkId?: string;
  metadata?: Record<string, unknown>;
}
