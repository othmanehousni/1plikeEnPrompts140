#!/bin/bash

# Setup script for Ask-Ed monorepo

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

echo -e "${MAIN_PREFIX} 🚀 Setting up Ask-Ed monorepo..."

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

# Install all dependencies
echo -e "${MAIN_PREFIX} 📦 Installing dependencies..."
run_with_prefix "bun install" "${MAIN_PREFIX}"
if [ $? -ne 0 ]; then
  echo -e "${RED}[error]${NC} ❌ Dependency installation failed"
  exit 1
fi

# Build shared package first
echo -e "${MAIN_PREFIX} 🔨 Building shared package..."
run_with_prefix "bun build:shared" "$SHARED_PREFIX"
if [ $? -ne 0 ]; then
  echo -e "${RED}[error]${NC} ❌ Shared package build failed"
  exit 1
fi

# Create necessary directories for the packages that might be missing
echo -e "${MAIN_PREFIX} 📁 Creating necessary directories..."
mkdir -p packages/shared/dist

echo -e "${MAIN_PREFIX} ✅ Setup complete! You can now run one of the following commands:"
echo -e "${MAIN_PREFIX} • ${YELLOW}bun dev${NC}       - Start all development servers"
echo -e "${MAIN_PREFIX} • ${YELLOW}bun dev:web${NC}   - Start the web app"
echo -e "${MAIN_PREFIX} • ${YELLOW}bun dev:extension${NC} - Start the browser extension"
echo -e "${MAIN_PREFIX} • ${YELLOW}bun dev:shared${NC} - Watch for changes in the shared package"
echo -e ""
echo -e "${MAIN_PREFIX} ⚠️  Note: If you encounter module resolution issues, try running '${YELLOW}bun build:shared${NC}' first" 