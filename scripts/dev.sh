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

# Get terminal width for truncating logs
TERM_WIDTH=$(tput cols 2>/dev/null || echo 80)
MAX_LOG_WIDTH=$((TERM_WIDTH - 20))  # Account for prefix and some padding

# Maximum number of lines to keep in buffer for each package
BUFFER_LINES=5

echo -e "${MAIN_PREFIX} 🚀 Starting development servers for all packages..."

# Function to run a command in the background and pipe output through a prefix with limited history
run_with_prefix() {
  local name=$1
  local cmd=$2
  local prefix=$3
  
  # Create a temporary file for the command output
  local fifo="/tmp/monorepo_$name.$$"
  mkfifo "$fifo"
  
  # Create a temporary log file to store the most recent lines
  local log_file="/tmp/monorepo_$name.log.$$"
  touch "$log_file"
  
  # Start a background process to read from the fifo, add prefixes, and maintain a limited buffer
  {
    while IFS= read -r line; do
      # Truncate long lines
      if [ ${#line} -gt $MAX_LOG_WIDTH ]; then
        line="${line:0:$((MAX_LOG_WIDTH - 3))}..."
      fi
      
      # Add timestamp
      timestamp=$(date "+%H:%M:%S")
      
      # Format the log line
      log_line="${prefix} ${GRAY}${timestamp}${NC} ${line}"
      
      # Print the line to stdout
      echo -e "$log_line"
      
      # Update the log file (limited buffer)
      echo "$log_line" >> "$log_file"
      
      # Keep only the last BUFFER_LINES lines
      if [ $(wc -l < "$log_file") -gt $BUFFER_LINES ]; then
        tail -n $BUFFER_LINES "$log_file" > "${log_file}.tmp"
        mv "${log_file}.tmp" "$log_file"
      fi
    done < "$fifo"
  } &
  local prefix_pid=$!
  
  # Store the prefix process PID so we can kill it later
  echo "$prefix_pid" > ".pid_${name}_prefix"
  
  # Run the actual command and redirect output to the fifo
  eval "$cmd > $fifo 2>&1" &
  local cmd_pid=$!
  
  # Store the command PID
  echo "$cmd_pid" > ".pid_$name"
  
  # Clean up the fifo when the command exits
  (
    wait "$cmd_pid"
    rm -f "$fifo" "$log_file"
    kill "$prefix_pid" 2>/dev/null
  ) &
}

# Function to print status dashboard
print_status() {
  clear
  echo -e "\n${MAIN_PREFIX} 📊 Ask-Ed Monorepo Development Dashboard 📊\n"
  
  # Function to print recent logs from a package
  print_package_logs() {
    local name=$1
    local prefix=$2
    local log_file="/tmp/monorepo_$name.log.$$"
    
    echo -e "\n${prefix} Recent logs:"
    echo -e "${GRAY}----------------------------------------${NC}"
    
    if [ -f "$log_file" ]; then
      cat "$log_file"
    else
      echo -e "${GRAY}No logs yet...${NC}"
    fi
    
    echo -e "${GRAY}----------------------------------------${NC}"
  }
  
  # Print status for each package
  print_package_logs "shared" "$SHARED_PREFIX"
  print_package_logs "web" "$WEB_PREFIX"
  print_package_logs "extension" "$EXT_PREFIX"
  
  echo -e "\n${MAIN_PREFIX} Press ${YELLOW}Ctrl+C${NC} to stop all servers\n"
}

# Clean up function to kill all background processes
cleanup() {
  echo -e "${MAIN_PREFIX} 🛑 Stopping all development servers..."
  for pid_file in .pid_*; do
    if [ -f "$pid_file" ]; then
      pid=$(cat "$pid_file")
      echo -e "${MAIN_PREFIX} Stopping process $pid..."
      kill "$pid" 2>/dev/null
      rm "$pid_file"
    fi
  done
  
  # Remove temp files
  rm -f /tmp/monorepo_*.$$
  
  # Final goodbye
  echo -e "${MAIN_PREFIX} ✅ All processes stopped successfully"
  exit 0
}

# Set up trap to clean up processes on exit
trap cleanup EXIT INT TERM

# Build shared package first (in watch mode)
echo -e "${MAIN_PREFIX} 🔨 Starting shared package watcher..."
run_with_prefix "shared" "bun --cwd packages/shared dev" "$SHARED_PREFIX"

# Wait a moment to ensure shared package has started building
sleep 2

# Start web app
echo -e "${MAIN_PREFIX} 🌐 Starting web app..."
run_with_prefix "web" "bun --cwd packages/web dev" "$WEB_PREFIX"

# Start extension
echo -e "${MAIN_PREFIX} 🧩 Starting extension..."
run_with_prefix "extension" "bun --cwd packages/extension dev" "$EXT_PREFIX"

echo -e "${MAIN_PREFIX} ✅ All development servers started!"

# Initialize the status display
print_status

# Set up a timer to refresh the status periodically
while true; do
  sleep 5
  print_status
done 