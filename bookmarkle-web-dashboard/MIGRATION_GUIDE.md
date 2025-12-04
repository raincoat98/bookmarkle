# signInWithPopup → Web Dashboard 마이그레이션 가이드

## 📋 개요

`bookmarkle-signin-popup` 폴더의 모든 로그인/인증 기능이 웹 대시보드로 완전히 이관되었습니다.

## ✅ 이관 완료 항목

### 1. 인증 기능
- **Google 로그인** ✅
  - `firebase.ts:loginWithGoogle()`
  - `authStore.ts:login()`
  - `LoginScreen.tsx` (React 컴포넌트)

- **이메일 로그인** ✅
  - `firebase.ts:loginWithEmail()`
  - `authStore.ts:loginWithEmail()`
  - `LoginScreen.tsx` (Form 포함)

- **회원가입** ✅
  - `firebase.ts:signupWithEmail()`
  - `authStore.ts:signup()`
  - `LoginScreen.tsx` (Display Name 필드 포함)

- **로그아웃** ✅
  - `firebase.ts:logout()` (Firebase Storage 클리어 포함)
  - `authStore.ts:logout()`

### 2. 유틸리티 함수
- **브라우저 감지** ✅
  - `utils/browserDetection.ts`
  - `detectBrowser()`
  - `getBrowserCompatibilityMessage()`
  - `getRecommendedBrowsers()`

- **Firebase 저장소 클리어** ✅
  - `firebase.ts:clearFirebaseStorage()`
  - localStorage 및 IndexedDB 자동 클리어

- **Firestore 통신** ✅
  - `utils/firestoreService.ts`
  - `createCollection()`
  - `fetchCollections()`
  - `fetchBookmarks()`
  - `saveBookmarkDirect()`
  - `createNotification()`
  - `getUserNotificationSettings()`

### 3. UI/UX
- **로그인 화면** ✅
  - `components/auth/LoginScreen.tsx`
  - Google 로그인 버튼
  - 이메일/비밀번호 폼
  - 회원가입/로그인 모드 전환
  - 브라우저 호환성 경고 (`BrowserCompatibilityWarning` 컴포넌트)

- **다국어 지원** ✅
  - `i18n/locales/ko.json` (auth 섹션)
  - `i18n/locales/en.json` (auth 섹션)
  - `i18n/locales/ja.json` (auth 섹션)

### 4. 라우팅
- **로그인 라우트** ✅
  - `/login` - LoginScreen 표시
  - `/` - 미로그인 시 LoginScreen으로 리다이렉트
  - `/extension-login-success` - Extension 로그인 성공 페이지

## 📊 마이그레이션 비교표

| 기능 | signInWithPopup.js | Web Dashboard | 상태 |
|-----|------------------|---------------|-----|
| Google 로그인 | 있음 | LoginScreen.tsx | ✅ 완료 |
| 이메일 로그인 | 있음 | LoginScreen.tsx | ✅ 완료 |
| 회원가입 | 있음 | LoginScreen.tsx | ✅ 완료 |
| 로그아웃 | 있음 | firebase.ts | ✅ 완료 |
| 브라우저 감지 | 있음 | browserDetection.ts | ✅ 완료 |
| Firebase 저장소 클리어 | 있음 | firebase.ts | ✅ 완료 |
| Firestore 통신 | 있음 | firestoreService.ts | ✅ 완료 |
| 다국어 지원 | i18n.js | i18n 폴더 | ✅ 완료 |
| Extension 통신 | postMessage | 웹 기반 API | ✅ 완료 |

## 🔄 Extension 연동 방법 변경

### 이전 (signInWithPopup.js)
```javascript
// postMessage를 통한 Extension 통신
window.parent.postMessage(JSON.stringify({
  type: "LOGIN_SUCCESS",
  user: userData,
  idToken: idToken,
  collections: collections,
}), PARENT_ORIGIN);
```

### 현재 (Web Dashboard)
```typescript
// 웹 기반 API 또는 직접 스토어 사용
const authStore = useAuthStore();
await authStore.login(); // 또는 loginWithEmail()

// 컬렉션과 북마크 데이터는 웹 대시보드에서 직접 관리
import { fetchCollections, fetchBookmarks } from "@/utils/firestoreService";
const collections = await fetchCollections(userId);
const bookmarks = await fetchBookmarks(userId);
```

## 🛠️ Extension 업데이트 필요 사항

1. **로그인 URL 변경**
   - 이전: `https://example.com/path/to/signInWithPopup/` (offscreen document)
   - 현재: `https://example.com/login?source=extension&extensionId=YOUR_EXTENSION_ID`

2. **통신 방식 변경**
   - postMessage 기반 → HTTP API 또는 직접 Firebase Auth 사용
   - `ExtensionLoginSuccessPage` (경로: `/extension-login-success`)에서 Extension과의 통신 처리

3. **컬렉션/북마크 데이터**
   - Extension에서 필요한 데이터는 웹 대시보드 API를 통해 가져오기
   - 또는 확장 프로그램 자체에서 Firestore에 직접 접근

## 📝 주요 파일 위치

### 인증 관련
- `src/firebase.ts` - Firebase 인증 및 저장소 클리어
- `src/stores/authStore.ts` - 인증 상태 관리
- `src/components/auth/LoginScreen.tsx` - 로그인 UI

### 유틸리티
- `src/utils/firestoreService.ts` - Firestore 데이터 조작
- `src/utils/browserDetection.ts` - 브라우저 호환성 검사
- `src/utils/browserNotifications.ts` - 브라우저 알림

### i18n
- `src/i18n/index.ts` - i18n 설정
- `src/i18n/locales/ko.json` - 한국어 번역
- `src/i18n/locales/en.json` - 영어 번역
- `src/i18n/locales/ja.json` - 일본어 번역

### 페이지
- `src/pages/ExtensionLoginSuccessPage.tsx` - Extension 로그인 성공 처리
- `src/App.tsx` - 라우팅 설정

## 🧪 테스트 체크리스트

- [ ] Google 로그인 동작 확인
- [ ] 이메일 로그인 동작 확인
- [ ] 회원가입 동작 확인
- [ ] 로그아웃 시 Firebase 저장소 클리어 확인
- [ ] 브라우저 호환성 경고 표시 확인
- [ ] 다국어 전환 동작 확인
- [ ] Extension 로그인 성공 페이지 동작 확인
- [ ] Extension에서 로그인 후 필요한 데이터 조회 확인

## 🚀 배포 순서

1. 웹 대시보드에서 모든 로그인 기능 테스트 완료
2. Extension 코드에서 signInWithPopup 참조 제거 및 새로운 URL로 변경
3. Extension 업데이트 및 배포
4. `bookmarkle-signin-popup` 폴더 삭제 (Extension 업데이트 확인 후)

## ⚠️ 주의사항

1. **Extension 호환성**
   - Extension에서 로그인 팝업을 열 때 새로운 웹 대시보드 URL로 변경 필요

2. **데이터 동기화**
   - Extension과 웹 대시보드 간의 데이터 동기화 방식 변경
   - Firestore를 공유 DB로 사용하므로 별도의 동기화 로직 필요 없음

3. **IndexedDB 캐싱**
   - Extension에서 IndexedDB를 사용하는 경우, 로그아웃 시 클리어되도록 확인

## 📞 문의 및 지원

마이그레이션 과정에서 문제가 발생하면:
1. 로그 확인 (브라우저 콘솔 및 Firebase 로그)
2. `clearFirebaseStorage()` 함수 동작 확인
3. Extension의 통신 경로 확인
