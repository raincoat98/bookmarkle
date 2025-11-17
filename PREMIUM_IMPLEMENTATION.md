# 💎 프리미엄 구독 시스템 구현 가이드

## ✅ 완료된 작업

### 1. 타입 정의 확장

- ✅ `SubscriptionPlan` 타입 (`free` | `premium`)
- ✅ `SubscriptionStatus` 타입 (`active` | `canceled` | `expired` | `trialing`)
- ✅ `SubscriptionBillingCycle` 타입 (`monthly` | `yearly`)
- ✅ `Subscription` 인터페이스
- ✅ `UserLimits` 인터페이스
- ✅ `FirestoreUser`에 `subscription` 필드 추가

**파일:** `bookmarkle-web-dashboard/src/types/index.ts`

### 2. 구독 제한 유틸리티

- ✅ 플랜별 제한 설정 (`PLAN_LIMITS`)
- ✅ 북마크/컬렉션 개수 제한 체크 함수
- ✅ 프리미엄 기능 사용 가능 여부 체크 함수

**파일:** `bookmarkle-web-dashboard/src/utils/subscriptionLimits.ts`

### 3. 구독 상태 관리 Store

- ✅ `useSubscriptionStore` 생성 (Zustand)
- ✅ Firestore에서 구독 정보 실시간 구독
- ✅ 구독 상태 확인 로직
- ✅ 플랜별 제한 자동 적용

**파일:** `bookmarkle-web-dashboard/src/stores/subscriptionStore.ts`

### 4. App 통합

- ✅ `App.tsx`에 구독 초기화 로직 추가
- ✅ 사용자 로그인 시 자동으로 구독 정보 구독

---

## 📋 다음 단계 구현 가이드

### Phase 1: 기능 제한 로직 구현 (우선순위 높음)

#### 1.1 북마크 추가 시 제한 체크

**위치:** `bookmarkle-web-dashboard/src/components/AddBookmarkModal.tsx`

```typescript
import { useSubscriptionStore } from "../stores";
import { checkBookmarkLimit } from "../utils/subscriptionLimits";

// 북마크 추가 전에 체크
const { plan, limits } = useSubscriptionStore();
const { rawBookmarks } = useBookmarkStore();

const bookmarkLimit = checkBookmarkLimit(rawBookmarks.length, plan);
if (!bookmarkLimit.allowed) {
  // 업그레이드 모달 표시
  setShowUpgradeModal(true);
  return;
}
```

#### 1.2 컬렉션 추가 시 제한 체크

**위치:** `bookmarkle-web-dashboard/src/components/AddCollectionModal.tsx`

```typescript
import { useSubscriptionStore } from "../stores";
import { checkCollectionLimit } from "../utils/subscriptionLimits";

const { plan } = useSubscriptionStore();
const { collections } = useCollectionStore();

const collectionLimit = checkCollectionLimit(collections.length, plan);
if (!collectionLimit.allowed) {
  // 업그레이드 모달 표시
  setShowUpgradeModal(true);
  return;
}
```

#### 1.3 프리미엄 기능 접근 제어

- 고급 검색: `canUseAdvancedSearch` 체크
- 데이터 내보내기: `canExportData` 체크
- 커스텀 테마: `canUseCustomTheme` 체크
- 삭제 북마크 복구: `canRestoreDeletedBookmarks` 체크
- 북마크 공유: `canShareBookmarks` 체크

---

### Phase 2: UI 컴포넌트 구현

#### 2.1 가격 페이지 (`PricingPage.tsx`)

**경로:** `/pricing`

**기능:**

- 무료/프리미엄 플랜 비교 표
- 월간/연간 구독 선택
- Stripe Checkout 연동
- 현재 구독 상태 표시

**구조:**

```
src/pages/PricingPage.tsx
```

#### 2.2 구독 관리 페이지 (`SubscriptionPage.tsx`)

**경로:** `/subscription`

**기능:**

- 현재 구독 상태 표시
- 구독 갱신일 표시
- 업그레이드/다운그레이드 버튼
- 구독 취소 기능
- 결제 내역 (선택사항)

**구조:**

```
src/pages/SubscriptionPage.tsx
```

#### 2.3 업그레이드 모달 (`UpgradeModal.tsx`)

**위치:** 공통 컴포넌트

**기능:**

- 제한 도달 시 자동 표시
- 프리미엄 기능 소개
- 가격 페이지로 이동 버튼

**구조:**

```
src/components/UpgradeModal.tsx
```

#### 2.4 업그레이드 배너 (`UpgradeBanner.tsx`)

**위치:** 헤더 또는 대시보드

**기능:**

- 무료 사용자에게 표시
- 프리미엄 혜택 간단 소개
- 업그레이드 버튼

**구조:**

```
src/components/UpgradeBanner.tsx
```

---

### Phase 3: Stripe 결제 시스템 연동

#### 3.1 Stripe 설정

1. Stripe 계정 생성 및 API 키 발급
2. Firebase Extensions 설치: `firestore-stripe-payments`
3. 환경 변수 설정:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

#### 3.2 결제 플로우

1. 사용자가 가격 페이지에서 구독 선택
2. Stripe Checkout 세션 생성
3. 결제 완료 후 웹훅으로 Firestore 업데이트
4. 사용자 구독 상태 자동 업데이트

#### 3.3 웹훅 처리

- Stripe 웹훅 엔드포인트 설정
- `subscription.created`, `subscription.updated`, `subscription.deleted` 이벤트 처리
- Firestore `users/{userId}/subscription` 업데이트

---

### Phase 4: 프리미엄 전용 기능 구현

#### 4.1 고급 검색

- 태그 필터링
- 도메인 필터링
- 기간 필터링
- URL 패턴 검색

**위치:** `bookmarkle-web-dashboard/src/components/BookmarkSearch.tsx`

#### 4.2 북마크 통계

- 총 북마크 개수
- 컬렉션별 분포
- 태그별 분포
- 최근 추가 추이
- 도메인별 분포

**위치:** `bookmarkle-web-dashboard/src/components/BookmarkStats.tsx`

#### 4.3 삭제 북마크 복구

- 삭제된 북마크 히스토리 저장
- 복구 기능
- 영구 삭제 옵션

**구현:**

- Firestore에 `deletedBookmarks` 컬렉션 추가
- 북마크 삭제 시 히스토리에 저장
- 프리미엄 사용자만 접근 가능

#### 4.4 북마크 공유 기능

- 공유 링크 생성
- 공개/비공개 설정
- 공유 컬렉션 생성

**구현:**

- Firestore에 `sharedBookmarks` 컬렉션 추가
- 공유 링크 생성 및 관리
- 프리미엄 사용자만 접근 가능

#### 4.5 커스텀 테마

- 색상 커스터마이징
- 폰트 설정
- 레이아웃 옵션

**위치:** `bookmarkle-web-dashboard/src/components/settings/ThemeSettings.tsx`

---

### Phase 5: Firestore 보안 규칙 업데이트

#### 5.1 구독 상태 확인 헬퍼 함수

```javascript
function isPremium() {
  return request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.subscription.plan == 'premium' &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.subscription.status == 'active';
}
```

#### 5.2 프리미엄 전용 컬렉션 보호

- `deletedBookmarks`: 프리미엄 사용자만 읽기/쓰기
- `sharedBookmarks`: 프리미엄 사용자만 읽기/쓰기
- `bookmarkStats`: 프리미엄 사용자만 읽기

---

## 🔧 구현 체크리스트

### 필수 기능

- [ ] 북마크 추가 시 제한 체크
- [ ] 컬렉션 추가 시 제한 체크
- [ ] 가격 페이지 (`/pricing`)
- [ ] 구독 관리 페이지 (`/subscription`)
- [ ] 업그레이드 모달
- [ ] Stripe 결제 연동
- [ ] 웹훅 처리

### 프리미엄 기능

- [ ] 고급 검색
- [ ] 북마크 통계
- [ ] 삭제 북마크 복구
- [ ] 북마크 공유
- [ ] 커스텀 테마
- [ ] 전체 위젯 접근

### UI/UX

- [ ] 업그레이드 배너
- [ ] 제한 도달 알림
- [ ] 구독 상태 표시
- [ ] 온보딩 플로우 개선

### 보안

- [ ] Firestore 보안 규칙 업데이트
- [ ] 서버 사이드 검증 (Cloud Functions)
- [ ] 결제 정보 보안

---

## 📊 테스트 계획

### 1. 기능 테스트

- [ ] 무료 사용자 북마크 제한 테스트
- [ ] 무료 사용자 컬렉션 제한 테스트
- [ ] 프리미엄 기능 접근 제어 테스트
- [ ] 구독 상태 변경 테스트

### 2. 결제 테스트

- [ ] Stripe 테스트 모드 결제 테스트
- [ ] 구독 생성 테스트
- [ ] 구독 갱신 테스트
- [ ] 구독 취소 테스트
- [ ] 웹훅 이벤트 처리 테스트

### 3. UI 테스트

- [ ] 가격 페이지 렌더링 테스트
- [ ] 업그레이드 모달 표시 테스트
- [ ] 구독 상태 표시 테스트

---

## 🚀 배포 전 체크리스트

- [ ] Stripe 프로덕션 키 설정
- [ ] 웹훅 엔드포인트 설정
- [ ] Firestore 보안 규칙 배포
- [ ] 환경 변수 설정 확인
- [ ] 결제 플로우 전체 테스트
- [ ] 에러 핸들링 확인
- [ ] 로깅 설정

---

## 📝 참고 자료

### Stripe 연동

- [Stripe Checkout 문서](https://stripe.com/docs/payments/checkout)
- [Firebase Extensions: Stripe Payments](https://github.com/stripe/stripe-firebase-extensions)

### Firestore 보안 규칙

- [Firestore Security Rules 가이드](https://firebase.google.com/docs/firestore/security/get-started)

### 구현 예시

- [Stripe + Firebase 예제](https://github.com/stripe-samples/firebase-subscription-payments)

---

## 💡 다음 작업 권장 순서

1. **업그레이드 모달 구현** - 제한 도달 시 즉시 표시
2. **가격 페이지 구현** - 사용자가 업그레이드할 수 있는 페이지
3. **Stripe 연동** - 실제 결제 시스템 연결
4. **프리미엄 기능 구현** - 사용자에게 가치 제공
