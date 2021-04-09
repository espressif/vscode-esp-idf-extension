#!/usr/bin/env bash
set -e

. $IDF_PATH/export.sh

# cat /github/workspace/README.md
exec "$1"