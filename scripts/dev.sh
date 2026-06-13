#!/bin/bash

# 북마클 웹 대시보드 개발 서버 실행 스크립트
# 사용법: ./scripts/dev.sh

set -e

# 공통 헬퍼 로드 후 프로젝트 루트로 진입
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
enter_project_root

echo -e "${BLUE}"
echo "🚀 북마클 웹 대시보드 개발 서버"
echo "==============================="
echo -e "${NC}"

cleanup_ports() {
    log_info "포트 정리 중..."

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "포트 3000 사용 중인 프로세스를 종료합니다..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    log_success "포트 정리 완료"
}

start_dashboard() {
    log_info "📊 북마클 웹 대시보드 서버 시작..."

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
    fi

    npm run dev -- --port 3000 --host &
    DASHBOARD_PID=$!

    cd "$ROOT_DIR"
    log_success "북마클 웹 대시보드 서버 시작됨 (PID: $DASHBOARD_PID)"
}

check_server() {
    log_info "서버 상태 확인 중..."
    sleep 3

    if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
        log_error "북마클 웹 대시보드 서버 시작 실패"
        return 1
    fi

    log_success "서버가 정상 시작됨"
}

main() {
    cleanup_ports
    start_dashboard

    if check_server; then
        echo ""
        log_success "🎉 서버가 시작되었습니다!"
        echo ""
        echo -e "${GREEN}🌐 북마클 웹 대시보드: ${BLUE}http://localhost:3000${NC}"
        echo ""
        echo -e "${YELLOW}서버를 중지하려면 Ctrl+C를 누르세요${NC}"
        echo ""

        cleanup() {
            echo ""
            log_info "서버를 종료하는 중..."
            kill $DASHBOARD_PID 2>/dev/null || true
            lsof -ti :3000 | xargs kill -9 2>/dev/null || true
            log_success "서버가 종료되었습니다"
            exit 0
        }

        trap cleanup SIGINT SIGTERM

        while true; do
            if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
                log_error "북마클 웹 대시보드 서버가 종료되었습니다"
                break
            fi
            sleep 1
        done
    else
        log_error "서버 시작에 실패했습니다"
        kill $DASHBOARD_PID 2>/dev/null || true
        exit 1
    fi
}

main
