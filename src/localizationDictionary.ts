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
    private dictionary: object;
    private schemaProperties: string[];
    private localizationFile: string;

    /**
     * Representation of a language dictionary for a source file.
     * @param {string} absolutePath - Path of the file to translate.
     * @param {string} type - Type of translation. Can be 'out' (default) or 'views'.
     */
    constructor(absolutePath: string, type: string = "out") {
        const extensionName = __dirname.replace(path.sep + "dist", "");
        const localeConf = JSON.parse(process.env.VSCODE_NLS_CONFIG);
        const locDirPath = path.join(extensionName, "i18n", localeConf.locale, type);
        const subPath = this.getLocalizationFilePath(absolutePath);
        this.localizationFile = path.join(locDirPath, subPath + ".i18n.json");
        if (fs.existsSync(locDirPath) && fs.existsSync(this.localizationFile)) {
            try {
                this.dictionary = JSON.parse(fs.readFileSync(this.localizationFile).toString());
                this.schemaProperties = this.getDictionaryType();
            } catch (error) {
                Logger.errorNotify("Failed to load localization, by default will only display in English", error);
            }
        }
    }

    public localize(key: string, defaultMsg: string): string {
        if (this.dictionary && this.dictionary.hasOwnProperty(key)) {
            return this.dictionary[key];
        }
        if (this.schemaProperties && this.schemaProperties.hasOwnProperty(key)) {
            Logger.infoNotify(`${this.localizationFile} doesn't contain localization for ${key}`);
        }
        return defaultMsg;
    }

    public getDictionary() {
        return this.dictionary;
    }

    public getSchemaParts(pathToUse: string): string[] {
        const extensionName = __dirname.replace(path.sep + "dist", "");
        const parts = pathToUse.replace(path.join(extensionName, "i18n"), "").split(/(?:\\|\/)/g);
        parts.splice(0, 2);
        parts[parts.length - 1] = parts[parts.length - 1].replace(/(\.).*/g, "");
        return parts;
    }

    public getDictionaryType() {
        const extensionName = __dirname.replace(path.sep + "dist", "");
        const dictionarySchema = JSON.parse(fs.readFileSync(path.join(extensionName, "schema.i18n.json")).toString());
        const parts = this.getSchemaParts(this.localizationFile);
        const keys = this.reduceSchemaObj(dictionarySchema, parts);
        if (keys) {
            return keys;
        } else {
            const err = new Error(`Error with parsing localization schema for ${this.localizationFile}`);
            Logger.errorNotify(err.message, err);
        }
    }

    private reduceSchemaObj = (schemaObj, parts: string[]) => {
        return parts.reduce((obj, key) =>
            (obj && obj[key] !== undefined) ? obj[key] : undefined, schemaObj);
    }

    private getLocalizationFilePath(absolutePath: string) {
        const parts = absolutePath.replace("src" + path.sep, "").split(/(?:\\|\/)/g);
        parts[parts.length - 1] = parts[parts.length - 1].replace(/(\.).*/g, "");
        return parts.join(path.sep);
    }
}
