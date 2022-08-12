#!/usr/bin/env bash
set -e

export OLD_PATH=$PATH

. $IDF_PATH/export.sh

cd /github/workspace

pip install --upgrade pip
pip install -r requirements.txt

export GIT_VERSION=$( echo "$a" | echo $(git --version) | sed -nre 's/^[^0-9]*(([0-9]+\.)*[0-9]+).*/\1/p')
export IDF_VERSION=$( echo "$a" | echo $(idf.py --version) | sed -nre 's/^[^0-9]*(([0-9]+\.)*[0-9]+).*/\1/p')
export PY_VERSION=$( echo "$a" | echo $(python --version) | sed -nre 's/^[^0-9]*(([0-9]+\.)*[0-9]+).*/\1/p')
export PIP_VERSION=$( echo "$a" | echo $(python -m pip --version) | sed -nre 's/^[^0-9]*(([0-9]+\.)*[0-9]+).*/\1/p')
export PY_PKGS=$(python -m pip list --format json)

rm -rf node_modules out test-resources
yarn
yarn lint
Xvfb -ac :99 -screen 0 1920x1080x16 & sleep 2 & yarn ci-test
