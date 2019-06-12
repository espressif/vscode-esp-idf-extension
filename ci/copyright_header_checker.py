#!/usr/bin/env python
#
# 'copyright_header_checker.py' checks for copyright comment
#
# Project: ESP-IDF VSCode Extension
# File Created: Tuesday, 4th June 2019 11:00:17 pm
# Copyright 2019 Espressif Systems (Shanghai) CO LTD
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import os
import re

DEFAULT_DIRS = ['.']
EXCLUDE_DIRS = ['node_modules']
DEFAULT_EXTENSIONS = ["js", "ts", "py"]

COPYRIGHT_REGEX = re.compile(r"Copyright [0-9]{4} Espressif Systems \(Shanghai\) CO\.? LTD\.?",
                             flags=re.MULTILINE | re.IGNORECASE)


def contain_copyright_message(file_path):
    with open(file_path) as fp:
        data = fp.read()
        return COPYRIGHT_REGEX.search(data)


def scan_for_all_files_with_extension(dirs, exclude_dirs, exts):
    coll = []
    for folder in dirs:
        for root, _dirs, files in os.walk(folder):
            if root in exclude_dirs:
                continue

            for file in files:
                coll.extend([os.path.join(root, file) for ext in exts if file.endswith(ext)])
    return coll


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Checker for copyright notice')
    parser.add_argument('-d', '--dirs', help="Directories to check for files", default=DEFAULT_DIRS, nargs="+")
    parser.add_argument('-x', '--exclude', help="Directories to exclude", default=EXCLUDE_DIRS, nargs="+")
    parser.add_argument('-e', '--extensions', help="File extensions to check", default=DEFAULT_EXTENSIONS, nargs="+")

    args = parser.parse_args()
    files = scan_for_all_files_with_extension(args.dirs, args.exclude, args.extensions)
    missing_copyright_files = [file_path for file_path in files if not contain_copyright_message(file_path)]

    if missing_copyright_files:
        for file in missing_copyright_files:
            print("[warning] missing copyright: " + file)
        exit(1)
