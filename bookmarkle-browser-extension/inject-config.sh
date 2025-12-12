
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
IFRAME_PUBLIC_SIGN_URL_VALUE="${IFRAME_PUBLIC_SIGN_URL}"

# Firebase 환경변수 값
FIREBASE_API_KEY_VALUE="${VITE_FIREBASE_API_KEY}"
FIREBASE_AUTH_DOMAIN_VALUE="${VITE_FIREBASE_AUTH_DOMAIN}"
FIREBASE_PROJECT_ID_VALUE="${VITE_FIREBASE_PROJECT_ID}"
FIREBASE_STORAGE_BUCKET_VALUE="${VITE_FIREBASE_STORAGE_BUCKET}"
FIREBASE_MESSAGING_SENDER_ID_VALUE="${VITE_FIREBASE_MESSAGING_SENDER_ID}"
FIREBASE_APP_ID_VALUE="${VITE_FIREBASE_APP_ID}"

 # 빌드 디렉토리 내 모든 .js, .html 파일을 대상으로 치환
TARGET_FILES=( $(find "$BUILD_DIR" -type f \( -name "*.js" -o -name "*.html" \) ) )

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    for file in "${TARGET_FILES[@]}"; do
        if [ -f "$file" ]; then
            sed -i '' "s|_PUBLIC_SIGN_URL_|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i '' "s|_PUBLIC_START_PAGE_URL_|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            sed -i '' "s|_IFRAME_PUBLIC_SIGN_URL_|${IFRAME_PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i '' "s|__ENV_PUBLIC_SIGN_URL__|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i '' "s|__ENV_PUBLIC_START_PAGE_URL__|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            sed -i '' "s|__ENV_IFRAME_PUBLIC_SIGN_URL__|${IFRAME_PUBLIC_SIGN_URL_VALUE}|g" "$file"

            # Firebase 환경변수 치환
            sed -i '' "s|_FIREBASE_API_KEY_|${FIREBASE_API_KEY_VALUE}|g" "$file"
            sed -i '' "s|_FIREBASE_AUTH_DOMAIN_|${FIREBASE_AUTH_DOMAIN_VALUE}|g" "$file"
            sed -i '' "s|_FIREBASE_PROJECT_ID_|${FIREBASE_PROJECT_ID_VALUE}|g" "$file"
            sed -i '' "s|_FIREBASE_STORAGE_BUCKET_|${FIREBASE_STORAGE_BUCKET_VALUE}|g" "$file"
            sed -i '' "s|_FIREBASE_MESSAGING_SENDER_ID_|${FIREBASE_MESSAGING_SENDER_ID_VALUE}|g" "$file"
            sed -i '' "s|_FIREBASE_APP_ID_|${FIREBASE_APP_ID_VALUE}|g" "$file"
        fi
    done
else
    # Linux
    for file in "${TARGET_FILES[@]}"; do
        if [ -f "$file" ]; then
            sed -i "s|_PUBLIC_SIGN_URL_|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i "s|_PUBLIC_START_PAGE_URL_|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            sed -i "s|_IFRAME_PUBLIC_SIGN_URL_|${IFRAME_PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i "s|__ENV_PUBLIC_SIGN_URL__|${PUBLIC_SIGN_URL_VALUE}|g" "$file"
            sed -i "s|__ENV_PUBLIC_START_PAGE_URL__|${PUBLIC_START_PAGE_URL_VALUE}|g" "$file"
            sed -i "s|__ENV_IFRAME_PUBLIC_SIGN_URL__|${IFRAME_PUBLIC_SIGN_URL_VALUE}|g" "$file"

            # Firebase 환경변수 치환
            sed -i "s|_FIREBASE_API_KEY_|${FIREBASE_API_KEY_VALUE}|g" "$file"
            sed -i "s|_FIREBASE_AUTH_DOMAIN_|${FIREBASE_AUTH_DOMAIN_VALUE}|g" "$file"
            sed -i "s|_FIREBASE_PROJECT_ID_|${FIREBASE_PROJECT_ID_VALUE}|g" "$file"
            sed -i "s|_FIREBASE_STORAGE_BUCKET_|${FIREBASE_STORAGE_BUCKET_VALUE}|g" "$file"
            sed -i "s|_FIREBASE_MESSAGING_SENDER_ID_|${FIREBASE_MESSAGING_SENDER_ID_VALUE}|g" "$file"
            sed -i "s|_FIREBASE_APP_ID_|${FIREBASE_APP_ID_VALUE}|g" "$file"
        fi
    done
fi

log_success "모든 JavaScript 파일에 환경 변수 주입 완료"
log_info "PUBLIC_SIGN_URL: $PUBLIC_SIGN_URL_VALUE"
log_info "PUBLIC_START_PAGE_URL: $PUBLIC_START_PAGE_URL_VALUE"
log_info "IFRAME_PUBLIC_SIGN_URL: $IFRAME_PUBLIC_SIGN_URL_VALUE"
log_info "FIREBASE_API_KEY: $FIREBASE_API_KEY_VALUE"
log_info "FIREBASE_AUTH_DOMAIN: $FIREBASE_AUTH_DOMAIN_VALUE"
log_info "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID_VALUE"
log_info "FIREBASE_STORAGE_BUCKET: $FIREBASE_STORAGE_BUCKET_VALUE"
log_info "FIREBASE_MESSAGING_SENDER_ID: $FIREBASE_MESSAGING_SENDER_ID_VALUE"
log_info "FIREBASE_APP_ID: $FIREBASE_APP_ID_VALUE"

