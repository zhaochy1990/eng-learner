#!/bin/bash
# Download ECDICT SQLite database
# Source: https://github.com/skywind3000/ECDICT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
ECDICT_DB="$DATA_DIR/ecdict.db"

mkdir -p "$DATA_DIR"

if [ -f "$ECDICT_DB" ]; then
  echo "ECDICT database already exists at $ECDICT_DB"
  exit 0
fi

echo "Downloading ECDICT database..."

# Try downloading from GitHub releases
ECDICT_URL="https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip"
TEMP_ZIP="$DATA_DIR/ecdict.zip"

curl -L -o "$TEMP_ZIP" "$ECDICT_URL"

if [ $? -eq 0 ] && [ -f "$TEMP_ZIP" ]; then
  echo "Extracting ECDICT database..."
  cd "$DATA_DIR"
  unzip -o "$TEMP_ZIP"

  # The zip contains stardict.db, rename it
  if [ -f "stardict.db" ]; then
    mv stardict.db ecdict.db
    echo "ECDICT database downloaded and extracted to $ECDICT_DB"
  else
    echo "Extraction succeeded but stardict.db not found. Checking contents..."
    ls -la "$DATA_DIR"
  fi

  rm -f "$TEMP_ZIP"
else
  echo "Failed to download ECDICT database."
  echo "Please download manually from: $ECDICT_URL"
  echo "Extract and place the .db file as: $ECDICT_DB"
  exit 1
fi
