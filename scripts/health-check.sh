#!/usr/bin/env bash
# health-check.sh — ensure codesidekick-mothership dev server is running
# Called by launchd every hour

PROJECT_DIR="/Users/dylanburkey/dev/projects/codesidekick-mothership"
LOG_FILE="$PROJECT_DIR/logs/dev-server.log"
PORT=5173

mkdir -p "$PROJECT_DIR/logs"

# Check if dev server is responding
if curl -sf "http://localhost:$PORT" > /dev/null 2>&1; then
  echo "$(date): ✓ Dev server healthy on :$PORT" >> "$LOG_FILE"
  exit 0
fi

echo "$(date): ✗ Dev server down — restarting..." >> "$LOG_FILE"

# Kill any orphaned vite processes
pkill -f "vite.*$PORT" 2>/dev/null || true

# Source nvm / volta / brew node so pnpm is on PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
export PATH="$HOME/.volta/bin:$HOME/.local/share/pnpm:/opt/homebrew/bin:$PATH"

# Start dev server in background
cd "$PROJECT_DIR"
nohup pnpm dev --port $PORT >> "$LOG_FILE" 2>&1 &
DEVPID=$!

echo "$(date): Started dev server (PID $DEVPID)" >> "$LOG_FILE"

# Wait for it to come up (max 30s)
for i in $(seq 1 30); do
  sleep 1
  if curl -sf "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "$(date): ✓ Dev server online after ${i}s" >> "$LOG_FILE"
    exit 0
  fi
done

echo "$(date): ✗ Dev server failed to start within 30s" >> "$LOG_FILE"
exit 1
