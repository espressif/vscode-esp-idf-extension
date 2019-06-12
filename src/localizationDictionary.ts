// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as fs from "fs";
import * as path from "path";
import { Logger } from "./logger/logger";

export class LocDictionary {
    private dictionary;

    constructor(filename) {
        const extensionName = __dirname.replace(path.sep + "out", "");
        const localeConf = JSON.parse(process.env.VSCODE_NLS_CONFIG);
        const locDirPath = path.join(extensionName, "i18n", localeConf.locale, "out");
        const locJsonPath = path.join(locDirPath, filename + ".i18n.json");
        if (fs.existsSync(locDirPath) && fs.existsSync(locJsonPath)) {
            try {
                this.dictionary = JSON.parse(fs.readFileSync(locJsonPath).toString());
            } catch (error) {
                Logger.errorNotify("Localization file error.", error);
            }
        }
    }

    public localize(key: string, defaultMsg: string): string {
        if (this.dictionary !== undefined && key in this.dictionary) {
            return this.dictionary[key];
        }
        return defaultMsg;
    }
}
