# 📚 북마클 (Bookmark Hub)

**통합 북마크 관리 시스템**

북마크를 한 곳에서 관리하고, Chrome Extension과 웹 대시보드를 통해 어디서나 접근하세요

[![Firebase](https://img.shields.io/badge/Firebase-12.x-orange?logo=firebase)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-green?logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📁 프로젝트 구조

```
📚 북마클/
├── 🧩 bookmarkle-browser-extension/  # Chrome Extension (Manifest V3)
│   ├── popup.html/js/css            # Extension Popup UI
│   ├── background.js                # Service Worker
│   ├── offscreen.js/html            # Offscreen Document
│   ├── manifest.json                # Extension Configuration
│   ├── firebase-config.js           # Firebase 설정
│   └── public/                      # 다국어 지원 파일들
│
├── 📊 bookmarkle-web-dashboard/     # 북마클 웹 대시보드
│   ├── src/
│   │   ├── components/              # UI Components (북마크 관리, 인증 등)
│   │   ├── hooks/                   # Custom Hooks (useAuth, useBookmarks 등)
│   │   ├── pages/                   # 페이지 컴포넌트 (대시보드, 북마크, 설정)
│   │   ├── stores/                  # 상태 관리 (Zustand)
│   │   ├── utils/                   # 유틸리티 함수들
│   │   └── i18n/                    # 다국어 지원
│   ├── dist/                        # Build Output
│   └── firebase.json                # Firebase Hosting Config
│
├── 📦 build/                        # 빌드 결과물
│   └── bookmarkle-browser-extension/ # 패키징된 Extension
│
├── 🛠 Scripts/                      # 배포 및 개발 스크립트
│   ├── deploy.sh                    # 통합 배포 스크립트
│   ├── dev.sh                      # 개발 서버 스크립트
│   ├── build.sh                    # 빌드 스크립트
│   └── setup-env.sh                # 환경변수 설정 스크립트
│
├── 🔑 Configuration/                # 설정 파일들
│   ├── serviceAccountKey.json      # Firebase Admin SDK 키
│   ├── firebase.json               # Firebase 프로젝트 설정
│   └── firestore.rules             # Firestore 보안 규칙
│
└── 📚 Documentation/
    ├── README.md                    # 메인 문서
    └── ADMIN_GUIDE.md               # 관리자 가이드
```

## ✨ 주요 기능

### 📚 **북마크 관리**

- **북마크 추가/편집/삭제** - 직관적인 북마크 관리
- **컬렉션 기반 분류** - 카테고리별로 북마크 정리
- **드래그 앤 드롭** - 쉬운 순서 변경 및 분류
- **검색 및 필터링** - 빠른 북마크 찾기
- **아이콘 자동 감지** - 웹사이트 파비콘 자동 수집
- **실시간 동기화** - 모든 기기에서 동일한 북마크

### 🔐 **Firebase Authentication**

- **Google OAuth 로그인** - 간편한 소셜 로그인
- **이메일/패스워드 로그인** - 전통적인 로그인 방식
- **회원가입** - 이메일 기반 계정 생성 및 프로필 설정
- **비밀번호 재설정** - 이메일을 통한 비밀번호 복구
- **자동 세션 관리** - 브라우저 재시작 시에도 로그인 상태 유지
- **실시간 인증 상태** - 로그인/로그아웃 상태 자동 감지

### 🧩 **Chrome Extension (Manifest V3)**

- **원클릭 북마크 추가** - 현재 페이지를 바로 북마크
- **빠른 북마크 접근** - 팝업에서 북마크 검색 및 접근
- **Firebase 실시간 동기화** - Firestore를 통한 데이터 실시간 동기화
- **Offscreen Document** - 확장 프로그램의 DOM 작업 처리

### 📊 **웹 대시보드**

- **반응형 UI** - 모바일, 태블릿, 데스크톱 지원
- **다크/라이트 테마** - 사용자 선호에 맞는 테마
- **위젯 시스템** - 날씨, 명언 등 다양한 위젯
- **자동 백업** - 주기적인 북마크 데이터 백업
- **내보내기/가져오기** - JSON 형태로 데이터 관리

## 📋 사전 요구사항

- **Node.js** 18+
- **npm** 또는 **yarn**
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Chrome Browser** (Extension 개발용)

## 🚀 빠른 시작

### 🔧 초기 설정

#### 1. Firebase 프로젝트 생성

```bash
# Firebase 콘솔에서 새 프로젝트 생성
# https://console.firebase.google.com/

# Authentication 활성화
# - Sign-in method에서 Google 활성화
# - 승인된 도메인에 localhost 추가

# Service Account Key 발급
# - 프로젝트 설정 > 서비스 계정
# - "새 비공개 키 생성" 클릭
# - serviceAccountKey.json 파일 다운로드
# - 프로젝트 루트에 저장
```

#### 2. 환경변수 설정

##### 북마클 웹 대시보드 환경 변수 (`bookmarkle-web-dashboard/.env.local`)

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
```

##### Chrome Extension 설정 (`bookmarkle-browser-extension/firebase-config.js`)

```javascript
export const firebaseConfig = {
  apiKey: "your_api_key_here",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  appId: "your_app_id",
  messagingSenderId: "your_sender_id",
};
```

#### 3. Firebase Hosting 사이트 생성

```bash
# 메인 웹앱용 사이트 (기본)
firebase hosting:sites:create YOUR_PROJECT_ID
```

### 📦 전체 프로젝트 관리

```bash
# 모든 프로젝트 빌드
npm run build
./build.sh all

# 모든 프로젝트 배포
npm run deploy
./deploy.sh all "업데이트 메시지"

# 모든 프로젝트 개발 서버 실행
npm run dev:all
./dev.sh
```

### 📱 개별 프로젝트 관리

#### 북마클 대시보드 (bookmarkle-web-dashboard)

```bash
# 개발 서버
npm run dev:dashboard
./dev.sh

# 빌드
npm run build:dashboard
./build.sh dashboard
```

#### Chrome Extension (bookmarkle-browser-extension)

```bash
# 빌드 & 패키징
npm run build:extension
./build.sh my-extension
```

## 📋 사용 가능한 스크립트

### 🔧 통합 스크립트

| 스크립트      | 설명      | 사용법                            |
| ------------- | --------- | --------------------------------- |
| `./deploy.sh` | 통합 배포 | `./deploy.sh [프로젝트] [메시지]` |
| `./dev.sh`    | 개발 서버 | `./dev.sh`                        |
| `./build.sh`  | 통합 빌드 | `./build.sh [프로젝트]`           |

### 📋 NPM 스크립트

| 명령어                     | 설명                      |
| -------------------------- | ------------------------- |
| `npm run build`            | 모든 프로젝트 빌드        |
| `npm run deploy`           | 모든 프로젝트 배포        |
| `npm run dev:all`          | 모든 프로젝트 개발 서버   |
| `npm run dev:dashboard`    | 북마클 대시보드 개발 서버 |
| `npm run start`            | 대시보드 개발 서버 (기본) |
| `npm run build:dashboard`  | 북마클 대시보드 빌드      |
| `npm run build:extension`  | Extension 빌드 & 패키징   |
| `npm run deploy:dashboard` | 북마클 대시보드 배포      |

## 🔧 설정

### 환경변수 자동 설정

```bash
# 환경변수 설정 스크립트 실행
./setup-env.sh

# Firebase 설정 정보 입력 후 자동으로 모든 설정 파일 생성
```

### 수동 설정

각 프로젝트의 Firebase 설정 파일을 수동으로 생성할 수 있습니다:

- **북마클 대시보드**: `bookmarkle-web-dashboard/.env.local`
- **Chrome Extension**: `bookmarkle-browser-extension/firebase-config.js`
- **Service Account Key**: `serviceAccountKey.json` (프로젝트 루트에 저장)

## 📚 프로젝트 구성

- **🧩 Chrome Extension**: Manifest V3 기반 북마크 관리 확장 프로그램
- **📊 웹 대시보드**: React + TypeScript 기반 완전한 북마크 관리 대시보드
- **🚀 통합 배포**: Firebase Hosting 자동 배포 시스템

## 🔍 문제 해결

### Chrome Extension 로드 실패

- `manifest.json` 문법 확인
- 권한 설정 확인
- 개발자 도구에서 에러 로그 확인

### Firebase 설정 오류

```bash
firebase login
firebase projects:list
```

### CORS 에러

- Firebase Hosting 도메인이 승인된 도메인에 추가되었는지 확인
- `manifest.json`의 `host_permissions` 확인

## 🔑 Firebase 프로젝트

- **프로젝트 ID**: `bookmarkhub-5ea6c`
- **콘솔**: https://console.firebase.google.com/project/bookmarkhub-5ea6c/overview
