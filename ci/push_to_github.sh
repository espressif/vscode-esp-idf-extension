#!/bin/bash

# gitlab-ci script to push current tested revision (tag or branch) to github

set -ex

if [ -n "${CI_COMMIT_TAG}" ]; then
    echo "Pushing Tag: $CI_COMMIT_TAG"
    git push --force github "${CI_COMMIT_TAG}"
else
    git push github "${CI_COMMIT_SHA}:refs/heads/${CI_COMMIT_REF_NAME}"
fi
