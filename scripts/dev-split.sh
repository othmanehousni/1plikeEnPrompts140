#!/bin/bash

# Make sure we're in the project root
cd "$(dirname "$0")/.." || exit

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Log prefixes
SHARED_PREFIX="${PURPLE}[shared]${NC}"
WEB_PREFIX="${BLUE}[web]${NC}"
EXT_PREFIX="${CYAN}[extension]${NC}"
MAIN_PREFIX="${GREEN}[monorepo]${NC}"

echo -e "${MAIN_PREFIX} 🚀 Starting development servers with split view..."

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}[error]${NC} tmux is not installed. Please install tmux to use this script."
    echo -e "Alternatively, use 'bun dev' to run with the dashboard view."
    exit 1
fi

# Clean up function to kill all processes
cleanup() {
  echo -e "${MAIN_PREFIX} 🛑 Stopping all development servers..."
  tmux kill-session -t askEd 2>/dev/null
  exit 0
}

# Set up trap to clean up processes on exit
trap cleanup EXIT INT TERM

# Create a new tmux session
tmux new-session -d -s askEd -n development

# Split the window into three panes
# Main layout: top for shared, bottom split for web and extension
tmux split-window -t askEd:0 -v -p 70
tmux split-window -t askEd:0.1 -h -p 50

# Start shared package in the top pane with proper title and coloring
tmux send-keys -t askEd:0.0 "echo -e '${PURPLE}==================== SHARED PACKAGE ====================${NC}'; bun --cwd packages/shared dev | sed -e 's/^/${PURPLE}[shared]${NC} /'" C-m

# Wait a moment to ensure shared package has started building
sleep 2

# Start web app in the bottom-left pane
tmux send-keys -t askEd:0.1 "echo -e '${BLUE}==================== WEB APP ====================${NC}'; bun --cwd packages/web dev | sed -e 's/^/${BLUE}[web]${NC} /'" C-m

# Start extension in the bottom-right pane
tmux send-keys -t askEd:0.2 "echo -e '${CYAN}==================== EXTENSION ====================${NC}'; bun --cwd packages/extension dev | sed -e 's/^/${CYAN}[extension]${NC} /'" C-m

# Attach to the tmux session
tmux attach-session -t askEd

# When tmux detaches, we'll hit the cleanup function through the trap 