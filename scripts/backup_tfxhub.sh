#!/usr/bin/env bash
set -euo pipefail
TARGET=${1:-local}         # local|rclone|s3|azure
TARGET_PATH=${2:-/mnt/backup}
ENCRYPT=${ENCRYPT:-0}      # set ENCRYPT=1 to enable
PASS=${BACKUP_PASSPHRASE:-""}
INCLUDE_GIT=${INCLUDE_GIT:-true}
NOW=$(date +%Y%m%d-%H%M%S)
REPO_ROOT="$(pwd)"
OUT_DIR="$REPO_ROOT/out"
mkdir -p "$OUT_DIR"
TMPDIR=$(mktemp -d -t tfxhub_backup_$NOW)
echo "Snapshot to $TMPDIR"
if [ "$INCLUDE_GIT" != "true" ]; then
  rsync -a --exclude='.git' "$REPO_ROOT/" "$TMPDIR/"
else
  rsync -a "$REPO_ROOT/" "$TMPDIR/"
fi
ARCHIVE_NAME="tfxhub-backup-$NOW.tar.gz"
ARCHIVE_PATH="$OUT_DIR/$ARCHIVE_NAME"
tar -C "$TMPDIR" -czf "$ARCHIVE_PATH" .
if [ "$ENCRYPT" = "1" ]; then
  if [ -z "$PASS" ]; then echo "Set BACKUP_PASSPHRASE env var"; exit 2; fi
  ENC_PATH="$ARCHIVE_PATH.enc"
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$ARCHIVE_PATH" -out "$ENC_PATH" -pass pass:"$PASS"
  rm -f "$ARCHIVE_PATH"
  ARCHIVE_PATH="$ENC_PATH"
fi
sha256sum "$ARCHIVE_PATH" > "$ARCHIVE_PATH.sha256"
case "$TARGET" in
  local)
    mkdir -p "$TARGET_PATH"
    cp "$ARCHIVE_PATH" "$TARGET_PATH/"
    cp "$ARCHIVE_PATH.sha256" "$TARGET_PATH/"
    ;;
  rclone)
    rclone copyto "$ARCHIVE_PATH" "$TARGET_PATH/$(basename $ARCHIVE_PATH)"
    rclone copyto "$ARCHIVE_PATH.sha256" "$TARGET_PATH/$(basename $ARCHIVE_PATH.sha256)"
    ;;
  s3)
    aws s3 cp "$ARCHIVE_PATH" "s3://$TARGET_PATH/"
    aws s3 cp "$ARCHIVE_PATH.sha256" "s3://$TARGET_PATH/"
    ;;
  azure)
    IFS='/' read -r container prefix <<< "$TARGET_PATH"
    az storage blob upload --container-name "$container" --file "$ARCHIVE_PATH" --name "$prefix/$(basename $ARCHIVE_PATH)"
    az storage blob upload --container-name "$container" --file "$ARCHIVE_PATH.sha256" --name "$prefix/$(basename $ARCHIVE_PATH.sha256)"
    ;;
  *)
    echo "Unknown target $TARGET"; exit 2
    ;;
esac
rm -rf "$TMPDIR"
echo "Backup complete: $ARCHIVE_PATH"
