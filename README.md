# Ask-Ed Monorepo

This monorepo contains:

1. `@ask-ed/web` - Next.js web application
2. `@ask-ed/extension` - Plasmo browser extension for extracting Ed tokens
3. `@ask-ed/shared` - Shared package with types and DB schema

## Setup

This project uses [Bun](https://bun.sh/) as the package manager and runtime:

```bash
# Quick setup with our script
bun setup

# Or manually:
bun install
bun build:shared
```

## Development

### All Packages

Two different modes are available for developing all packages simultaneously:

```bash
# Dashboard mode: Periodically refreshes with logs from all packages in one view
bun dev

# Split screen mode: Uses tmux to create split panes for each package (requires tmux)
bun dev:split
```

#### Dashboard Mode
The dashboard mode (`bun dev`) displays a refreshing dashboard with the most recent logs from each package. The screen updates every 5 seconds to show the latest outputs.

#### Split Screen Mode
The split screen mode (`bun dev:split`) uses tmux to create a split view with:
- The shared package in the top pane
- The web app in the bottom-left pane
- The extension in the bottom-right pane

This mode requires [tmux](https://github.com/tmux/tmux) to be installed on your system.

### Individual Packages

If you prefer to work on packages individually:

```bash
# Shared Package
bun dev:shared

# Web App
bun dev:web

# Browser Extension
bun dev:extension
```

## Building for Production

To build all packages in the correct order:

```bash
# Build everything
bun build
```

Or build packages individually:

```bash
# Build specific packages
bun build:shared
bun build:web
bun build:extension

# Package extension for distribution
bun package:extension
```

## Extension Features

The browser extension automatically extracts the Ed authentication token and makes it available for the Ask-Ed web application.

1. Install the extension
2. Visit any Ed platform page
3. The extension will automatically extract your authentication token
4. Copy the token from the extension popup
5. Use it in the Ask-Ed web application

## Database

The project uses Drizzle ORM with a shared database schema.

```bash
# Generate migrations
bun --cwd packages/shared drizzle-kit generate

# Apply migrations
bun --cwd packages/web db:migrate
```
