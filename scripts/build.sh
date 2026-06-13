#!/bin/bash

# 통합 빌드 스크립트
# 사용법: ./scripts/build.sh [프로젝트]
# 프로젝트: dashboard, my-extension, all (기본값)

set -e

# 공통 헬퍼 로드 후 프로젝트 루트로 진입
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
enter_project_root

echo -e "${BLUE}"
echo "🔨 통합 빌드 스크립트"
echo "==================="
echo -e "${NC}"

PROJECT="${1:-all}"
AVAILABLE_PROJECTS=("dashboard" "my-extension" "all")

if [[ ! " ${AVAILABLE_PROJECTS[@]} " =~ " ${PROJECT} " ]]; then
    log_error "알 수 없는 프로젝트: $PROJECT"
    log_info "사용 가능한 프로젝트: ${AVAILABLE_PROJECTS[*]}"
    exit 1
fi

log_info "빌드 대상: $PROJECT"

build_dashboard() {
    log_info "📊 북마클 웹 대시보드 빌드 시작..."

    if [ ! -d "bookmarkle-web-dashboard" ]; then
        log_error "bookmarkle-web-dashboard 디렉토리가 없습니다!"
        return 1
    fi

    cd bookmarkle-web-dashboard

    if [ ! -f "package.json" ]; then
        log_error "package.json이 없습니다!"
        cd "$ROOT_DIR"
        return 1
    fi

    if [ ! -d "node_modules" ]; then
        log_info "의존성 설치 중..."
        npm install
    else
        log_info "의존성 확인 중..."
        npm install
    fi

    if [ -d "dist" ]; then
        log_info "기존 빌드 파일 정리 중..."
        rm -rf dist
    fi

    if [ -f "tsconfig.json" ] && command -v npx &> /dev/null; then
        log_info "TypeScript 타입 체크 중..."
        if npx tsc --noEmit --skipLibCheck; then
            log_success "TypeScript 타입 체크 완료"
        else
            log_warning "TypeScript 타입 오류가 있지만 빌드를 계속 진행합니다"
        fi
    fi

    log_info "북마클 웹 대시보드 빌드 중..."
    if npm run build; then
        log_success "북마클 웹 대시보드 빌드 완료!"

        if [ -d "dist" ]; then
            BUILD_SIZE=$(du -sh dist | cut -f1)
            log_info "빌드 크기: $BUILD_SIZE"
            echo -e "${GREEN}📁 빌드 디렉토리: ${BLUE}$(pwd)/dist${NC}"
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

build_my_extension() {
    log_info "🧩 북마클 브라우저 확장 빌드 및 패키징..."

    if [ ! -d "bookmarkle-web-extension" ]; then
        log_error "bookmarkle-web-extension 디렉토리가 없습니다!"
        return 1
    fi

    cd bookmarkle-web-extension

    if [ ! -f "manifest.json" ]; then
        log_error "manifest.json이 없습니다!"
        cd "$ROOT_DIR"
        return 1
    fi

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

    REQUIRED_FILES=("background.js" "popup.html" "popup.js" "content-script.js" "manifest.json")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            log_warning "필수 파일이 없습니다: $file"
        else
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

    log_info "Vite 빌드 실행 중..."
    if npm run build; then
        log_success "Vite 빌드 완료"
    else
        log_error "Vite 빌드 실패"
        cd "$ROOT_DIR"
        return 1
    fi

    BUILD_DIR="../build/bookmarkle-web-extension"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    log_info "Extension 빌드 파일들을 빌드 디렉토리로 복사 중..."
    if [ -d "dist" ]; then
        cp -r dist/* "$BUILD_DIR/"
        log_success "빌드 파일 복사 완료"
    else
        log_error "dist 디렉토리를 찾을 수 없습니다"
        cd "$ROOT_DIR"
        return 1
    fi

    if [ -f "build-config.js" ]; then
        log_info "환경 변수 치환(build-config.js) 실행 중..."
        if node build-config.js; then
            log_success "환경 변수 치환 완료"
        else
            log_error "환경 변수 치환 실패"
            cd "$ROOT_DIR"
            return 1
        fi
    else
        log_warning "build-config.js 스크립트를 찾을 수 없습니다."
    fi

    if [ -f "$BUILD_DIR/.env" ] || [ -f "$BUILD_DIR/.env.local" ] || [ -f "$BUILD_DIR/.env.production" ]; then
        log_warning ".env 파일이 발견되었습니다. 삭제 중..."
        rm -f "$BUILD_DIR/.env" "$BUILD_DIR/.env.*" "$BUILD_DIR"/*.env 2>/dev/null || true
        log_success ".env 파일 제거 완료"
    fi

    cd ../build
    EXTENSION_ZIP="bookmarkle-web-extension-$(date '+%Y%m%d-%H%M%S').zip"
    log_info "확장 프로그램을 패키징 중: $EXTENSION_ZIP"

    zip -r "$EXTENSION_ZIP" bookmarkle-web-extension/ > /dev/null

    if [ -f "$EXTENSION_ZIP" ]; then
        PACKAGE_SIZE=$(du -sh "$EXTENSION_ZIP" | cut -f1)
        log_success "북마클 브라우저 확장 빌드 완료!"
        echo -e "${GREEN}📦 패키지 파일: ${BLUE}$(pwd)/$EXTENSION_ZIP${NC}"
        echo -e "${GREEN}📏 패키지 크기: ${BLUE}$PACKAGE_SIZE${NC}"
        echo -e "${GREEN}📁 빌드 디렉토리: ${BLUE}$(pwd)/bookmarkle-web-extension${NC}"

        log_info "Chrome 웹 스토어 개발자 대시보드에서 업로드하세요"
    else
        log_error "북마클 브라우저 확장 패키징 실패!"
        cd "$ROOT_DIR"
        return 1
    fi

    cd "$ROOT_DIR"
    return 0
}

case $PROJECT in
    "dashboard")
        build_dashboard
        ;;
    "my-extension")
        build_my_extension
        ;;
    "all")
        log_info "모든 프로젝트 빌드 시작..."

        SUCCESS_COUNT=0
        TOTAL_COUNT=2

        if build_dashboard; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            log_warning "대시보드 빌드 실패 또는 건너뜀"
        fi

        echo ""
        if build_my_extension; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            log_warning "Extension 빌드 실패 또는 건너뜀"
        fi

        echo ""
        if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
            log_success "모든 프로젝트 빌드 완료! ($SUCCESS_COUNT/$TOTAL_COUNT)"
        else
            log_warning "일부 프로젝트 빌드 완료 ($SUCCESS_COUNT/$TOTAL_COUNT)"
        fi

        echo ""
        echo -e "${BLUE}📋 빌드 결과 요약:${NC}"
        [ -d "bookmarkle-web-dashboard/dist" ] && echo "• 북마클 웹 대시보드: bookmarkle-web-dashboard/dist/ (호스팅 준비됨)"
        if compgen -G "build/bookmarkle-web-extension-*.zip" > /dev/null; then
            echo "• 북마클 브라우저 확장: build/bookmarkle-web-extension-*.zip (스토어 업로드 준비됨)"
        fi
        ;;
    *)
        log_error "알 수 없는 프로젝트: $PROJECT"
        log_info "사용 가능한 프로젝트: dashboard, my-extension, all"
        exit 1
        ;;
esac

echo ""
log_success "빌드 스크립트 완료!"
