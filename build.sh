#!/bin/bash

# 통합 빌드 스크립트
# 사용법: ./build.sh [프로젝트]
# 프로젝트: signin-popup, dashboard, my-extension, all (기본값)

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
echo "🔨 통합 빌드 스크립트"
echo "==================="
echo -e "${NC}"

# 프로젝트 파라미터 처리
PROJECT="${1:-all}"

log_info "빌드 대상: $PROJECT"

# 루트 디렉토리 저장
ROOT_DIR=$(pwd)

# SignIn Popup 빌드 함수 (정적 파일이므로 검증만)
build_signin_popup() {
    log_info "📱 SignIn Popup 빌드 확인..."
    
    if [ ! -d "bookmarkle-signin-popup" ]; then
        log_error "bookmarkle-signin-popup 디렉토리가 없습니다!"
        return 1
    fi
    
    cd bookmarkle-signin-popup
    
    # 필수 파일 확인
    REQUIRED_FILES=("index.html" "signInWithPopup.js")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "필수 파일이 없습니다: $file"
            cd "$ROOT_DIR"
            return 1
        fi
    done
    
    # JavaScript 파일 문법 검증 (Node.js가 있는 경우)
    if command -v node &> /dev/null; then
        log_info "JavaScript 파일 문법 검증 중..."
        if node -c signInWithPopup.js; then
            log_success "JavaScript 파일 문법 검증 완료"
        else
            log_error "JavaScript 파일에 문법 오류가 있습니다"
            cd "$ROOT_DIR"
            return 1
        fi
    fi
    
    # HTML 파일 기본 검증
    if grep -q "<!doctype html>" index.html && grep -q "<html>" index.html; then
        log_success "HTML 파일 기본 구조 확인 완료"
    else
        log_warning "HTML 파일 구조를 확인하세요"
    fi
    
    log_success "SignIn Popup 빌드 확인 완료! (정적 파일)"
    echo -e "${GREEN}📁 빌드된 파일들:${NC}"
    ls -la *.html *.js 2>/dev/null || true
    
    cd "$ROOT_DIR"
    return 0
}

# 북마클 웹 대시보드 빌드 함수
build_dashboard() {
    log_info "📊 북마클 웹 대시보드 빌드 시작..."
    
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
    else
        log_info "의존성 확인 중..."
        # npm ci 대신 npm install 사용 (개발 의존성 포함)
        npm install
    fi
    
    # 기존 빌드 디렉토리 정리
    if [ -d "dist" ]; then
        log_info "기존 빌드 파일 정리 중..."
        rm -rf dist
    fi
    
    # TypeScript 타입 체크 (있는 경우) - 에러가 있어도 계속 진행
    if [ -f "tsconfig.json" ] && command -v npx &> /dev/null; then
        log_info "TypeScript 타입 체크 중..."
        if npx tsc --noEmit --skipLibCheck; then
            log_success "TypeScript 타입 체크 완료"
        else
            log_warning "TypeScript 타입 오류가 있지만 빌드를 계속 진행합니다"
        fi
    fi
    
    # 빌드 실행
    log_info "북마클 웹 대시보드 빌드 중..."
    if npm run build; then
        log_success "북마클 웹 대시보드 빌드 완료!"
        
        # 빌드 결과 확인
        if [ -d "dist" ]; then
            BUILD_SIZE=$(du -sh dist | cut -f1)
            log_info "빌드 크기: $BUILD_SIZE"
            echo -e "${GREEN}📁 빌드 디렉토리: ${BLUE}$(pwd)/dist${NC}"
            
            # 주요 파일들 나열
            echo -e "${GREEN}📄 주요 빌드 파일들:${NC}"
            find dist -name "*.html" -o -name "*.js" -o -name "*.css" | head -10
        else
            log_warning "dist 디렉토리를 찾을 수 없습니다"
        fi
    else
        log_error "북마클 웹 대시보드 빌드 실패!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 북마클 브라우저 확장 빌드 함수
build_my_extension() {
    log_info "🧩 북마클 브라우저 확장 빌드 및 패키징..."
    
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
    
    # manifest.json 유효성 검사
    if command -v node &> /dev/null; then
        log_info "manifest.json 유효성 검사 중..."
        if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))"; then
            log_success "manifest.json 유효성 검사 완료"
        else
            log_error "manifest.json에 JSON 문법 오류가 있습니다"
            cd "$ROOT_DIR"
            return 1
        fi
    fi
    
    # 필수 파일들 확인
    REQUIRED_FILES=("background.js" "popup.html" "popup.js")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_warning "권장 파일이 없습니다: $file"
        else
            # JavaScript 파일 문법 검증
            if [[ "$file" == *.js ]] && command -v node &> /dev/null; then
                if node -c "$file"; then
                    log_success "$file 문법 검증 완료"
                else
                    log_error "$file에 문법 오류가 있습니다"
                    cd "$ROOT_DIR"
                    return 1
                fi
            fi
        fi
    done
    
    # 빌드 디렉토리 생성
    BUILD_DIR="../build/bookmarkle-browser-extension"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    
    # 파일들 복사 (불필요한 파일 제외)
    log_info "Extension 파일들을 빌드 디렉토리로 복사 중..."
    rsync -av --exclude='*.DS_Store' --exclude='*.git*' --exclude='node_modules' --exclude='*.log' . "$BUILD_DIR/"
    
    # _locales 폴더가 있는지 확인하고 복사
    if [ -d "public/_locales" ]; then
        log_info "_locales 폴더 복사 중..."
        cp -r public/_locales "$BUILD_DIR/"
        log_success "_locales 폴더 복사 완료"
    else
        log_warning "_locales 폴더를 찾을 수 없습니다"
    fi
    
    # zip 파일로 패키징
    cd ../build
    EXTENSION_ZIP="bookmarkle-browser-extension-$(date '+%Y%m%d-%H%M%S').zip"
    log_info "확장 프로그램을 패키징 중: $EXTENSION_ZIP"
    
    zip -r "$EXTENSION_ZIP" bookmarkle-browser-extension/ > /dev/null
    
    if [ -f "$EXTENSION_ZIP" ]; then
        PACKAGE_SIZE=$(du -sh "$EXTENSION_ZIP" | cut -f1)
        log_success "북마클 브라우저 확장 빌드 완료!"
        echo -e "${GREEN}📦 패키지 파일: ${BLUE}$(pwd)/$EXTENSION_ZIP${NC}"
        echo -e "${GREEN}📏 패키지 크기: ${BLUE}$PACKAGE_SIZE${NC}"
        echo -e "${GREEN}📁 빌드 디렉토리: ${BLUE}$(pwd)/bookmarkle-browser-extension${NC}"
        
        log_info "Chrome 웹 스토어 개발자 대시보드에서 업로드하세요"
    else
        log_error "북마클 브라우저 확장 패키징 실패!"
        cd "$ROOT_DIR"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 메인 빌드 로직
case $PROJECT in
    "signin-popup")
        build_signin_popup
        ;;
    "dashboard")
        build_dashboard
        ;;
    "my-extension")
        build_my_extension
        ;;
    "all")
        log_info "모든 프로젝트 빌드 시작..."
        
        SUCCESS_COUNT=0
        TOTAL_COUNT=3
        
        if build_signin_popup; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        
        echo ""
        if build_dashboard; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        
        echo ""
        if build_my_extension; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        
        echo ""
        if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
            log_success "모든 프로젝트 빌드 완료! ($SUCCESS_COUNT/$TOTAL_COUNT)"
        else
            log_warning "일부 프로젝트 빌드 완료 ($SUCCESS_COUNT/$TOTAL_COUNT)"
        fi
        
        # 빌드 결과 요약
        echo ""
        echo -e "${BLUE}📋 빌드 결과 요약:${NC}"
        [ -d "bookmarkle-signin-popup" ] && echo "• 북마클 로그인 팝업: 정적 파일 (배포 준비됨)"
        [ -d "bookmarkle-web-dashboard/dist" ] && echo "• 북마클 웹 대시보드: bookmarkle-web-dashboard/dist/ (호스팅 준비됨)"
        if compgen -G "build/bookmarkle-browser-extension-*.zip" > /dev/null; then
            echo "• 북마클 브라우저 확장: build/bookmarkle-browser-extension-*.zip (스토어 업로드 준비됨)"
        fi
        ;;
    *)
        log_error "알 수 없는 프로젝트: $PROJECT"
        log_info "사용 가능한 프로젝트: signin-popup, dashboard, my-extension, all"
        exit 1
        ;;
esac

echo ""
log_success "빌드 스크립트 완료!"
