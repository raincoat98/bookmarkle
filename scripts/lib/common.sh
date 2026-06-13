# shellcheck shell=bash
# 공통 헬퍼 — 모든 스크립트에서 source 해서 사용

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

# 호출한 스크립트의 위치 기준으로 프로젝트 루트(scripts/의 상위) 진입
enter_project_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
  ROOT_DIR="$(cd "$script_dir/.." && pwd)"
  cd "$ROOT_DIR"
}
