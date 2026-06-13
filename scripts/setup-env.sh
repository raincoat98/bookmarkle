#!/bin/bash

# 🔥 북마클 - 환경변수 설정 스크립트
# 사용법: ./scripts/setup-env.sh

set -e

# 공통 헬퍼 로드 후 프로젝트 루트로 진입
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
enter_project_root

echo -e "${BLUE}"
echo "🔥 북마클 - 환경변수 설정"
echo "======================="
echo -e "${NC}"

log_info "Firebase 설정 정보를 입력해주세요:"
echo ""

read -p "API Key: " API_KEY
read -p "Auth Domain (예: your-project.firebaseapp.com): " AUTH_DOMAIN
read -p "Project ID: " PROJECT_ID
read -p "App ID: " APP_ID
read -p "Messaging Sender ID: " SENDER_ID

echo ""
log_info "설정 파일들을 생성하고 있습니다..."

cat > bookmarkle-web-dashboard/.env.local << EOF
# Firebase Configuration
VITE_FIREBASE_API_KEY=$API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_APP_ID=$APP_ID
VITE_FIREBASE_MESSAGING_SENDER_ID=$SENDER_ID
EOF

log_success "북마클 대시보드 환경변수 파일 생성됨: bookmarkle-web-dashboard/.env.local"

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

log_info "Firebase 프로젝트 설정 파일을 업데이트합니다..."

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
echo "4. 개발 서버를 시작하세요: ./scripts/dev.sh"
echo ""
log_warning "주의: 생성된 설정 파일들은 .gitignore에 의해 Git에서 제외됩니다"
