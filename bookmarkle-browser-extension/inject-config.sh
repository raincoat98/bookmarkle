#!/bin/bash

# 빌드 디렉토리의 config.js에 환경 변수 주입 스크립트
# 사용법: ./inject-config.sh [빌드 디렉토리 경로]
# 빌드 디렉토리가 지정되지 않으면 현재 디렉토리 사용

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 빌드 디렉토리 경로 (첫 번째 인자 또는 현재 디렉토리)
BUILD_DIR="${1:-.}"

# config.js 파일 경로
CONFIG_FILE="$BUILD_DIR/config.js"

# config.js 파일 확인
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "config.js 파일을 찾을 수 없습니다: $CONFIG_FILE"
    exit 1
fi

log_info "환경 변수로 JavaScript 파일들에 설정 주입 중... (빌드 디렉토리: $BUILD_DIR)"

# .env 파일에서 환경 변수 읽기 (소스 디렉토리에서)
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SOURCE_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    log_info ".env 파일에서 환경 변수 로드 중..."
    # .env 파일을 source하여 환경 변수 로드
    set -a
    source "$ENV_FILE"
    set +a
    log_success ".env 파일 로드 완료"
else
    log_warning ".env 파일을 찾을 수 없습니다: $ENV_FILE"
fi

PUBLIC_SIGN_URL_VALUE="${PUBLIC_SIGN_URL}"
PUBLIC_START_PAGE_URL_VALUE="${PUBLIC_START_PAGE_URL}"

# 치환할 파일 목록
JS_FILES=(
    "$CONFIG_FILE"
    "$BUILD_DIR/background.js"
    "$BUILD_DIR/newtab.js"
    "$BUILD_DIR/options.js"
    "$BUILD_DIR/offscreen.js"
)

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    for file in "${JS_FILES[@]}"; do
        if [ -f "$file" ]; then
            # "_PUBLIC_SIGN_URL_" 형식: 따옴표 없이 값만 치환 (문자열 리터럴)
            sed -i '' "s|_PUBLIC_SIGN_URL_|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i '' "s|_PUBLIC_START_PAGE_URL_|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            # "__ENV_...__" 형식: 따옴표 없이 값만 치환
            sed -i '' "s|__ENV_PUBLIC_SIGN_URL__|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i '' "s|__ENV_PUBLIC_START_PAGE_URL__|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
        fi
    done
else
    # Linux
    for file in "${JS_FILES[@]}"; do
        if [ -f "$file" ]; then
            # "_PUBLIC_SIGN_URL_" 형식: 따옴표 없이 값만 치환 (문자열 리터럴)
            sed -i "s|_PUBLIC_SIGN_URL_|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i "s|_PUBLIC_START_PAGE_URL_|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            # "__ENV_...__" 형식: 따옴표 없이 값만 치환
            sed -i "s|__ENV_PUBLIC_SIGN_URL__|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i "s|__ENV_PUBLIC_START_PAGE_URL__|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
        fi
    done
fi

log_success "모든 JavaScript 파일에 환경 변수 주입 완료"
log_info "PUBLIC_SIGN_URL: $PUBLIC_SIGN_URL_VALUE"
log_info "PUBLIC_START_PAGE_URL: $PUBLIC_START_PAGE_URL_VALUE"

