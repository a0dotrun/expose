#!/usr/bin/env bash
set -eu

##############################################################################
# Expose CLI Install Script
#
# This script downloads the latest stable 'expose-cli' binary from GitHub releases
# and installs it to your system.
#
# Supported OS: macOS (darwin), Linux
# Supported Architectures: x86_64, arm64
#
# Usage:
#   curl -fsSL https://github.com/a0dotrun/expose/releases/download/stable/install.sh | bash
#
##############################################################################

# --- 1) Check for curl ---
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: 'curl' is required to download Expose CLI. Please install curl and try again."
  exit 1
fi

# --- 2) Detect OS/Architecture ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux) OS_ID="unknown-linux-gnu" ;;
  darwin) OS_ID="apple-darwin" ;;
  *)
    echo "Error: Unsupported OS '$OS'. Expose CLI only supports Linux and macOS."
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64)
    ARCH_ID="x86_64"
    ;;
  arm64|aarch64)
    ARCH_ID="aarch64"
    ;;
  *)
    echo "Error: Unsupported architecture '$ARCH'. Expose CLI supports x86_64 and arm64."
    exit 1
    ;;
esac

# --- 3) Set download URL ---
REPO="a0dotrun/expose"
INSTALL_DIR="${EXPOSE_BIN_DIR:-"$HOME/.local/bin"}"
FILE="expose-cli-${ARCH_ID}-${OS_ID}.tar.bz2"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/stable/$FILE"

# --- 4) Download the binary ---
echo "Downloading $FILE from $DOWNLOAD_URL..."
curl -sLf "$DOWNLOAD_URL" --output "$FILE"

# --- 5) Extract & Install ---
mkdir -p "$INSTALL_DIR"
tar -xjf "$FILE" -C "$INSTALL_DIR"
rm "$FILE"

# Ensure it's executable
chmod +x "$INSTALL_DIR/expose-cli"

echo "✅ Expose CLI installed successfully at $INSTALL_DIR/expose-cli"

# --- 6) Add to PATH if needed ---
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "Warning: Expose CLI installed, but $INSTALL_DIR is not in your PATH."
  echo "Add it by running:"
  echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
  echo "Then reload your shell (e.g. 'source ~/.bashrc', 'source ~/.zshrc')."
fi

echo "Run 'expose-cli --help' to get started!"
