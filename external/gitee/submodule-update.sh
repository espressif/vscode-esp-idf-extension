#!/bin/bash
#
# Redirects git submodules to gitee mirrors and updates these recursively.
#
# To revert the changed URLs use 'git submodule deinit .'
#

# -----------------------------------------------------------------------------
# Common bash

if [[ ! -z ${DEBUG_SHELL} ]]
then
  set -x # Activate the expand mode if DEBUG is anything but empty.
fi

set -o errexit # Exit if command failed.
set -o pipefail # Exit if pipe failed.
set -o nounset # Exit if variable not set.

die() {
    echo "${1:-"Unknown Error"}" 1>&2
    exit 1
}

check_git_version() {
    currentver="$(echo $(git --version 2>&1 |awk 'NR==1{gsub(/"/,"");print $3}'))"
    requiredver="2.11.0"
    if [ "$(printf '%s\n' "$requiredver" "$currentver" | sort -V | head -n1)" = "$requiredver" ]; then
        # Greater than or equal to 2.11.0
        true
    else
        # Less than 2.11.0
        false
    fi
}

# -----------------------------------------------------------------------------

ERR_CANNOT_UPDATE=13

REPO_DIR=${1:-"${PWD}"}
REPO_DIR=$(cd ${REPO_DIR} && pwd -P)

SCRIPT_SH=$(cd "$(dirname "${0}")" && pwd -P)/$(basename "${0}")

[ -d "${REPO_DIR}" ] || die "${REPO_DIR} is not directory!"
[ -f "${SCRIPT_SH}" ] || die "${SCRIPT_SH} does not exist!"

## repo group
REPOS_ARRAY=(
esp-idf                 espressifsystems
esp-rainmaker           espressifsystems
esp-insights            espressifsystems
esp-qcloud              espressifsystems
esp-sr                  esp-components
esp-adf-libs            esp-components
esp32-camera            esp-components
esp-rainmaker-common    esp-components
esp-dl                  esp-components
)

len=${#REPOS_ARRAY[@]}

pushd ${REPO_DIR} >/dev/null

# 0
[ -f ".gitmodules" ] || exit 0

# 1
git submodule init

# 2
# Replacing each submodule URL of the current repository
# to the mirror repos in gitee
for LINE in $(git config -f .gitmodules --list | grep "\.url=../[^.]\|\.url=../../[^.]\|\.url=https://github.com/[^.]\|\.url=https://git.eclipse.org/[^.]")
do
    SUBPATH=$(echo "${LINE}" | sed "s|^submodule\.\([^.]*\)\.url.*$|\1|")
    LOCATION=$(echo "${LINE}" | sed 's/.*\///' | sed 's/.git//g' | sed 's/.*\.//')

    for ((i=0;i<len;i+=2))
    do
        REPO=${REPOS_ARRAY[i]}
        GROUP=${REPOS_ARRAY[i+1]}

        if [ "$LOCATION" = "$REPO" ]; then
            SUBURL="https://gitee.com/$GROUP/$LOCATION"
            break
        else
            # gitee url is case sensitive
            if [ "$LOCATION" = "unity" ]; then
                LOCATION="Unity"
            fi
            if [ "$LOCATION" = "cexception" ]; then
                LOCATION="CException"
            fi
            SUBURL="https://gitee.com/esp-submodules/$LOCATION"
        fi
    done

    git config submodule."${SUBPATH}".url "${SUBURL}"
done

# 3
# Getting submodules of the current repository from gitee mirrors
if check_git_version; then
    git submodule update --progress || exit $ERR_CANNOT_UPDATE
else
    git submodule update || exit $ERR_CANNOT_UPDAT
fi

# 4
# Replacing URLs for each sub-submodule.
# The script runs recursively
git submodule foreach "${SCRIPT_SH}" # No '--recursive'

popd >/dev/null