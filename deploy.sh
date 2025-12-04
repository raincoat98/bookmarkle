#!/bin/bash

# 통합 배포 스크립트
# 사용법: ./deploy.sh [프로젝트] [메시지]
# 프로젝트: dashboard, my-extension, all (기본값)

set -e  # 에러 발생 시 스크립트 중단

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
echo "🚀 통합 배포 스크립트"
echo "==================="
echo -e "${NC}"

# 프로젝트 및 메시지 파라미터 처리
PROJECT="${1:-all}"
if [[ "$1" =~ ^[^-] ]] && [[ ! "$1" =~ ^(signin-popup|dashboard|my-extension|all)$ ]]; then
    # 첫 번째 파라미터가 프로젝트명이 아니면 메시지로 간주
    PROJECT="all"
    DEPLOY_MESSAGE="$1"
else
    DEPLOY_MESSAGE="$2"
fi

DEPLOY_MESSAGE="${DEPLOY_MESSAGE:-자동 배포 $(date '+%Y-%m-%d %H:%M:%S')}"

log_info "배포 대상: $PROJECT"
log_info "배포 메시지: $DEPLOY_MESSAGE"

# 루트 디렉토리 저장
ROOT_DIR=$(pwd)

# 북마클 웹 대시보드 배포 함수
deploy_dashboard() {
    log_info "📊 북마클 웹 대시보드 빌드 및 준비..."
    
    if [ ! -d "bookmarkle-web-dashboard" ]; then
        log_error "bookmarkle-web-dashboard 디렉토리가 없습니다!"
        return 1
    fi
    
    cd bookmarkle-web-dashboard
    
    # package.json 확인
    if [ ! -f "package.json" ]; then
        log_error "package.json이 없습니다!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    # 의존성 설치
    if [ ! -d "node_modules" ]; then
        log_info "의존성 설치 중..."
        npm install
    fi
    
    # 빌드 실행
    log_info "북마클 웹 대시보드 빌드 중..."
    if npm run build; then
        log_success "북마클 웹 대시보드 빌드 완료!"
        log_info "빌드된 파일은 dist/ 디렉토리에 있습니다"
        
        # Firebase CLI 설치 확인
        if ! command -v firebase &> /dev/null; then
            log_warning "Firebase CLI가 설치되지 않았습니다. 설치 중..."
            npm install -g firebase-tools
            log_success "Firebase CLI 설치 완료"
        fi
        
        # Firebase Hosting에 배포
        log_info "Firebase Hosting에 배포 중..."
        if firebase deploy --only hosting --message "$DEPLOY_MESSAGE"; then
            log_success "북마클 웹 대시보드 배포 완료!"
            
            # 배포 URL 출력
            HOSTING_URL="https://bookmarkhub-5ea6c.web.app"
            echo -e "${GREEN}🌐 배포된 사이트: ${BLUE}$HOSTING_URL${NC}"
        else
            log_error "북마클 웹 대시보드 배포 실패!"
            cd "$ROOT_DIR"
            return 1
        fi
    else
        log_error "북마클 웹 대시보드 빌드 실패!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 북마클 브라우저 확장 패키징 함수
deploy_my_extension() {
    log_info "🧩 북마클 브라우저 확장 패키징..."
    
    if [ ! -d "bookmarkle-browser-extension" ]; then
        log_error "bookmarkle-browser-extension 디렉토리가 없습니다!"
        return 1
    fi
    
    cd bookmarkle-browser-extension
    
    # manifest.json 확인
    if [ ! -f "manifest.json" ]; then
        log_error "manifest.json이 없습니다!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    # 필수 파일들 확인
    REQUIRED_FILES=("background.js" "popup.html" "popup.js")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_warning "권장 파일이 없습니다: $file"
        fi
    done
    
    # build 디렉토리 생성
    BUILD_DIR="../build"
    mkdir -p "$BUILD_DIR"
    
    # zip 파일로 패키징
    EXTENSION_ZIP="$BUILD_DIR/bookmarkle-browser-extension-$(date '+%Y%m%d-%H%M%S').zip"
    log_info "확장 프로그램을 패키징 중: $(basename "$EXTENSION_ZIP")"
    
    zip -r "$EXTENSION_ZIP" . -x "*.DS_Store" "*.git*" "node_modules/*"
    
    if [ -f "$EXTENSION_ZIP" ]; then
        log_success "북마클 브라우저 확장 패키징 완료!"
        echo -e "${GREEN}📦 패키지 파일: ${BLUE}$EXTENSION_ZIP${NC}"
        echo -e "${GREEN}📁 빌드 디렉토리: ${BLUE}$BUILD_DIR${NC}"
        log_info "Chrome 웹 스토어 개발자 대시보드에서 업로드하세요"
    else
        log_error "북마클 브라우저 확장 패키징 실패!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 메인 배포 로직
case $PROJECT in
    "dashboard")
        deploy_dashboard
        ;;
    "my-extension")
        deploy_my_extension
        ;;
    "all")
        log_info "모든 프로젝트 배포 시작..."

        SUCCESS_COUNT=0
        TOTAL_COUNT=2

        if deploy_dashboard; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi

        if deploy_my_extension; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        
        echo ""
        if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
            log_success "모든 프로젝트 배포 완료! ($SUCCESS_COUNT/$TOTAL_COUNT)"
        else
            log_warning "일부 프로젝트 배포 완료 ($SUCCESS_COUNT/$TOTAL_COUNT)"
        fi
        ;;
    *)
        log_error "알 수 없는 프로젝트: $PROJECT"
        log_info "사용 가능한 프로젝트: dashboard, my-extension, all"
        exit 1
        ;;
esac

echo ""
log_success "배포 스크립트 완료!"