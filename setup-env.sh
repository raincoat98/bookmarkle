#!/bin/bash

# 🔥 북마클 - 환경변수 설정 스크립트
# 사용법: ./setup-env.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 배너 출력
echo -e "${BLUE}"
echo "🔥 북마클 - 환경변수 설정"
echo "======================="
echo -e "${NC}"

log_info "Firebase 설정 정보를 입력해주세요:"
echo ""

# Firebase 설정 입력 받기
read -p "API Key: " API_KEY
read -p "Auth Domain (예: your-project.firebaseapp.com): " AUTH_DOMAIN
read -p "Project ID: " PROJECT_ID
read -p "App ID: " APP_ID
read -p "Messaging Sender ID: " SENDER_ID

echo ""
log_info "설정 파일들을 생성하고 있습니다..."

# 북마클 대시보드 환경변수 파일 생성
cat > bookmarkle-web-dashboard/.env.local << EOF
# Firebase Configuration
VITE_FIREBASE_API_KEY=$API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_APP_ID=$APP_ID
VITE_FIREBASE_MESSAGING_SENDER_ID=$SENDER_ID
EOF

log_success "북마클 대시보드 환경변수 파일 생성됨: bookmarkle-web-dashboard/.env.local"

# Chrome Extension 설정 파일 생성
cat > bookmarkle-browser-extension/firebase-config.js << EOF
// 확장 내부에서만 쓰는 Config (민감 정보 아님 - 공개키 성격)
export const firebaseConfig = {
  apiKey: "$API_KEY",
  authDomain: "$AUTH_DOMAIN",
  projectId: "$PROJECT_ID",
  appId: "$APP_ID",
  messagingSenderId: "$SENDER_ID",
};
EOF

log_success "Chrome Extension 설정 파일 생성됨: bookmarkle-browser-extension/firebase-config.js"

# Firebase 프로젝트 설정 파일 업데이트
log_info "Firebase 프로젝트 설정 파일을 업데이트합니다..."

# bookmarkle-web-dashboard/.firebaserc 업데이트
cat > bookmarkle-web-dashboard/.firebaserc << EOF
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
EOF

log_success "Firebase 프로젝트 설정 파일 업데이트 완료"

echo ""
log_success "🎉 모든 환경변수 설정이 완료되었습니다!"
echo ""
log_info "다음 단계:"
echo "1. Firebase 콘솔에서 Authentication을 활성화하세요"
echo "2. Google Sign-in 방법을 활성화하세요"
echo "3. Firebase Hosting 사이트를 생성하세요:"
echo "   - firebase hosting:sites:create $PROJECT_ID"
echo "4. 개발 서버를 시작하세요: ./dev.sh"
echo ""
log_warning "주의: 생성된 설정 파일들은 .gitignore에 의해 Git에서 제외됩니다"
