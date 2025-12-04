# PUBLIC_SIGN_URL 설정 가이드

## 개요

`PUBLIC_SIGN_URL`은 Extension에서 로그인을 처리하기 위해 로드할 웹 대시보드의 로그인 페이지 URL입니다.

## 설정값

### 개발 환경 (Local)
```javascript
PUBLIC_SIGN_URL: "http://localhost:5173/login?source=extension"
```

### 프로덕션 환경
```javascript
PUBLIC_SIGN_URL: "https://yourapp.com/login?source=extension"
```

## 상세 설정

### 1. 개발 환경 설정 (`config.js`)

```javascript
// bookmarkle-browser-extension/config.js
export const config = {
  PUBLIC_SIGN_URL: "http://localhost:5173/login?source=extension",
  PUBLIC_START_PAGE_URL: "http://localhost:5173/",
};
```

**포트 설명:**
- `5173` - Vite 기본 개발 서버 포트 (웹 대시보드)
- 웹 대시보드 package.json에서 설정한 포트로 변경 가능

### 2. 프로덕션 환경 설정

```javascript
// bookmarkle-browser-extension/config.js
export const config = {
  PUBLIC_SIGN_URL: "https://yourdomain.com/login?source=extension",
  PUBLIC_START_PAGE_URL: "https://yourdomain.com/",
};
```

## URL 파라미터 설명

### `source=extension`
- Extension에서 요청임을 표시
- 로그인 성공 후 `/extension-login-success` 페이지로 리다이렉트
- Extension에 로그인 정보 전달

```
URL: http://localhost:5173/login?source=extension
                                     ↑
                        Extension 요청임을 표시
```

## 웹 대시보드 처리 로직

### LoginScreen.tsx
```typescript
// Extension에서 접속한 경우 로그인 후 성공 페이지로 리다이렉트
useEffect(() => {
  const urlParams = new URLSearchParams(location.search);
  const source = urlParams.get("source");

  if (user && source === "extension") {
    navigate("/extension-login-success" + location.search);
  }
}, [user, navigate, location.search]);
```

### ExtensionLoginSuccessPage.tsx
```typescript
// Extension과의 postMessage 통신으로 로그인 정보 전달
window.parent.postMessage({
  type: "LOGIN_SUCCESS",
  user: userData,
  idToken: idToken,
}, "*");
```

## Extension 동작 흐름

### 1. offscreen.js에서 iframe 생성
```javascript
const PUBLIC_SIGN_URL = "http://localhost:5173/login?source=extension";

const iframe = document.createElement("iframe");
iframe.src = PUBLIC_SIGN_URL;  // ← 여기에 설정된 URL 사용
iframe.style.display = "none";
document.documentElement.appendChild(iframe);
```

### 2. 로그인 요청 (background.js → offscreen.js)
```javascript
if (msg.type === "START_POPUP_AUTH") {
  iframe.contentWindow.postMessage({ initAuth: true }, origin);
  // offscreen.js가 postMessage를 받으면
  // 웹 대시보드의 LoginScreen에서 로그인 처리
}
```

### 3. 로그인 성공 후 데이터 수신
```javascript
window.addEventListener("message", handleIframeMessage, false);
// 웹 대시보드에서 postMessage로 보낸 데이터 수신
// {
//   user: {...},
//   idToken: "...",
//   collections: [...]
// }
```

## CORS 및 보안 설정

### 개발 환경
- `http://localhost:5173`에서 iframe 로드 가능
- CORS 제한 없음 (localhost)

### 프로덕션 환경

웹 대시보드의 `vite.config.ts`에서 Extension 도메인 허용 필요:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    cors: {
      origin: [
        "chrome-extension://<YOUR_EXTENSION_ID>",
        // 다른 오리진도 필요하면 추가
      ],
      credentials: true,
    },
  },
});
```

## 환경 변수 설정 (.env)

웹 대시보드의 `.env` 파일:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
... 기타 Firebase 설정
```

Extension의 `config.js`:
```javascript
export const config = {
  PUBLIC_SIGN_URL: "https://yourdomain.com/login?source=extension",
  PUBLIC_START_PAGE_URL: "https://yourdomain.com/",
};
```

## 트러블슈팅

### 1. iframe이 로드되지 않음
- **원인**: CORS 제한 또는 잘못된 URL
- **해결**: 브라우저 콘솔에서 CORS 에러 확인
- **해결**: PUBLIC_SIGN_URL이 올바른지 확인

### 2. 로그인 후 Extension으로 데이터가 전달되지 않음
- **원인**: postMessage의 targetOrigin이 일치하지 않음
- **확인**: offscreen.js의 `origin` 변수 값 확인
- **로그**: 브라우저 콘솔에 "origin" 출력해서 확인

```javascript
// offscreen.js에 로그 추가
const origin = new URL(PUBLIC_SIGN_URL).origin;
console.log("Target origin:", origin);  // 확인용
```

### 3. "postMessage 메시지를 받을 리스너가 없음" 에러
- **원인**: iframe이 완전히 로드되기 전에 postMessage 전송
- **해결**: iframe의 load 이벤트 대기 확인

```javascript
// offscreen.js
iframe.addEventListener("load", () => {
  console.log("SignIn popup iframe loaded successfully");
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });
});
```

## 데이터 흐름 다이어그램

```
┌─────────────────────────┐
│  Chrome Extension       │
│  (background.js)        │
└────────────┬────────────┘
             │
             ↓ START_POPUP_AUTH
┌─────────────────────────┐
│  offscreen.html/js      │
│  (iframe 호스팅)        │
└────────────┬────────────┘
             │
             ↓ iframe.src = PUBLIC_SIGN_URL
┌─────────────────────────────────────────────┐
│  Web Dashboard (http://localhost:5173)      │
│  ├─ LoginScreen.tsx (로그인 처리)           │
│  ├─ Firebase Auth (인증)                    │
│  └─ ExtensionLoginSuccessPage.tsx           │
│     (postMessage로 데이터 반환)             │
└────────────┬────────────────────────────────┘
             │
             ↓ postMessage (user, idToken)
┌─────────────────────────┐
│  offscreen.js           │
│  (메시지 수신)          │
└────────────┬────────────┘
             │
             ↓ sendResponse()
┌─────────────────────────┐
│  background.js          │
│  (데이터 저장)          │
└─────────────────────────┘
```

## 로그인 후 데이터 처리

### Extension에서의 저장
```javascript
// offscreen.js에서 로그인 성공 시
if (data.user) {
  currentUser = data.user;
  currentIdToken = data.idToken;

  // Chrome Storage에 저장
  chrome.storage.local.set({
    currentUser: data.user,
    currentIdToken: data.idToken,
  });
}
```

### popup.js에서의 사용
```javascript
// popup에서 사용자 정보 조회
chrome.runtime.sendMessage(
  { target: "offscreen", type: "GET_AUTH_STATE" },
  (response) => {
    const user = response.user;
    // UI 업데이트
  }
);
```

## 다음 단계

1. `config.js`에서 PUBLIC_SIGN_URL 설정
2. 웹 대시보드 서버 시작 (`npm run dev`)
3. Extension 로드 및 테스트
4. 로그인 후 Extension과의 데이터 통신 확인

---

**참고**: 웹 대시보드의 `/extension-login-success` 페이지에서 Extension과의 통신을 처리합니다.
