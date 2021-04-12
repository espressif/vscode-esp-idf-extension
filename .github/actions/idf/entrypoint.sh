#!/usr/bin/env bash
set -e

. $IDF_PATH/export.sh

cd /github/workspace

pip install -r requirements.txt
pip install -r esp_debug_adapter/requirements.txt

yarn
yarn lint
Xvfb :99 & sleep 2
tsc -p ./
node ./out/test/runTest.js --VERBOSE >> testing.results.log
echo ::set-output name=result::$(cat testing.results.log)