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
NC='\033[0m' # No Color

# Log prefixes
SHARED_PREFIX="${PURPLE}[shared]${NC}"
WEB_PREFIX="${BLUE}[web]${NC}"
EXT_PREFIX="${CYAN}[extension]${NC}"
MAIN_PREFIX="${GREEN}[monorepo]${NC}"

echo -e "${MAIN_PREFIX} 🚀 Building all packages..."

# Function to run a command and prefix its output
run_with_prefix() {
  local cmd=$1
  local prefix=$2
  
  # Run the command and prefix each line of output
  echo -e "${MAIN_PREFIX} Running: $cmd"
  OLDIFS=$IFS
  IFS=$'\n'
  while read -r line; do
    echo -e "${prefix} ${line}"
  done < <(eval "$cmd 2>&1")
  local exit_code=${PIPESTATUS[0]}
  IFS=$OLDIFS
  
  return $exit_code
}

# Build in the correct order: shared → web & extension
echo -e "${MAIN_PREFIX} 📦 Building shared package..."
run_with_prefix "bun build:shared" "$SHARED_PREFIX"
if [ $? -ne 0 ]; then
  echo -e "${RED}[error]${NC} ❌ Shared package build failed"
  exit 1
fi

# Build web app
echo -e "${MAIN_PREFIX} 🌐 Building web app..."
run_with_prefix "bun build:web" "$WEB_PREFIX"
if [ $? -ne 0 ]; then
  echo -e "${RED}[error]${NC} ❌ Web app build failed"
  exit 1
fi

# Build extension
echo -e "${MAIN_PREFIX} 🧩 Building extension..."
run_with_prefix "bun build:extension" "$EXT_PREFIX"
if [ $? -ne 0 ]; then
  echo -e "${RED}[error]${NC} ❌ Extension build failed"
  exit 1
fi

echo -e "${MAIN_PREFIX} ✅ All packages built successfully!" 