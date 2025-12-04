# Extension ↔ Web Dashboard 통신 가이드

## 📌 개요

Chrome Extension과 Web Dashboard 간의 통신을 설정하는 완전한 가이드입니다.

## 🎯 구조

```
┌──────────────────────────────────────────────────────────────┐
│  Chrome Extension                                            │
│  ├─ background.js (메인 로직)                                │
│  └─ offscreen.html/js (Firestore 통신 처리)                 │
│     └─ <iframe> loads PUBLIC_SIGN_URL                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
        postMessage (iframe ↔ parent)
                     │
┌────────────────────▼─────────────────────────────────────────┐
│  Web Dashboard (http://localhost:5173)                       │
│  ├─ /login?source=extension (로그인 페이지)                  │
│  │  └─ LoginScreen.tsx                                       │
│  │     └─ /extension-login-success (리다이렉트)              │
│  └─ /extension-login-success (로그인 완료)                   │
│     └─ ExtensionLoginSuccessPage.tsx                         │
│        └─ postMessage 전송 (user, idToken)                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Step 1: Extension 설정 (config.js)

### 파일 위치
```
bookmarkle-browser-extension/config.js
```

### 개발 환경
```javascript
export const config = {
  PUBLIC_SIGN_URL: "http://localhost:5173/login?source=extension",
  PUBLIC_START_PAGE_URL: "http://localhost:5173/",
};
```

### 프로덕션 환경
```javascript
export const config = {
  PUBLIC_SIGN_URL: "https://yourdomain.com/login?source=extension",
  PUBLIC_START_PAGE_URL: "https://yourdomain.com/",
};
```

**포트 설명:**
- `5173` - Vite 기본 개발 포트
- 웹 대시보드 `package.json`에서 다른 포트로 설정했다면 변경

---

## 📋 Step 2: Web Dashboard 확인

### 로그인 화면 (LoginScreen.tsx)
- ✅ `source=extension` 파라미터 감지
- ✅ 로그인 후 `/extension-login-success`로 자동 리다이렉트

### 로그인 성공 페이지 (ExtensionLoginSuccessPage.tsx)
- ✅ 자동으로 Extension에 postMessage 전송
- ✅ 사용자 정보 + ID Token 포함
- ✅ "대시보드로 가기" / "창 닫기" 버튼 제공

---

## 🔄 통신 흐름

### 1️⃣ Extension 로그인 요청
```javascript
// background.js
chrome.runtime.sendMessage(
  { target: "offscreen", type: "START_POPUP_AUTH" },
  (response) => {
    // 로그인 결과 처리
  }
);
```

### 2️⃣ offscreen.js에서 iframe 로드
```javascript
// offscreen.js
const PUBLIC_SIGN_URL = "http://localhost:5173/login?source=extension";

const iframe = document.createElement("iframe");
iframe.src = PUBLIC_SIGN_URL;  // ← Web Dashboard 로그인 페이지
document.documentElement.appendChild(iframe);
```

### 3️⃣ Web Dashboard 로그인 처리
```typescript
// LoginScreen.tsx
const urlParams = new URLSearchParams(location.search);
if (urlParams.get("source") === "extension") {
  // Extension 요청으로 감지
  // 로그인 후 자동으로 /extension-login-success로 리다이렉트
}
```

### 4️⃣ 로그인 성공 후 Extension으로 데이터 전송
```typescript
// ExtensionLoginSuccessPage.tsx
const sendToExtensionParent = async () => {
  const idToken = await getIdToken();

  window.parent.postMessage({
    type: "LOGIN_SUCCESS",
    user: { uid, email, displayName, photoURL },
    idToken: idToken,
  }, "*");
};
```

### 5️⃣ offscreen.js에서 메시지 수신
```javascript
// offscreen.js
window.addEventListener("message", handleIframeMessage, false);
// 로그인 정보 수신 → background.js에 sendResponse()
```

### 6️⃣ background.js에서 처리
```javascript
// background.js
if (msg.type === "START_POPUP_AUTH") {
  // 로그인 정보 저장
  // Chrome Storage에 저장
  // 응답 반환
}
```

---

## 🔧 데이터 형식

### Extension → Web Dashboard
```javascript
// offscreen.js가 iframe에 전송
iframe.contentWindow.postMessage({
  initAuth: true,  // 로그인 시작 신호
}, origin);
```

### Web Dashboard → Extension
```javascript
// ExtensionLoginSuccessPage.tsx에서 전송
window.parent.postMessage({
  type: "LOGIN_SUCCESS",
  user: {
    uid: "user123",
    email: "user@example.com",
    displayName: "User Name",
    photoURL: "https://...",
  },
  idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6...",  // Firebase ID Token
}, "*");
```

---

## 📝 로그 확인

### Extension 콘솔 확인
```javascript
// background.js에서 로그 확인
chrome.runtime.sendMessage(
  { target: "offscreen", type: "START_POPUP_AUTH" }
);
```

### offscreen 콘솔 확인
```javascript
// offscreen.js의 로그
console.log("SignIn popup iframe loaded successfully");
console.log("Offscreen received message:", msg?.type);
```

### Web Dashboard 콘솔 확인
```javascript
// ExtensionLoginSuccessPage.tsx의 로그
console.log("📤 Sending login data to Extension:", messageData);
```

---

## ⚠️ 트러블슈팅

### 1. iframe이 로드되지 않음

**증상:**
- "Offscreen iframe failed to load" 에러
- 브라우저 콘솔에 CORS 에러

**해결:**
1. PUBLIC_SIGN_URL 확인
   ```javascript
   // 올바른 형식
   "http://localhost:5173/login?source=extension"

   // 잘못된 형식
   "http://localhost:5173/signInWithPopup"  // ❌ 폴더 구조 변경됨
   ```

2. 웹 대시보드 서버 실행 확인
   ```bash
   cd bookmarkle-web-dashboard
   npm run dev
   ```

3. 포트 확인
   ```bash
   # 5173 포트 사용 중인지 확인
   lsof -i :5173
   ```

### 2. 로그인 후 Extension으로 데이터가 전달되지 않음

**증상:**
- 브라우저에서는 로그인되지만 Extension은 반응 없음
- offscreen.js에서 "메시지를 받을 리스너가 없음" 에러

**해결:**
1. ExtensionLoginSuccessPage.tsx가 자동 전송하는지 확인
   ```typescript
   // useEffect에서 자동 호출 확인
   useEffect(() => {
     if (source === "extension" && user) {
       sendToExtensionParent();  // ← 자동 호출되는지 확인
     }
   }, [user]);
   ```

2. Web Dashboard 콘솔에서 로그 확인
   ```javascript
   console.log("📤 Sending login data to Extension:", messageData);
   ```

3. offscreen.js의 메시지 리스너 확인
   ```javascript
   window.addEventListener("message", handleIframeMessage, false);
   ```

### 3. "Cannot read property 'contentWindow' of undefined" 에러

**증상:**
- offscreen.js에서 iframe이 null

**해결:**
1. iframe 로드 완료 대기
   ```javascript
   iframe.addEventListener("load", () => {
     console.log("iframe loaded successfully");
   });
   ```

2. iframe 생성 위치 확인
   ```javascript
   document.documentElement.appendChild(iframe);
   ```

### 4. postMessage 메시지가 수신되지 않음

**증상:**
- offscreen.js에서 메시지 리스너 반응 없음

**해결:**
1. targetOrigin 확인
   ```javascript
   // offscreen.js
   const origin = new URL(PUBLIC_SIGN_URL).origin;
   console.log("Target origin:", origin);  // 예: "http://localhost:5173"
   ```

2. postMessage의 targetOrigin 와일드카드 확인
   ```javascript
   // Web Dashboard
   window.parent.postMessage(messageData, "*");  // ← "*" 사용
   ```

---

## 🚀 배포 전 체크리스트

### Web Dashboard
- [ ] 웹 대시보드 배포 URL 확인
- [ ] 환경 변수 설정 확인 (Firebase API 키 등)
- [ ] `/login?source=extension` 페이지 동작 확인
- [ ] `/extension-login-success` 페이지 동작 확인
- [ ] postMessage 전송 확인

### Extension
- [ ] `config.js`의 `PUBLIC_SIGN_URL` 업데이트
- [ ] 웹 대시보드의 최종 배포 URL 사용
- [ ] 로그인 완료 후 데이터 저장 확인
- [ ] Chrome Storage에 사용자 정보 저장 확인
- [ ] popup.js에서 저장된 데이터 로드 확인

### 배포 순서
1. Web Dashboard 배포
2. `PUBLIC_SIGN_URL` 업데이트
3. Extension 패키징 및 배포
4. 최종 통신 테스트

---

## 📚 참고 파일

### Extension
- `bookmarkle-browser-extension/config.js` - 설정 파일
- `bookmarkle-browser-extension/offscreen.js` - iframe 호스팅 및 메시지 처리
- `bookmarkle-browser-extension/background.js` - 메인 로직
- `bookmarkle-browser-extension/PUBLIC_SIGN_URL_GUIDE.md` - 상세 가이드

### Web Dashboard
- `bookmarkle-web-dashboard/src/components/auth/LoginScreen.tsx` - 로그인 화면
- `bookmarkle-web-dashboard/src/pages/ExtensionLoginSuccessPage.tsx` - 성공 페이지
- `bookmarkle-web-dashboard/src/App.tsx` - 라우팅 설정

---

## 🎯 다음 단계

1. **개발 환경 테스트**
   ```bash
   # Terminal 1: Web Dashboard
   cd bookmarkle-web-dashboard
   npm run dev

   # Terminal 2: Extension 로드
   # Chrome DevTools → Extensions → Load unpacked
   ```

2. **Extension 로그인 테스트**
   - Extension popup에서 로그인 버튼 클릭
   - Web Dashboard의 로그인 페이지 오픈
   - 로그인 완료 후 데이터 확인

3. **프로덕션 배포**
   - Web Dashboard 배포
   - `PUBLIC_SIGN_URL` 업데이트
   - Extension 업데이트 및 배포

---

**질문이 있으신가요?**
- Extension 콘솔 확인
- Web Dashboard 콘솔 확인
- 네트워크 탭에서 요청 추적
