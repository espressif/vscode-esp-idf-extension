import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

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
                vscode.window.showErrorMessage("Localization file error.");
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
