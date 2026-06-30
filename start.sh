#!/usr/bin/env bash
# Splendor Monsters TS - 启动脚本

set -euo pipefail

HTTP_PORT="${SPLENDOR_HTTP_PORT:-19988}"
FOREGROUND=false
BUILD_DASHBOARD=true
STOP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --port) HTTP_PORT="$2"; shift 2 ;;
    --foreground|-f) FOREGROUND=true; shift ;;
    --skip-dashboard-build) BUILD_DASHBOARD=false; shift ;;
    --stop) STOP=true; shift ;;
    -h|--help)
      echo "用法: $0 [--port PORT] [--foreground] [--skip-dashboard-build] [--stop]"
      exit 0
      ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

if [[ "$STOP" == "true" ]]; then
  kill_port "$HTTP_PORT"
  echo "端口 $HTTP_PORT 上的服务已停止"
  exit 0
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null 2>&1 || true

if [[ "$BUILD_DASHBOARD" == "true" ]]; then
  npm run build:dashboard
fi

kill_port "$HTTP_PORT"
export SPLENDOR_HTTP_PORT="$HTTP_PORT"
export SPLENDOR_HTTP_HOST="${SPLENDOR_HTTP_HOST:-127.0.0.1}"

mkdir -p logs
LOG_FILE="logs/splendor-monsters.log"

echo "Splendor Monsters TS: http://localhost:${HTTP_PORT}"

if [[ "$FOREGROUND" == "true" ]]; then
  exec npm run start 2>&1 | tee -a "$LOG_FILE"
else
  nohup npm run start >> "$LOG_FILE" 2>&1 &
  echo "服务已后台启动，日志: $LOG_FILE"
fi
