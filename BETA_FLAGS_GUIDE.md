# 베타 플래그 설정 가이드

북마클의 베타 기능들을 환경 변수를 통해 개별적으로 제어할 수 있습니다.

## 환경 변수 설정

`bookmarkle-web-dashboard/.env` 파일에 다음 변수들을 추가하여 베타 기능을 제어할 수 있습니다:

```env
# 베타 배너 표시 여부 (기본값: true)
VITE_SHOW_BETA_BANNER=true

# 베타 공지 모달 표시 여부 (첫 로그인 시, 기본값: true)
VITE_SHOW_BETA_MODAL=true

# 얼리유저 혜택 표시 여부 (기본값: true)
VITE_SHOW_EARLY_USER_BENEFITS=true

# 프리미엄 기능 Soft Lock 예고 표시 여부 (기본값: true)
VITE_SHOW_PREMIUM_PREVIEW=true

# 설정에서 베타 정보 표시 여부 (기본값: true)
VITE_SHOW_BETA_SETTINGS=true

# 베타 피드백 기능 활성화 여부 (기본값: true)
VITE_ENABLE_BETA_FEEDBACK=true
```

## 사용법

### 1. 개발 환경에서 베타 기능 끄기

```env
# 개발 중 베타 배너 숨기기
VITE_SHOW_BETA_BANNER=false

# 베타 모달 비활성화
VITE_SHOW_BETA_MODAL=false
```

### 2. 프로덕션에서 베타 기능 제어

```env
# 정식 오픈 후 베타 관련 UI 모두 숨기기
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
VITE_SHOW_EARLY_USER_BENEFITS=false
VITE_SHOW_PREMIUM_PREVIEW=false
VITE_SHOW_BETA_SETTINGS=false
```

### 3. 단계적 베타 종료

정식 오픈 시 점진적으로 베타 기능을 비활성화할 수 있습니다:

**1단계: 신규 유입 중단**
```env
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
```

**2단계: 얼리유저 혜택 안내만 유지**
```env
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
VITE_SHOW_PREMIUM_PREVIEW=false
VITE_SHOW_EARLY_USER_BENEFITS=true  # 얼리유저 안내 유지
VITE_SHOW_BETA_SETTINGS=true        # 설정에서 확인 가능
```

**3단계: 완전 종료**
```env
# 모든 베타 관련 기능 비활성화
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
VITE_SHOW_EARLY_USER_BENEFITS=false
VITE_SHOW_PREMIUM_PREVIEW=false
VITE_SHOW_BETA_SETTINGS=false
VITE_ENABLE_BETA_FEEDBACK=false
```

## 베타 기능별 설명

### 1. 베타 배너 (VITE_SHOW_BETA_BANNER)
- **위치**: 로그인 후 화면 상단
- **기능**: 베타 기간 안내 및 얼리유저 혜택 표시
- **제어**: 사용자가 직접 닫기 가능 (로컬 스토리지에 저장)

### 2. 베타 공지 모달 (VITE_SHOW_BETA_MODAL)
- **위치**: 첫 로그인 시 모달 팝업
- **기능**: 베타 환영 메시지 및 얼리유저 혜택 안내
- **제어**: 한 번 본 후에는 다시 표시되지 않음

### 3. 얼리유저 혜택 (VITE_SHOW_EARLY_USER_BENEFITS)
- **위치**: 베타 배너, 모달, 설정 페이지
- **기능**: 얼리유저 특별 혜택 안내
- **대상**: 베타 종료일 이전 가입자

### 4. 프리미엄 미리보기 (VITE_SHOW_PREMIUM_PREVIEW)
- **위치**: 가격 페이지 상단
- **기능**: Soft Lock 예고 및 프리미엄 전환 안내
- **목적**: 유료화 전 사용자 준비

### 5. 베타 설정 (VITE_SHOW_BETA_SETTINGS)
- **위치**: 설정 페이지 "베타 정보" 탭
- **기능**: 베타 상태 확인, 설정 초기화, 피드백 전송
- **대상**: 관리자 및 개발자

### 6. 베타 피드백 (VITE_ENABLE_BETA_FEEDBACK)
- **위치**: 베타 설정 페이지
- **기능**: 사용자 피드백 수집
- **연동**: GitHub Issues 또는 피드백 시스템

## 로컬 스토리지 키

베타 기능들은 다음 로컬 스토리지 키들을 사용합니다:

```javascript
// 베타 배너 닫기 상태
localStorage.getItem("betaBannerDismissed")

// 베타 모달 표시 완료 상태
localStorage.getItem("betaModalShown")

// 베타 피드백 전송 상태
localStorage.getItem("betaFeedbackSent")
```

## 개발자 도구

### 베타 설정 초기화

설정 페이지의 "베타 정보" 탭에서 "베타 설정 초기화" 버튼을 클릭하거나, 
브라우저 콘솔에서 다음 명령어 실행:

```javascript
// 모든 베타 관련 로컬 스토리지 클리어
["betaBannerDismissed", "betaModalShown", "betaFeedbackSent"].forEach(key => {
  localStorage.removeItem(key);
});

// 페이지 새로고침
window.location.reload();
```

### 베타 상태 확인

```javascript
// 현재 베타 플래그 상태 확인
console.log(window.betaUtils?.getBetaStatus());
```

## 주의사항

1. **환경 변수 변경 시 재빌드 필요**: Vite 환경 변수는 빌드 시점에 정적으로 치환되므로, 변경 후 `npm run build` 또는 개발 서버 재시작이 필요합니다.

2. **기본값**: 모든 플래그의 기본값은 `true`입니다. 명시적으로 `false`로 설정해야 비활성화됩니다.

3. **베타 종료일**: `src/utils/betaFlags.ts`의 `BETA_END_DATE`를 실제 정식 오픈 날짜로 수정해야 합니다.

4. **얼리유저 판별**: 사용자의 `createdAt` 필드가 `BETA_END_DATE` 이전인지로 판별합니다.

## 배포 시나리오

### 개발 환경
```env
# 모든 베타 기능 활성화 (기본값)
```

### 스테이징 환경
```env
# 프로덕션과 동일한 설정으로 테스트
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
```

### 프로덕션 환경 (베타 기간)
```env
# 베타 기능 모두 활성화
VITE_SHOW_BETA_BANNER=true
VITE_SHOW_BETA_MODAL=true
VITE_SHOW_EARLY_USER_BENEFITS=true
```

### 프로덕션 환경 (정식 오픈)
```env
# 베타 기능 단계적 비활성화
VITE_SHOW_BETA_BANNER=false
VITE_SHOW_BETA_MODAL=false
VITE_SHOW_EARLY_USER_BENEFITS=true  # 기존 사용자 안내용
VITE_SHOW_BETA_SETTINGS=true        # 관리 목적
```
