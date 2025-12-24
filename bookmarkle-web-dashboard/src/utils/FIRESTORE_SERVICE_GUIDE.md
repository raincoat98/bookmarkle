# Firestore Service Guide

## 개요

`firestoreService.ts`는 signInWithPopup에서 이관된 Firestore 데이터베이스 조작 함수들을 포함합니다.

## 주요 함수들

### 컬렉션 관련

#### `createCollection(collectionData)`
새로운 컬렉션을 생성합니다.

**파라미터:**
```typescript
{
  userId: string;           // 필수: 사용자 ID
  name: string;            // 필수: 컬렉션 이름
  icon?: string;           // 선택: 컬렉션 아이콘 (기본값: "📁")
  description?: string;    // 선택: 컬렉션 설명
  parentId?: string;       // 선택: 상위 컬렉션 ID (하위 컬렉션)
}
```

**반환:** 생성된 컬렉션 ID (string)

**사용 예제:**
```typescript
import { createCollection } from "@/utils/firestoreService";

const collectionId = await createCollection({
  userId: currentUser.uid,
  name: "내 북마크",
  icon: "📚",
  description: "개인 북마크 모음"
});
```

#### `fetchCollections(userId)`
사용자의 모든 컬렉션을 조회합니다.

**파라미터:**
- `userId` (string): 사용자 ID

**반환:** Collection[] 배열

**사용 예제:**
```typescript
import { fetchCollections } from "@/utils/firestoreService";

const collections = await fetchCollections(currentUser.uid);
console.log(`${collections.length}개의 컬렉션을 찾았습니다`);
```

### 북마크 관련

#### `fetchBookmarks(userId, collectionId?)`
북마크를 조회합니다.

**파라미터:**
- `userId` (string): 사용자 ID
- `collectionId?` (string): 특정 컬렉션의 북마크만 조회 (생략시 모든 북마크)

**반환:** Bookmark[] 배열

**사용 예제:**
```typescript
import { fetchBookmarks } from "@/utils/firestoreService";

// 모든 북마크 조회
const allBookmarks = await fetchBookmarks(currentUser.uid);

// 특정 컬렉션의 북마크만 조회
const collectionBookmarks = await fetchBookmarks(
  currentUser.uid,
  "collectionId123"
);
```

#### `saveBookmarkDirect(bookmarkData)`
북마크를 직접 저장합니다.

**주의:** 일반적으로는 `useBookmarkStore`의 `addBookmark()`를 사용하세요. 이 함수는 확장 프로그램이나 외부 소스의 북마크를 저장할 때만 사용합니다.

**파라미터:**
```typescript
{
  userId: string;          // 필수: 사용자 ID
  title: string;          // 필수: 북마크 제목
  url: string;            // 필수: 북마크 URL
  description?: string;   // 선택: 설명
  favicon?: string;       // 선택: 파비콘 URL
  collectionId?: string;  // 선택: 컬렉션 ID
  tags?: string[];        // 선택: 태그 목록
  isFavorite?: boolean;   // 선택: 즐겨찾기 여부
  order?: number;         // 선택: 정렬 순서
}
```

**반환:** 생성된 북마크 ID (string)

**사용 예제:**
```typescript
import { saveBookmarkDirect } from "@/utils/firestoreService";

const bookmarkId = await saveBookmarkDirect({
  userId: currentUser.uid,
  title: "React Documentation",
  url: "https://react.dev",
  favicon: "https://react.dev/favicon.ico",
  tags: ["react", "documentation"],
  isFavorite: true
});
```

### 알림 관련

#### `createNotification(userId, type, message, bookmarkId?)`
알림을 생성합니다.

**파라미터:**
- `userId` (string): 사용자 ID
- `type` (string): 알림 타입 (`bookmark_added`, `bookmark_updated`, `bookmark_deleted` 등)
- `message` (string): 알림 메시지
- `bookmarkId?` (string): 관련 북마크 ID

**반환:** 생성된 알림 ID (string | null)

**사용 예제:**
```typescript
import { createNotification } from "@/utils/firestoreService";

const notificationId = await createNotification(
  currentUser.uid,
  "bookmark_added",
  '"React 공식 문서" 북마크가 추가되었습니다',
  "bookmarkId123"
);
```

#### `getUserNotificationSettings(uid)`
사용자의 알림 설정을 가져옵니다.

**파라미터:**
- `uid` (string): 사용자 ID

**반환:**
```typescript
{
  notifications: boolean;           // 전체 알림 활성화 여부
  systemNotifications: boolean;     // 시스템 알림 활성화 여부
  bookmarkNotifications: boolean;   // 북마크 알림 활성화 여부
}
```

**사용 예제:**
```typescript
import { getUserNotificationSettings } from "@/utils/firestoreService";

const settings = await getUserNotificationSettings(currentUser.uid);
if (settings.bookmarkNotifications) {
  // 북마크 알림 활성화됨
}
```

## 기존 방식과의 차이점

### 이전 (signInWithPopup에서)
```javascript
// Extension과의 postMessage 통신으로 데이터 처리
window.parent.postMessage(JSON.stringify({
  type: "BOOKMARK_SAVED",
  bookmarkId: id
}), PARENT_ORIGIN);
```

### 현재 (Web Dashboard)
```typescript
// 직접 함수 호출로 처리
import { useBookmarkStore } from "@/stores/bookmarkStore";

const bookmarkStore = useBookmarkStore();
const bookmarkId = await bookmarkStore.addBookmark(bookmarkData, userId);
```

## 통합 예제

### 완전한 북마크 추가 워크플로우

```typescript
import { useBookmarkStore } from "@/stores/bookmarkStore";
import { useAuthStore } from "@/stores/authStore";
import { createNotification } from "@/utils/firestoreService";

async function addNewBookmark() {
  const authStore = useAuthStore();
  const bookmarkStore = useBookmarkStore();

  if (!authStore.user) {
    throw new Error("User not authenticated");
  }

  try {
    // 1. 북마크 추가
    const bookmarkId = await bookmarkStore.addBookmark(
      {
        title: "My Bookmark",
        url: "https://example.com",
        description: "A great website",
        collection: selectedCollectionId,
        tags: ["example", "bookmark"],
      },
      authStore.user.uid
    );

    // 2. 알림 생성 (필요시)
    try {
      await createNotification(
        authStore.user.uid,
        "bookmark_added",
        "새로운 북마크가 추가되었습니다",
        bookmarkId
      );
    } catch (notificationError) {
      console.warn("Failed to create notification:", notificationError);
      // 알림 생성 실패는 무시하고 계속 진행
    }

    return bookmarkId;
  } catch (error) {
    console.error("Failed to add bookmark:", error);
    throw error;
  }
}
```

## 마이그레이션 체크리스트

- [x] 함수 추출 및 TypeScript로 변환
- [x] 웹 대시보드 유틸리티로 통합
- [x] 기존 Import 정리 (signInWithPopup.js)
- [ ] 기존 코드에서 이 새로운 서비스 사용으로 변경
- [ ] 테스트 및 검증

## 주의사항

1. **Authentication 확인**: 모든 함수를 호출하기 전에 `auth.currentUser`가 존재하는지 확인하세요.

2. **Error Handling**: 각 함수는 에러를 throw할 수 있으므로 try-catch로 감싸세요.

3. **bookmarkStore 사용**: 북마크 추가/수정은 가능하면 `useBookmarkStore`를 사용하세요. `saveBookmarkDirect`는 특수한 경우(API 연동, 배치 작업 등)에만 사용하세요.

4. **알림 설정 확인**: `createNotification`은 사용자의 알림 설정을 자동으로 확인합니다. 알림이 비활성화되면 `null`을 반환합니다.

5. **컬렉션 ID 검증**: 북마크 저장 시 collectionId가 유효한지 확인하세요.
