# Ed Token Extension

A Chrome extension that extracts your Ed authentication token for use with the Ask-Ed application.

## Features

- Automatically extracts your Ed authentication token when visiting Ed platform
- Provides a convenient UI to copy the token
- Integrates with the Ask-Ed web application

## Development

This extension is part of the Ask-Ed monorepo and uses [Plasmo](https://www.plasmo.com/) for extension development.

```bash
# Run in development mode
bun dev

# Build for production
bun build

# Package the extension
bun package
```

## Installation

1. Build the extension with `bun build`
2. Go to `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `build/chrome-mv3-dev` directory

## Usage

1. Visit any Ed platform page
2. Click on the extension icon
3. Copy the displayed token
4. Paste it into the Ask-Ed web application when prompted
