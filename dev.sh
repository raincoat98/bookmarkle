#!/bin/bash

# 북마클 웹 대시보드 개발 서버 실행 스크립트
# 사용법: ./dev.sh

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
echo "🚀 북마클 웹 대시보드 개발 서버"
echo "==============================="
echo -e "${NC}"

# 루트 디렉토리 저장
ROOT_DIR=$(pwd)

# 포트 사용 중인 프로세스 자동 종료
cleanup_ports() {
    log_info "포트 정리 중..."

    # 포트 3000 정리
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "포트 3000 사용 중인 프로세스를 종료합니다..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    log_success "포트 정리 완료"
}

# 북마클 웹 대시보드 서버 시작
start_dashboard() {
    log_info "📊 북마클 웹 대시보드 서버 시작..."
    
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
    
    # 백그라운드에서 서버 시작
    npm run dev -- --port 3000 --host &
    DASHBOARD_PID=$!
    
    cd "$ROOT_DIR"
    log_success "북마클 웹 대시보드 서버 시작됨 (PID: $DASHBOARD_PID)"
}

# 서버 상태 확인
check_server() {
    log_info "서버 상태 확인 중..."
    sleep 3

    # 대시보드 서버 확인
    if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
        log_error "북마클 웹 대시보드 서버 시작 실패"
        return 1
    fi

    log_success "서버가 정상 시작됨"
}

# 메인 실행
main() {
    # 포트 정리
    cleanup_ports

    # 서버 시작
    start_dashboard

    # 서버 상태 확인
    if check_server; then
        echo ""
        log_success "🎉 서버가 시작되었습니다!"
        echo ""
        echo -e "${GREEN}🌐 북마클 웹 대시보드: ${BLUE}http://localhost:3000${NC}"
        echo ""
        echo -e "${YELLOW}서버를 중지하려면 Ctrl+C를 누르세요${NC}"
        echo ""

        # 프로세스 정리 함수
        cleanup() {
            echo ""
            log_info "서버를 종료하는 중..."
            kill $DASHBOARD_PID 2>/dev/null || true
            # 포트 정리
            lsof -ti :3000 | xargs kill -9 2>/dev/null || true
            log_success "서버가 종료되었습니다"
            exit 0
        }

        # 시그널 핸들러 등록
        trap cleanup SIGINT SIGTERM

        # 서버 상태 모니터링
        while true; do
            if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
                log_error "북마클 웹 대시보드 서버가 종료되었습니다"
                break
            fi
            sleep 1
        done
    else
        log_error "서버 시작에 실패했습니다"
        # 실패한 서버 정리
        kill $DASHBOARD_PID 2>/dev/null || true
        exit 1
    fi
}

# 스크립트 실행
main
