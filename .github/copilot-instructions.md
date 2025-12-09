# Bookmarkle - AI Coding Agent Instructions

북마클은 Chrome Extension(MV3)과 React 웹 대시보드를 Firebase로 연결하는 통합 북마크 관리 시스템입니다.

## 프로젝트 구조

```
bookmarkle/
├── bookmarkle-browser-extension/   # Chrome MV3 확장 (Vanilla JS)
├── bookmarkle-web-dashboard/       # React 19 + TypeScript + Vite 웹앱
├── build.sh, dev.sh, deploy.sh     # 통합 빌드/배포 스크립트
└── firestore.rules                 # Firebase 보안 규칙
```

**핵심 아키텍처**: Extension의 background.js는 DOM 접근 불가하므로 offscreen.js를 통해 iframe으로 Firebase 인증 처리. iframe은 `postMessage`로 offscreen과 통신, offscreen은 `chrome.runtime.sendMessage`로 background와 통신하는 3-tier 구조.

## 개발 워크플로우

```bash
# 전체 빌드: ./build.sh all
# 개발 서버: ./dev.sh dashboard
# 배포: ./deploy.sh dashboard "메시지"
```

**중요**: Extension은 `build.sh my-extension`으로 빌드 후 Chrome에 수동 로드. Web은 Firebase Hosting으로 자동 배포.

## Chrome Extension (MV3) 패턴

### 메시지 전달 체인
```javascript
// background.js → offscreen.js
await chrome.runtime.sendMessage({ type: "START_POPUP_AUTH" });

// offscreen.js → iframe (postMessage)
iframe.contentWindow.postMessage({ initAuth: true }, origin);

// iframe → offscreen.js (window.addEventListener)
window.addEventListener("message", (ev) => {
  if (ev.data.type === "LOGIN_SUCCESS") { /* handle */ }
});
```

**비동기 응답 필수**: `chrome.runtime.onMessage.addListener`에서 `return true`로 비동기 응답 활성화.

### Offscreen Document 초기화
```javascript
// background.js
await ensureOffscreenDocument();  // offscreen.html 생성 확인
await waitForOffscreenReady();    // OFFSCREEN_READY 메시지 대기
```

**주의**: Service Worker는 이벤트 기반이므로 상태는 `chrome.storage.local`에 저장. `localStorage` 사용 불가.

## React 웹 대시보드 패턴

### State Management (Zustand)
```typescript
// stores/authStore.ts - 전역 상태
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  // ...
}));

// 컴포넌트에서 사용
const { user, setUser } = useAuthStore();
```

**패턴**: 각 도메인별 store 분리 (authStore, bookmarkStore, collectionStore, themeStore 등). Firebase 연동은 store의 액션 메서드에서 처리.

### Firebase 연동
```typescript
// firebase.ts - 중앙화된 Firebase 설정
export const auth = getAuth(app);
export const db = getFirestore(app);

// 사용자 데이터 저장 패턴
await setDoc(doc(db, "users", user.uid), userData, { merge: true });
```

**보안 규칙**: `firestore.rules`에서 `isOwner(userId)`, `isAdmin()` 함수로 접근 제어. 모든 데이터는 `userId` 필드로 소유권 확인.

### 컴포넌트 구조
```typescript
// 1. Import 순서: React → 외부 라이브러리 → 내부 컴포넌트 → API → Store → Style → Type
// 2. 타입 정의 (Props, State)
// 3. 컴포넌트 정의
// 4. Hooks (useState → useEffect → 커스텀 훅)
// 5. 이벤트 핸들러
// 6. 렌더 로직 (early return)
// 7. JSX 반환
```

### i18n 다국어 지원
```typescript
import { useTranslation } from "react-i18next";
const { t } = useTranslation();

// 사용: {t("key.path")}
// 언어 파일: src/i18n/locales/{ko,en,ja}.json
```

**기본 언어**: 한국어 (ko). `localStorage`에 언어 설정 저장.

## Git Commit 규칙

```
<타입>(<범위>): <제목>

<본문>

Jira: BMK-123
```

**타입**: `feat`, `fix`, `style`(UI/CSS), `refactor`, `perf`, `test`, `docs`, `chore`, `build`

**범위**: 
- 공통: `firebase`, `api`, `utils`, `types`, `config`
- Extension: `background`, `popup`, `offscreen`, `manifest`
- Dashboard: `components`, `pages`, `hooks`, `store`, `router`, `styles`

**예시**: 
```
feat(dashboard/components): 북마크 드래그 앤 드롭 구현

@dnd-kit/sortable을 이용한 순서 변경 기능 추가

Jira: BMK-45
```

## 배포 프로세스

1. **Web Dashboard**: `./deploy.sh dashboard "메시지"` → Firebase Hosting 자동 배포
2. **Extension**: `./build.sh my-extension` → `build/` 폴더에 ZIP 생성 → Chrome Web Store 수동 업로드

**환경변수**: 
- Dashboard: `bookmarkle-web-dashboard/.env.local` (VITE_FIREBASE_*)
- Extension: `bookmarkle-browser-extension/config.js` (빌드 시 inject-config.sh로 주입)

## 공통 주의사항

- **타입 안전성**: TypeScript strict mode 사용. `any` 금지, `unknown` 선호
- **에러 처리**: Firebase 작업은 항상 try-catch. 사용자에게 `react-hot-toast`로 피드백
- **성능**: 북마크 리스트는 가상화 또는 페이지네이션. Firestore 쿼리는 인덱스 확인 (`firestore.indexes.json`)
- **CSS**: Tailwind CSS 사용. 커스텀 스타일은 `module.css`로 스코핑
- **테마**: `themeStore`로 다크/라이트 모드 관리. `localStorage`에 persists

## 디버깅

- **Extension**: `chrome://extensions` → 확장 프로그램 → 검사(Service Worker, Popup)
- **Offscreen 통신**: background.js와 offscreen.js 로그를 동시에 확인 (타이밍 이슈 주의)
- **Firebase**: Firestore 콘솔에서 규칙 시뮬레이터로 보안 규칙 테스트
