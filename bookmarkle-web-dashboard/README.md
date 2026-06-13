# 북마클 웹 대시보드 (Bookmarkle Web Dashboard)

React + TypeScript + Vite 기반의 북마크 관리 대시보드입니다.

## 환경 설정

### 1. 환경 변수 설정

Firebase 설정을 위해 환경 변수를 설정해야 합니다.

```bash
# .env.example 파일을 .env로 복사
cp .env.example .env

# .env 파일을 열어서 실제 Firebase 설정 값을 입력하세요
```

`.env` 파일에 다음 값들을 설정하세요:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_OPENWEATHER_API_KEY=your_openweather_api_key

# 관리자 설정
VITE_ADMIN_EMAIL=admin@bookmarkle.com
```

### 관리자 페이지 설정

관리자 계정을 설정하려면 다음 단계를 따르세요:

#### 1. 환경변수 설정

`.env` 파일에 `VITE_ADMIN_EMAIL` 환경 변수를 추가하세요.

```env
VITE_ADMIN_EMAIL=your-admin-email@example.com
```

#### 2. 관리자 권한 부여

프로젝트 루트에서 다음 명령어를 실행하여 관리자 권한을 부여하세요:

```bash
# 의존성 설치
npm install

# 관리자 권한 설정
npm run admin:set

# 또는 직접 실행 (프로젝트 루트에서)
node ../scripts/set-admin.js
```

**추가 명령어:**

```bash
# 환경변수 확인
npm run admin:check

# 관리자 권한 재설정
npm run admin:set
```

이 스크립트는 다음 작업을 수행합니다:

- Firebase Auth에 Custom Claims 설정 (`isAdmin: true`)
- Firestore `admins` 컬렉션에 관리자 정보 추가
- Firestore `users` 컬렉션에 `isAdmin` 필드 추가

#### 3. 관리자 대시보드 접근

관리자로 로그인하면 헤더에 방패(🛡️) 아이콘이 표시되며,
클릭하면 관리자 대시보드에 접근할 수 있습니다.

**관리자 대시보드 기능:**

- 전체 사용자 목록 조회
- 사용자별 북마크 및 컬렉션 통계
- 사용자 검색 및 필터링
- 사용자 상세 정보 확인
- **사용자 비활성화/활성화** (새로 추가!)
- 사용자 상태 관리

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

## 기술 스택

- React 18
- TypeScript
- Vite
- Firebase (Authentication & Firestore)
- Tailwind CSS

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
