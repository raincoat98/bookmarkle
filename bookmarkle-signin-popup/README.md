# 북마클 로그인 팝업 서비스 (Bookmarkle SignIn Popup)

Chrome Extension에서 사용할 Firebase Authentication `signInWithPopup` 구현체입니다.

## 🚀 빠른 시작

### 1. 로컬 개발

```bash
npm run dev
# 또는
npm start
```

→ http://localhost:8000 에서 접근

### 2. 배포

#### 간단한 배포

```bash
npm run deploy
```

#### 메시지와 함께 배포

```bash
./deploy.sh "새로운 기능 추가"
```

#### Firebase CLI 직접 사용

```bash
firebase deploy --only hosting
```

## 📁 파일 구조

```
signin-popup/
├── index.html          # 메인 HTML 페이지
├── signInWithPopup.js   # Firebase Auth 로직
├── firebase.json        # Firebase 설정
├── .firebaserc         # Firebase 프로젝트 설정
├── deploy.sh           # 자동 배포 스크립트
├── package.json        # NPM 스크립트
└── README.md          # 이 파일
```

## 🔧 사용법

### Chrome Extension에서 사용

```javascript
// offscreen.html에서
const iframe = document.createElement("iframe");
iframe.src = "https://bookmarkhub-5ea6c-sign-a4489.web.app";
document.body.appendChild(iframe);

// 인증 시작
iframe.contentWindow.postMessage({ initAuth: true }, "*");

// 결과 수신
window.addEventListener("message", (event) => {
  if (event.data.user) {
    console.log("로그인 성공:", event.data.user);
  }
});
```

### 브라우저에서 직접 테스트

```javascript
// 개발자 도구에서
window.postMessage({ initAuth: true }, "*");
```

## 🌐 배포된 사이트

- **호스팅 URL**: https://bookmarkhub-5ea6c-sign-a4489.web.app
- **Firebase 콘솔**: https://console.firebase.google.com/project/bookmarkhub-5ea6c/overview

## 📋 NPM 스크립트

| 명령어           | 설명                            |
| ---------------- | ------------------------------- |
| `npm run dev`    | 로컬 개발 서버 시작 (포트 8000) |
| `npm run deploy` | Firebase Hosting에 배포         |
| `npm run serve`  | Firebase 로컬 서버 시작         |
| `npm run build`  | 빌드 (정적 파일이므로 불필요)   |

## 🔑 Firebase 설정

현재 프로젝트: `test-project-12345`

Firebase 설정이 `signInWithPopup.js`에 하드코딩되어 있습니다:

```javascript
const firebaseConfig = {
  apiKey: "test_api_key_123456789",
  authDomain: "test-project-12345.firebaseapp.com",
  projectId: "test-project-12345",
  appId: "1:123456789:web:abcdef123456789",
  messagingSenderId: "123456789",
};
```

## 🛠 개발 팁

1. **로컬 테스트**: `npm run dev`로 로컬에서 테스트
2. **빠른 배포**: `npm run deploy`로 한 번에 배포
3. **Firebase 서버**: `npm run serve`로 Firebase 로컬 서버 사용
4. **자동화**: `deploy.sh` 스크립트로 배포 과정 자동화

## 🔒 보안 고려사항

- Firebase API 키는 공개되어도 안전합니다 (클라이언트 사이드 키)
- 실제 보안은 Firebase 콘솔의 Authentication 규칙에서 관리
- HTTPS 환경에서만 Firebase Auth 작동

## 📞 지원

문제가 발생하면 Firebase 콘솔에서 로그를 확인하세요:
https://console.firebase.google.com/project/bookmarkhub-5ea6c/overview
